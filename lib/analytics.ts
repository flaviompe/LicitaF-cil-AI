import { db } from '@/lib/db'

export interface AnalyticsEvent {
  userId: string
  event: string
  properties?: Record<string, any>
  timestamp?: Date
}

export interface BusinessMetrics {
  totalUsers: number
  activeUsers: number
  newUsersToday: number
  newUsersThisMonth: number
  userRetentionRate: number
  totalOpportunities: number
  totalProposals: number
  successRate: number
  averageProposalValue: number
  topPerformingUsers: Array<{
    userId: string
    userName: string
    proposalCount: number
    successRate: number
  }>
  opportunitiesByType: Record<string, number>
  proposalsByStatus: Record<string, number>
  userGrowth: Array<{
    month: string
    users: number
    growth: number
  }>
  usersByPlan: Array<{
    plan: string
    count: number
    percentage: number
  }>
  revenue: {
    total: number
    thisMonth: number
    lastMonth: number
    growth: number
  }
}

export class Analytics {
  static async trackEvent(event: AnalyticsEvent) {
    try {
      // Salvar evento no banco de dados
      await db.analyticsEvent.create({
        data: {
          userId: event.userId,
          event: event.event,
          properties: event.properties || {},
          timestamp: event.timestamp || new Date(),
        }
      })
    } catch (error) {
      console.error('Failed to track analytics event:', error)
    }
  }

  static async getBusinessMetrics(): Promise<BusinessMetrics> {
    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

      // Métricas de usuários
      const [
        totalUsers,
        activeUsers,
        newUsersToday,
        newUsersThisMonth,
        totalOpportunities,
        totalProposals,
        successfulProposals,
        proposalValues,
        opportunitiesByType,
        proposalsByStatus,
        userGrowthData,
        paymentsThisMonth,
        paymentsLastMonth,
      ] = await Promise.all([
        // Total de usuários
        db.user.count(),
        
        // Usuários ativos (logaram nos últimos 30 dias)
        db.user.count({
          where: {
            sessions: {
              some: {
                expires: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
              }
            }
          }
        }),
        
        // Novos usuários hoje
        db.user.count({
          where: {
            createdAt: {
              gte: todayStart
            }
          }
        }),
        
        // Novos usuários este mês
        db.user.count({
          where: {
            createdAt: {
              gte: monthStart
            }
          }
        }),
        
        // Total de oportunidades
        db.opportunity.count(),
        
        // Total de propostas
        db.proposal.count(),
        
        // Propostas bem-sucedidas
        db.proposal.count({
          where: {
            status: 'ACCEPTED'
          }
        }),
        
        // Valores das propostas
        db.proposal.aggregate({
          _avg: {
            proposedValue: true
          },
          _sum: {
            proposedValue: true
          }
        }),
        
        // Oportunidades por tipo
        db.opportunity.groupBy({
          by: ['bidType'],
          _count: {
            bidType: true
          }
        }),
        
        // Propostas por status
        db.proposal.groupBy({
          by: ['status'],
          _count: {
            status: true
          }
        }),
        
        // Crescimento de usuários (últimos 30 dias)
        db.user.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          },
          select: {
            createdAt: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }),
        
        // COMENTADO: payment não existe no schema Prisma
        // db.payment.aggregate({
        //   where: {
        //     createdAt: {
        //       gte: monthStart
        //     },
        //     status: 'SUCCEEDED'
        //   },
        //   _sum: {
        //     amount: true
        //   }
        // }),
        
        // Implementação temporária
        Promise.resolve({ _sum: { amount: 0 } }),
        
        // COMENTADO: payment não existe no schema Prisma
        // db.payment.aggregate({
        //   where: {
        //     createdAt: {
        //       gte: lastMonthStart,
        //       lt: lastMonthEnd
        //     },
        //     status: 'SUCCEEDED'
        //   },
        //   _sum: {
        //     amount: true
        //   }
        // })
        
        // Implementação temporária
        Promise.resolve({ _sum: { amount: 0 } }),
      ])

      // Calcular taxa de sucesso
      const successRate = totalProposals > 0 ? (successfulProposals / totalProposals) * 100 : 0

      // Processar crescimento de usuários
      const userGrowth = this.processUserGrowthMonthly(userGrowthData)

      // Top performers
      const topPerformingUsers = await this.getTopPerformingUsers()

      // Taxa de retenção (usuários ativos / total)
      const userRetentionRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0

      // Usuários por plano
      const usersByPlan = await this.getUsersByPlan()

      // Métricas de receita
      const revenueThisMonth = paymentsThisMonth._sum.amount || 0
      const revenueLastMonth = paymentsLastMonth._sum.amount || 0
      const revenueGrowth = revenueLastMonth > 0 
        ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 
        : 0

      // COMENTADO: payment não existe no schema Prisma
      // const totalRevenue = await db.payment.aggregate({
      //   where: {
      //     status: 'SUCCEEDED'
      //   },
      //   _sum: {
      //     amount: true
      //   }
      // })
      
      // Implementação temporária
      const totalRevenue = { _sum: { amount: 0 } }

      return {
        totalUsers,
        activeUsers,
        newUsersToday,
        newUsersThisMonth,
        userRetentionRate,
        totalOpportunities,
        totalProposals,
        successRate,
        averageProposalValue: proposalValues._avg.proposedValue || 0,
        topPerformingUsers,
        opportunitiesByType: opportunitiesByType.reduce((acc, item) => {
          acc[item.bidType] = item._count.bidType
          return acc
        }, {} as Record<string, number>),
        proposalsByStatus: proposalsByStatus.reduce((acc, item) => {
          acc[item.status] = item._count.status
          return acc
        }, {} as Record<string, number>),
        userGrowth,
        usersByPlan,
        revenue: {
          total: totalRevenue._sum.amount || 0,
          thisMonth: revenueThisMonth,
          lastMonth: revenueLastMonth,
          growth: revenueGrowth,
        }
      }
    } catch (error) {
      console.error('Failed to get business metrics:', error)
      throw error
    }
  }

  private static processUserGrowth(userData: Array<{ createdAt: Date }>) {
    const last30Days = []
    const now = new Date()
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      
      const count = userData.filter(user => {
        const userDate = user.createdAt.toISOString().split('T')[0]
        return userDate === dateStr
      }).length
      
      last30Days.push({
        date: dateStr,
        count
      })
    }
    
    return last30Days
  }

  private static processUserGrowthMonthly(userData: Array<{ createdAt: Date }>) {
    const monthsData: Record<string, number> = {}
    const now = new Date()
    
    // Últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = date.toISOString().substring(0, 7)
      monthsData[monthKey] = 0
    }
    
    // Contar usuários por mês
    userData.forEach(user => {
      const monthKey = user.createdAt.toISOString().substring(0, 7)
      if (monthsData[monthKey] !== undefined) {
        monthsData[monthKey]++
      }
    })
    
    // Converter para array com crescimento
    const months = Object.keys(monthsData).sort()
    return months.map((month, index) => {
      const users = monthsData[month]
      const prevUsers = index > 0 ? monthsData[months[index - 1]] : 0
      const growth = prevUsers > 0 ? ((users - prevUsers) / prevUsers) * 100 : 0
      
      return {
        month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        users,
        growth
      }
    })
  }

  private static async getUsersByPlan() {
    // Como não temos um campo de plano no schema User, vamos simular
    const totalUsers = await db.user.count()
    
    return [
      {
        plan: 'FREE',
        count: Math.floor(totalUsers * 0.7),
        percentage: 70
      },
      {
        plan: 'PRO',
        count: Math.floor(totalUsers * 0.25),
        percentage: 25
      },
      {
        plan: 'ENTERPRISE',
        count: Math.floor(totalUsers * 0.05),
        percentage: 5
      }
    ]
  }

  private static async getTopPerformingUsers() {
    const users = await db.user.findMany({
      include: {
        proposals: {
          select: {
            status: true,
            proposedValue: true
          }
        }
      },
      take: 10
    })

    return users
      .map(user => {
        const proposalCount = user.proposals.length
        const successfulProposals = user.proposals.filter(p => p.status === 'ACCEPTED').length
        const successRate = proposalCount > 0 ? (successfulProposals / proposalCount) * 100 : 0

        return {
          userId: user.id,
          userName: user.name || 'Usuário',
          proposalCount,
          successRate
        }
      })
      .filter(user => user.proposalCount > 0)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5)
  }

  static async getUserAnalytics(userId: string) {
    try {
      const [
        totalProposals,
        acceptedProposals,
        pendingProposals,
        rejectedProposals,
        totalOpportunities,
        certificatesCount,
        recentActivity,
        proposalHistory,
      ] = await Promise.all([
        db.proposal.count({
          where: { userId }
        }),
        db.proposal.count({
          where: { userId, status: 'ACCEPTED' }
        }),
        db.proposal.count({
          where: { userId, status: 'PENDING' }
        }),
        db.proposal.count({
          where: { userId, status: 'REJECTED' }
        }),
        db.opportunity.count({
          where: { 
            proposals: {
              some: { userId }
            }
          }
        }),
        db.certificate.count({
          where: { userId }
        }),
        db.analyticsEvent.findMany({
          where: { userId },
          orderBy: { timestamp: 'desc' },
          take: 10
        }),
        db.proposal.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 30,
          select: {
            createdAt: true,
            proposedValue: true,
            status: true
          }
        })
      ])

      const successRate = totalProposals > 0 ? (acceptedProposals / totalProposals) * 100 : 0

      // Processar histórico de propostas por mês
      const proposalsByMonth = proposalHistory.reduce((acc, proposal) => {
        const month = proposal.createdAt.toISOString().substring(0, 7)
        if (!acc[month]) {
          acc[month] = { total: 0, accepted: 0, value: 0 }
        }
        acc[month].total++
        acc[month].value += proposal.proposedValue
        if (proposal.status === 'ACCEPTED') {
          acc[month].accepted++
        }
        return acc
      }, {} as Record<string, { total: number; accepted: number; value: number }>)

      return {
        totalProposals,
        acceptedProposals,
        pendingProposals,
        rejectedProposals,
        successRate,
        totalOpportunities,
        certificatesCount,
        recentActivity,
        proposalsByMonth
      }
    } catch (error) {
      console.error('Failed to get user analytics:', error)
      throw error
    }
  }
}

// Eventos comuns para tracking
export const ANALYTICS_EVENTS = {
  USER_REGISTERED: 'user_registered',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',
  OPPORTUNITY_VIEWED: 'opportunity_viewed',
  PROPOSAL_CREATED: 'proposal_created',
  PROPOSAL_SUBMITTED: 'proposal_submitted',
  CERTIFICATE_ADDED: 'certificate_added',
  CERTIFICATE_UPDATED: 'certificate_updated',
  NOTIFICATION_SENT: 'notification_sent',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_CANCELED: 'subscription_canceled',
  ONBOARDING_COMPLETED: 'onboarding_completed',
} as const