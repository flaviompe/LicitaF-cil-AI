import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiService } from '@/lib/api-public'
import { z } from 'zod'

const querySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('monthly'),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  metrics: z.array(z.enum([
    'opportunities',
    'proposals',
    'certificates',
    'success_rate',
    'revenue',
    'conversion'
  ])).optional()
})

// GET /api/v1/analytics - Obter analytics
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const auth = await apiService.authenticate(request, ['analytics:read'])
    if ('error' in auth) {
      return auth as NextResponse
    }

    const { apiKey, rateLimit } = auth
    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams)
    
    const query = querySchema.parse(params)
    
    // Definir período
    let startDate = new Date()
    let endDate = new Date()
    
    if (query.dateFrom) {
      startDate = new Date(query.dateFrom)
    } else {
      // Período padrão baseado no tipo
      switch (query.period) {
        case 'daily':
          startDate.setDate(startDate.getDate() - 30)
          break
        case 'weekly':
          startDate.setDate(startDate.getDate() - 7 * 12)
          break
        case 'monthly':
          startDate.setMonth(startDate.getMonth() - 12)
          break
        case 'yearly':
          startDate.setFullYear(startDate.getFullYear() - 5)
          break
      }
    }
    
    if (query.dateTo) {
      endDate = new Date(query.dateTo)
    }
    
    // Buscar dados base
    const [
      opportunities,
      proposals,
      certificates,
      winRate
    ] = await Promise.all([
      // Oportunidades
      db.opportunity.findMany({
        where: {
          company: { userId: apiKey.userId },
          createdAt: { gte: startDate, lte: endDate }
        },
        select: {
          id: true,
          value: true,
          status: true,
          createdAt: true
        }
      }),
      // Propostas
      db.proposal.findMany({
        where: {
          opportunity: {
            company: { userId: apiKey.userId }
          },
          createdAt: { gte: startDate, lte: endDate }
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          opportunity: {
            select: {
              value: true
            }
          }
        }
      }),
      // Certificados
      db.certificate.findMany({
        where: {
          company: { userId: apiKey.userId },
          createdAt: { gte: startDate, lte: endDate }
        },
        select: {
          id: true,
          status: true,
          expiresAt: true,
          createdAt: true
        }
      }),
      // Taxa de sucesso
      db.proposal.findMany({
        where: {
          opportunity: {
            company: { userId: apiKey.userId }
          },
          status: { in: ['WON', 'LOST'] }
        },
        select: {
          status: true
        }
      })
    ])
    
    // Calcular métricas
    const metrics = {
      opportunities: {
        total: opportunities.length,
        open: opportunities.filter(o => o.status === 'OPEN').length,
        closed: opportunities.filter(o => o.status === 'CLOSED').length,
        totalValue: opportunities.reduce((sum, o) => sum + (o.value || 0), 0),
        averageValue: opportunities.length > 0 
          ? opportunities.reduce((sum, o) => sum + (o.value || 0), 0) / opportunities.length 
          : 0
      },
      proposals: {
        total: proposals.length,
        submitted: proposals.filter(p => p.status === 'SUBMITTED').length,
        won: proposals.filter(p => p.status === 'WON').length,
        lost: proposals.filter(p => p.status === 'LOST').length,
        pending: proposals.filter(p => p.status === 'DRAFT').length
      },
      certificates: {
        total: certificates.length,
        active: certificates.filter(c => c.status === 'ACTIVE').length,
        expired: certificates.filter(c => c.status === 'EXPIRED').length,
        expiringSoon: certificates.filter(c => 
          c.status === 'ACTIVE' && 
          c.expiresAt && 
          c.expiresAt.getTime() <= Date.now() + 30 * 24 * 60 * 60 * 1000
        ).length
      },
      performance: {
        successRate: winRate.length > 0 
          ? (winRate.filter(p => p.status === 'WON').length / winRate.length) * 100
          : 0,
        conversionRate: opportunities.length > 0 
          ? (proposals.length / opportunities.length) * 100
          : 0,
        averageProposalValue: proposals.length > 0
          ? proposals.reduce((sum, p) => sum + (p.opportunity?.value || 0), 0) / proposals.length
          : 0
      }
    }
    
    // Dados por período
    const groupByPeriod = (data: any[], dateField: string) => {
      const groups: Record<string, number> = {}
      
      data.forEach(item => {
        const date = new Date(item[dateField])
        let key: string
        
        switch (query.period) {
          case 'daily':
            key = date.toISOString().split('T')[0]
            break
          case 'weekly':
            const weekStart = new Date(date)
            weekStart.setDate(date.getDate() - date.getDay())
            key = weekStart.toISOString().split('T')[0]
            break
          case 'monthly':
            key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
            break
          case 'yearly':
            key = date.getFullYear().toString()
            break
        }
        
        groups[key] = (groups[key] || 0) + 1
      })
      
      return Object.entries(groups)
        .map(([period, count]) => ({ period, count }))
        .sort((a, b) => a.period.localeCompare(b.period))
    }
    
    const analytics = {
      period: query.period,
      dateRange: {
        from: startDate.toISOString(),
        to: endDate.toISOString()
      },
      metrics,
      trends: {
        opportunities: groupByPeriod(opportunities, 'createdAt'),
        proposals: groupByPeriod(proposals, 'createdAt'),
        certificates: groupByPeriod(certificates, 'createdAt')
      }
    }
    
    const responseTime = Date.now() - startTime
    const response = {
      data: analytics,
      meta: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    }
    
    const responseBody = JSON.stringify(response)
    
    await apiService.logApiUsage(
      apiKey.id,
      '/api/v1/analytics',
      'GET',
      200,
      responseTime,
      JSON.stringify(params).length,
      responseBody.length,
      request.headers.get('User-Agent') || undefined,
      request.headers.get('X-Forwarded-For') || undefined
    )
    
    return NextResponse.json(response, {
      headers: {
        'X-RateLimit-Limit': apiKey.rateLimit.requests.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString()
      }
    })
    
  } catch (error) {
    console.error('Erro na API de analytics:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid parameters',
          details: error.errors,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}