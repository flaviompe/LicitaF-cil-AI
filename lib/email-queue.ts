'use server'

import { EmailData, EmailResult } from './email-service'

export interface QueuedEmail {
  id: string
  emailData: EmailData
  templateId?: string
  templateVariables?: Record<string, any>
  priority: 'high' | 'normal' | 'low'
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'retry'
  attempts: number
  maxAttempts: number
  scheduledFor?: Date
  createdAt: Date
  updatedAt: Date
  sentAt?: Date
  error?: string
  result?: EmailResult
  
  // Analytics tracking
  userId?: string
  campaignId?: string
  trackOpens?: boolean
  trackClicks?: boolean
}

export interface QueueStats {
  pending: number
  processing: number
  sent: number
  failed: number
  total: number
}

class EmailQueue {
  private queue: Map<string, QueuedEmail> = new Map()
  private processing = false
  private processingInterval?: NodeJS.Timeout
  private maxConcurrent = 5
  private currentlyProcessing = 0
  private retryDelay = 5000 // 5 seconds
  private maxRetryDelay = 300000 // 5 minutes

  constructor() {
    this.startProcessing()
  }

  private generateId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async addToQueue(
    emailData: EmailData,
    options: {
      priority?: 'high' | 'normal' | 'low'
      maxAttempts?: number
      scheduledFor?: Date
      templateId?: string
      templateVariables?: Record<string, any>
      userId?: string
      campaignId?: string
      trackOpens?: boolean
      trackClicks?: boolean
    } = {}
  ): Promise<string> {
    const id = this.generateId()
    
    const queuedEmail: QueuedEmail = {
      id,
      emailData,
      templateId: options.templateId,
      templateVariables: options.templateVariables,
      priority: options.priority || 'normal',
      status: 'pending',
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      scheduledFor: options.scheduledFor,
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Analytics tracking options
      userId: options.userId,
      campaignId: options.campaignId,
      trackOpens: options.trackOpens ?? true, // Default to true
      trackClicks: options.trackClicks ?? true // Default to true
    }

    this.queue.set(id, queuedEmail)
    
    // Log queue addition
    console.log(`Email added to queue: ${id} (Priority: ${queuedEmail.priority})`)
    
    return id
  }

  async addBulkToQueue(
    emails: Array<{
      emailData: EmailData
      options?: {
        priority?: 'high' | 'normal' | 'low'
        maxAttempts?: number
        scheduledFor?: Date
        templateId?: string
        templateVariables?: Record<string, any>
      }
    }>
  ): Promise<string[]> {
    const ids: string[] = []
    
    for (const email of emails) {
      const id = await this.addToQueue(email.emailData, email.options || {})
      ids.push(id)
    }
    
    return ids
  }

  private async startProcessing() {
    if (this.processing) return
    
    this.processing = true
    this.processingInterval = setInterval(() => {
      this.processQueue()
    }, 1000) // Check every second
    
    console.log('Email queue processing started')
  }

  stopProcessing() {
    this.processing = false
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = undefined
    }
    console.log('Email queue processing stopped')
  }

  private async processQueue() {
    if (this.currentlyProcessing >= this.maxConcurrent) {
      return
    }

    const pendingEmails = Array.from(this.queue.values())
      .filter(email => 
        email.status === 'pending' && 
        (!email.scheduledFor || email.scheduledFor <= new Date())
      )
      .sort((a, b) => {
        // Sort by priority: high > normal > low
        const priorityOrder = { high: 3, normal: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        
        // Then by creation date (oldest first)
        return a.createdAt.getTime() - b.createdAt.getTime()
      })

    for (const email of pendingEmails) {
      if (this.currentlyProcessing >= this.maxConcurrent) break
      
      this.processEmail(email.id)
    }
  }

  private async processEmail(emailId: string) {
    const email = this.queue.get(emailId)
    if (!email || email.status !== 'pending') return

    this.currentlyProcessing++
    
    // Update status to processing
    email.status = 'processing'
    email.updatedAt = new Date()
    email.attempts++
    
    try {
      console.log(`Processing email ${emailId} (Attempt ${email.attempts}/${email.maxAttempts})`)
      
      // Import email service dynamically to avoid circular dependencies
      const { getEmailService } = await import('./email-service')
      const emailService = getEmailService()
      
      let emailToSend = email.emailData
      
      // If using template, render it first
      if (email.templateId && email.templateVariables) {
        const { getEmailTemplateService } = await import('./email-templates')
        const templateService = getEmailTemplateService()
        
        // Prepare tracking options
        const trackingOptions = {
          emailId: emailId,
          userEmail: Array.isArray(email.emailData.to) ? email.emailData.to[0] : email.emailData.to,
          trackOpens: email.trackOpens || false,
          trackClicks: email.trackClicks || false
        }
        
        // Render template with tracking
        const rendered = templateService.renderTemplate(
          email.templateId,
          email.templateVariables,
          trackingOptions
        )
        
        if (rendered) {
          emailToSend = {
            ...email.emailData,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text
          }
        }
      }
      
      const result = await emailService.sendEmail(emailToSend)
      
      if (result.success) {
        email.status = 'sent'
        email.sentAt = new Date()
        email.result = result
        
        // Track email sent event for analytics
        try {
          const { trackEmailSent } = await import('./email-analytics')
          const userEmail = Array.isArray(emailToSend.to) ? emailToSend.to[0] : emailToSend.to
          await trackEmailSent(emailId, email.userId || '', userEmail)
        } catch (analyticsError) {
          console.warn('Failed to track email sent event:', analyticsError)
        }
        
        console.log(`Email ${emailId} sent successfully`)
      } else {
        throw new Error(result.error || 'Unknown error')
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Email ${emailId} failed:`, errorMessage)
      
      email.error = errorMessage
      
      if (email.attempts >= email.maxAttempts) {
        email.status = 'failed'
        console.log(`Email ${emailId} failed permanently after ${email.attempts} attempts`)
      } else {
        email.status = 'retry'
        // Schedule retry with exponential backoff
        const delay = Math.min(
          this.retryDelay * Math.pow(2, email.attempts - 1),
          this.maxRetryDelay
        )
        email.scheduledFor = new Date(Date.now() + delay)
        console.log(`Email ${emailId} scheduled for retry in ${delay}ms`)
      }
    } finally {
      email.updatedAt = new Date()
      this.currentlyProcessing--
    }
  }

  getQueueStats(): QueueStats {
    const emails = Array.from(this.queue.values())
    
    return {
      pending: emails.filter(e => e.status === 'pending' || e.status === 'retry').length,
      processing: emails.filter(e => e.status === 'processing').length,
      sent: emails.filter(e => e.status === 'sent').length,
      failed: emails.filter(e => e.status === 'failed').length,
      total: emails.length
    }
  }

  getEmailStatus(emailId: string): QueuedEmail | undefined {
    return this.queue.get(emailId)
  }

  getAllEmails(
    filter?: {
      status?: QueuedEmail['status']
      priority?: QueuedEmail['priority']
      limit?: number
      offset?: number
    }
  ): QueuedEmail[] {
    let emails = Array.from(this.queue.values())
    
    if (filter?.status) {
      emails = emails.filter(e => e.status === filter.status)
    }
    
    if (filter?.priority) {
      emails = emails.filter(e => e.priority === filter.priority)
    }
    
    // Sort by creation date (newest first)
    emails.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    
    if (filter?.offset) {
      emails = emails.slice(filter.offset)
    }
    
    if (filter?.limit) {
      emails = emails.slice(0, filter.limit)
    }
    
    return emails
  }

  retryEmail(emailId: string): boolean {
    const email = this.queue.get(emailId)
    if (!email || email.status !== 'failed') return false
    
    email.status = 'pending'
    email.attempts = 0
    email.error = undefined
    email.scheduledFor = undefined
    email.updatedAt = new Date()
    
    console.log(`Email ${emailId} queued for retry`)
    return true
  }

  retryAllFailed(): number {
    const failedEmails = Array.from(this.queue.values()).filter(e => e.status === 'failed')
    
    failedEmails.forEach(email => {
      email.status = 'pending'
      email.attempts = 0
      email.error = undefined
      email.scheduledFor = undefined
      email.updatedAt = new Date()
    })
    
    console.log(`${failedEmails.length} failed emails queued for retry`)
    return failedEmails.length
  }

  removeEmail(emailId: string): boolean {
    const email = this.queue.get(emailId)
    if (!email || email.status === 'processing') return false
    
    return this.queue.delete(emailId)
  }

  clearQueue(filter?: { status?: QueuedEmail['status'] }): number {
    if (!filter) {
      const count = this.queue.size
      this.queue.clear()
      return count
    }
    
    let removedCount = 0
    for (const [id, email] of this.queue.entries()) {
      if (email.status === filter.status && email.status !== 'processing') {
        this.queue.delete(id)
        removedCount++
      }
    }
    
    return removedCount
  }

  // Schedule an email for future sending
  async scheduleEmail(
    emailData: EmailData,
    scheduledFor: Date,
    options: {
      priority?: 'high' | 'normal' | 'low'
      maxAttempts?: number
      templateId?: string
      templateVariables?: Record<string, any>
    } = {}
  ): Promise<string> {
    return this.addToQueue(emailData, {
      ...options,
      scheduledFor
    })
  }

  // Get scheduled emails
  getScheduledEmails(): QueuedEmail[] {
    return Array.from(this.queue.values())
      .filter(email => 
        email.scheduledFor && 
        email.scheduledFor > new Date() &&
        email.status === 'pending'
      )
      .sort((a, b) => a.scheduledFor!.getTime() - b.scheduledFor!.getTime())
  }

  // Cancel a scheduled email
  cancelScheduledEmail(emailId: string): boolean {
    const email = this.queue.get(emailId)
    if (!email || !email.scheduledFor || email.status !== 'pending') {
      return false
    }
    
    return this.queue.delete(emailId)
  }

  // Update queue configuration
  updateConfig(config: {
    maxConcurrent?: number
    retryDelay?: number
    maxRetryDelay?: number
  }) {
    if (config.maxConcurrent !== undefined) {
      this.maxConcurrent = config.maxConcurrent
    }
    if (config.retryDelay !== undefined) {
      this.retryDelay = config.retryDelay
    }
    if (config.maxRetryDelay !== undefined) {
      this.maxRetryDelay = config.maxRetryDelay
    }
    
    console.log('Email queue configuration updated:', config)
  }

  // Get queue performance metrics
  getPerformanceMetrics(): {
    averageProcessingTime: number
    successRate: number
    failureRate: number
    retryRate: number
    throughput: number // emails per minute
  } {
    const emails = Array.from(this.queue.values())
    const sentEmails = emails.filter(e => e.status === 'sent')
    const failedEmails = emails.filter(e => e.status === 'failed')
    const totalProcessed = sentEmails.length + failedEmails.length
    
    // Calculate average processing time for sent emails
    const avgProcessingTime = sentEmails.length > 0 
      ? sentEmails.reduce((sum, email) => {
          if (email.sentAt) {
            return sum + (email.sentAt.getTime() - email.createdAt.getTime())
          }
          return sum
        }, 0) / sentEmails.length
      : 0
    
    // Calculate rates
    const successRate = totalProcessed > 0 ? (sentEmails.length / totalProcessed) * 100 : 0
    const failureRate = totalProcessed > 0 ? (failedEmails.length / totalProcessed) * 100 : 0
    const retryEmails = emails.filter(e => e.attempts > 1)
    const retryRate = totalProcessed > 0 ? (retryEmails.length / totalProcessed) * 100 : 0
    
    // Calculate throughput (emails sent in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentSent = sentEmails.filter(e => e.sentAt && e.sentAt > oneHourAgo)
    const throughput = recentSent.length
    
    return {
      averageProcessingTime: Math.round(avgProcessingTime),
      successRate: Math.round(successRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      retryRate: Math.round(retryRate * 100) / 100,
      throughput
    }
  }
}

// Singleton instance
let emailQueue: EmailQueue | null = null

export const getEmailQueue = (): EmailQueue => {
  if (!emailQueue) {
    emailQueue = new EmailQueue()
  }
  return emailQueue
}

// Helper functions
export const queueWelcomeEmail = async (userEmail: string, userName: string): Promise<string> => {
  const queue = getEmailQueue()
  
  return queue.addToQueue({
    to: userEmail,
    subject: `Bem-vindo ao LicitaFácil AI, ${userName}!`,
    html: 'temp' // Will be replaced by template
  }, {
    priority: 'high',
    templateId: 'welcome',
    templateVariables: {
      userName,
      userEmail,
      dashboardUrl: `${process.env.NEXTAUTH_URL}/dashboard`
    }
  })
}

export const queueOpportunityAlert = async (
  userEmail: string, 
  userName: string, 
  opportunity: any
): Promise<string> => {
  const queue = getEmailQueue()
  
  return queue.addToQueue({
    to: userEmail,
    subject: `Nova oportunidade: ${opportunity.title}`,
    html: 'temp' // Will be replaced by template
  }, {
    priority: 'normal',
    templateId: 'opportunity-alert',
    templateVariables: {
      userName,
      opportunityTitle: opportunity.title,
      organ: opportunity.organ,
      value: opportunity.value?.toLocaleString('pt-BR') || 'Não informado',
      deadline: new Date(opportunity.deadline).toLocaleDateString('pt-BR'),
      modality: opportunity.modality,
      opportunityUrl: `${process.env.NEXTAUTH_URL}/dashboard/opportunities/${opportunity.id}`
    }
  })
}

export const queueBulkNotifications = async (
  notifications: Array<{
    userEmail: string
    userName: string
    templateId: string
    templateVariables: Record<string, any>
    priority?: 'high' | 'normal' | 'low'
  }>
): Promise<string[]> => {
  const queue = getEmailQueue()
  
  const emails = notifications.map(notification => ({
    emailData: {
      to: notification.userEmail,
      subject: 'temp', // Will be replaced by template
      html: 'temp' // Will be replaced by template
    },
    options: {
      priority: notification.priority || 'normal',
      templateId: notification.templateId,
      templateVariables: notification.templateVariables
    }
  }))
  
  return queue.addBulkToQueue(emails)
}

export type { QueuedEmail, QueueStats }