import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiService } from '@/lib/api-public'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['OPEN', 'CLOSED', 'CANCELLED']).optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  minValue: z.coerce.number().optional(),
  maxValue: z.coerce.number().optional()
})

const createOpportunitySchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  editalNumber: z.string().min(1).max(100),
  organ: z.string().min(1).max(200),
  publishDate: z.string().datetime(),
  openingDate: z.string().datetime(),
  bidType: z.enum(['PREGAO_ELETRONICO', 'CONCORRENCIA', 'TOMADA_PRECO', 'CONVITE']),
  value: z.number().positive().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  documents: z.array(z.object({
    name: z.string(),
    url: z.string().url()
  })).optional()
})

// GET /api/v1/opportunities - Listar oportunidades
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Autenticar e verificar permissões
    const auth = await apiService.authenticate(request, ['opportunities:read'])
    if (!auth.success) {
      return auth as NextResponse
    }

    const { apiKey, rateLimit } = auth
    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams)
    
    // Validar parâmetros
    const query = querySchema.parse(params)
    
    // Construir filtros
    const where: any = {
      company: {
        userId: apiKey.userId
      }
    }
    
    if (query.status) {
      where.status = query.status
    }
    
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { organ: { contains: query.search, mode: 'insensitive' } }
      ]
    }
    
    if (query.dateFrom) {
      where.publishDate = {
        gte: new Date(query.dateFrom)
      }
    }
    
    if (query.dateTo) {
      where.publishDate = {
        ...where.publishDate,
        lte: new Date(query.dateTo)
      }
    }
    
    if (query.minValue || query.maxValue) {
      where.value = {}
      if (query.minValue) where.value.gte = query.minValue
      if (query.maxValue) where.value.lte = query.maxValue
    }
    
    // Buscar oportunidades
    const [opportunities, total] = await Promise.all([
      db.opportunity.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          editalNumber: true,
          organ: true,
          publishDate: true,
          openingDate: true,
          bidType: true,
          value: true,
          status: true,
          category: true,
          tags: true,
          requirements: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { publishDate: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      db.opportunity.count({ where })
    ])
    
    const responseTime = Date.now() - startTime
    const response = {
      data: opportunities,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit)
      },
      meta: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    }
    
    const responseBody = JSON.stringify(response)
    
    // Log da API
    await apiService.logApiUsage(
      apiKey.id,
      '/api/v1/opportunities',
      'GET',
      200,
      responseTime,
      JSON.stringify(params).length,
      responseBody.length,
      request.headers.get('User-Agent') || undefined,
      request.headers.get('X-Forwarded-For') || undefined
    )
    
    return NextResponse.json(response, {
      headers: {
        'X-RateLimit-Limit': apiKey.rateLimit.requests.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString()
      }
    })
    
  } catch (error) {
    console.error('Erro na API de oportunidades:', error)
    
    const responseTime = Date.now() - startTime
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid parameters',
          details: error.errors,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/opportunities - Criar oportunidade
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Autenticar e verificar permissões
    const auth = await apiService.authenticate(request, ['opportunities:write'])
    if (!auth.success) {
      return auth as NextResponse
    }

    const { apiKey, rateLimit } = auth
    const body = await request.json()
    
    // Validar dados
    const data = createOpportunitySchema.parse(body)
    
    // Buscar empresa do usuário
    const user = await db.user.findUnique({
      where: { id: apiKey.userId },
      include: { company: true }
    })
    
    if (!user?.company) {
      return NextResponse.json(
        { error: 'User company not found' },
        { status: 404 }
      )
    }
    
    // Criar oportunidade
    const opportunity = await db.opportunity.create({
      data: {
        ...data,
        publishDate: new Date(data.publishDate),
        openingDate: new Date(data.openingDate),
        companyId: user.company.id,
        status: 'OPEN'
      }
    })
    
    const responseTime = Date.now() - startTime
    const response = {
      data: opportunity,
      meta: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    }
    
    const responseBody = JSON.stringify(response)
    
    // Log da API
    await apiService.logApiUsage(
      apiKey.id,
      '/api/v1/opportunities',
      'POST',
      201,
      responseTime,
      JSON.stringify(body).length,
      responseBody.length,
      request.headers.get('User-Agent') || undefined,
      request.headers.get('X-Forwarded-For') || undefined
    )
    
    // Enviar webhook se configurado
    const webhooks = await apiService.getUserWebhooks(apiKey.userId)
    for (const webhook of webhooks) {
      if (webhook.events.includes('opportunity.created')) {
        await apiService.sendWebhook(webhook.id, 'opportunity.created', {
          opportunity: {
            id: opportunity.id,
            title: opportunity.title,
            organ: opportunity.organ,
            value: opportunity.value,
            publishDate: opportunity.publishDate
          }
        })
      }
    }
    
    return NextResponse.json(response, {
      status: 201,
      headers: {
        'X-RateLimit-Limit': apiKey.rateLimit.requests.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString()
      }
    })
    
  } catch (error) {
    console.error('Erro ao criar oportunidade:', error)
    
    const responseTime = Date.now() - startTime
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}