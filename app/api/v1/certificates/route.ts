import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiService } from '@/lib/api-public'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['ACTIVE', 'EXPIRED', 'REVOKED']).optional(),
  type: z.enum(['A1', 'A3']).optional(),
  expiringDays: z.coerce.number().optional()
})

const createCertificateSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['A1', 'A3']),
  serialNumber: z.string().min(1).max(100),
  issuer: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  thumbprint: z.string().optional(),
  keyUsage: z.array(z.string()).optional()
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
          name: true,
          type: true,
          serialNumber: true,
          issuer: true,
          subject: true,
          issuedAt: true,
          expiresAt: true,
          status: true,
          thumbprint: true,
          keyUsage: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { expiresAt: 'asc' },
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
    if (!auth.success) {
      return auth as NextResponse
    }

    const { apiKey, rateLimit } = auth
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
    
    // Verificar se já existe certificado com o mesmo número de série
    const existingCert = await db.certificate.findUnique({
      where: {
        companyId_serialNumber: {
          companyId: user.company.id,
          serialNumber: data.serialNumber
        }
      }
    })
    
    if (existingCert) {
      return NextResponse.json(
        { error: 'Certificate with this serial number already exists' },
        { status: 409 }
      )
    }
    
    const certificate = await db.certificate.create({
      data: {
        ...data,
        issuedAt: new Date(data.issuedAt),
        expiresAt: new Date(data.expiresAt),
        companyId: user.company.id,
        status: 'ACTIVE'
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