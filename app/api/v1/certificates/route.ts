import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiService } from '@/lib/api-public'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['ACTIVE', 'EXPIRED', 'REVOKED']).optional(),
  type: z.enum(['RECEITA_FEDERAL', 'FGTS', 'INSS', 'TRABALHISTA', 'ESTADUAL', 'MUNICIPAL', 'ANVISA', 'CREA', 'OTHER']).optional(),
  expiringDays: z.coerce.number().optional()
})

const createCertificateSchema = z.object({
  type: z.enum(['RECEITA_FEDERAL', 'FGTS', 'INSS', 'TRABALHISTA', 'ESTADUAL', 'MUNICIPAL', 'ANVISA', 'CREA', 'OTHER']),
  issuer: z.string().min(1).max(200),
  issueDate: z.string().datetime(),
  expiryDate: z.string().datetime(),
  documentUrl: z.string().optional(),
  observations: z.string().optional()
})

// GET /api/v1/certificates - Listar certificados
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const auth = await apiService.authenticate(request, ['certificates:read'])
    if ('error' in auth) {
      return auth as NextResponse
    }
    
    const { apiKey, rateLimit } = auth as { success: boolean; apiKey: any; rateLimit: any }
    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams)
    
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
    
    if (query.type) {
      where.type = query.type
    }
    
    if (query.expiringDays) {
      const expiringDate = new Date()
      expiringDate.setDate(expiringDate.getDate() + query.expiringDays)
      where.expiresAt = {
        lte: expiringDate
      }
      where.status = 'ACTIVE'
    }
    
    const [certificates, total] = await Promise.all([
      db.certificate.findMany({
        where,
        select: {
          id: true,
          type: true,
          issuer: true,
          issueDate: true,
          expiryDate: true,
          status: true,
          documentUrl: true,
          observations: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { expiryDate: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      db.certificate.count({ where })
    ])
    
    const responseTime = Date.now() - startTime
    const response = {
      data: certificates,
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
    
    await apiService.logApiUsage(
      apiKey.id,
      '/api/v1/certificates',
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
    console.error('Erro na API de certificados:', error)
    
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

// POST /api/v1/certificates - Criar certificado
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const auth = await apiService.authenticate(request, ['certificates:write'])
    if ('error' in auth) {
      return auth as NextResponse
    }
    
    const { apiKey, rateLimit } = auth as { success: boolean; apiKey: any; rateLimit: any }
    const body = await request.json()
    
    const data = createCertificateSchema.parse(body)
    
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
    
    // Verificar se já existe certificado do mesmo tipo para a empresa
    const existingCert = await db.certificate.findFirst({
      where: {
        companyId: user.company.id,
        type: data.type,
        status: { not: 'EXPIRED' }
      }
    })
    
    if (existingCert) {
      return NextResponse.json(
        { error: 'Active certificate of this type already exists for the company' },
        { status: 409 }
      )
    }
    
    const certificate = await db.certificate.create({
      data: {
        type: data.type,
        issuer: data.issuer,
        issueDate: new Date(data.issueDate),
        expiryDate: new Date(data.expiryDate),
        documentUrl: data.documentUrl,
        observations: data.observations,
        companyId: user.company.id,
        userId: user.id,
        status: 'VALID'
      }
    })
    
    const responseTime = Date.now() - startTime
    const response = {
      data: certificate,
      meta: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    }
    
    const responseBody = JSON.stringify(response)
    
    await apiService.logApiUsage(
      apiKey.id,
      '/api/v1/certificates',
      'POST',
      201,
      responseTime,
      JSON.stringify(body).length,
      responseBody.length,
      request.headers.get('User-Agent') || undefined,
      request.headers.get('X-Forwarded-For') || undefined
    )
    
    return NextResponse.json(response, {
      status: 201,
      headers: {
        'X-RateLimit-Limit': apiKey.rateLimit.requests.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString()
      }
    })
    
  } catch (error) {
    console.error('Erro ao criar certificado:', error)
    
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