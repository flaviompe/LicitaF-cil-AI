import { db } from '@/lib/db'
import { EventEmitter } from 'events'

export interface MonitoringEvent {
  id: string
  type: 'opportunity' | 'certificate' | 'proposal' | 'payment' | 'system'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  userId: string
  companyId?: string
  metadata?: Record<string, any>
  timestamp: Date
  resolved: boolean
}

export interface SystemMetrics {
  activeUsers: number
  totalOpportunities: number
  certificateExpirations: number
  proposalDeadlines: number
  systemUptime: number
  apiResponseTime: number
  errorRate: number
}

export class MonitoringService extends EventEmitter {
  private static instance: MonitoringService
  private metrics: SystemMetrics
  private alerts: MonitoringEvent[]
  private isMonitoring: boolean = false

  private constructor() {
    super()
    this.metrics = {
      activeUsers: 0,
      totalOpportunities: 0,
      certificateExpirations: 0,
      proposalDeadlines: 0,
      systemUptime: 0,
      apiResponseTime: 0,
      errorRate: 0
    }
    this.alerts = []
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService()
    }
    return MonitoringService.instance
  }

  async startMonitoring() {
    if (this.isMonitoring) return

    this.isMonitoring = true
    console.log('🔍 Monitoramento em tempo real iniciado')

    // Monitorar métricas a cada minuto
    const metricsInterval = setInterval(async () => {
      await this.updateMetrics()
    }, 60000)

    // Verificar alertas a cada 30 segundos
    const alertsInterval = setInterval(async () => {
      await this.checkAlerts()
    }, 30000)

    // Verificar certificados expirados a cada hora
    const certificatesInterval = setInterval(async () => {
      await this.checkCertificateExpirations()
    }, 3600000)

    // Verificar prazos de propostas a cada 15 minutos
    const proposalsInterval = setInterval(async () => {
      await this.checkProposalDeadlines()
    }, 900000)

    // Limpar intervalos quando necessário
    process.on('SIGINT', () => {
      clearInterval(metricsInterval)
      clearInterval(alertsInterval)
      clearInterval(certificatesInterval)
      clearInterval(proposalsInterval)
      this.isMonitoring = false
    })
  }

  async updateMetrics() {
    try {
      // Usuários ativos nas últimas 24 horas
      const activeUsers = await db.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })

      // Total de oportunidades abertas
      const totalOpportunities = await db.opportunity.count({
        where: {
          status: 'OPEN'
        }
      })

      // Certificados expirando em 30 dias
      const certificateExpirations = await db.certificate.count({
        where: {
          expiresAt: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          },
          status: 'ACTIVE'
        }
      })

      // Propostas com prazo em 7 dias
      const proposalDeadlines = await db.proposal.count({
        where: {
          deadline: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          },
          status: 'DRAFT'
        }
      })

      this.metrics = {
        activeUsers,
        totalOpportunities,
        certificateExpirations,
        proposalDeadlines,
        systemUptime: process.uptime(),
        apiResponseTime: Math.random() * 100 + 50, // Simulado
        errorRate: Math.random() * 0.1 // Simulado
      }

      // Emitir evento de atualização de métricas
      this.emit('metricsUpdated', this.metrics)

    } catch (error) {
      console.error('Erro ao atualizar métricas:', error)
      this.createAlert({
        type: 'system',
        title: 'Erro no Monitoramento',
        description: 'Falha ao atualizar métricas do sistema',
        severity: 'high',
        userId: 'system'
      })
    }
  }

  async checkAlerts() {
    // Verificar métricas críticas
    if (this.metrics.errorRate > 0.05) {
      this.createAlert({
        type: 'system',
        title: 'Alta Taxa de Erro',
        description: `Taxa de erro atual: ${(this.metrics.errorRate * 100).toFixed(2)}%`,
        severity: 'critical',
        userId: 'system'
      })
    }

    if (this.metrics.apiResponseTime > 2000) {
      this.createAlert({
        type: 'system',
        title: 'API Lenta',
        description: `Tempo de resposta: ${this.metrics.apiResponseTime.toFixed(0)}ms`,
        severity: 'high',
        userId: 'system'
      })
    }

    // Verificar certificados críticos
    if (this.metrics.certificateExpirations > 0) {
      this.createAlert({
        type: 'certificate',
        title: 'Certificados Expirando',
        description: `${this.metrics.certificateExpirations} certificados expirando em 30 dias`,
        severity: 'medium',
        userId: 'system'
      })
    }

    // Verificar propostas urgentes
    if (this.metrics.proposalDeadlines > 0) {
      this.createAlert({
        type: 'proposal',
        title: 'Propostas Urgentes',
        description: `${this.metrics.proposalDeadlines} propostas com prazo em 7 dias`,
        severity: 'high',
        userId: 'system'
      })
    }
  }

  async checkCertificateExpirations() {
    try {
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
        
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
        if (daysToExpire <= 7) severity = 'critical'
        else if (daysToExpire <= 15) severity = 'high'
        else if (daysToExpire <= 30) severity = 'medium'

        this.createAlert({
          type: 'certificate',
          title: `Certificado Expirando - ${cert.name}`,
          description: `Certificado expira em ${daysToExpire} dias`,
          severity,
          userId: cert.company.userId,
          companyId: cert.companyId,
          metadata: {
            certificateId: cert.id,
            expirationDate: cert.expiresAt,
            daysToExpire
          }
        })
      }
    } catch (error) {
      console.error('Erro ao verificar certificados:', error)
    }
  }

  async checkProposalDeadlines() {
    try {
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
        
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
        if (daysToDeadline <= 1) severity = 'critical'
        else if (daysToDeadline <= 3) severity = 'high'
        else if (daysToDeadline <= 7) severity = 'medium'

        this.createAlert({
          type: 'proposal',
          title: `Prazo Próximo - ${proposal.opportunity.title}`,
          description: `Proposta deve ser enviada em ${daysToDeadline} dias`,
          severity,
          userId: proposal.opportunity.company.userId,
          companyId: proposal.opportunity.companyId,
          metadata: {
            proposalId: proposal.id,
            opportunityId: proposal.opportunityId,
            deadline: proposal.deadline,
            daysToDeadline
          }
        })
      }
    } catch (error) {
      console.error('Erro ao verificar prazos de propostas:', error)
    }
  }

  async createAlert(alertData: Omit<MonitoringEvent, 'id' | 'timestamp' | 'resolved'>) {
    const alert: MonitoringEvent = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      resolved: false,
      ...alertData
    }

    this.alerts.unshift(alert)
    
    // Manter apenas os últimos 100 alertas
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100)
    }

    // Salvar no banco de dados
    try {
      await db.monitoringEvent.create({
        data: {
          id: alert.id,
          type: alert.type,
          title: alert.title,
          description: alert.description,
          severity: alert.severity,
          userId: alert.userId,
          companyId: alert.companyId,
          metadata: alert.metadata,
          resolved: alert.resolved
        }
      })
    } catch (error) {
      console.error('Erro ao salvar alerta:', error)
    }

    // Emitir evento de novo alerta
    this.emit('newAlert', alert)

    console.log(`🚨 Novo alerta: ${alert.title} (${alert.severity})`)
  }

  async resolveAlert(alertId: string) {
    const alertIndex = this.alerts.findIndex(a => a.id === alertId)
    if (alertIndex !== -1) {
      this.alerts[alertIndex].resolved = true
      
      // Atualizar no banco
      try {
        await db.monitoringEvent.update({
          where: { id: alertId },
          data: { resolved: true }
        })
      } catch (error) {
        console.error('Erro ao resolver alerta:', error)
      }

      this.emit('alertResolved', this.alerts[alertIndex])
    }
  }

  getMetrics(): SystemMetrics {
    return this.metrics
  }

  getAlerts(limit: number = 10): MonitoringEvent[] {
    return this.alerts.slice(0, limit)
  }

  getUserAlerts(userId: string, limit: number = 10): MonitoringEvent[] {
    return this.alerts
      .filter(alert => alert.userId === userId)
      .slice(0, limit)
  }

  async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical'
    uptime: number
    metrics: SystemMetrics
    activeAlerts: number
    criticalAlerts: number
  }> {
    const criticalAlerts = this.alerts.filter(a => a.severity === 'critical' && !a.resolved).length
    const activeAlerts = this.alerts.filter(a => !a.resolved).length

    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (criticalAlerts > 0) status = 'critical'
    else if (activeAlerts > 5 || this.metrics.errorRate > 0.02) status = 'warning'

    return {
      status,
      uptime: this.metrics.systemUptime,
      metrics: this.metrics,
      activeAlerts,
      criticalAlerts
    }
  }

  async generateReport(period: 'daily' | 'weekly' | 'monthly') {
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
    }

    const periodAlerts = await db.monitoringEvent.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const alertsByType = periodAlerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const alertsBySeverity = periodAlerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      period,
      startDate,
      endDate: now,
      totalAlerts: periodAlerts.length,
      resolvedAlerts: periodAlerts.filter(a => a.resolved).length,
      alertsByType,
      alertsBySeverity,
      currentMetrics: this.metrics
    }
  }
}

// Funções auxiliares para inicializar o monitoramento
export async function initializeMonitoring() {
  const monitoring = MonitoringService.getInstance()
  await monitoring.startMonitoring()
  return monitoring
}

export function getMonitoringInstance() {
  return MonitoringService.getInstance()
}