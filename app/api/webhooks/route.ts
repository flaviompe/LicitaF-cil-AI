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
  // TODO: Implementar após adicionar modelo Webhook ao schema Prisma
  return NextResponse.json(
    { error: 'Funcionalidade não implementada - modelo Webhook não existe no schema' },
    { status: 501 }
  )
}

// DELETE /api/webhooks - Deletar webhook
export async function DELETE(request: Request) {
  // TODO: Implementar após adicionar modelo Webhook ao schema Prisma
  return NextResponse.json(
    { error: 'Funcionalidade não implementada - modelo Webhook não existe no schema' },
    { status: 501 }
  )
}