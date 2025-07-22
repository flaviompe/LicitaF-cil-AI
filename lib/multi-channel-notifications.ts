// Sistema Completo de Notificações Multi-Canal (Email, WhatsApp, SMS, Push)
import { EventEmitter } from 'events'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export type NotificationChannel = 'email' | 'whatsapp' | 'sms' | 'push' | 'telegram' | 'dashboard'
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical'
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface NotificationTemplate {
  id: string
  name: string
  channels: NotificationChannel[]
  templates: {
    [K in NotificationChannel]?: {
      subject?: string
      content: string
      format: 'text' | 'html' | 'markdown'
    }
  }
  variables: string[]
  category: string
  enabled: boolean
}

export interface NotificationRule {
  id: string
  name: string
  event: string
  conditions: NotificationCondition[]
  template: string
  channels: NotificationChannel[]
  priority: NotificationPriority
  delay?: number // segundos
  throttle?: number // máximo por período
  throttlePeriod?: number // período em segundos
  enabled: boolean
  recipients: {
    type: 'user' | 'role' | 'custom' | 'all'
    targets?: string[]
  }
}

export interface NotificationCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'exists'
  value: any
  logic?: 'AND' | 'OR'
}

export interface Notification {
  id: string
  userId?: string
  title: string
  content: string
  channel: NotificationChannel
  priority: NotificationPriority
  status: NotificationStatus
  templateId?: string
  eventId?: string
  metadata: Record<string, any>
  scheduledFor?: Date
  sentAt?: Date
  deliveredAt?: Date
  readAt?: Date
  failedAt?: Date
  errorMessage?: string
  retryCount: number
  maxRetries: number
  createdAt: Date
}

export interface NotificationPreferences {
  userId: string
  email: {
    enabled: boolean
    opportunities: boolean
    deadlines: boolean
    certificates: boolean
    legal_updates: boolean
    system: boolean
  }
  whatsapp: {
    enabled: boolean
    phone?: string
    opportunities: boolean
    critical_only: boolean
  }
  sms: {
    enabled: boolean
    phone?: string
    critical_only: boolean
  }
  push: {
    enabled: boolean
    opportunities: boolean
    deadlines: boolean
  }
  quietHours: {
    enabled: boolean
    start: string // HH:mm
    end: string // HH:mm
    timezone: string
  }
}

export class MultiChannelNotificationService extends EventEmitter {
  private static instance: MultiChannelNotificationService
  private rules: Map<string, NotificationRule> = new Map()
  private templates: Map<string, NotificationTemplate> = new Map()
  private preferences: Map<string, NotificationPreferences> = new Map()
  private queue: Notification[] = []
  private processing = false
  private providers: Map<NotificationChannel, NotificationProvider> = new Map()

  private constructor() {
    super()
    this.initializeProviders()
    this.initializeTemplates()
    this.initializeRules()
    this.startProcessing()
  }

  static getInstance(): MultiChannelNotificationService {
    if (!MultiChannelNotificationService.instance) {
      MultiChannelNotificationService.instance = new MultiChannelNotificationService()
    }
    return MultiChannelNotificationService.instance
  }

  private initializeProviders() {
    // Email Provider
    this.providers.set('email', new EmailProvider({
      smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      from: process.env.EMAIL_FROM || 'noreply@licitafacil.ai'
    }))

    // WhatsApp Provider (usando Twilio WhatsApp API)
    this.providers.set('whatsapp', new WhatsAppProvider({
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_WHATSAPP_FROM
    }))

    // SMS Provider
    this.providers.set('sms', new SMSProvider({
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_SMS_FROM
    }))

    // Telegram Provider
    this.providers.set('telegram', new TelegramProvider({
      botToken: process.env.TELEGRAM_BOT_TOKEN
    }))

    // Push Notification Provider
    this.providers.set('push', new PushProvider({
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
      fcmServerKey: process.env.FCM_SERVER_KEY
    }))
  }

  private initializeTemplates() {
    const defaultTemplates: NotificationTemplate[] = [
      {
        id: 'opportunity_alert',
        name: 'Alerta de Nova Oportunidade',
        channels: ['email', 'whatsapp', 'push'],
        templates: {
          email: {
            subject: '🎯 Nova Oportunidade ME/EPP: {{title}}',
            content: `
              <h2>🎯 Nova Oportunidade Detectada!</h2>
              
              <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <h3>{{title}}</h3>
                <p><strong>Órgão:</strong> {{organ}}</p>
                <p><strong>Valor:</strong> R$ {{value}}</p>
                <p><strong>Prazo:</strong> {{deadline}}</p>
                <p><strong>Modalidade:</strong> {{modality}}</p>
                {{#if meAdvantage}}<p>✅ <strong>Benefícios ME/EPP Aplicáveis</strong></p>{{/if}}
              </div>
              
              <h4>📋 Análise Preliminar da IA:</h4>
              <ul>
                <li><strong>Viabilidade:</strong> {{viabilityScore}}%</li>
                <li><strong>Risco:</strong> {{riskLevel}}</li>
                <li><strong>Concorrência Estimada:</strong> {{estimatedParticipants}} empresas</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{opportunityUrl}}" style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  📊 Ver Análise Completa
                </a>
              </div>
            `,
            format: 'html'
          },
          whatsapp: {
            content: `🎯 *NOVA OPORTUNIDADE ME/EPP*

📋 *{{title}}*

🏛️ Órgão: {{organ}}
💰 Valor: R$ {{value}}
⏰ Prazo: {{deadline}}
📑 Modalidade: {{modality}}

{{#if meAdvantage}}✅ *Benefícios ME/EPP Aplicáveis*{{/if}}

🤖 *Análise da IA:*
• Viabilidade: {{viabilityScore}}%
• Risco: {{riskLevel}}
• Concorrência: ~{{estimatedParticipants}} empresas

🔗 Ver análise completa: {{opportunityUrl}}`,
            format: 'text'
          },
          push: {
            subject: 'Nova Oportunidade ME/EPP',
            content: '🎯 {{title}} - {{organ}} - R$ {{value}}',
            format: 'text'
          }
        },
        variables: ['title', 'organ', 'value', 'deadline', 'modality', 'meAdvantage', 'viabilityScore', 'riskLevel', 'estimatedParticipants', 'opportunityUrl'],
        category: 'opportunities',
        enabled: true
      },
      {
        id: 'certificate_expiry',
        name: 'Alerta de Vencimento de Certidão',
        channels: ['email', 'whatsapp', 'sms'],
        templates: {
          email: {
            subject: '⚠️ URGENTE: Certidão {{certificateName}} vence em {{daysUntilExpiry}} dias',
            content: `
              <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 10px;">
                <h2>⚠️ ALERTA DE VENCIMENTO</h2>
                
                <p>A certidão <strong>{{certificateName}}</strong> da sua empresa vencerá em <strong>{{daysUntilExpiry}} dias</strong>.</p>
                
                <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                  <p><strong>Data de Vencimento:</strong> {{expiryDate}}</p>
                  <p><strong>Tipo:</strong> {{certificateType}}</p>
                  <p><strong>Órgão Emissor:</strong> {{issuer}}</p>
                </div>
                
                <h3>🔄 Como Renovar:</h3>
                <ol>
                  <li>{{renewalStep1}}</li>
                  <li>{{renewalStep2}}</li>
                  <li>{{renewalStep3}}</li>
                </ol>
                
                <div style="background: #fee2e2; padding: 15px; border-radius: 5px; margin: 15px 0;">
                  <strong>⚡ IMPORTANTE:</strong> Certidões vencidas impedem participação em licitações!
                </div>
                
                <div style="text-align: center; margin: 20px 0;">
                  <a href="{{renewalUrl}}" style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
                    🔄 Renovar Agora
                  </a>
                </div>
              </div>
            `,
            format: 'html'
          },
          whatsapp: {
            content: `⚠️ *ALERTA DE VENCIMENTO*

🗓️ A certidão *{{certificateName}}* vence em *{{daysUntilExpiry}} dias*

📅 Data de Vencimento: {{expiryDate}}
🏛️ Órgão: {{issuer}}

⚡ *ATENÇÃO:* Certidões vencidas impedem participação em licitações!

🔗 Renovar: {{renewalUrl}}`,
            format: 'text'
          },
          sms: {
            content: 'URGENTE: Certidão {{certificateName}} vence em {{daysUntilExpiry}} dias ({{expiryDate}}). Renove: {{renewalUrl}}',
            format: 'text'
          }
        },
        variables: ['certificateName', 'daysUntilExpiry', 'expiryDate', 'certificateType', 'issuer', 'renewalStep1', 'renewalStep2', 'renewalStep3', 'renewalUrl'],
        category: 'certificates',
        enabled: true
      },
      {
        id: 'proposal_deadline',
        name: 'Lembrete de Prazo de Proposta',
        channels: ['email', 'whatsapp', 'push', 'sms'],
        templates: {
          email: {
            subject: '⏰ Prazo terminando: {{opportunityTitle}} - {{hoursRemaining}}h restantes',
            content: `
              <div style="background: #fecaca; border: 2px solid #dc2626; padding: 20px; border-radius: 10px;">
                <h2>⏰ PRAZO TERMINANDO!</h2>
                
                <p>O prazo para envio de propostas está acabando!</p>
                
                <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h3>{{opportunityTitle}}</h3>
                  <p><strong>Órgão:</strong> {{organ}}</p>
                  <p><strong>Prazo Final:</strong> {{deadline}}</p>
                  <p><strong>Tempo Restante:</strong> {{hoursRemaining}} horas</p>
                </div>
                
                {{#if proposalDraft}}
                <div style="background: #dbeafe; padding: 15px; border-radius: 5px;">
                  ✅ Você tem um rascunho salvo. <a href="{{proposalUrl}}">Finalizar proposta</a>
                </div>
                {{else}}
                <div style="background: #fef3c7; padding: 15px; border-radius: 5px;">
                  ⚠️ Você ainda não iniciou sua proposta. <a href="{{proposalUrl}}">Criar proposta</a>
                </div>
                {{/if}}
                
                <div style="text-align: center; margin: 20px 0;">
                  <a href="{{proposalUrl}}" style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
                    🚀 Enviar Proposta
                  </a>
                </div>
              </div>
            `,
            format: 'html'
          },
          whatsapp: {
            content: `⏰ *PRAZO TERMINANDO!*

{{opportunityTitle}}
🏛️ {{organ}}

⏰ Prazo: {{deadline}}
🚨 Restam apenas *{{hoursRemaining}} horas*!

{{#if proposalDraft}}✅ Você tem um rascunho salvo{{else}}⚠️ Proposta ainda não iniciada{{/if}}

🚀 Enviar: {{proposalUrl}}`,
            format: 'text'
          },
          sms: {
            content: 'URGENTE: {{opportunityTitle}} - Restam {{hoursRemaining}}h para envio. Envie: {{proposalUrl}}',
            format: 'text'
          }
        },
        variables: ['opportunityTitle', 'organ', 'deadline', 'hoursRemaining', 'proposalDraft', 'proposalUrl'],
        category: 'deadlines',
        enabled: true
      },
      {
        id: 'legal_update',
        name: 'Atualização Jurídica',
        channels: ['email', 'push'],
        templates: {
          email: {
            subject: '⚖️ Atualização Jurídica: {{title}}',
            content: `
              <h2>⚖️ Nova Atualização Jurídica</h2>
              
              <div style="background: #f0f9ff; padding: 20px; border-radius: 10px;">
                <h3>{{title}}</h3>
                <p><strong>Tipo:</strong> {{updateType}}</p>
                <p><strong>Data:</strong> {{publishDate}}</p>
                <p><strong>Impacto:</strong> {{impact}}</p>
              </div>
              
              <div style="margin: 20px 0;">
                {{content}}
              </div>
              
              {{#if actionRequired}}
              <div style="background: #fef3c7; padding: 15px; border-radius: 5px;">
                <strong>⚠️ AÇÃO NECESSÁRIA:</strong> {{actionRequired}}
              </div>
              {{/if}}
              
              <div style="text-align: center; margin: 20px 0;">
                <a href="{{detailsUrl}}" style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
                  📖 Ler Completo
                </a>
              </div>
            `,
            format: 'html'
          }
        },
        variables: ['title', 'updateType', 'publishDate', 'impact', 'content', 'actionRequired', 'detailsUrl'],
        category: 'legal',
        enabled: true
      }
    ]

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template)
    })
  }

  private initializeRules() {
    const defaultRules: NotificationRule[] = [
      {
        id: 'new_opportunity_mepp',
        name: 'Nova Oportunidade ME/EPP',
        event: 'opportunity.created',
        conditions: [
          { field: 'meAdvantage', operator: 'equals', value: true }
        ],
        template: 'opportunity_alert',
        channels: ['email', 'whatsapp', 'push'],
        priority: 'high',
        enabled: true,
        recipients: { type: 'user' }
      },
      {
        id: 'certificate_expiring_30days',
        name: 'Certidão Expirando em 30 Dias',
        event: 'certificate.expiring',
        conditions: [
          { field: 'daysUntilExpiry', operator: 'equals', value: 30 }
        ],
        template: 'certificate_expiry',
        channels: ['email', 'whatsapp'],
        priority: 'medium',
        enabled: true,
        recipients: { type: 'user' }
      },
      {
        id: 'certificate_expiring_7days',
        name: 'Certidão Expirando em 7 Dias',
        event: 'certificate.expiring',
        conditions: [
          { field: 'daysUntilExpiry', operator: 'equals', value: 7 }
        ],
        template: 'certificate_expiry',
        channels: ['email', 'whatsapp', 'sms'],
        priority: 'high',
        enabled: true,
        recipients: { type: 'user' }
      },
      {
        id: 'proposal_deadline_24h',
        name: 'Prazo de Proposta - 24h',
        event: 'proposal.deadline_approaching',
        conditions: [
          { field: 'hoursUntilDeadline', operator: 'equals', value: 24 }
        ],
        template: 'proposal_deadline',
        channels: ['email', 'whatsapp', 'push'],
        priority: 'high',
        enabled: true,
        recipients: { type: 'user' }
      },
      {
        id: 'proposal_deadline_2h',
        name: 'Prazo de Proposta - 2h URGENTE',
        event: 'proposal.deadline_approaching',
        conditions: [
          { field: 'hoursUntilDeadline', operator: 'equals', value: 2 }
        ],
        template: 'proposal_deadline',
        channels: ['whatsapp', 'sms', 'push'],
        priority: 'critical',
        enabled: true,
        recipients: { type: 'user' }
      }
    ]

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule)
    })
  }

  private startProcessing() {
    setInterval(async () => {
      if (!this.processing && this.queue.length > 0) {
        await this.processQueue()
      }
    }, 5000) // Processar a cada 5 segundos
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return

    this.processing = true

    try {
      // Ordenar por prioridade e data de agendamento
      this.queue.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        
        if (priorityDiff !== 0) return priorityDiff
        
        const aTime = a.scheduledFor?.getTime() || a.createdAt.getTime()
        const bTime = b.scheduledFor?.getTime() || b.createdAt.getTime()
        
        return aTime - bTime
      })

      // Processar até 10 notificações por vez
      const batch = this.queue.splice(0, 10)
      
      await Promise.allSettled(
        batch.map(notification => this.sendNotification(notification))
      )

    } finally {
      this.processing = false
    }
  }

  private async sendNotification(notification: Notification): Promise<void> {
    try {
      // Verificar se deve enviar agora
      if (notification.scheduledFor && notification.scheduledFor > new Date()) {
        this.queue.push(notification) // Reagendar
        return
      }

      // Verificar quiet hours se aplicável
      if (notification.userId && await this.isInQuietHours(notification.userId, notification.channel)) {
        // Reagendar para depois das quiet hours
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(8, 0, 0, 0)
        notification.scheduledFor = tomorrow
        this.queue.push(notification)
        return
      }

      const provider = this.providers.get(notification.channel)
      if (!provider) {
        throw new Error(`Provider not found for channel: ${notification.channel}`)
      }

      notification.status = 'sent'
      notification.sentAt = new Date()

      const result = await provider.send({
        to: notification.userId ? await this.getRecipientAddress(notification.userId, notification.channel) : '',
        subject: notification.title,
        content: notification.content,
        metadata: notification.metadata
      })

      if (result.success) {
        notification.status = 'delivered'
        notification.deliveredAt = new Date()
        notification.metadata.providerId = result.providerId
      } else {
        throw new Error(result.error || 'Unknown error')
      }

      // Salvar no banco
      await this.saveNotification(notification)
      
      this.emit('notification_sent', notification)

    } catch (error: any) {
      notification.status = 'failed'
      notification.failedAt = new Date()
      notification.errorMessage = error.message
      notification.retryCount++

      // Tentar reenviar se não excedeu o limite
      if (notification.retryCount < notification.maxRetries) {
        // Reagendar com delay exponencial
        notification.scheduledFor = new Date(Date.now() + Math.pow(2, notification.retryCount) * 60000)
        notification.status = 'pending'
        this.queue.push(notification)
      } else {
        await this.saveNotification(notification)
        this.emit('notification_failed', notification)
      }

      console.error(`Notification failed:`, error)
    }
  }

  // API Pública

  async triggerEvent(event: string, data: Record<string, any>, userId?: string): Promise<void> {
    const matchingRules = Array.from(this.rules.values()).filter(rule => 
      rule.event === event && rule.enabled && this.evaluateConditions(rule.conditions, data)
    )

    for (const rule of matchingRules) {
      await this.createNotificationsFromRule(rule, data, userId)
    }
  }

  private evaluateConditions(conditions: NotificationCondition[], data: Record<string, any>): boolean {
    if (conditions.length === 0) return true

    let result = true
    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i]
      const value = this.getNestedValue(data, condition.field)
      const conditionResult = this.evaluateCondition(condition, value)

      if (i === 0) {
        result = conditionResult
      } else {
        const prevCondition = conditions[i - 1]
        const logic = prevCondition.logic || 'AND'
        
        if (logic === 'AND') {
          result = result && conditionResult
        } else {
          result = result || conditionResult
        }
      }
    }

    return result
  }

  private evaluateCondition(condition: NotificationCondition, value: any): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value
      case 'not_equals':
        return value !== condition.value
      case 'contains':
        return String(value).includes(String(condition.value))
      case 'greater_than':
        return Number(value) > Number(condition.value)
      case 'less_than':
        return Number(value) < Number(condition.value)
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value)
      case 'exists':
        return value !== undefined && value !== null
      default:
        return false
    }
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((o, p) => o?.[p], obj)
  }

  private async createNotificationsFromRule(rule: NotificationRule, data: Record<string, any>, userId?: string): Promise<void> {
    const template = this.templates.get(rule.template)
    if (!template) return

    const recipients = await this.getRecipients(rule.recipients, userId)
    
    for (const recipientId of recipients) {
      const userPrefs = await this.getUserPreferences(recipientId)
      
      for (const channel of rule.channels) {
        if (!this.shouldSendToChannel(channel, template.category, userPrefs)) continue

        const channelTemplate = template.templates[channel]
        if (!channelTemplate) continue

        const content = this.renderTemplate(channelTemplate.content, data)
        const title = channelTemplate.subject ? this.renderTemplate(channelTemplate.subject, data) : template.name

        const notification: Notification = {
          id: this.generateId(),
          userId: recipientId,
          title,
          content,
          channel,
          priority: rule.priority,
          status: 'pending',
          templateId: template.id,
          eventId: rule.id,
          metadata: { ...data, ruleId: rule.id },
          scheduledFor: rule.delay ? new Date(Date.now() + rule.delay * 1000) : undefined,
          retryCount: 0,
          maxRetries: 3,
          createdAt: new Date()
        }

        this.queue.push(notification)
      }
    }
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match
    })
      .replace(/\{\{#if (\w+)\}\}(.*?)\{\{\/if\}\}/g, (match, key, content) => {
        return data[key] ? content : ''
      })
  }

  private async getRecipients(recipients: NotificationRule['recipients'], userId?: string): Promise<string[]> {
    switch (recipients.type) {
      case 'user':
        return userId ? [userId] : []
      case 'custom':
        return recipients.targets || []
      case 'role':
        return [] // Implementar busca por role
      case 'all':
        return [] // Implementar busca de todos os usuários
      default:
        return []
    }
  }

  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    let prefs = this.preferences.get(userId)
    
    if (!prefs) {
      // Buscar do banco ou criar padrão
      prefs = {
        userId,
        email: {
          enabled: true,
          opportunities: true,
          deadlines: true,
          certificates: true,
          legal_updates: true,
          system: true
        },
        whatsapp: {
          enabled: false,
          opportunities: true,
          critical_only: false
        },
        sms: {
          enabled: false,
          critical_only: true
        },
        push: {
          enabled: true,
          opportunities: true,
          deadlines: true
        },
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
          timezone: 'America/Sao_Paulo'
        }
      }
      
      this.preferences.set(userId, prefs)
    }
    
    return prefs
  }

  private shouldSendToChannel(channel: NotificationChannel, category: string, prefs: NotificationPreferences): boolean {
    switch (channel) {
      case 'email':
        return prefs.email.enabled && (prefs.email as any)[category] !== false
      case 'whatsapp':
        return prefs.whatsapp.enabled && (prefs.whatsapp.opportunities || category !== 'opportunities')
      case 'sms':
        return prefs.sms.enabled && (!prefs.sms.critical_only || category === 'critical')
      case 'push':
        return prefs.push.enabled && (prefs.push as any)[category] !== false
      default:
        return true
    }
  }

  private async isInQuietHours(userId: string, channel: NotificationChannel): Promise<boolean> {
    const prefs = await this.getUserPreferences(userId)
    
    if (!prefs.quietHours.enabled) return false
    if (channel === 'email' || channel === 'dashboard') return false // Email e dashboard não respeitam quiet hours
    
    const now = new Date()
    const startTime = this.parseTime(prefs.quietHours.start)
    const endTime = this.parseTime(prefs.quietHours.end)
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    
    if (startTime > endTime) { // Atravessa meia-noite
      return currentMinutes >= startTime || currentMinutes <= endTime
    } else {
      return currentMinutes >= startTime && currentMinutes <= endTime
    }
  }

  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  private async getRecipientAddress(userId: string, channel: NotificationChannel): Promise<string> {
    // Buscar endereço do usuário no banco
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, phone: true }
      })
      
      if (!user) return ''
      
      switch (channel) {
        case 'email':
          return user.email
        case 'whatsapp':
          return user.phone ? `whatsapp:${user.phone}` : ''
        case 'sms':
          return user.phone || ''
        default:
          return user.email
      }
    } catch (error) {
      console.error('Error getting recipient address:', error)
      return ''
    }
  }

  private async saveNotification(notification: Notification): Promise<void> {
    try {
      // Implementar salvamento no banco
      console.log(`Notification saved: ${notification.id} - ${notification.status}`)
    } catch (error) {
      console.error('Error saving notification:', error)
    }
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // APIs Públicas para configuração

  async updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    const currentPrefs = await this.getUserPreferences(userId)
    const updatedPrefs = { ...currentPrefs, ...preferences }
    this.preferences.set(userId, updatedPrefs)
    
    // Salvar no banco
    await this.saveUserPreferences(userId, updatedPrefs)
    
    this.emit('preferences_updated', { userId, preferences: updatedPrefs })
  }

  async createRule(rule: NotificationRule): Promise<void> {
    this.rules.set(rule.id, rule)
    this.emit('rule_created', rule)
  }

  async updateRule(ruleId: string, updates: Partial<NotificationRule>): Promise<void> {
    const rule = this.rules.get(ruleId)
    if (!rule) throw new Error('Rule not found')
    
    const updatedRule = { ...rule, ...updates }
    this.rules.set(ruleId, updatedRule)
    
    this.emit('rule_updated', updatedRule)
  }

  async getNotificationStats(userId?: string, startDate?: Date, endDate?: Date) {
    // Implementar estatísticas de notificações
    return {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      byChannel: {},
      byTemplate: {}
    }
  }

  private async saveUserPreferences(userId: string, preferences: NotificationPreferences): Promise<void> {
    // Implementar salvamento das preferências
    console.log(`Preferences saved for user: ${userId}`)
  }
}

// Interfaces para Providers

interface NotificationProvider {
  send(params: {
    to: string
    subject?: string
    content: string
    metadata?: Record<string, any>
  }): Promise<{ success: boolean; providerId?: string; error?: string }>
}

class EmailProvider implements NotificationProvider {
  constructor(private config: any) {}
  
  async send(params: any): Promise<{ success: boolean; providerId?: string; error?: string }> {
    // Implementar envio de email
    console.log('Email sent:', params.subject)
    return { success: true, providerId: `email_${Date.now()}` }
  }
}

class WhatsAppProvider implements NotificationProvider {
  constructor(private config: any) {}
  
  async send(params: any): Promise<{ success: boolean; providerId?: string; error?: string }> {
    // Implementar envio via WhatsApp Business API
    console.log('WhatsApp sent:', params.content.substring(0, 50))
    return { success: true, providerId: `whatsapp_${Date.now()}` }
  }
}

class SMSProvider implements NotificationProvider {
  constructor(private config: any) {}
  
  async send(params: any): Promise<{ success: boolean; providerId?: string; error?: string }> {
    // Implementar envio de SMS
    console.log('SMS sent:', params.content.substring(0, 50))
    return { success: true, providerId: `sms_${Date.now()}` }
  }
}

class TelegramProvider implements NotificationProvider {
  constructor(private config: any) {}
  
  async send(params: any): Promise<{ success: boolean; providerId?: string; error?: string }> {
    // Implementar envio via Telegram Bot
    console.log('Telegram sent:', params.content.substring(0, 50))
    return { success: true, providerId: `telegram_${Date.now()}` }
  }
}

class PushProvider implements NotificationProvider {
  constructor(private config: any) {}
  
  async send(params: any): Promise<{ success: boolean; providerId?: string; error?: string }> {
    // Implementar push notifications
    console.log('Push sent:', params.subject)
    return { success: true, providerId: `push_${Date.now()}` }
  }
}

// Singleton export
export const multiChannelNotifications = MultiChannelNotificationService.getInstance()

// Helper functions
export async function sendOpportunityAlert(opportunityData: any, userId: string) {
  await multiChannelNotifications.triggerEvent('opportunity.created', opportunityData, userId)
}

export async function sendCertificateAlert(certificateData: any, userId: string) {
  await multiChannelNotifications.triggerEvent('certificate.expiring', certificateData, userId)
}

export async function sendDeadlineAlert(proposalData: any, userId: string) {
  await multiChannelNotifications.triggerEvent('proposal.deadline_approaching', proposalData, userId)
}

export async function sendLegalUpdate(updateData: any, userIds?: string[]) {
  if (userIds) {
    for (const userId of userIds) {
      await multiChannelNotifications.triggerEvent('legal.update', updateData, userId)
    }
  } else {
    await multiChannelNotifications.triggerEvent('legal.update', updateData)
  }
}