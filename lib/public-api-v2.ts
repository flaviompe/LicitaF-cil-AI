// API Pública LicitaFácil v2.0 - Sistema Completo para Desenvolvedores
import { NextRequest, NextResponse } from 'next/server';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// Interfaces da API

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    version: string;
    rateLimit?: {
      limit: number;
      remaining: number;
      reset: number;
    };
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface APIKey {
  id: string;
  key: string;
  name: string;
  userId: string;
  permissions: APIPermission[];
  rateLimit: {
    requests: number;
    period: 'minute' | 'hour' | 'day';
  };
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date;
  expiresAt?: Date;
}

export interface APIPermission {
  resource: 'opportunities' | 'analysis' | 'proposals' | 'documents' | 'notifications' | 'analytics' | 'webhooks';
  actions: ('read' | 'write' | 'delete')[];
  scope?: 'own' | 'company' | 'all';
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  retryPolicy: {
    maxRetries: number;
    backoffStrategy: 'exponential' | 'linear';
    timeout: number;
  };
}

// Schemas de Validação

const CreateOpportunitySchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  organ: z.string().min(1),
  category: z.string(),
  value: z.number().positive(),
  deadline: z.string().datetime(),
  modalidade: z.enum(['PREGAO', 'CONCORRENCIA', 'TOMADA_PRECOS', 'CONVITE', 'CONCURSO', 'LEILAO']),
  tags: z.array(z.string()).optional()
});

const AnalysisRequestSchema = z.object({
  opportunityId: z.string().min(1),
  analysisType: z.enum(['QUICK', 'COMPREHENSIVE', 'COMPETITIVE', 'LEGAL']),
  options: z.object({
    includeVices: z.boolean().optional(),
    includePrecedents: z.boolean().optional(),
    includeStrategy: z.boolean().optional(),
    includeMEEPPAnalysis: z.boolean().optional()
  }).optional()
});

const ProposalSchema = z.object({
  opportunityId: z.string().min(1),
  proposedValue: z.number().positive(),
  technicalProposal: z.string().min(1),
  economicProposal: z.object({
    items: z.array(z.object({
      description: z.string(),
      quantity: z.number().positive(),
      unitValue: z.number().positive(),
      totalValue: z.number().positive()
    })),
    totalValue: z.number().positive(),
    taxes: z.number().optional(),
    discount: z.number().optional()
  }),
  documents: z.array(z.string()).optional(),
  validityDays: z.number().positive().optional()
});

const WebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  description: z.string().optional(),
  secret: z.string().optional()
});

// Classe Principal da API

export class LicitaFacilPublicAPI {
  private readonly version = '2.0.0';
  private readonly baseUrl = process.env.API_BASE_URL || 'https://api.licitafacil.ai/v2';
  
  // Rate Limiting por tipo de endpoint
  private readonly rateLimits = {
    opportunities: { requests: 1000, period: 'hour' as const },
    analysis: { requests: 100, period: 'hour' as const },
    proposals: { requests: 50, period: 'hour' as const },
    webhooks: { requests: 10, period: 'minute' as const },
    general: { requests: 500, period: 'hour' as const }
  };

  // CRUD de API Keys
  
  async createAPIKey(userId: string, config: {
    name: string;
    permissions: APIPermission[];
    rateLimit?: { requests: number; period: 'minute' | 'hour' | 'day' };
    expiresIn?: string; // '30d', '1y', 'never'
  }): Promise<APIKey> {
    
    const apiKey: APIKey = {
      id: `key_${Date.now()}`,
      key: `lfa_${this.generateSecureKey(32)}`,
      name: config.name,
      userId,
      permissions: config.permissions,
      rateLimit: config.rateLimit || { requests: 1000, period: 'hour' },
      isActive: true,
      createdAt: new Date(),
      expiresAt: config.expiresIn && config.expiresIn !== 'never' 
        ? new Date(Date.now() + this.parseExpiresIn(config.expiresIn))
        : undefined
    };

    // Salvar no banco
    console.log('Created API key:', apiKey.id);
    return apiKey;
  }

  async validateAPIKey(key: string): Promise<APIKey | null> {
    // Buscar no banco e validar
    console.log('Validating API key:', key.substring(0, 10) + '...');
    
    // Mock para demonstração
    if (key.startsWith('lfa_')) {
      return {
        id: 'key_demo',
        key,
        name: 'Demo Key',
        userId: 'user_demo',
        permissions: [
          { resource: 'opportunities', actions: ['read'], scope: 'all' },
          { resource: 'analysis', actions: ['read', 'write'], scope: 'own' }
        ],
        rateLimit: { requests: 1000, period: 'hour' },
        isActive: true,
        createdAt: new Date(),
        lastUsed: new Date()
      };
    }
    
    return null;
  }

  // Middleware de Autenticação e Rate Limiting

  async authenticate(request: NextRequest): Promise<{
    valid: boolean;
    apiKey?: APIKey;
    error?: string;
  }> {
    const authHeader = request.headers.get('Authorization');
    const apiKey = request.headers.get('X-API-Key');
    
    if (!authHeader && !apiKey) {
      return { valid: false, error: 'Missing authentication' };
    }

    if (apiKey) {
      const key = await this.validateAPIKey(apiKey);
      if (!key || !key.isActive) {
        return { valid: false, error: 'Invalid API key' };
      }
      
      if (key.expiresAt && key.expiresAt < new Date()) {
        return { valid: false, error: 'Expired API key' };
      }
      
      return { valid: true, apiKey: key };
    }

    // Validação JWT se não usar API key
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        jwt.verify(token, process.env.JWT_SECRET!);
        return { valid: true };
      } catch {
        return { valid: false, error: 'Invalid token' };
      }
    }

    return { valid: false, error: 'Invalid authentication method' };
  }

  async checkRateLimit(apiKey: APIKey, endpoint: string): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }> {
    const rateConfig = this.rateLimits[endpoint as keyof typeof this.rateLimits] 
      || this.rateLimits.general;
    
    // Implementar verificação real de rate limiting
    // Para demonstração, sempre permite
    return {
      allowed: true,
      limit: rateConfig.requests,
      remaining: rateConfig.requests - 1,
      reset: Date.now() + (rateConfig.period === 'hour' ? 3600000 : 
             rateConfig.period === 'minute' ? 60000 : 86400000)
    };
  }

  // Endpoints da API

  // 1. OPORTUNIDADES
  async getOpportunities(params: {
    page?: number;
    limit?: number;
    category?: string;
    minValue?: number;
    maxValue?: number;
    deadline?: string;
    organ?: string;
    search?: string;
    status?: 'OPEN' | 'CLOSED' | 'AWARDED';
  } = {}): Promise<APIResponse> {
    
    const {
      page = 1,
      limit = 20,
      category,
      minValue,
      maxValue,
      deadline,
      organ,
      search,
      status = 'OPEN'
    } = params;

    try {
      // Simular busca de oportunidades
      const opportunities = [
        {
          id: 'opp_001',
          title: 'Pregão Eletrônico nº 001/2025 - Serviços de TI',
          description: 'Contratação de serviços de desenvolvimento de software',
          organ: 'Ministério da Educação',
          category: 'Tecnologia da Informação',
          value: 150000,
          deadline: '2025-08-15T23:59:59Z',
          modalidade: 'PREGAO',
          status: 'OPEN',
          meAdvantage: true,
          publishedAt: '2025-07-21T10:00:00Z',
          tags: ['software', 'desenvolvimento', 'me/epp']
        }
      ];

      const total = opportunities.length;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: opportunities,
        meta: {
          timestamp: new Date().toISOString(),
          version: this.version,
          pagination: {
            page,
            limit,
            total,
            totalPages
          }
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch opportunities',
          details: error
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: this.version
        }
      };
    }
  }

  async getOpportunity(id: string): Promise<APIResponse> {
    try {
      // Buscar oportunidade específica
      const opportunity = {
        id,
        title: 'Pregão Eletrônico nº 001/2025 - Serviços de TI',
        description: 'Contratação de serviços de desenvolvimento de software...',
        organ: 'Ministério da Educação',
        category: 'Tecnologia da Informação',
        value: 150000,
        deadline: '2025-08-15T23:59:59Z',
        modalidade: 'PREGAO',
        status: 'OPEN',
        meAdvantage: true,
        publishedAt: '2025-07-21T10:00:00Z',
        documents: [
          { name: 'Edital Completo.pdf', url: '/documents/edital_001.pdf' },
          { name: 'Anexo I - Termo de Referência.pdf', url: '/documents/anexo1_001.pdf' }
        ],
        requirements: {
          habilitacao: ['CNPJ', 'Certidões Negativas', 'Balanço Patrimonial'],
          tecnica: ['Atestado de Capacidade Técnica', 'Certificado ISO 9001'],
          economica: ['Capital Social mínimo R$ 50.000']
        },
        timeline: {
          impugnacao: '2025-08-05T17:00:00Z',
          esclarecimentos: '2025-08-08T17:00:00Z',
          abertura: '2025-08-15T14:00:00Z'
        },
        tags: ['software', 'desenvolvimento', 'me/epp']
      };

      return {
        success: true,
        data: opportunity,
        meta: {
          timestamp: new Date().toISOString(),
          version: this.version
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Opportunity ${id} not found`
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: this.version
        }
      };
    }
  }

  async createOpportunity(data: z.infer<typeof CreateOpportunitySchema>, apiKey: APIKey): Promise<APIResponse> {
    
    // Validar permissões
    if (!this.hasPermission(apiKey, 'opportunities', 'write')) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to create opportunities'
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: this.version
        }
      };
    }

    try {
      const validated = CreateOpportunitySchema.parse(data);
      
      const opportunity = {
        id: `opp_${Date.now()}`,
        ...validated,
        status: 'OPEN' as const,
        createdAt: new Date().toISOString(),
        createdBy: apiKey.userId
      };

      // Salvar no banco
      console.log('Created opportunity:', opportunity.id);

      return {
        success: true,
        data: opportunity,
        meta: {
          timestamp: new Date().toISOString(),
          version: this.version
        }
      };
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid opportunity data',
            details: error.errors
          },
          meta: {
            timestamp: new Date().toISOString(),
            version: this.version
          }
        };
      }
      
      throw error;
    }
  }

  // 2. ANÁLISES JURÍDICAS
  async requestAnalysis(data: z.infer<typeof AnalysisRequestSchema>, apiKey: APIKey): Promise<APIResponse> {
    
    if (!this.hasPermission(apiKey, 'analysis', 'write')) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to request analysis'
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: this.version
        }
      };
    }

    try {
      const validated = AnalysisRequestSchema.parse(data);
      
      // Processar análise (integrar com IA jurídica)
      const analysis = {
        id: `analysis_${Date.now()}`,
        opportunityId: validated.opportunityId,
        type: validated.analysisType,
        status: 'PROCESSING',
        requestedAt: new Date().toISOString(),
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutos
        options: validated.options || {}
      };

      // Simular processamento assíncrono
      setTimeout(() => {
        this.completeAnalysis(analysis.id);
      }, 5000);

      return {
        success: true,
        data: analysis,
        meta: {
          timestamp: new Date().toISOString(),
          version: this.version
        }
      };
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid analysis request',
            details: error.errors
          },
          meta: {
            timestamp: new Date().toISOString(),
            version: this.version
          }
        };
      }
      
      throw error;
    }
  }

  async getAnalysis(id: string): Promise<APIResponse> {
    try {
      // Buscar análise completa
      const analysis = {
        id,
        opportunityId: 'opp_001',
        type: 'COMPREHENSIVE',
        status: 'COMPLETED',
        requestedAt: '2025-07-21T10:00:00Z',
        completedAt: '2025-07-21T10:05:00Z',
        results: {
          viabilityScore: 85,
          riskLevel: 'MEDIUM',
          legalCompliance: true,
          competitiveAdvantage: 'HIGH',
          estimatedParticipants: 5,
          recommendedStrategy: 'Participação recomendada com estratégia competitiva',
          vicesDetected: [
            {
              type: 'RESTRICTIVE',
              description: 'Exigência de experiência específica pode ser restritiva',
              severity: 'MEDIUM',
              suggestion: 'Considerar impugnação baseada no art. 30 da Lei 14.133/21'
            }
          ],
          meeppOpportunities: [
            {
              benefit: 'Empate ficto até 10%',
              applicability: 'HIGH',
              legalBasis: 'Art. 48, §2º da LC 123/2006'
            }
          ],
          precedents: [
            {
              acordao: 'Acórdão 1234/2024-TCU',
              relevance: 'HIGH',
              summary: 'Caso similar com decisão favorável para ME/EPP'
            }
          ]
        }
      };

      return {
        success: true,
        data: analysis,
        meta: {
          timestamp: new Date().toISOString(),
          version: this.version
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Analysis ${id} not found`
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: this.version
        }
      };
    }
  }

  // 3. PROPOSTAS
  async createProposal(data: z.infer<typeof ProposalSchema>, apiKey: APIKey): Promise<APIResponse> {
    
    if (!this.hasPermission(apiKey, 'proposals', 'write')) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to create proposals'
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: this.version
        }
      };
    }

    try {
      const validated = ProposalSchema.parse(data);
      
      const proposal = {
        id: `proposal_${Date.now()}`,
        ...validated,
        status: 'DRAFT' as const,
        createdAt: new Date().toISOString(),
        createdBy: apiKey.userId,
        version: 1
      };

      return {
        success: true,
        data: proposal,
        meta: {
          timestamp: new Date().toISOString(),
          version: this.version
        }
      };
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid proposal data',
            details: error.errors
          },
          meta: {
            timestamp: new Date().toISOString(),
            version: this.version
          }
        };
      }
      
      throw error;
    }
  }

  // 4. WEBHOOKS
  async createWebhook(data: z.infer<typeof WebhookSchema>, apiKey: APIKey): Promise<APIResponse> {
    
    if (!this.hasPermission(apiKey, 'webhooks', 'write')) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to create webhooks'
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: this.version
        }
      };
    }

    try {
      const validated = WebhookSchema.parse(data);
      
      const webhook: WebhookConfig = {
        id: `webhook_${Date.now()}`,
        url: validated.url,
        events: validated.events,
        secret: validated.secret || this.generateSecureKey(32),
        isActive: true,
        retryPolicy: {
          maxRetries: 3,
          backoffStrategy: 'exponential',
          timeout: 30000
        }
      };

      return {
        success: true,
        data: webhook,
        meta: {
          timestamp: new Date().toISOString(),
          version: this.version
        }
      };
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid webhook data',
            details: error.errors
          },
          meta: {
            timestamp: new Date().toISOString(),
            version: this.version
          }
        };
      }
      
      throw error;
    }
  }

  // 5. ANALYTICS E MÉTRICAS
  async getAnalytics(params: {
    startDate?: string;
    endDate?: string;
    metrics?: string[];
    groupBy?: 'day' | 'week' | 'month';
  } = {}): Promise<APIResponse> {
    
    try {
      const analytics = {
        period: {
          start: params.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: params.endDate || new Date().toISOString()
        },
        metrics: {
          totalOpportunities: 1247,
          analyzedOpportunities: 892,
          submittedProposals: 156,
          wonProposals: 23,
          winRate: 14.7,
          averageProposalValue: 89500,
          totalRevenue: 2058500,
          meeppBenefitsUsed: 45,
          impugnationsSubmitted: 12,
          successfulImpugnations: 8
        },
        trends: {
          opportunityGrowth: '+15.3%',
          analysisAccuracy: '94.2%',
          proposalSuccessRate: '+8.1%',
          averageResponseTime: '2.3s'
        },
        topCategories: [
          { name: 'Tecnologia da Informação', count: 234, winRate: 18.2 },
          { name: 'Consultoria', count: 156, winRate: 12.8 },
          { name: 'Serviços Gerais', count: 98, winRate: 15.3 }
        ]
      };

      return {
        success: true,
        data: analytics,
        meta: {
          timestamp: new Date().toISOString(),
          version: this.version
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: 'Failed to fetch analytics data'
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: this.version
        }
      };
    }
  }

  // Métodos auxiliares

  private generateSecureKey(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private parseExpiresIn(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));
    
    switch (unit) {
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
      case 'm': return value * 30 * 24 * 60 * 60 * 1000;
      case 'y': return value * 365 * 24 * 60 * 60 * 1000;
      default: return 30 * 24 * 60 * 60 * 1000; // 30 days default
    }
  }

  private hasPermission(apiKey: APIKey, resource: string, action: string): boolean {
    return apiKey.permissions.some(p => 
      p.resource === resource && p.actions.includes(action as any)
    );
  }

  private async completeAnalysis(analysisId: string): Promise<void> {
    console.log(`Analysis ${analysisId} completed - would trigger webhook if configured`);
    // Implementar webhook dispatch
  }

  // Sistema de Rate Limiting
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

  private isRateLimited(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const record = this.rateLimitStore.get(key);
    
    if (!record || record.resetTime <= now) {
      this.rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return false;
    }
    
    if (record.count >= limit) {
      return true;
    }
    
    record.count++;
    return false;
  }

  // Documentação da API (OpenAPI 3.0)
  getOpenAPISpec(): any {
    return {
      openapi: '3.0.0',
      info: {
        title: 'LicitaFácil API',
        version: this.version,
        description: 'API completa para gestão de licitações públicas com IA jurídica',
        contact: {
          name: 'Suporte LicitaFácil',
          email: 'api@licitafacil.ai',
          url: 'https://docs.licitafacil.ai'
        },
        license: {
          name: 'Commercial',
          url: 'https://licitafacil.ai/license'
        }
      },
      servers: [
        {
          url: this.baseUrl,
          description: 'Production server'
        },
        {
          url: 'https://api-staging.licitafacil.ai/v2',
          description: 'Staging server'
        }
      ],
      security: [
        { ApiKeyAuth: [] },
        { BearerAuth: [] }
      ],
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key'
          },
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        },
        schemas: {
          Opportunity: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'opp_001' },
              title: { type: 'string', example: 'Pregão Eletrônico nº 001/2025' },
              organ: { type: 'string', example: 'Ministério da Educação' },
              value: { type: 'number', example: 150000 },
              deadline: { type: 'string', format: 'date-time' },
              status: { type: 'string', enum: ['OPEN', 'CLOSED', 'AWARDED'] }
            }
          },
          Analysis: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'analysis_001' },
              viabilityScore: { type: 'number', minimum: 0, maximum: 100 },
              riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
              legalCompliance: { type: 'boolean' }
            }
          },
          Error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object' }
            }
          }
        }
      },
      paths: {
        '/opportunities': {
          get: {
            summary: 'Lista oportunidades de licitação',
            tags: ['Opportunities'],
            parameters: [
              {
                name: 'page',
                in: 'query',
                schema: { type: 'integer', minimum: 1, default: 1 }
              },
              {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
              },
              {
                name: 'category',
                in: 'query',
                schema: { type: 'string' }
              }
            ],
            responses: {
              200: {
                description: 'Lista de oportunidades',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Opportunity' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '/analysis': {
          post: {
            summary: 'Solicita análise jurídica de oportunidade',
            tags: ['Analysis'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      opportunityId: { type: 'string' },
                      analysisType: { 
                        type: 'string',
                        enum: ['QUICK', 'COMPREHENSIVE', 'COMPETITIVE', 'LEGAL']
                      }
                    },
                    required: ['opportunityId', 'analysisType']
                  }
                }
              }
            },
            responses: {
              201: {
                description: 'Análise solicitada com sucesso',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Analysis' }
                  }
                }
              }
            }
          }
        }
      }
    };
  }
}

// Instância singleton
export const publicAPI = new LicitaFacilPublicAPI();

// Helper para criar rotas Next.js
export function createAPIRoute(handler: (api: LicitaFacilPublicAPI, request: NextRequest, apiKey: APIKey) => Promise<APIResponse>) {
  return async (request: NextRequest) => {
    const api = publicAPI;
    
    // Autenticação
    const auth = await api.authenticate(request);
    if (!auth.valid) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: auth.error || 'Authentication required'
        }
      }, { status: 401 });
    }

    // Rate Limiting
    if (auth.apiKey) {
      const rateLimit = await api.checkRateLimit(auth.apiKey, 'general');
      if (!rateLimit.allowed) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded'
          },
          meta: {
            rateLimit: {
              limit: rateLimit.limit,
              remaining: rateLimit.remaining,
              reset: rateLimit.reset
            }
          }
        }, { status: 429 });
      }
    }

    try {
      const result = await handler(api, request, auth.apiKey!);
      
      // Adicionar headers de rate limit
      const response = NextResponse.json(result);
      if (auth.apiKey) {
        const rateLimit = await api.checkRateLimit(auth.apiKey, 'general');
        response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
        response.headers.set('X-RateLimit-Reset', rateLimit.reset.toString());
      }
      
      return response;
      
    } catch (error: any) {
      console.error('API Error:', error);
      return NextResponse.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      }, { status: 500 });
    }
  };
}