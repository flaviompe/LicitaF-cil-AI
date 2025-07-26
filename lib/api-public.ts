import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'

export interface ApiKey {
  id: string
  userId: string
  companyId: string
  name: string
  key: string
  permissions: ApiPermission[]
  rateLimit: {
    requests: number
    window: number // em segundos
  }
  isActive: boolean
  lastUsed?: Date
  expiresAt?: Date
  createdAt: Date
}

export type ApiPermission = 
  | 'opportunities:read'
  | 'opportunities:write'
  | 'certificates:read'
  | 'certificates:write'
  | 'proposals:read'
  | 'proposals:write'
  | 'analytics:read'
  | 'notifications:send'
  | 'webhooks:manage'

export interface ApiUsage {
  id: string
  apiKeyId: string
  endpoint: string
  method: string
  statusCode: number
  responseTime: number
  requestSize: number
  responseSize: number
  userAgent?: string
  ipAddress?: string
  timestamp: Date
}

export interface WebhookEndpoint {
  id: string
  userId: string
  companyId: string
  url: string
  events: WebhookEvent[]
  secret: string
  isActive: boolean
  lastTriggered?: Date
  failureCount: number
  createdAt: Date
}

export type WebhookEvent = 
  | 'opportunity.created'
  | 'opportunity.updated'
  | 'certificate.expiring'
  | 'certificate.expired'
  | 'proposal.submitted'
  | 'proposal.deadline'
  | 'payment.success'
  | 'payment.failed'
  | 'analysis.completed'

export class ApiService {
  private static instance: ApiService
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map()

  private constructor() {}

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService()
    }
    return ApiService.instance
  }

  // Geração de chave API
  generateApiKey(): string {
    const prefix = 'lf_'
    const randomBytes = crypto.randomBytes(32).toString('hex')
    return prefix + randomBytes
  }

  // Geração de secret para webhook
  generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  // Autenticação da API
  async authenticateApiKey(apiKey: string): Promise<ApiKey | null> {
    try {
      const keyRecord = await db.apiKey.findUnique({
        where: { key: apiKey },
        include: {
          user: true,
          company: true
        }
      })

      if (!keyRecord || !keyRecord.isActive) {
        return null
      }

      // Verificar expiração
      if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
        return null
      }

      // Atualizar último uso
      await db.apiKey.update({
        where: { id: keyRecord.id },
        data: { lastUsed: new Date() }
      })

      return keyRecord as ApiKey
    } catch (error) {
      console.error('Erro na autenticação da API:', error)
      return null
    }
  }

  // Verificação de permissões
  hasPermission(apiKey: ApiKey, permission: ApiPermission): boolean {
    return apiKey.permissions.includes(permission)
  }

  // Rate limiting
  async checkRateLimit(apiKey: ApiKey): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = apiKey.id
    const now = Date.now()
    const windowMs = apiKey.rateLimit.window * 1000
    
    const current = this.rateLimitStore.get(key)
    
    if (!current || now > current.resetTime) {
      // Nova janela de rate limit
      const resetTime = now + windowMs
      this.rateLimitStore.set(key, { count: 1, resetTime })
      return {
        allowed: true,
        remaining: apiKey.rateLimit.requests - 1,
        resetTime
      }
    }
    
    if (current.count >= apiKey.rateLimit.requests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime
      }
    }
    
    // Incrementar contador
    current.count++
    this.rateLimitStore.set(key, current)
    
    return {
      allowed: true,
      remaining: apiKey.rateLimit.requests - current.count,
      resetTime: current.resetTime
    }
  }

  // Logging de uso da API
  async logApiUsage(
    apiKeyId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    requestSize: number,
    responseSize: number,
    userAgent?: string,
    ipAddress?: string
  ) {
    try {
      await db.apiUsage.create({
        data: {
          apiKeyId,
          endpoint,
          method,
          statusCode,
          responseTime,
          requestSize,
          responseSize,
          userAgent,
          ipAddress
        }
      })
    } catch (error) {
      console.error('Erro ao registrar uso da API:', error)
    }
  }

  // Middleware para autenticação e rate limiting
  async authenticate(req: NextRequest, requiredPermissions: ApiPermission[] = []) {
    const apiKey = req.headers.get('X-API-Key')
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 401 }
      )
    }

    const keyRecord = await this.authenticateApiKey(apiKey)
    
    if (!keyRecord) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    // Verificar permissões
    for (const permission of requiredPermissions) {
      if (!this.hasPermission(keyRecord, permission)) {
        return NextResponse.json(
          { error: `Missing permission: ${permission}` },
          { status: 403 }
        )
      }
    }

    // Verificar rate limit
    const rateLimit = await this.checkRateLimit(keyRecord)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': keyRecord.rateLimit.requests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetTime.toString()
          }
        }
      )
    }

    return { success: true, apiKey: keyRecord, rateLimit }
  }

  // Criar chave API
  async createApiKey(
    userId: string,
    companyId: string,
    name: string,
    permissions: ApiPermission[],
    rateLimit: { requests: number; window: number },
    expiresAt?: Date
  ): Promise<ApiKey> {
    const key = this.generateApiKey()
    
    const apiKeyRecord = await db.apiKey.create({
      data: {
        userId,
        companyId,
        name,
        key,
        permissions,
        rateLimit,
        expiresAt,
        isActive: true
      }
    })

    return apiKeyRecord as ApiKey
  }

  // Listar chaves API do usuário
  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    const apiKeys = await db.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    return apiKeys as ApiKey[]
  }

  // Revogar chave API
  async revokeApiKey(keyId: string, userId: string): Promise<boolean> {
    try {
      await db.apiKey.update({
        where: { 
          id: keyId,
          userId: userId 
        },
        data: { isActive: false }
      })
      return true
    } catch (error) {
      console.error('Erro ao revogar chave API:', error)
      return false
    }
  }

  // Webhook management
  async createWebhook(
    userId: string,
    companyId: string,
    url: string,
    events: WebhookEvent[]
  ): Promise<WebhookEndpoint> {
    // TODO: Implementar após adicionar modelo Webhook ao schema Prisma
    const secret = this.generateWebhookSecret()
    
    // Retornar mock temporário
    return {
      id: crypto.randomUUID(),
      userId,
      companyId,
      url,
      events,
      secret,
      isActive: true,
      failureCount: 0,
      createdAt: new Date()
    }
  }

  // Enviar webhook
  async sendWebhook(
    webhookId: string,
    event: WebhookEvent,
    data: any
  ): Promise<boolean> {
    try {
      const webhook = await db.webhook.findUnique({
        where: { id: webhookId }
      })

      if (!webhook || !webhook.isActive) {
        return false
      }

      if (!webhook.events.includes(event)) {
        return false
      }

      const payload = {
        event,
        data,
        timestamp: new Date().toISOString()
      }

      // Gerar assinatura
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(JSON.stringify(payload))
        .digest('hex')

      // Enviar webhook
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': event,
          'User-Agent': 'LicitaFacil-Webhook/1.0'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        // Resetar contador de falhas
        await db.webhook.update({
          where: { id: webhookId },
          data: {
            lastTriggered: new Date(),
            failureCount: 0
          }
        })
        return true
      } else {
        // Incrementar contador de falhas
        await db.webhook.update({
          where: { id: webhookId },
          data: {
            failureCount: { increment: 1 }
          }
        })
        
        // Desativar webhook após muitas falhas
        if (webhook.failureCount >= 5) {
          await db.webhook.update({
            where: { id: webhookId },
            data: { isActive: false }
          })
        }
        
        return false
      }
    } catch (error) {
      console.error('Erro ao enviar webhook:', error)
      return false
    }
  }

  // Listar webhooks do usuário
  async getUserWebhooks(userId: string): Promise<WebhookEndpoint[]> {
    // TODO: Implementar após adicionar modelo Webhook ao schema Prisma
    return []
  }

  // Validar assinatura de webhook
  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
    
    return `sha256=${expectedSignature}` === signature
  }

  // Obter estatísticas de uso da API
  async getApiUsageStats(apiKeyId: string, days: number = 30): Promise<{
    totalRequests: number
    successRate: number
    averageResponseTime: number
    requestsByDay: Array<{ date: string; count: number }>
    topEndpoints: Array<{ endpoint: string; count: number }>
  }> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const usage = await db.apiUsage.findMany({
      where: {
        apiKeyId,
        timestamp: {
          gte: startDate
        }
      },
      orderBy: { timestamp: 'desc' }
    })

    const totalRequests = usage.length
    const successfulRequests = usage.filter(u => u.statusCode >= 200 && u.statusCode < 400).length
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0
    const averageResponseTime = totalRequests > 0 
      ? usage.reduce((sum, u) => sum + u.responseTime, 0) / totalRequests 
      : 0

    // Requests por dia
    const requestsByDay = usage.reduce((acc, u) => {
      const date = u.timestamp.toISOString().split('T')[0]
      const existing = acc.find(item => item.date === date)
      if (existing) {
        existing.count++
      } else {
        acc.push({ date, count: 1 })
      }
      return acc
    }, [] as Array<{ date: string; count: number }>)

    // Top endpoints
    const endpointCounts = usage.reduce((acc, u) => {
      acc[u.endpoint] = (acc[u.endpoint] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topEndpoints = Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalRequests,
      successRate,
      averageResponseTime,
      requestsByDay,
      topEndpoints
    }
  }

  // Limpar dados antigos de rate limit
  clearOldRateLimitData() {
    const now = Date.now()
    for (const [key, data] of this.rateLimitStore.entries()) {
      if (now > data.resetTime) {
        this.rateLimitStore.delete(key)
      }
    }
  }
}

// Schemas para validação
export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.enum([
    'opportunities:read',
    'opportunities:write',
    'certificates:read',
    'certificates:write',
    'proposals:read',
    'proposals:write',
    'analytics:read',
    'notifications:send',
    'webhooks:manage'
  ])),
  rateLimit: z.object({
    requests: z.number().min(1).max(10000),
    window: z.number().min(1).max(3600)
  }),
  expiresAt: z.string().optional()
})

export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum([
    'opportunity.created',
    'opportunity.updated',
    'certificate.expiring',
    'certificate.expired',
    'proposal.submitted',
    'proposal.deadline',
    'payment.success',
    'payment.failed',
    'analysis.completed'
  ]))
})

// Instância singleton
export const apiService = ApiService.getInstance()

// Limpar dados antigos a cada hora
setInterval(() => {
  apiService.clearOldRateLimitData()
}, 60 * 60 * 1000)