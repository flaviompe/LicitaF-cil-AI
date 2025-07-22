'use server'

import { getEmailQueue, queueWelcomeEmail, queueOpportunityAlert } from './email-queue'
import { 
  createWelcomeEmail, 
  createOpportunityAlert, 
  createCertificateExpiryAlert, 
  createPasswordResetEmail 
} from './email-templates'

export interface NotificationTrigger {
  id: string
  name: string
  description: string
  event: string
  conditions: Record<string, any>
  template: string
  enabled: boolean
  priority: 'high' | 'normal' | 'low'
  delay?: number // in minutes
  recipients: 'user' | 'admin' | 'custom'
  customRecipients?: string[]
}

export interface NotificationEvent {
  type: string
  data: Record<string, any>
  userId?: string
  userEmail?: string
  userName?: string
  timestamp: Date
}

class EmailNotificationService {
  private triggers: Map<string, NotificationTrigger> = new Map()
  private eventHistory: NotificationEvent[] = []
  private isProcessing = false

  constructor() {
    this.initializeDefaultTriggers()
    this.startEventProcessing()
  }

  private initializeDefaultTriggers() {
    const defaultTriggers: NotificationTrigger[] = [
      {
        id: 'user-registration',
        name: 'Cadastro de Usuário',
        description: 'Enviado quando um novo usuário se cadastra',
        event: 'user.registered',
        conditions: {},
        template: 'welcome',
        enabled: true,
        priority: 'high',
        recipients: 'user'
      },
      {
        id: 'new-opportunity',
        name: 'Nova Oportunidade',
        description: 'Enviado quando uma nova licitação corresponde ao perfil do usuário',
        event: 'opportunity.matched',
        conditions: {
          minValue: 0,
          userPreferences: true
        },
        template: 'opportunity-alert',
        enabled: true,
        priority: 'normal',
        recipients: 'user'
      },
      {
        id: 'certificate-expiry-30',
        name: 'Certidão Vencendo em 30 Dias',
        description: 'Alerta quando certidão está próxima do vencimento',
        event: 'certificate.expiring',
        conditions: {
          daysToExpiry: 30
        },
        template: 'certificate-expiry',
        enabled: true,
        priority: 'high',
        recipients: 'user'
      },
      {
        id: 'certificate-expiry-7',
        name: 'Certidão Vencendo em 7 Dias',
        description: 'Alerta urgente de vencimento de certidão',
        event: 'certificate.expiring',
        conditions: {
          daysToExpiry: 7
        },
        template: 'certificate-expiry',
        enabled: true,
        priority: 'high',
        recipients: 'user'
      },
      {
        id: 'password-reset',
        name: 'Redefinição de Senha',
        description: 'Enviado quando usuário solicita redefinição de senha',
        event: 'user.password-reset-requested',
        conditions: {},
        template: 'password-reset',
        enabled: true,
        priority: 'high',
        recipients: 'user'
      },
      {
        id: 'proposal-submitted',
        name: 'Proposta Enviada',
        description: 'Confirmação de envio de proposta',
        event: 'proposal.submitted',
        conditions: {},
        template: 'proposal-confirmation',
        enabled: true,
        priority: 'normal',
        recipients: 'user'
      },
      {
        id: 'daily-digest',
        name: 'Resumo Diário',
        description: 'Resumo das atividades do dia',
        event: 'scheduled.daily-digest',
        conditions: {
          time: '08:00',
          hasActivity: true
        },
        template: 'daily-digest',
        enabled: false, // Disabled by default
        priority: 'low',
        recipients: 'user'
      },
      {
        id: 'admin-new-user',
        name: 'Novo Usuário (Admin)',
        description: 'Notifica admin sobre novos cadastros',
        event: 'user.registered',
        conditions: {},
        template: 'admin-new-user',
        enabled: true,
        priority: 'low',
        recipients: 'admin'
      }
    ]

    defaultTriggers.forEach(trigger => {
      this.triggers.set(trigger.id, trigger)
    })
  }

  private startEventProcessing() {
    setInterval(() => {
      this.processScheduledEvents()
    }, 60000) // Check every minute for scheduled events
  }

  async triggerEvent(event: NotificationEvent): Promise<string[]> {
    try {
      // Add to event history
      this.eventHistory.push(event)
      
      // Keep only last 1000 events
      if (this.eventHistory.length > 1000) {
        this.eventHistory = this.eventHistory.slice(-1000)
      }

      const emailIds: string[] = []
      
      // Find matching triggers
      const matchingTriggers = Array.from(this.triggers.values()).filter(trigger => 
        trigger.enabled && this.matchesEvent(trigger, event)
      )

      for (const trigger of matchingTriggers) {
        const triggeredEmailIds = await this.processTrigger(trigger, event)
        emailIds.push(...triggeredEmailIds)
      }

      return emailIds

    } catch (error) {
      console.error('Error processing notification event:', error)
      return []
    }
  }

  private matchesEvent(trigger: NotificationTrigger, event: NotificationEvent): boolean {
    // Check event type
    if (trigger.event !== event.type) {
      return false
    }

    // Check conditions
    for (const [key, value] of Object.entries(trigger.conditions)) {
      if (!this.evaluateCondition(key, value, event.data)) {
        return false
      }
    }

    return true
  }

  private evaluateCondition(key: string, expectedValue: any, eventData: Record<string, any>): boolean {
    const actualValue = eventData[key]

    switch (key) {
      case 'minValue':
        return typeof actualValue === 'number' && actualValue >= expectedValue
      
      case 'daysToExpiry':
        return actualValue === expectedValue
      
      case 'userPreferences':
        // Check if user has preferences matching this opportunity
        return expectedValue ? !!eventData.matchesUserPreferences : true
      
      case 'hasActivity':
        return expectedValue ? !!eventData.hasActivity : true
      
      default:
        return actualValue === expectedValue
    }
  }

  private async processTrigger(trigger: NotificationTrigger, event: NotificationEvent): Promise<string[]> {
    const emailIds: string[] = []
    
    try {
      let recipients: string[] = []

      // Determine recipients
      switch (trigger.recipients) {
        case 'user':
          if (event.userEmail) {
            recipients = [event.userEmail]
          }
          break
        
        case 'admin':
          recipients = await this.getAdminEmails()
          break
        
        case 'custom':
          recipients = trigger.customRecipients || []
          break
      }

      // Process each recipient
      for (const recipientEmail of recipients) {
        const emailId = await this.sendNotificationEmail(
          trigger,
          event,
          recipientEmail
        )
        
        if (emailId) {
          emailIds.push(emailId)
        }
      }

    } catch (error) {
      console.error(`Error processing trigger ${trigger.id}:`, error)
    }

    return emailIds
  }

  private async sendNotificationEmail(
    trigger: NotificationTrigger, 
    event: NotificationEvent, 
    recipientEmail: string
  ): Promise<string | null> {
    try {
      const queue = getEmailQueue()
      
      // Prepare template variables
      const templateVariables = {
        userName: event.userName || 'Usuário',
        userEmail: event.userEmail || recipientEmail,
        ...event.data,
        timestamp: event.timestamp.toISOString(),
        dashboardUrl: `${process.env.NEXTAUTH_URL}/dashboard`
      }

      const scheduledFor = trigger.delay 
        ? new Date(Date.now() + trigger.delay * 60 * 1000)
        : undefined

      const emailId = await queue.addToQueue({
        to: recipientEmail,
        subject: 'Will be replaced by template',
        html: 'Will be replaced by template'
      }, {
        priority: trigger.priority,
        templateId: trigger.template,
        templateVariables,
        scheduledFor
      })

      console.log(`Notification email queued: ${trigger.name} to ${recipientEmail}`)
      return emailId

    } catch (error) {
      console.error(`Error sending notification email for trigger ${trigger.id}:`, error)
      return null
    }
  }

  private async getAdminEmails(): Promise<string[]> {
    // In a real implementation, this would query the database
    // For now, return environment variable or default
    const adminEmail = process.env.ADMIN_EMAIL
    return adminEmail ? [adminEmail] : ['admin@licitafacil.ai']
  }

  private async processScheduledEvents() {
    if (this.isProcessing) return
    
    this.isProcessing = true
    
    try {
      const now = new Date()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      
      // Process daily digest if it's the right time
      if (currentTime === '08:00') {
        await this.processDailyDigest()
      }
      
      // Check for certificate expiries
      await this.checkCertificateExpiries()
      
    } catch (error) {
      console.error('Error processing scheduled events:', error)
    } finally {
      this.isProcessing = false
    }
  }

  private async processDailyDigest() {
    // This would typically query the database for users who want daily digest
    // and have activity in the last 24 hours
    console.log('Processing daily digest...')
  }

  private async checkCertificateExpiries() {
    // This would query the database for certificates expiring in 30 and 7 days
    // For now, this is a placeholder
    console.log('Checking certificate expiries...')
  }

  // Management methods
  getTrigger(id: string): NotificationTrigger | undefined {
    return this.triggers.get(id)
  }

  getAllTriggers(): NotificationTrigger[] {
    return Array.from(this.triggers.values())
  }

  addTrigger(trigger: NotificationTrigger): void {
    this.triggers.set(trigger.id, trigger)
  }

  updateTrigger(id: string, updates: Partial<NotificationTrigger>): boolean {
    const existing = this.triggers.get(id)
    if (!existing) return false

    this.triggers.set(id, { ...existing, ...updates })
    return true
  }

  deleteTrigger(id: string): boolean {
    return this.triggers.delete(id)
  }

  enableTrigger(id: string): boolean {
    return this.updateTrigger(id, { enabled: true })
  }

  disableTrigger(id: string): boolean {
    return this.updateTrigger(id, { enabled: false })
  }

  getEventHistory(limit = 100): NotificationEvent[] {
    return this.eventHistory.slice(-limit)
  }

  getNotificationStats(): {
    totalTriggers: number
    enabledTriggers: number
    recentEvents: number
    triggersById: Record<string, { name: string, enabled: boolean, lastTriggered?: Date }>
  } {
    const triggers = Array.from(this.triggers.values())
    const recentEvents = this.eventHistory.filter(
      e => Date.now() - e.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    ).length

    return {
      totalTriggers: triggers.length,
      enabledTriggers: triggers.filter(t => t.enabled).length,
      recentEvents,
      triggersById: Object.fromEntries(
        triggers.map(t => [t.id, { 
          name: t.name, 
          enabled: t.enabled 
        }])
      )
    }
  }
}

// Singleton instance
let notificationService: EmailNotificationService | null = null

export const getNotificationService = (): EmailNotificationService => {
  if (!notificationService) {
    notificationService = new EmailNotificationService()
  }
  return notificationService
}

// Helper functions for common events
export const notifyUserRegistration = async (
  userId: string, 
  userEmail: string, 
  userName: string,
  companyName?: string
): Promise<string[]> => {
  const service = getNotificationService()
  
  return service.triggerEvent({
    type: 'user.registered',
    data: { 
      userId, 
      companyName: companyName || 'Sua empresa'
    },
    userId,
    userEmail,
    userName,
    timestamp: new Date()
  })
}

export const notifyNewOpportunity = async (
  userId: string,
  userEmail: string,
  userName: string,
  opportunity: {
    id: string
    title: string
    organ: string
    value?: number
    deadline: Date
    modality: string
    matchesUserPreferences: boolean
  }
): Promise<string[]> => {
  const service = getNotificationService()
  
  return service.triggerEvent({
    type: 'opportunity.matched',
    data: {
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      organ: opportunity.organ,
      value: opportunity.value,
      deadline: opportunity.deadline.toLocaleDateString('pt-BR'),
      modality: opportunity.modality,
      matchesUserPreferences: opportunity.matchesUserPreferences,
      opportunityUrl: `${process.env.NEXTAUTH_URL}/dashboard/opportunities/${opportunity.id}`
    },
    userId,
    userEmail,
    userName,
    timestamp: new Date()
  })
}

export const notifyCertificateExpiry = async (
  userId: string,
  userEmail: string,
  userName: string,
  certificate: {
    id: string
    name: string
    expiryDate: Date
    daysToExpiry: number
  }
): Promise<string[]> => {
  const service = getNotificationService()
  
  return service.triggerEvent({
    type: 'certificate.expiring',
    data: {
      certificateId: certificate.id,
      certificateName: certificate.name,
      expiryDate: certificate.expiryDate.toLocaleDateString('pt-BR'),
      daysToExpiry: certificate.daysToExpiry,
      renewalUrl: `${process.env.NEXTAUTH_URL}/dashboard/certificates`
    },
    userId,
    userEmail,
    userName,
    timestamp: new Date()
  })
}

export const notifyPasswordReset = async (
  userEmail: string,
  userName: string,
  resetToken: string
): Promise<string[]> => {
  const service = getNotificationService()
  
  return service.triggerEvent({
    type: 'user.password-reset-requested',
    data: {
      resetToken,
      resetUrl: `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`,
      expiryTime: '1 hora'
    },
    userEmail,
    userName,
    timestamp: new Date()
  })
}

export const notifyProposalSubmitted = async (
  userId: string,
  userEmail: string,
  userName: string,
  proposal: {
    id: string
    opportunityTitle: string
    value: number
    submittedAt: Date
  }
): Promise<string[]> => {
  const service = getNotificationService()
  
  return service.triggerEvent({
    type: 'proposal.submitted',
    data: {
      proposalId: proposal.id,
      opportunityTitle: proposal.opportunityTitle,
      proposalValue: proposal.value.toLocaleString('pt-BR'),
      submittedAt: proposal.submittedAt.toLocaleDateString('pt-BR'),
      proposalUrl: `${process.env.NEXTAUTH_URL}/dashboard/proposals/${proposal.id}`
    },
    userId,
    userEmail,
    userName,
    timestamp: new Date()
  })
}

export type { NotificationTrigger, NotificationEvent }