import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { chatService } from '@/lib/chat'

// GET /api/chat/sessions - Listar sessões de chat
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as any

    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Construir filtros
    const where: any = {
      user_id: sessionUser.id
    }
    
    if (status) {
      where.status = status
    }

    // Buscar sessões do usuário
    const sessions = await db.$queryRaw`
      SELECT 
        s.*,
        COUNT(m.id) as message_count,
        MAX(m.timestamp) as last_message_time
      FROM chat_sessions s
      LEFT JOIN chat_messages m ON s.id = m.chat_id
      WHERE s.user_id = ${sessionUser.id}
      ${status ? `AND s.status = ${status}` : ''}
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    // Contar total de sessões
    const totalResult = await db.$queryRaw`
      SELECT COUNT(*) as total
      FROM chat_sessions
      WHERE user_id = ${sessionUser.id}
      ${status ? `AND status = ${status}` : ''}
    `

    const total = (totalResult as any)[0]?.total || 0

    return NextResponse.json({
      sessions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Erro ao buscar sessões de chat:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/chat/sessions - Criar nova sessão de chat
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as any

    const body = await request.json()
    const { subject, department, priority } = body

    // Verificar se já existe uma sessão ativa
    const existingSession = await db.$queryRaw`
      SELECT id FROM chat_sessions
      WHERE user_id = ${sessionUser.id} AND status IN ('waiting', 'active')
      LIMIT 1
    `

    if ((existingSession as any).length > 0) {
      return NextResponse.json(
        { error: 'Você já possui uma sessão de chat ativa' },
        { status: 409 }
      )
    }

    // Buscar dados do usuário
    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      include: { company: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Criar nova sessão
    const sessionId = crypto.randomUUID()
    
    await db.$executeRaw`
      INSERT INTO chat_sessions (id, user_id, user_name, user_email, status, subject, department, priority)
      VALUES (${sessionId}, ${sessionUser.id}, ${user.name}, ${user.email}, 'waiting', ${subject}, ${department}, ${priority})
    `

    // Buscar a sessão criada
    const newSession = await db.$queryRaw`
      SELECT * FROM chat_sessions WHERE id = ${sessionId}
    `

    return NextResponse.json({
      success: true,
      session: (newSession as any)[0]
    })

  } catch (error) {
    console.error('Erro ao criar sessão de chat:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}