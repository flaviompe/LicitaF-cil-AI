import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { apiService, createWebhookSchema } from '@/lib/api-public'
import { z } from 'zod'

interface AuthenticatedUser {
  id: string
  name?: string | null
  email?: string | null
}

// GET /api/webhooks - Listar webhooks do usuário
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as AuthenticatedUser
    const webhooks = await apiService.getUserWebhooks(sessionUser.id)
    
    // Remover secret por segurança
    const safeWebhooks = webhooks.map(webhook => ({
      ...webhook,
      secret: webhook.secret.substring(0, 8) + '...'
    }))

    return NextResponse.json({ webhooks: safeWebhooks })

  } catch (error) {
    console.error('Erro ao buscar webhooks:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/webhooks - Criar novo webhook
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as AuthenticatedUser

    const body = await request.json()
    const data = createWebhookSchema.parse(body)
    
    // Buscar usuário e empresa
    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      include: { 
        company: true
      }
    })
    
    if (!user?.company) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      )
    }

    // TODO: Implementar lógica real de verificação de plano do usuário
    // Por enquanto, assumindo Professional para todos os usuários
    const allowWebhooks = true // Mudar para false quando implementar planos Starter
    
    // Verificar se o plano suporta webhooks
    if (!allowWebhooks) {
      return NextResponse.json(
        { error: 'Webhooks disponíveis apenas nos planos Professional e Enterprise' },
        { status: 403 }
      )
    }
    
    // Verificar limites do plano
    const existingWebhooks = await apiService.getUserWebhooks(sessionUser.id)
    
    // TODO: Implementar limites reais baseados no plano do usuário
    const maxWebhooks = 20 // Assumindo Enterprise por enquanto
    
    if (existingWebhooks.length >= maxWebhooks) {
      return NextResponse.json(
        { error: `Limite de ${maxWebhooks} webhooks atingido` },
        { status: 403 }
      )
    }

    // Testar URL do webhook
    try {
      const testResponse = await fetch(data.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LicitaFacil-Webhook-Test/1.0'
        },
        body: JSON.stringify({
          test: true,
          message: 'Teste de configuração do webhook'
        })
      })
      
      if (!testResponse.ok) {
        return NextResponse.json(
          { error: 'URL do webhook não está respondendo corretamente' },
          { status: 400 }
        )
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Falha ao conectar com a URL do webhook' },
        { status: 400 }
      )
    }

    // Criar webhook
    const webhook = await apiService.createWebhook(
      sessionUser.id,
      user.company.id,
      data.url,
      data.events
    )

    return NextResponse.json({
      webhook: {
        ...webhook,
        secret: webhook.secret // Mostrar secret completo apenas na criação
      }
    })

  } catch (error) {
    console.error('Erro ao criar webhook:', error)
    
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

// PUT /api/webhooks - Atualizar webhook
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as AuthenticatedUser

    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID do webhook é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o webhook pertence ao usuário
    const existingWebhook = await db.webhook.findFirst({
      where: {
        id,
        userId: sessionUser.id
      }
    })
    
    if (!existingWebhook) {
      return NextResponse.json(
        { error: 'Webhook não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar webhook
    const updatedWebhook = await db.webhook.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      webhook: {
        ...updatedWebhook,
        secret: updatedWebhook.secret.substring(0, 8) + '...'
      }
    })

  } catch (error) {
    console.error('Erro ao atualizar webhook:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/webhooks - Deletar webhook
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as AuthenticatedUser

    const url = new URL(request.url)
    const webhookId = url.searchParams.get('id')
    
    if (!webhookId) {
      return NextResponse.json(
        { error: 'ID do webhook é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o webhook pertence ao usuário
    const existingWebhook = await db.webhook.findFirst({
      where: {
        id: webhookId,
        userId: sessionUser.id
      }
    })
    
    if (!existingWebhook) {
      return NextResponse.json(
        { error: 'Webhook não encontrado' },
        { status: 404 }
      )
    }

    // Deletar webhook
    await db.webhook.delete({
      where: { id: webhookId }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao deletar webhook:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}