import { db } from '@/lib/db'
import { EventEmitter } from 'events'

export interface NotificationData {
  id: string
  userId: string
  companyId?: string
  type: NotificationType
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  channels: NotificationChannel[]
  metadata?: Record<string, any>
  scheduledFor?: Date
  sentAt?: Date
  readAt?: Date
  actionUrl?: string
  actionText?: string
  createdAt: Date
  status: 'pending' | 'sent' | 'failed' | 'read'
}

export type NotificationChannel = 'email' | 'whatsapp' | 'telegram' | 'push' | 'sms'

export type NotificationType = 'opportunity' | 'certificate' | 'proposal' | 'payment' | 'system' | 'ai_analysis'

export interface NotificationTemplate {
  id: string
  name: string
  type: NotificationType
  channels: NotificationChannel[]
  template: {
    title: string
    message: string
    actionText?: string
  }
  variables: string[]
  enabled: boolean
}

export interface NotificationSettings {
  userId: string
  emailEnabled: boolean
  whatsappEnabled: boolean
  telegramEnabled: boolean
  pushEnabled: boolean
  smsEnabled: boolean
  quietHours: {
    start: string
    end: string
  }
  preferences: {
    opportunities: boolean
    certificates: boolean
    proposals: boolean
    payments: boolean
    system: boolean
    aiAnalysis: boolean
  }
}

interface NotificationSettingsCreateData {
  userId: string
  emailEnabled?: boolean
  whatsappEnabled?: boolean
  telegramEnabled?: boolean
  pushEnabled?: boolean
  smsEnabled?: boolean
  quietHours?: {
    start: string
    end: string
  }
  preferences?: {
    opportunities: boolean
    certificates: boolean
    proposals: boolean
    payments: boolean
    system: boolean
    aiAnalysis: boolean
  }
}

export class NotificationService extends EventEmitter {
  private static instance: NotificationService
  private queue: NotificationData[] = []
  private isProcessing: boolean = false
  private templates: Map<string, NotificationTemplate> = new Map()

  private constructor() {
    super()
    this.initializeTemplates()
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  private initializeTemplates() {
    const templates: NotificationTemplate[] = [
      {
        id: 'certificate_expiring',
        name: 'Certificado Expirando',
        type: 'certificate',
        channels: ['email', 'whatsapp', 'push'],
        template: {
          title: 'Certificado {{certificateName}} expirando',
          message: 'Seu certificado {{certificateName}} expira em {{daysToExpire}} dias. Renove agora para evitar interrupções.',
          actionText: 'Renovar Certificado'
        },
        variables: ['certificateName', 'daysToExpire', 'expirationDate'],
        enabled: true
      },
      {
        id: 'proposal_deadline',
        name: 'Prazo de Proposta',
        type: 'proposal',
        channels: ['email', 'whatsapp', 'push'],
        template: {
          title: 'Prazo próximo: {{opportunityTitle}}',
          message: 'A proposta para {{opportunityTitle}} deve ser enviada em {{daysToDeadline}} dias.',
          actionText: 'Ver Proposta'
        },
        variables: ['opportunityTitle', 'daysToDeadline', 'deadline'],
        enabled: true
      },
      {
        id: 'new_opportunity',
        name: 'Nova Oportunidade',
        type: 'opportunity',
        channels: ['email', 'push'],
        template: {
          title: 'Nova oportunidade: {{opportunityTitle}}',
          message: 'Encontramos uma nova oportunidade relevante para sua empresa: {{opportunityTitle}} no valor de {{value}}.',
          actionText: 'Ver Oportunidade'
        },
        variables: ['opportunityTitle', 'value', 'organ', 'deadline'],
        enabled: true
      },
      {
        id: 'payment_success',
        name: 'Pagamento Confirmado',
        type: 'payment',
        channels: ['email', 'whatsapp'],
        template: {
          title: 'Pagamento confirmado',
          message: 'Seu pagamento de {{amount}} foi confirmado. Plano {{planName}} ativo até {{nextBilling}}.',
          actionText: 'Ver Fatura'
        },
        variables: ['amount', 'planName', 'nextBilling'],
        enabled: true
      },
      {
        id: 'ai_analysis_complete',
        name: 'Análise de IA Concluída',
        type: 'ai_analysis',
        channels: ['email', 'push'],
        template: {
          title: 'Análise de IA concluída',
          message: 'A análise do edital {{editalTitle}} foi concluída. Taxa de sucesso estimada: {{successRate}}%.',
          actionText: 'Ver Análise'
        },
        variables: ['editalTitle', 'successRate', 'riskLevel'],
        enabled: true
      },
      {
        id: 'system_maintenance',
        name: 'Manutenção do Sistema',
        type: 'system',
        channels: ['email', 'push'],
        template: {
          title: 'Manutenção programada',
          message: 'O sistema será atualizado em {{maintenanceDate}}. Duração estimada: {{duration}}.',
          actionText: 'Saiba Mais'
        },
        variables: ['maintenanceDate', 'duration'],
        enabled: true
      }
    ]

    templates.forEach(template => {
      this.templates.set(template.id, template)
    })
  }

  async sendNotification(data: Omit<NotificationData, 'id' | 'createdAt' | 'status'>) {
    const notification: NotificationData = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      status: 'pending',
      ...data
    }

    // Verificar configurações do usuário
    const userSettings = await this.getUserSettings(data.userId)
    if (!userSettings) {
      console.log(`Usuário ${data.userId} não tem configurações de notificação`)
      return
    }

    // Filtrar canais baseado nas preferências
    const enabledChannels = this.filterChannelsBySettings(data.channels, userSettings)
    if (enabledChannels.length === 0) {
      console.log(`Nenhum canal ativo para usuário ${data.userId}`)
      return
    }

    notification.channels = enabledChannels

    // Verificar horário de silêncio
    if (this.isQuietHour(userSettings.quietHours)) {
      notification.scheduledFor = this.getNextActiveHour(userSettings.quietHours)
    }

    // Adicionar à fila
    this.queue.push(notification)

    // Salvar no banco
    try {
      await db.notification.create({
        data: {
          id: notification.id,
          userId: notification.userId,
          companyId: notification.companyId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          channels: notification.channels,
          metadata: notification.metadata,
          scheduledFor: notification.scheduledFor,
          actionUrl: notification.actionUrl,
          actionText: notification.actionText,
          status: notification.status
        }
      })
    } catch (error) {
      console.error('Erro ao salvar notificação:', error)
    }

    // Processar fila
    this.processQueue()

    console.log(`📱 Notificação criada: ${notification.title}`)
    this.emit('notificationCreated', notification)
  }

  async sendFromTemplate(
    templateId: string,
    userId: string,
    variables: Record<string, any>,
    options: {
      companyId?: string
      priority?: 'low' | 'medium' | 'high' | 'urgent'
      scheduledFor?: Date
      actionUrl?: string
    } = {}
  ) {
    const template = this.templates.get(templateId)
    if (!template || !template.enabled) {
      console.error(`Template ${templateId} não encontrado ou desabilitado`)
      return
    }

    // Substituir variáveis no template
    const title = this.replaceVariables(template.template.title, variables)
    const message = this.replaceVariables(template.template.message, variables)
    const actionText = template.template.actionText ? 
      this.replaceVariables(template.template.actionText, variables) : undefined

    await this.sendNotification({
      userId,
      companyId: options.companyId,
      type: template.type,
      title,
      message,
      priority: options.priority || 'medium',
      channels: template.channels,
      metadata: { templateId, variables },
      scheduledFor: options.scheduledFor,
      actionUrl: options.actionUrl,
      actionText
    })
  }

  private replaceVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match
    })
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return

    this.isProcessing = true

    while (this.queue.length > 0) {
      const notification = this.queue.shift()!
      
      // Verificar se deve ser enviada agora
      if (notification.scheduledFor && notification.scheduledFor > new Date()) {
        // Reagendar para mais tarde
        setTimeout(() => {
          this.queue.unshift(notification)
          this.processQueue()
        }, notification.scheduledFor.getTime() - Date.now())
        continue
      }

      await this.deliverNotification(notification)
    }

    this.isProcessing = false
  }

  private async deliverNotification(notification: NotificationData) {
    const results: Partial<Record<NotificationChannel, boolean>> = {}

    for (const channel of notification.channels) {
      try {
        const success = await this.sendToChannel(channel, notification)
        results[channel] = success
      } catch (error) {
        console.error(`Erro ao enviar por ${channel}:`, error)
        results[channel] = false
      }
    }

    // Atualizar status
    const allFailed = Object.values(results).every(success => !success)
    const newStatus = allFailed ? 'failed' : 'sent'

    try {
      await db.notification.update({
        where: { id: notification.id },
        data: {
          status: newStatus,
          sentAt: new Date(),
          metadata: {
            ...notification.metadata,
            deliveryResults: results
          }
        }
      })
    } catch (error) {
      console.error('Erro ao atualizar status da notificação:', error)
    }

    notification.status = newStatus
    notification.sentAt = new Date()

    this.emit('notificationSent', notification)
    console.log(`✅ Notificação enviada: ${notification.title} (${newStatus})`)
  }

  private async sendToChannel(channel: NotificationChannel, notification: NotificationData): Promise<boolean> {
    switch (channel) {
      case 'email':
        return this.sendEmail(notification)
      case 'whatsapp':
        return this.sendWhatsApp(notification)
      case 'telegram':
        return this.sendTelegram(notification)
      case 'push':
        return this.sendPush(notification)
      case 'sms':
        return this.sendSMS(notification)
      default:
        return false
    }
  }

  private async sendEmail(notification: NotificationData): Promise<boolean> {
    try {
      // Implementar envio de email
      console.log(`📧 Enviando email: ${notification.title}`)
      
      // Simular envio
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      return true
    } catch (error) {
      console.error('Erro ao enviar email:', error)
      return false
    }
  }

  private async sendWhatsApp(notification: NotificationData): Promise<boolean> {
    try {
      // Implementar envio via WhatsApp API
      console.log(`📱 Enviando WhatsApp: ${notification.title}`)
      
      // Simular envio
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      return true
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error)
      return false
    }
  }

  private async sendTelegram(notification: NotificationData): Promise<boolean> {
    try {
      // Implementar envio via Telegram Bot API
      console.log(`🤖 Enviando Telegram: ${notification.title}`)
      
      // Simular envio
      await new Promise(resolve => setTimeout(resolve, 800))
      
      return true
    } catch (error) {
      console.error('Erro ao enviar Telegram:', error)
      return false
    }
  }

  private async sendPush(notification: NotificationData): Promise<boolean> {
    try {
      // Implementar push notifications
      console.log(`🔔 Enviando push: ${notification.title}`)
      
      // Simular envio
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return true
    } catch (error) {
      console.error('Erro ao enviar push:', error)
      return false
    }
  }

  private async sendSMS(notification: NotificationData): Promise<boolean> {
    try {
      // Implementar envio de SMS
      console.log(`📱 Enviando SMS: ${notification.title}`)
      
      // Simular envio
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      return true
    } catch (error) {
      console.error('Erro ao enviar SMS:', error)
      return false
    }
  }

  private async getUserSettings(userId: string): Promise<NotificationSettings | null> {
    try {
      const settings = await db.notificationSettings.findUnique({
        where: { userId }
      })

      if (!settings) {
        // Criar configurações padrão
        return await this.createDefaultSettings(userId)
      }

      return settings as NotificationSettings
    } catch (error) {
      console.error('Erro ao buscar configurações:', error)
      return null
    }
  }

  private async createDefaultSettings(userId: string): Promise<NotificationSettings> {
    const defaultSettings: NotificationSettings = {
      userId,
      emailEnabled: true,
      whatsappEnabled: false,
      telegramEnabled: false,
      pushEnabled: true,
      smsEnabled: false,
      quietHours: {
        start: '22:00',
        end: '08:00'
      },
      preferences: {
        opportunities: true,
        certificates: true,
        proposals: true,
        payments: true,
        system: true,
        aiAnalysis: true
      }
    }

    try {
      await db.notificationSettings.create({
        data: defaultSettings
      })
    } catch (error) {
      console.error('Erro ao criar configurações padrão:', error)
    }

    return defaultSettings
  }

  private filterChannelsBySettings(channels: NotificationChannel[], settings: NotificationSettings): NotificationChannel[] {
    return channels.filter(channel => {
      switch (channel) {
        case 'email': return settings.emailEnabled
        case 'whatsapp': return settings.whatsappEnabled
        case 'telegram': return settings.telegramEnabled
        case 'push': return settings.pushEnabled
        case 'sms': return settings.smsEnabled
        default: return false
      }
    })
  }

  private isQuietHour(quietHours: { start: string; end: string }): boolean {
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    const startTime = this.parseTime(quietHours.start)
    const endTime = this.parseTime(quietHours.end)

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime
    } else {
      return currentTime >= startTime || currentTime < endTime
    }
  }

  private parseTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  private getNextActiveHour(quietHours: { start: string; end: string }): Date {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const [hours, minutes] = quietHours.end.split(':').map(Number)
    tomorrow.setHours(hours, minutes, 0, 0)
    
    return tomorrow
  }

  async markAsRead(notificationId: string, userId: string) {
    try {
      await db.notification.update({
        where: { 
          id: notificationId,
          userId: userId 
        },
        data: {
          readAt: new Date()
        }
      })

      this.emit('notificationRead', { notificationId, userId })
    } catch (error) {
      console.error('Erro ao marcar como lida:', error)
    }
  }

  async getUserNotifications(userId: string, limit: number = 20): Promise<NotificationData[]> {
    try {
      const notifications = await db.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit
      })

      return notifications as NotificationData[]
    } catch (error) {
      console.error('Erro ao buscar notificações:', error)
      return []
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await db.notification.count({
        where: {
          userId,
          readAt: null
        }
      })
    } catch (error) {
      console.error('Erro ao contar não lidas:', error)
      return 0
    }
  }

  async updateUserSettings(userId: string, settings: Partial<NotificationSettings>) {
    try {
      await db.notificationSettings.upsert({
        where: { userId },
        update: settings,
        create: {
          userId,
          ...settings
        } as NotificationSettingsCreateData
      })

      this.emit('settingsUpdated', { userId, settings })
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error)
    }
  }

  getTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values())
  }

  updateTemplate(templateId: string, updates: Partial<NotificationTemplate>) {
    const template = this.templates.get(templateId)
    if (template) {
      this.templates.set(templateId, { ...template, ...updates })
      this.emit('templateUpdated', { templateId, updates })
    }
  }

  async scheduleRecurringNotifications() {
    // Verificar certificados expirando
    const expiringCertificates = await db.certificate.findMany({
      where: {
        expiresAt: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        status: 'ACTIVE'
      },
      include: {
        company: {
          include: {
            user: true
          }
        }
      }
    })

    for (const cert of expiringCertificates) {
      const daysToExpire = Math.ceil((cert.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      
      if ([30, 15, 7, 3, 1].includes(daysToExpire)) {
        await this.sendFromTemplate('certificate_expiring', cert.company.userId, {
          certificateName: cert.name,
          daysToExpire,
          expirationDate: cert.expiresAt.toLocaleDateString('pt-BR')
        }, {
          companyId: cert.companyId,
          priority: daysToExpire <= 3 ? 'urgent' : daysToExpire <= 7 ? 'high' : 'medium',
          actionUrl: '/dashboard/certificates'
        })
      }
    }

    // Verificar prazos de propostas
    const urgentProposals = await db.proposal.findMany({
      where: {
        deadline: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        },
        status: 'DRAFT'
      },
      include: {
        opportunity: {
          include: {
            company: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })

    for (const proposal of urgentProposals) {
      const daysToDeadline = Math.ceil((proposal.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      
      if ([7, 3, 1].includes(daysToDeadline)) {
        await this.sendFromTemplate('proposal_deadline', proposal.opportunity.company.userId, {
          opportunityTitle: proposal.opportunity.title,
          daysToDeadline,
          deadline: proposal.deadline.toLocaleDateString('pt-BR')
        }, {
          companyId: proposal.opportunity.companyId,
          priority: daysToDeadline <= 1 ? 'urgent' : 'high',
          actionUrl: `/dashboard/proposals/${proposal.id}`
        })
      }
    }
  }

  async startScheduler() {
    // Verificar notificações recorrentes a cada hora
    setInterval(() => {
      this.scheduleRecurringNotifications()
    }, 60 * 60 * 1000)

    // Executar imediatamente
    this.scheduleRecurringNotifications()
    
    console.log('🔔 Scheduler de notificações iniciado')
  }
}

// Funções auxiliares
export async function initializeNotifications() {
  const service = NotificationService.getInstance()
  await service.startScheduler()
  return service
}

export function getNotificationService() {
  return NotificationService.getInstance()
}