import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

interface SessionUser {
  id: string
  role: string
  email: string
  name?: string | null
}

interface QueryResult {
  [key: string]: any
}

interface CountResult {
  total: number
}

interface ChatSession {
  id: string
  status: string
}

const messageSchema = z.object({
  chatId: z.string(),
  content: z.string().min(1),
  type: z.enum(['text', 'image', 'file']).default('text')
})

// GET /api/chat/messages - Listar mensagens de um chat
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as SessionUser

    const url = new URL(request.url)
    const chatId = url.searchParams.get('chatId')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID é obrigatório' }, { status: 400 })
    }

    // Verificar se o chat pertence ao usuário - CORRIGIDO SQL INJECTION
    // COMENTADO: chatSession não existe no schema Prisma
    // const chatSession = await db.chatSession.findFirst({
    //   where: {
    //     id: chatId,
    //     userId: sessionUser.id
    //   },
    //   select: { id: true }
    // })

    // Implementação temporária com raw SQL
    const chatSession = await db.$queryRaw`
      SELECT id FROM chat_sessions
      WHERE id = ${chatId} AND user_id = ${sessionUser.id}
    `

    if (!chatSession) {
      return NextResponse.json({ error: 'Chat não encontrado' }, { status: 404 })
    }

    // Buscar mensagens
    const messages = await db.$queryRaw`
      SELECT *
      FROM chat_messages
      WHERE chat_id = ${chatId}
      ORDER BY timestamp ASC
      LIMIT ${limit} OFFSET ${offset}
    `

    // Contar total de mensagens
    const totalResult = await db.$queryRaw`
      SELECT COUNT(*) as total
      FROM chat_messages
      WHERE chat_id = ${chatId}
    `

    const total = (totalResult as CountResult[])[0]?.total || 0

    return NextResponse.json({
      messages,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Erro ao buscar mensagens:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/chat/messages - Enviar nova mensagem
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as SessionUser
    const body = await request.json()
    const { chatId, content, type } = messageSchema.parse(body)

    // Verificar se o chat pertence ao usuário
    const chatSession = await db.$queryRaw`
      SELECT id, status FROM chat_sessions
      WHERE id = ${chatId} AND user_id = ${sessionUser.id}
    `

    if (!(chatSession as QueryResult[]).length) {
      return NextResponse.json({ error: 'Chat não encontrado' }, { status: 404 })
    }

    const chat = (chatSession as ChatSession[])[0]
    if (chat.status === 'closed') {
      return NextResponse.json({ error: 'Chat está fechado' }, { status: 400 })
    }

    // Buscar dados do usuário
    const user = await db.user.findUnique({
      where: { id: sessionUser.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Criar mensagem
    const messageId = crypto.randomUUID()
    
    await db.$executeRaw`
      INSERT INTO chat_messages (id, chat_id, sender_id, sender_name, sender_role, content, type)
      VALUES (${messageId}, ${chatId}, ${sessionUser.id}, ${user.name}, 'user', ${content}, ${type})
    `

    // Atualizar última atividade da sessão
    await db.$executeRaw`
      UPDATE chat_sessions
      SET last_activity = CURRENT_TIMESTAMP
      WHERE id = ${chatId}
    `

    // Buscar a mensagem criada
    const newMessage = await db.$queryRaw`
      SELECT * FROM chat_messages WHERE id = ${messageId}
    `

    return NextResponse.json({
      success: true,
      message: (newMessage as QueryResult[])[0]
    })

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}