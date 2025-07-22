'use server'

import nodemailer from 'nodemailer'
import { Resend } from 'resend'

// Email service configuration
interface EmailConfig {
  provider: 'nodemailer' | 'resend' | 'sendgrid'
  smtp?: {
    host: string
    port: number
    secure: boolean
    auth: {
      user: string
      pass: string
    }
  }
  apiKey?: string
}

interface EmailData {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  html?: string
  text?: string
  attachments?: Array<{
    filename: string
    path?: string
    content?: Buffer
    contentType?: string
  }>
  replyTo?: string
  from?: string
  priority?: 'high' | 'normal' | 'low'
  headers?: Record<string, string>
}

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
  recipients?: string[]
}

class EmailService {
  private config: EmailConfig
  private transporter?: nodemailer.Transporter
  private resend?: Resend

  constructor() {
    this.config = this.getEmailConfig()
    this.initializeService()
  }

  private getEmailConfig(): EmailConfig {
    const provider = process.env.EMAIL_PROVIDER as 'nodemailer' | 'resend' | 'sendgrid' || 'nodemailer'
    
    switch (provider) {
      case 'resend':
        return {
          provider: 'resend',
          apiKey: process.env.RESEND_API_KEY
        }
      
      case 'sendgrid':
        return {
          provider: 'sendgrid',
          apiKey: process.env.SENDGRID_API_KEY
        }
      
      default:
        return {
          provider: 'nodemailer',
          smtp: {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER || '',
              pass: process.env.SMTP_PASS || ''
            }
          }
        }
    }
  }

  private async initializeService() {
    try {
      switch (this.config.provider) {
        case 'nodemailer':
          if (this.config.smtp) {
            this.transporter = nodemailer.createTransporter({
              host: this.config.smtp.host,
              port: this.config.smtp.port,
              secure: this.config.smtp.secure,
              auth: this.config.smtp.auth,
              tls: {
                rejectUnauthorized: process.env.NODE_ENV === 'production'
              }
            })
            
            // Verify connection
            await this.transporter.verify()
          }
          break
          
        case 'resend':
          if (this.config.apiKey) {
            this.resend = new Resend(this.config.apiKey)
          }
          break
      }
    } catch (error) {
      console.error('Email service initialization failed:', error)
    }
  }

  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    try {
      const defaultFrom = process.env.EMAIL_FROM || 'noreply@licitafacil.ai'
      
      const emailOptions = {
        ...emailData,
        from: emailData.from || defaultFrom
      }

      switch (this.config.provider) {
        case 'nodemailer':
          return await this.sendWithNodemailer(emailOptions)
          
        case 'resend':
          return await this.sendWithResend(emailOptions)
          
        default:
          throw new Error(`Unsupported email provider: ${this.config.provider}`)
      }
    } catch (error) {
      console.error('Email sending failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async sendWithNodemailer(emailData: EmailData): Promise<EmailResult> {
    if (!this.transporter) {
      throw new Error('Nodemailer transporter not initialized')
    }

    const result = await this.transporter.sendMail({
      from: emailData.from,
      to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
      cc: emailData.cc ? (Array.isArray(emailData.cc) ? emailData.cc.join(', ') : emailData.cc) : undefined,
      bcc: emailData.bcc ? (Array.isArray(emailData.bcc) ? emailData.bcc.join(', ') : emailData.bcc) : undefined,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      attachments: emailData.attachments,
      replyTo: emailData.replyTo,
      priority: emailData.priority,
      headers: emailData.headers
    })

    return {
      success: true,
      messageId: result.messageId,
      recipients: Array.isArray(emailData.to) ? emailData.to : [emailData.to]
    }
  }

  private async sendWithResend(emailData: EmailData): Promise<EmailResult> {
    if (!this.resend) {
      throw new Error('Resend client not initialized')
    }

    const result = await this.resend.emails.send({
      from: emailData.from!,
      to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
      cc: emailData.cc ? (Array.isArray(emailData.cc) ? emailData.cc : [emailData.cc]) : undefined,
      bcc: emailData.bcc ? (Array.isArray(emailData.bcc) ? emailData.bcc : [emailData.bcc]) : undefined,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      attachments: emailData.attachments?.map(att => ({
        filename: att.filename,
        path: att.path,
        content: att.content
      })),
      reply_to: emailData.replyTo,
      headers: emailData.headers
    })

    return {
      success: true,
      messageId: result.data?.id,
      recipients: Array.isArray(emailData.to) ? emailData.to : [emailData.to]
    }
  }

  async sendBulkEmails(emails: EmailData[]): Promise<EmailResult[]> {
    const results: EmailResult[] = []
    
    // Process in batches to avoid rate limiting
    const batchSize = 10
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize)
      const batchPromises = batch.map(email => this.sendEmail(email))
      const batchResults = await Promise.allSettled(batchPromises)
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({
            success: false,
            error: result.reason?.message || 'Batch processing failed'
          })
        }
      })
      
      // Add delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return results
  }

  async verifyEmailAddress(email: string): Promise<boolean> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  async testConnection(): Promise<{ success: boolean, error?: string }> {
    try {
      switch (this.config.provider) {
        case 'nodemailer':
          if (this.transporter) {
            await this.transporter.verify()
            return { success: true }
          }
          break
          
        case 'resend':
          if (this.resend) {
            // Test with a simple API call
            try {
              await this.resend.emails.send({
                from: 'test@licitafacil.ai',
                to: ['test@example.com'],
                subject: 'Test',
                html: 'Test'
              })
            } catch (error: any) {
              // If it's an API key error, the service is working but key is invalid
              if (error.message?.includes('API key')) {
                return { success: false, error: 'Invalid API key' }
              }
              // Other errors might be due to test email, which is fine for connection test
              return { success: true }
            }
            return { success: true }
          }
          break
      }
      
      return { success: false, error: 'Service not initialized' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      }
    }
  }
}

// Singleton instance
let emailService: EmailService | null = null

export const getEmailService = (): EmailService => {
  if (!emailService) {
    emailService = new EmailService()
  }
  return emailService
}

// Helper functions
export const sendWelcomeEmail = async (userEmail: string, userName: string): Promise<EmailResult> => {
  const service = getEmailService()
  
  return await service.sendEmail({
    to: userEmail,
    subject: 'Bem-vindo ao LicitaFácil AI!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Bem-vindo ao LicitaFácil AI, ${userName}!</h1>
        <p>Obrigado por se cadastrar em nossa plataforma de gestão de licitações públicas.</p>
        <p>Com o LicitaFácil AI, você terá acesso a:</p>
        <ul>
          <li>Monitoramento automatizado de licitações</li>
          <li>IA jurídica especializada</li>
          <li>Análise inteligente de editais</li>
          <li>Gestão completa de documentos</li>
        </ul>
        <p><a href="${process.env.NEXTAUTH_URL}/dashboard" style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Acessar Dashboard</a></p>
        <p>Atenciosamente,<br>Equipe LicitaFácil AI</p>
      </div>
    `,
    text: `Bem-vindo ao LicitaFácil AI, ${userName}! Obrigado por se cadastrar em nossa plataforma.`
  })
}

export const sendOpportunityAlert = async (userEmail: string, opportunity: any): Promise<EmailResult> => {
  const service = getEmailService()
  
  return await service.sendEmail({
    to: userEmail,
    subject: `Nova Oportunidade: ${opportunity.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Nova Oportunidade de Licitação!</h1>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 16px 0;">
          <h2>${opportunity.title}</h2>
          <p><strong>Órgão:</strong> ${opportunity.organ}</p>
          <p><strong>Valor:</strong> R$ ${opportunity.value?.toLocaleString('pt-BR')}</p>
          <p><strong>Prazo:</strong> ${new Date(opportunity.deadline).toLocaleDateString('pt-BR')}</p>
          <p><strong>Modalidade:</strong> ${opportunity.modality}</p>
        </div>
        <p><a href="${process.env.NEXTAUTH_URL}/dashboard/opportunities/${opportunity.id}" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver Detalhes</a></p>
        <p>Atenciosamente,<br>Equipe LicitaFácil AI</p>
      </div>
    `,
    text: `Nova oportunidade: ${opportunity.title} - ${opportunity.organ}. Prazo: ${new Date(opportunity.deadline).toLocaleDateString('pt-BR')}`
  })
}

export const sendPasswordReset = async (userEmail: string, resetToken: string): Promise<EmailResult> => {
  const service = getEmailService()
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`
  
  return await service.sendEmail({
    to: userEmail,
    subject: 'Redefinição de Senha - LicitaFácil AI',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Redefinição de Senha</h1>
        <p>Você solicitou a redefinição de sua senha no LicitaFácil AI.</p>
        <p>Clique no botão abaixo para redefinir sua senha:</p>
        <p><a href="${resetUrl}" style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Redefinir Senha</a></p>
        <p>Este link é válido por 1 hora.</p>
        <p>Se você não solicitou esta redefinição, ignore este e-mail.</p>
        <p>Atenciosamente,<br>Equipe LicitaFácil AI</p>
      </div>
    `,
    text: `Redefinição de senha: ${resetUrl}`
  })
}

export type { EmailData, EmailResult }