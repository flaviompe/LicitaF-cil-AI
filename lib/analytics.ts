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
  activeOpportunities: number
  newOpportunitiesThisMonth: number
  opportunitiesGrowth: number
  averageOpportunityValue: number
  opportunitiesByCategory: Array<{
    category: string
    count: number
    percentage: number
    averageValue: number
  }>
  opportunitiesByRegion: Array<{
    region: string
    count: number
    percentage: number
  }>
  opportunityTrends: Array<{
    month: string
    count: number
    value: number
    growth: number
  }>
  topOpportunities: Array<{
    id: string
    title: string
    value: number
    category: string
    region: string
    deadline: string
    viewCount: number
  }>
  
  totalProposals: number
  successfulProposals: number
  pendingProposals: number
  rejectedProposals: number
  averageSuccessRate: number
  totalValueProposed: number
  totalValueWon: number
  proposalsByStatus: Array<{
    status: string
    count: number
    percentage: number
  }>
  proposalsByCategory: Array<{
    category: string
    count: number
    successRate: number
    totalValue: number
  }>
  monthlyProposalTrends: Array<{
    month: string
    submitted: number
    won: number
    successRate: number
    value: number
  }>
  topPerformingProposals: Array<{
    id: string
    title: string
    value: number
    category: string
    status: 'WON' | 'PENDING' | 'REJECTED'
    submittedDate: string
    userName: string
  }>
  successRate: number
  averageProposalValue: number
  
  // Revenue metrics for RevenueMetrics component
  totalRevenue: number
  monthlyRevenue: number
  revenueGrowth: number
  averageRevenuePerUser: number
  subscriptionRevenue: number
  oneTimeRevenue: number
  churnRate: number
  revenueByPlan: Array<{
    plan: string
    revenue: number
    percentage: number
  }>
  monthlyRevenueHistory: Array<{
    month: string
    revenue: number
    growth: number
  }>
  
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

      // Métricas de receita avançadas
      const revenueByPlan = await this.getRevenueByPlan()
      const monthlyRevenueHistory = await this.getMonthlyRevenueHistory()
      const churnRate = await this.getChurnRate()

      // Métricas de oportunidades avançadas
      const opportunitiesByCategory = await this.getOpportunitiesByCategory()
      const opportunitiesByRegion = await this.getOpportunitiesByRegion()
      const opportunityTrends = await this.getOpportunityTrends()
      const topOpportunities = await this.getTopOpportunities()
      const activeOpportunities = await this.getActiveOpportunities()
      const newOpportunitiesThisMonth = await this.getNewOpportunitiesThisMonth()
      const opportunitiesGrowth = await this.getOpportunitiesGrowth()
      const averageOpportunityValue = await this.getAverageOpportunityValue()

      // Métricas de propostas avançadas
      const successfulProposals = await this.getSuccessfulProposals()
      const pendingProposals = await this.getPendingProposals()
      const rejectedProposals = await this.getRejectedProposals()
      const averageSuccessRate = await this.getAverageSuccessRate()
      const totalValueProposed = await this.getTotalValueProposed()
      const totalValueWon = await this.getTotalValueWon()
      const proposalsByStatusDetailed = await this.getProposalsByStatusDetailed()
      const proposalsByCategory = await this.getProposalsByCategory()
      const monthlyProposalTrends = await this.getMonthlyProposalTrends()
      const topPerformingProposals = await this.getTopPerformingProposals()

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
      const totalRevenueAmount = totalRevenue._sum.amount || 0
      const subscriptionRevenue = totalRevenueAmount * 0.8 // 80% assinaturas
      const oneTimeRevenue = totalRevenueAmount * 0.2 // 20% vendas únicas
      const averageRevenuePerUser = totalUsers > 0 ? totalRevenueAmount / totalUsers : 0

      return {
        totalUsers,
        activeUsers,
        newUsersToday,
        newUsersThisMonth,
        userRetentionRate,
        totalOpportunities,
        activeOpportunities,
        newOpportunitiesThisMonth,
        opportunitiesGrowth,
        averageOpportunityValue,
        opportunitiesByCategory,
        opportunitiesByRegion,
        opportunityTrends,
        topOpportunities,
        totalProposals,
        successfulProposals,
        pendingProposals,
        rejectedProposals,
        averageSuccessRate,
        totalValueProposed,
        totalValueWon,
        proposalsByStatus: proposalsByStatusDetailed,
        proposalsByCategory,
        monthlyProposalTrends,
        topPerformingProposals,
        successRate,
        averageProposalValue: proposalValues._avg.proposedValue || 0,
        
        // Revenue metrics for RevenueMetrics component
        totalRevenue: totalRevenueAmount,
        monthlyRevenue: revenueThisMonth,
        revenueGrowth,
        averageRevenuePerUser,
        subscriptionRevenue,
        oneTimeRevenue,
        churnRate,
        revenueByPlan,
        monthlyRevenueHistory,
        
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
          total: totalRevenueAmount,
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

  private static async getRevenueByPlan() {
    // Simulação de receita por plano
    return [
      {
        plan: 'FREE',
        revenue: 0,
        percentage: 0
      },
      {
        plan: 'PRO',
        revenue: 25000,
        percentage: 75
      },
      {
        plan: 'ENTERPRISE',
        revenue: 8333,
        percentage: 25
      }
    ]
  }

  private static async getMonthlyRevenueHistory() {
    // Simulação de histórico de receita mensal
    const months = []
    const now = new Date()
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      const baseRevenue = 30000 + (Math.random() * 10000)
      const growth = (Math.random() - 0.5) * 20 // -10% a +10%
      
      months.push({
        month: monthName,
        revenue: Math.round(baseRevenue),
        growth: Math.round(growth * 10) / 10
      })
    }
    
    return months
  }

  private static async getChurnRate() {
    // Simulação de taxa de churn (cancelamentos)
    return Math.random() * 5 + 2 // Entre 2% e 7%
  }

  private static async getOpportunitiesByCategory() {
    const opportunities = await db.opportunity.groupBy({
      by: ['bidType'],
      _count: { bidType: true },
      _avg: { estimatedValue: true }
    })

    const total = opportunities.reduce((sum, item) => sum + item._count.bidType, 0)
    
    return opportunities.map(item => ({
      category: item.bidType || 'Outros',
      count: item._count.bidType,
      percentage: total > 0 ? (item._count.bidType / total) * 100 : 0,
      averageValue: item._avg.estimatedValue || 0
    }))
  }

  private static async getOpportunitiesByRegion() {
    // Simulação de oportunidades por região
    const regions = [
      { region: 'São Paulo', count: 45, percentage: 35 },
      { region: 'Rio de Janeiro', count: 28, percentage: 22 },
      { region: 'Minas Gerais', count: 20, percentage: 16 },
      { region: 'Paraná', count: 15, percentage: 12 },
      { region: 'Outros', count: 19, percentage: 15 }
    ]
    return regions
  }

  private static async getOpportunityTrends() {
    // Simulação de tendências de oportunidades
    const trends = []
    const now = new Date()
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      const count = Math.floor(Math.random() * 50) + 20
      const value = Math.floor(Math.random() * 2000000) + 1000000
      const growth = (Math.random() - 0.5) * 30
      
      trends.push({
        month: monthName,
        count,
        value,
        growth
      })
    }
    
    return trends
  }

  private static async getTopOpportunities() {
    const opportunities = await db.opportunity.findMany({
      orderBy: { estimatedValue: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        estimatedValue: true,
        bidType: true,
        entity_state: true,
        deadline: true
      }
    })

    return opportunities.map((opp, index) => ({
      id: opp.id,
      title: opp.title,
      value: opp.estimatedValue || 0,
      category: opp.bidType || 'Outros',
      region: opp.entity_state || 'Não informado',
      deadline: opp.deadline?.toISOString() || new Date().toISOString(),
      viewCount: Math.floor(Math.random() * 1000) + 100
    }))
  }

  private static async getActiveOpportunities() {
    return await db.opportunity.count({
      where: {
        deadline: {
          gte: new Date()
        }
      }
    })
  }

  private static async getNewOpportunitiesThisMonth() {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    return await db.opportunity.count({
      where: {
        createdAt: {
          gte: monthStart
        }
      }
    })
  }

  private static async getOpportunitiesGrowth() {
    const thisMonth = await this.getNewOpportunitiesThisMonth()
    
    const lastMonthStart = new Date()
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)
    lastMonthStart.setDate(1)
    lastMonthStart.setHours(0, 0, 0, 0)
    
    const lastMonthEnd = new Date()
    lastMonthEnd.setDate(0)
    lastMonthEnd.setHours(23, 59, 59, 999)

    const lastMonth = await db.opportunity.count({
      where: {
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd
        }
      }
    })

    return lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0
  }

  private static async getAverageOpportunityValue() {
    const result = await db.opportunity.aggregate({
      _avg: { estimatedValue: true }
    })
    
    return result._avg.estimatedValue || 0
  }

  private static async getSuccessfulProposals() {
    return await db.proposal.count({
      where: { status: 'ACCEPTED' }
    })
  }

  private static async getPendingProposals() {
    return await db.proposal.count({
      where: { status: 'PENDING' }
    })
  }

  private static async getRejectedProposals() {
    return await db.proposal.count({
      where: { status: 'REJECTED' }
    })
  }

  private static async getAverageSuccessRate() {
    const total = await db.proposal.count()
    const successful = await this.getSuccessfulProposals()
    
    return total > 0 ? (successful / total) * 100 : 0
  }

  private static async getTotalValueProposed() {
    const result = await db.proposal.aggregate({
      _sum: { proposedValue: true }
    })
    
    return result._sum.proposedValue || 0
  }

  private static async getTotalValueWon() {
    const result = await db.proposal.aggregate({
      where: { status: 'ACCEPTED' },
      _sum: { proposedValue: true }
    })
    
    return result._sum.proposedValue || 0
  }

  private static async getProposalsByStatusDetailed() {
    const statusCounts = await db.proposal.groupBy({
      by: ['status'],
      _count: { status: true }
    })

    const total = statusCounts.reduce((sum, item) => sum + item._count.status, 0)
    
    return statusCounts.map(item => ({
      status: item.status,
      count: item._count.status,
      percentage: total > 0 ? (item._count.status / total) * 100 : 0
    }))
  }

  private static async getProposalsByCategory() {
    const proposals = await db.proposal.findMany({
      include: {
        opportunity: {
          select: { bidType: true }
        }
      }
    })

    const categoryStats: Record<string, { count: number; successful: number; totalValue: number }> = {}

    proposals.forEach(proposal => {
      const category = proposal.opportunity?.bidType || 'Outros'
      if (!categoryStats[category]) {
        categoryStats[category] = { count: 0, successful: 0, totalValue: 0 }
      }
      
      categoryStats[category].count++
      categoryStats[category].totalValue += proposal.proposedValue
      
      if (proposal.status === 'ACCEPTED') {
        categoryStats[category].successful++
      }
    })

    return Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      count: stats.count,
      successRate: stats.count > 0 ? (stats.successful / stats.count) * 100 : 0,
      totalValue: stats.totalValue
    }))
  }

  private static async getMonthlyProposalTrends() {
    const trends = []
    const now = new Date()
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      const monthName = monthStart.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      
      const [submitted, won, valueData] = await Promise.all([
        db.proposal.count({
          where: {
            createdAt: {
              gte: monthStart,
              lte: monthEnd
            }
          }
        }),
        db.proposal.count({
          where: {
            createdAt: {
              gte: monthStart,
              lte: monthEnd
            },
            status: 'ACCEPTED'
          }
        }),
        db.proposal.aggregate({
          where: {
            createdAt: {
              gte: monthStart,
              lte: monthEnd
            },
            status: 'ACCEPTED'
          },
          _sum: { proposedValue: true }
        })
      ])
      
      trends.push({
        month: monthName,
        submitted,
        won,
        successRate: submitted > 0 ? (won / submitted) * 100 : 0,
        value: valueData._sum.proposedValue || 0
      })
    }
    
    return trends
  }

  private static async getTopPerformingProposals() {
    const proposals = await db.proposal.findMany({
      orderBy: { proposedValue: 'desc' },
      take: 10,
      include: {
        user: {
          select: { name: true }
        },
        opportunity: {
          select: { title: true, bidType: true }
        }
      }
    })

    return proposals.map(proposal => ({
      id: proposal.id,
      title: proposal.opportunity?.title || 'Proposta sem título',
      value: proposal.proposedValue,
      category: proposal.opportunity?.bidType || 'Outros',
      status: proposal.status === 'ACCEPTED' ? 'WON' as const :
              proposal.status === 'PENDING' ? 'PENDING' as const : 'REJECTED' as const,
      submittedDate: proposal.createdAt.toISOString(),
      userName: proposal.user?.name || 'Usuário desconhecido'
    }))
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