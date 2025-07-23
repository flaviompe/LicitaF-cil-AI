import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/chat/admin/stats - Estatísticas para agentes
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as any

    // Verificar se o usuário é admin/agente
    const user = await db.user.findUnique({
      where: { id: sessionUser.id }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const url = new URL(request.url)
    const agentId = url.searchParams.get('agentId') || sessionUser.id
    const period = url.searchParams.get('period') || '7d' // 1d, 7d, 30d, 90d

    // Calcular data de início baseado no período
    let startDate: string
    switch (period) {
      case '1d':
        startDate = 'DATE_SUB(NOW(), INTERVAL 1 DAY)'
        break
      case '7d':
        startDate = 'DATE_SUB(NOW(), INTERVAL 7 DAY)'
        break
      case '30d':
        startDate = 'DATE_SUB(NOW(), INTERVAL 30 DAY)'
        break
      case '90d':
        startDate = 'DATE_SUB(NOW(), INTERVAL 90 DAY)'
        break
      default:
        startDate = 'DATE_SUB(NOW(), INTERVAL 7 DAY)'
    }

    // Estatísticas do agente
    const agentStats = await Promise.all([
      // Total de chats
      db.$queryRaw`
        SELECT COUNT(*) as total
        FROM chat_sessions
        WHERE agent_id = ${agentId} AND created_at >= ${startDate}
      `,
      
      // Chats ativos
      db.$queryRaw`
        SELECT COUNT(*) as active
        FROM chat_sessions
        WHERE agent_id = ${agentId} AND status = 'active'
      `,
      
      // Tempo médio de resposta
      db.$queryRaw`
        SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, updated_at)) as avg_response
        FROM chat_sessions
        WHERE agent_id = ${agentId} AND status = 'closed' AND created_at >= ${startDate}
      `,
      
      // Avaliação média
      db.$queryRaw`
        SELECT AVG(rating) as avg_rating
        FROM chat_sessions
        WHERE agent_id = ${agentId} AND rating IS NOT NULL AND created_at >= ${startDate}
      `,
      
      // Chats hoje
      db.$queryRaw`
        SELECT COUNT(*) as today
        FROM chat_sessions
        WHERE agent_id = ${agentId} AND DATE(created_at) = CURDATE()
      `,
      
      // Chats resolvidos
      db.$queryRaw`
        SELECT COUNT(*) as resolved
        FROM chat_sessions
        WHERE agent_id = ${agentId} AND status = 'closed' AND created_at >= ${startDate}
      `,
      
      // Tempo médio de duração
      db.$queryRaw`
        SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, closed_at)) as avg_duration
        FROM chat_sessions
        WHERE agent_id = ${agentId} AND status = 'closed' AND created_at >= ${startDate}
      `,
      
      // Taxa de resolução
      db.$queryRaw`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as resolved
        FROM chat_sessions
        WHERE agent_id = ${agentId} AND created_at >= ${startDate}
      `
    ])

    const [
      totalChats,
      activeChats,
      avgResponseTime,
      avgRating,
      todayChats,
      resolvedChats,
      avgDuration,
      resolutionRate
    ] = agentStats

    const total = (totalChats as any)[0]?.total || 0
    const resolved = (resolvedChats as any)[0]?.resolved || 0
    const resolutionRateData = (resolutionRate as any)[0]
    const resolutionPercentage = resolutionRateData?.total > 0 ? 
      (resolutionRateData.resolved / resolutionRateData.total) * 100 : 0

    // Estatísticas por dia (últimos 7 dias)
    const dailyStats = await db.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as resolved,
        AVG(rating) as avg_rating,
        AVG(TIMESTAMPDIFF(MINUTE, created_at, closed_at)) as avg_duration
      FROM chat_sessions
      WHERE agent_id = ${agentId} AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `

    // Estatísticas por departamento
    const departmentStats = await db.$queryRaw`
      SELECT 
        department,
        COUNT(*) as total,
        AVG(rating) as avg_rating,
        AVG(TIMESTAMPDIFF(MINUTE, created_at, closed_at)) as avg_duration
      FROM chat_sessions
      WHERE agent_id = ${agentId} AND created_at >= ${startDate}
      GROUP BY department
      ORDER BY total DESC
    `

    // Estatísticas por prioridade
    const priorityStats = await db.$queryRaw`
      SELECT 
        priority,
        COUNT(*) as total,
        AVG(rating) as avg_rating,
        AVG(TIMESTAMPDIFF(MINUTE, created_at, closed_at)) as avg_duration
      FROM chat_sessions
      WHERE agent_id = ${agentId} AND created_at >= ${startDate}
      GROUP BY priority
    `

    // Horários mais movimentados
    const busyHours = await db.$queryRaw`
      SELECT 
        HOUR(created_at) as hour,
        COUNT(*) as total
      FROM chat_sessions
      WHERE agent_id = ${agentId} AND created_at >= ${startDate}
      GROUP BY HOUR(created_at)
      ORDER BY total DESC
    `

    // Estatísticas gerais do sistema (se for admin)
    let systemStats = null
    if (user.role === 'ADMIN') {
      const systemStatsData = await Promise.all([
        db.$queryRaw`SELECT COUNT(*) as total FROM chat_sessions WHERE created_at >= ${startDate}`,
        db.$queryRaw`SELECT COUNT(*) as waiting FROM chat_sessions WHERE status = 'waiting'`,
        db.$queryRaw`SELECT COUNT(*) as active FROM chat_sessions WHERE status = 'active'`,
        db.$queryRaw`SELECT COUNT(*) as closed FROM chat_sessions WHERE status = 'closed' AND created_at >= ${startDate}`,
        db.$queryRaw`SELECT AVG(rating) as avg_rating FROM chat_sessions WHERE rating IS NOT NULL AND created_at >= ${startDate}`,
        db.$queryRaw`SELECT COUNT(DISTINCT agent_id) as active_agents FROM chat_sessions WHERE agent_id IS NOT NULL AND created_at >= ${startDate}`,
      ])

      systemStats = {
        totalChats: (systemStatsData[0] as any)[0]?.total || 0,
        waitingChats: (systemStatsData[1] as any)[0]?.waiting || 0,
        activeChats: (systemStatsData[2] as any)[0]?.active || 0,
        closedChats: (systemStatsData[3] as any)[0]?.closed || 0,
        avgRating: (systemStatsData[4] as any)[0]?.avg_rating || 0,
        activeAgents: (systemStatsData[5] as any)[0]?.active_agents || 0
      }
    }

    return NextResponse.json({
      period,
      stats: {
        totalChats: total,
        activeChats: (activeChats as any)[0]?.active || 0,
        avgResponseTime: (avgResponseTime as any)[0]?.avg_response || 0,
        avgRating: (avgRating as any)[0]?.avg_rating || 0,
        todayChats: (todayChats as any)[0]?.today || 0,
        resolvedChats: resolved,
        avgDuration: (avgDuration as any)[0]?.avg_duration || 0,
        resolutionRate: resolutionPercentage
      },
      dailyStats,
      departmentStats,
      priorityStats,
      busyHours,
      systemStats
    })

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}