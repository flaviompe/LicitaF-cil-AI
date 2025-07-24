import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { chatService } from '@/lib/chat'

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
  count: number
}

// POST /api/chat/admin/sessions/[id]/take - Agente assume o chat
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as SessionUser

    const chatId = params.id

    // Verificar se o usuário é admin/agente
    const user = await db.user.findUnique({
      where: { id: sessionUser.id }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Verificar se o chat existe e está aguardando
    const chatSession = await db.$queryRaw`
      SELECT * FROM chat_sessions 
      WHERE id = ${chatId} AND status = 'waiting'
    `

    if (!(chatSession as QueryResult[]).length) {
      return NextResponse.json(
        { error: 'Chat não encontrado ou não está aguardando' },
        { status: 404 }
      )
    }

    const chat = (chatSession as QueryResult[])[0]

    // Verificar se o agente já tem muitos chats ativos
    const agentActiveChats = await db.$queryRaw`
      SELECT COUNT(*) as count
      FROM chat_sessions
      WHERE agent_id = ${sessionUser.id} AND status = 'active'
    `

    const activeCount = (agentActiveChats as CountResult[])[0]?.count || 0
    const maxConcurrentChats = 5 // Limite por agente

    if (activeCount >= maxConcurrentChats) {
      return NextResponse.json(
        { error: 'Limite de chats simultâneos atingido' },
        { status: 429 }
      )
    }

    // Assumir o chat
    await db.$executeRaw`
      UPDATE chat_sessions
      SET 
        agent_id = ${sessionUser.id},
        agent_name = ${user.name},
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${chatId}
    `

    // Adicionar agente como participante
    await db.$executeRaw`
      INSERT INTO chat_participants (id, chat_id, user_id, role, name, email, online)
      VALUES (${crypto.randomUUID()}, ${chatId}, ${sessionUser.id}, 'agent', ${user.name}, ${user.email}, true)
    `

    // Enviar mensagem do sistema
    const systemMessageId = crypto.randomUUID()
    await db.$executeRaw`
      INSERT INTO chat_messages (id, chat_id, sender_id, sender_name, sender_role, content, type)
      VALUES (${systemMessageId}, ${chatId}, 'system', 'Sistema', 'system', ${`${user.name} entrou no chat`}, 'system')
    `

    // Notificar via WebSocket
    const activeSessions = await chatService.getActiveSessions()
    const updatedSession = activeSessions.find(s => s.id === chatId)
    
    if (updatedSession) {
      chatService.emit('agent_joined', {
        chatId,
        agent: { id: sessionUser.id, name: user.name },
        session: updatedSession
      })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Chat assumido com sucesso'
    })

  } catch (error) {
    console.error('Erro ao assumir chat:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}