import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getNotificationService } from '@/lib/notifications'
import { z } from 'zod'

const sendFromTemplateSchema = z.object({
  templateId: z.string(),
  variables: z.record(z.any()),
  options: z.object({
    companyId: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    scheduledFor: z.string().optional(),
    actionUrl: z.string().optional()
  }).optional()
})

const testNotificationSchema = z.object({
  channel: z.enum(['email', 'whatsapp', 'telegram', 'push', 'sms'])
})

// GET /api/notifications/templates - Buscar templates disponíveis
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as { id: string }

    const notificationService = getNotificationService()
    const templates = notificationService.getTemplates()

    return NextResponse.json({
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        type: template.type,
        channels: template.channels,
        variables: template.variables,
        enabled: template.enabled,
        preview: {
          title: template.template.title,
          message: template.template.message,
          actionText: template.template.actionText
        }
      }))
    })

  } catch (error) {
    console.error('Erro ao buscar templates:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/notifications/templates - Enviar notificação usando template
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as { id: string }

    const body = await request.json()
    
    if (body.action === 'sendFromTemplate') {
      const { templateId, variables, options } = sendFromTemplateSchema.parse(body)
      
      const notificationService = getNotificationService()
      
      await notificationService.sendFromTemplate(
        templateId,
        sessionUser.id,
        variables,
        {
          ...options,
          scheduledFor: options?.scheduledFor ? new Date(options.scheduledFor) : undefined
        }
      )

      return NextResponse.json({ success: true })
    }

    if (body.action === 'test') {
      const { channel } = testNotificationSchema.parse(body)
      
      const notificationService = getNotificationService()
      
      // Enviar notificação de teste
      await notificationService.sendNotification({
        userId: sessionUser.id,
        type: 'system',
        title: 'Teste de Notificação',
        message: `Esta é uma notificação de teste via ${channel}. Se você recebeu esta mensagem, o canal está funcionando corretamente.`,
        priority: 'low',
        channels: [channel],
        metadata: { isTest: true }
      })

      return NextResponse.json({ 
        success: true, 
        message: `Notificação de teste enviada via ${channel}` 
      })
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 })

  } catch (error) {
    console.error('Erro na API de templates:', error)
    
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

// PUT /api/notifications/templates - Atualizar template (apenas Enterprise)
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as { id: string }

    // Verificar se o usuário tem plano Enterprise
    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        company: true
      }
    })

    const currentPlan: 'Starter' | 'Professional' | 'Enterprise' = 'Professional' // Temporariamente definir como Professional
    
    if (currentPlan !== 'Enterprise') {
      return NextResponse.json(
        { error: 'Recurso disponível apenas no plano Enterprise' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { templateId, ...updates } = body
    
    const notificationService = getNotificationService()
    notificationService.updateTemplate(templateId, updates)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao atualizar template:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}