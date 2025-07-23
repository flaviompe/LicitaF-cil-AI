import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getNotificationService } from '@/lib/notifications'
import { z } from 'zod'

const sendNotificationSchema = z.object({
  type: z.enum(['opportunity', 'certificate', 'proposal', 'payment', 'system', 'ai_analysis']),
  title: z.string().min(1),
  message: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  channels: z.array(z.enum(['email', 'whatsapp', 'telegram', 'push', 'sms'])),
  actionUrl: z.string().optional(),
  actionText: z.string().optional(),
  scheduledFor: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

const markAsReadSchema = z.object({
  notificationId: z.string()
})

const updateSettingsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  telegramEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  quietHours: z.object({
    start: z.string(),
    end: z.string()
  }).optional(),
  preferences: z.object({
    opportunities: z.boolean().optional(),
    certificates: z.boolean().optional(),
    proposals: z.boolean().optional(),
    payments: z.boolean().optional(),
    system: z.boolean().optional(),
    aiAnalysis: z.boolean().optional()
  }).optional()
})

// GET /api/notifications - Buscar notificações do usuário
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as any

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const type = url.searchParams.get('type')
    const unreadOnly = url.searchParams.get('unread') === 'true'

    const notificationService = getNotificationService()
    
    // Buscar notificações
    const notifications = await notificationService.getUserNotifications(sessionUser.id, limit)
    
    // Filtrar por tipo se especificado
    let filteredNotifications = notifications
    if (type) {
      filteredNotifications = notifications.filter(n => n.type === type)
    }
    
    // Filtrar apenas não lidas se especificado
    if (unreadOnly) {
      filteredNotifications = filteredNotifications.filter(n => !n.readAt)
    }
    
    // Buscar contagem de não lidas
    const unreadCount = await notificationService.getUnreadCount(sessionUser.id)

    return NextResponse.json({
      notifications: filteredNotifications,
      unreadCount,
      total: notifications.length
    })

  } catch (error) {
    console.error('Erro na API de notificações:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/notifications - Enviar nova notificação
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as any

    const body = await request.json()
    
    if (body.action === 'send') {
      const { type, title, message, priority, channels, actionUrl, actionText, scheduledFor, metadata } = sendNotificationSchema.parse(body)
      
      const notificationService = getNotificationService()
      
      await notificationService.sendNotification({
        userId: sessionUser.id,
        type,
        title,
        message,
        priority,
        channels,
        actionUrl,
        actionText,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        metadata
      })

      return NextResponse.json({ success: true })
    }

    if (body.action === 'markAsRead') {
      const { notificationId } = markAsReadSchema.parse(body)
      
      const notificationService = getNotificationService()
      await notificationService.markAsRead(notificationId, sessionUser.id)

      return NextResponse.json({ success: true })
    }

    if (body.action === 'updateSettings') {
      const settings = updateSettingsSchema.parse(body)
      
      const notificationService = getNotificationService()
      await notificationService.updateUserSettings(sessionUser.id, settings)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 })

  } catch (error) {
    console.error('Erro na API de notificações:', error)
    
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

// PUT /api/notifications - Atualizar configurações
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as any

    const body = await request.json()
    const settings = updateSettingsSchema.parse(body)
    
    const notificationService = getNotificationService()
    await notificationService.updateUserSettings(sessionUser.id, settings)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao atualizar configurações:', error)
    
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

// DELETE /api/notifications - Deletar notificação
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as any

    const url = new URL(request.url)
    const notificationId = url.searchParams.get('id')
    
    if (!notificationId) {
      return NextResponse.json(
        { error: 'ID da notificação é obrigatório' },
        { status: 400 }
      )
    }

    // Deletar notificação
    await db.notification.delete({
      where: {
        id: notificationId,
        userId: sessionUser.id
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao deletar notificação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}