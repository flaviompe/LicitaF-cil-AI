import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { apiService, createApiKeySchema, ApiPermission } from '@/lib/api-public'
import { z } from 'zod'

// GET /api/api-keys - Listar chaves API do usuário
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as { id: string }
    const apiKeys = await apiService.getUserApiKeys(sessionUser.id)
    
    // Remover a chave real por segurança
    const safeApiKeys = apiKeys.map(key => ({
      ...key,
      key: key.key.substring(0, 8) + '...' + key.key.substring(key.key.length - 8)
    }))

    return NextResponse.json({ apiKeys: safeApiKeys })

  } catch (error) {
    console.error('Erro ao buscar chaves API:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/api-keys - Criar nova chave API
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as { id: string }

    const body = await request.json()
    const data = createApiKeySchema.parse(body)
    
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

    const currentPlan = 'Pro' // Temporariamente definir como Pro
    
    // Verificar limites do plano
    const existingKeys = await apiService.getUserApiKeys(sessionUser.id)
    const planLimits = {
      'Starter': { maxKeys: 1, maxRequests: 100 },
      'Professional': { maxKeys: 5, maxRequests: 1000 },
      'Enterprise': { maxKeys: 50, maxRequests: 10000 }
    }
    
    const currentLimits = planLimits[currentPlan as keyof typeof planLimits] || planLimits['Starter']
    
    if (existingKeys.length >= currentLimits.maxKeys) {
      return NextResponse.json(
        { error: `Limite de ${currentLimits.maxKeys} chaves API atingido para o plano ${currentPlan}` },
        { status: 403 }
      )
    }

    // Validar rate limit
    if (data.rateLimit.requests > currentLimits.maxRequests) {
      return NextResponse.json(
        { error: `Limite máximo de ${currentLimits.maxRequests} requisições/hora para o plano ${currentPlan}` },
        { status: 403 }
      )
    }

    // Criar chave API
    const apiKey = await apiService.createApiKey(
      sessionUser.id,
      user.company.id,
      data.name,
      data.permissions,
      data.rateLimit,
      data.expiresAt ? new Date(data.expiresAt) : undefined
    )

    return NextResponse.json({
      apiKey: {
        ...apiKey,
        key: apiKey.key // Mostrar chave completa apenas na criação
      }
    })

  } catch (error) {
    console.error('Erro ao criar chave API:', error)
    
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

// DELETE /api/api-keys - Revogar chave API
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as { id: string }

    const url = new URL(request.url)
    const keyId = url.searchParams.get('id')
    
    if (!keyId) {
      return NextResponse.json(
        { error: 'ID da chave é obrigatório' },
        { status: 400 }
      )
    }

    const success = await apiService.revokeApiKey(keyId, sessionUser.id)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Chave não encontrada ou não autorizada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao revogar chave API:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}