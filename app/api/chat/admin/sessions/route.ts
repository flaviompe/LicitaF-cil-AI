import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/chat/admin/sessions - Listar todas as sessões (admin)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se o usuário é admin/agente
    const user = await db.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const priority = url.searchParams.get('priority')
    const department = url.searchParams.get('department')
    const agentId = url.searchParams.get('agentId')
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Construir query base
    let whereClause = 'WHERE 1=1'
    const params: any[] = []
    
    if (status) {
      whereClause += ` AND s.status = ?`
      params.push(status)
    }
    
    if (priority) {
      whereClause += ` AND s.priority = ?`
      params.push(priority)
    }
    
    if (department) {
      whereClause += ` AND s.department = ?`
      params.push(department)
    }
    
    if (agentId) {
      whereClause += ` AND s.agent_id = ?`
      params.push(agentId)
    }

    // Buscar sessões com estatísticas
    const sessions = await db.$queryRaw`
      SELECT 
        s.*,
        COUNT(m.id) as message_count,
        MAX(m.timestamp) as last_message_time,
        CASE 
          WHEN s.status = 'waiting' THEN TIMESTAMPDIFF(MINUTE, s.created_at, NOW())
          ELSE NULL
        END as waiting_time,
        CASE 
          WHEN s.status = 'active' THEN TIMESTAMPDIFF(MINUTE, s.created_at, NOW())
          ELSE NULL
        END as active_time
      FROM chat_sessions s
      LEFT JOIN chat_messages m ON s.id = m.chat_id
      ${whereClause}
      GROUP BY s.id
      ORDER BY 
        CASE 
          WHEN s.status = 'waiting' THEN 1
          WHEN s.status = 'active' THEN 2
          ELSE 3
        END,
        s.priority = 'high' DESC,
        s.priority = 'medium' DESC,
        s.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    // Contar total
    const totalResult = await db.$queryRaw`
      SELECT COUNT(*) as total
      FROM chat_sessions s
      ${whereClause}
    `

    const total = (totalResult as any)[0]?.total || 0

    // Estatísticas gerais
    const [waitingCount, activeCount, closedToday] = await Promise.all([
      db.$queryRaw`SELECT COUNT(*) as count FROM chat_sessions WHERE status = 'waiting'`,
      db.$queryRaw`SELECT COUNT(*) as count FROM chat_sessions WHERE status = 'active'`,
      db.$queryRaw`
        SELECT COUNT(*) as count 
        FROM chat_sessions 
        WHERE status = 'closed' AND DATE(created_at) = CURDATE()
      `
    ])

    return NextResponse.json({
      sessions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      stats: {
        waiting: (waitingCount as any)[0]?.count || 0,
        active: (activeCount as any)[0]?.count || 0,
        closedToday: (closedToday as any)[0]?.count || 0
      }
    })

  } catch (error) {
    console.error('Erro ao buscar sessões admin:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}