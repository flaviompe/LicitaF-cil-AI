import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { chatService } from '@/lib/chat'
import { z } from 'zod'

const closeSchema = z.object({
  reason: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  tags: z.array(z.string()).optional()
})

// POST /api/chat/admin/sessions/[id]/close - Fechar chat
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as any

    const chatId = params.id
    const body = await request.json()
    const { reason, rating, tags } = closeSchema.parse(body)

    // Verificar se o usuário é admin/agente
    const user = await db.user.findUnique({
      where: { id: sessionUser.id }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Verificar se o chat existe e não está fechado
    const chatSession = await db.$queryRaw`
      SELECT * FROM chat_sessions 
      WHERE id = ${chatId} AND status != 'closed'
    `

    if (!(chatSession as any).length) {
      return NextResponse.json(
        { error: 'Chat não encontrado ou já está fechado' },
        { status: 404 }
      )
    }

    const chat = (chatSession as any)[0]

    // Verificar se o agente tem permissão para fechar este chat
    if (chat.agent_id && chat.agent_id !== sessionUser.id) {
      return NextResponse.json(
        { error: 'Apenas o agente responsável pode fechar este chat' },
        { status: 403 }
      )
    }

    // Fechar o chat
    await db.$executeRaw`
      UPDATE chat_sessions
      SET 
        status = 'closed',
        closed_at = CURRENT_TIMESTAMP,
        close_reason = ${reason || null},
        rating = ${rating || null},
        tags = ${tags ? JSON.stringify(tags) : null}
      WHERE id = ${chatId}
    `

    // Atualizar participantes
    await db.$executeRaw`
      UPDATE chat_participants
      SET online = false, left_at = CURRENT_TIMESTAMP
      WHERE chat_id = ${chatId} AND online = true
    `

    // Enviar mensagem do sistema
    const systemMessageId = crypto.randomUUID()
    await db.$executeRaw`
      INSERT INTO chat_messages (id, chat_id, sender_id, sender_name, sender_role, content, type)
      VALUES (${systemMessageId}, ${chatId}, 'system', 'Sistema', 'system', ${`Chat encerrado por ${user.name}`}, 'system')
    `

    // Notificar via WebSocket
    chatService.emit('chat_closed', {
      chatId,
      closedBy: sessionUser.id,
      reason
    })

    // Calcular estatísticas da sessão
    const sessionStats = await db.$queryRaw`
      SELECT 
        TIMESTAMPDIFF(MINUTE, created_at, closed_at) as duration,
        COUNT((SELECT id FROM chat_messages WHERE chat_id = ${chatId})) as message_count
      FROM chat_sessions
      WHERE id = ${chatId}
    `

    const stats = (sessionStats as any)[0]

    return NextResponse.json({ 
      success: true,
      message: 'Chat encerrado com sucesso',
      stats: {
        duration: stats?.duration || 0,
        messageCount: stats?.message_count || 0
      }
    })

  } catch (error) {
    console.error('Erro ao fechar chat:', error)
    
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