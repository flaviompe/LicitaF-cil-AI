/**
 * Rate Limiting Implementation
 * Protege contra abuso de API e ataques de força bruta
 */

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

class RateLimiter {
  private store: RateLimitStore = {}
  private defaultLimit: number = 100 // requests per window
  private defaultWindow: number = 15 * 60 * 1000 // 15 minutes

  /**
   * Verifica se uma requisição deve ser bloqueada por rate limiting
   */
  checkLimit(
    identifier: string,
    limit: number = this.defaultLimit,
    windowMs: number = this.defaultWindow
  ): {
    allowed: boolean
    remaining: number
    resetTime: number
  } {
    const now = Date.now()
    const key = `${identifier}:${Math.floor(now / windowMs)}`
    
    // Limpar entradas antigas
    this.cleanup(now, windowMs)
    
    const current = this.store[key] || { count: 0, resetTime: now + windowMs }
    
    if (current.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime
      }
    }
    
    current.count++
    this.store[key] = current
    
    return {
      allowed: true,
      remaining: limit - current.count,
      resetTime: current.resetTime
    }
  }

  /**
   * Remove entradas antigas do store
   */
  private cleanup(now: number, windowMs: number) {
    const cutoff = now - windowMs * 2 // Manter 2 janelas para transições
    
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < cutoff) {
        delete this.store[key]
      }
    })
  }

  /**
   * Configurações específicas para diferentes endpoints
   */
  static readonly configs = {
    // Autenticação - mais restritivo
    auth: {
      limit: 5, // 5 tentativas
      window: 15 * 60 * 1000, // 15 minutos
    },
    
    // Registro - prevenir spam
    register: {
      limit: 3, // 3 registros
      window: 60 * 60 * 1000, // 1 hora
    },
    
    // Chat - moderado
    chat: {
      limit: 50, // 50 mensagens
      window: 5 * 60 * 1000, // 5 minutos
    },
    
    // APIs v1 - padrão
    api: {
      limit: 100, // 100 requests
      window: 15 * 60 * 1000, // 15 minutos
    },
    
    // Email - restritivo
    email: {
      limit: 10, // 10 emails
      window: 60 * 60 * 1000, // 1 hora
    }
  }
}

// Instância global do rate limiter
export const rateLimiter = new RateLimiter()

/**
 * Middleware para aplicar rate limiting
 */
export function createRateLimitMiddleware(
  config: { limit: number; window: number } = RateLimiter.configs.api
) {
  return (identifier: string) => {
    const result = rateLimiter.checkLimit(identifier, config.limit, config.window)
    
    if (!result.allowed) {
      const resetDate = new Date(result.resetTime).toISOString()
      throw new Error(`Rate limit exceeded. Try again at ${resetDate}`)
    }
    
    return {
      'X-RateLimit-Limit': config.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetTime.toString()
    }
  }
}

/**
 * Utilitário para extrair identificador da requisição
 */
export function getClientIdentifier(request: Request): string {
  // Prioridade: IP real > Forwarded IP > User agent como fallback
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  const ip = realIP || 
             (forwarded ? forwarded.split(',')[0].trim() : null) ||
             'unknown-ip'
  
  return `${ip}:${userAgent.slice(0, 50)}`
}

/**
 * Rate limiter específico por usuário autenticado
 */
export function getUserRateLimit(userId: string, action: keyof typeof RateLimiter.configs) {
  const config = RateLimiter.configs[action]
  const identifier = `user:${userId}:${action}`
  
  return rateLimiter.checkLimit(identifier, config.limit, config.window)
}

export default rateLimiter