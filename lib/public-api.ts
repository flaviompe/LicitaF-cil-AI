// API Pública com Autenticação JWT e Documentação Swagger
import express from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuração do Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LicitaFácil Pro API',
      version: '1.0.0',
      description: 'API completa para gestão inteligente de licitações públicas',
      contact: {
        name: 'Suporte LicitaFácil Pro',
        email: 'api@licitafacil.pro',
        url: 'https://licitafacil.pro/suporte'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://api.licitafacil.pro/v1',
        description: 'Servidor de Produção'
      },
      {
        url: 'https://staging-api.licitafacil.pro/v1', 
        description: 'Servidor de Homologação'
      },
      {
        url: 'http://localhost:3001/api/v1',
        description: 'Servidor de Desenvolvimento'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido através do endpoint /auth/login'
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'Chave API para integração de sistemas'
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Token de acesso necessário',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string', example: 'Token não fornecido' },
                  code: { type: 'string', example: 'UNAUTHORIZED' }
                }
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Permissão insuficiente',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string', example: 'Acesso negado' },
                  code: { type: 'string', example: 'FORBIDDEN' }
                }
              }
            }
          }
        },
        RateLimitError: {
          description: 'Limite de taxa excedido',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string', example: 'Muitas requisições' },
                  retryAfter: { type: 'number', example: 60 }
                }
              }
            }
          }
        }
      }
    },
    security: [
      { bearerAuth: [] },
      { apiKeyAuth: [] }
    ]
  },
  apis: ['./routes/*.ts', './models/*.ts'] // Caminhos para os arquivos com anotações
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Schemas de validação
const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
});

const CreateAPIKeySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  permissions: z.array(z.string()).min(1, 'Pelo menos uma permissão é necessária'),
  expiresAt: z.string().datetime().optional()
});

const OpportunityQuerySchema = z.object({
  category: z.string().optional(),
  entity: z.string().optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  status: z.enum(['OPEN', 'CLOSED', 'SUSPENDED']).optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['deadline', 'value', 'published', 'relevance']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

const BidSubmissionSchema = z.object({
  opportunityId: z.string().uuid('ID da oportunidade inválido'),
  technicalProposal: z.object({
    description: z.string().min(1),
    methodology: z.string(),
    timeline: z.string(),
    team: z.array(z.object({
      name: z.string(),
      role: z.string(),
      experience: z.string()
    }))
  }),
  commercialProposal: z.object({
    totalValue: z.number().positive('Valor deve ser positivo'),
    breakdown: z.array(z.object({
      item: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      totalPrice: z.number()
    })),
    paymentTerms: z.string(),
    warranty: z.string().optional()
  }),
  documents: z.array(z.object({
    name: z.string(),
    type: z.string(),
    url: z.string().url()
  }))
});

export interface APIKey {
  id: string;
  name: string;
  key: string;
  hashedKey: string;
  userId: string;
  permissions: string[];
  isActive: boolean;
  lastUsed?: Date;
  expiresAt?: Date;
  createdAt: Date;
  requestCount: number;
  dailyLimit: number;
}

export interface APIUsageStats {
  keyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}

export class PublicAPIManager {
  private app: express.Application;
  
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Segurança
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      }
    }));

    // CORS configurado
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
    }));

    // Rate limiting por IP
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 1000, // 1000 requests por IP por janela
      message: {
        error: 'Muitas requisições deste IP',
        retryAfter: 900
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    // Rate limiting para autenticação
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10, // 10 tentativas de login por IP
      message: {
        error: 'Muitas tentativas de login',
        retryAfter: 900
      }
    });

    this.app.use('/api/', generalLimiter);
    this.app.use('/api/auth/', authLimiter);

    // Parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging de requisições
    this.app.use(this.requestLogger);
  }

  private setupRoutes(): void {
    // Documentação Swagger
    this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'LicitaFácil Pro API Documentation'
    }));

    // Health check
    this.app.get('/api/health', this.healthCheck);

    // Autenticação
    this.app.post('/api/auth/login', this.login);
    this.app.post('/api/auth/refresh', this.authenticateToken, this.refreshToken);
    this.app.post('/api/auth/logout', this.authenticateToken, this.logout);

    // Gestão de API Keys
    this.app.post('/api/keys', this.authenticateToken, this.createAPIKey);
    this.app.get('/api/keys', this.authenticateToken, this.listAPIKeys);
    this.app.delete('/api/keys/:keyId', this.authenticateToken, this.revokeAPIKey);

    // Oportunidades
    this.app.get('/api/opportunities', this.authenticateRequest, this.getOpportunities);
    this.app.get('/api/opportunities/:id', this.authenticateRequest, this.getOpportunity);
    this.app.post('/api/opportunities/:id/watch', this.authenticateRequest, this.watchOpportunity);

    // Propostas
    this.app.post('/api/bids', this.authenticateRequest, this.submitBid);
    this.app.get('/api/bids', this.authenticateRequest, this.getBids);
    this.app.get('/api/bids/:id', this.authenticateRequest, this.getBid);
    this.app.put('/api/bids/:id', this.authenticateRequest, this.updateBid);

    // Análise Jurídica
    this.app.post('/api/legal/analyze', this.authenticateRequest, this.analyzeLegalDocument);
    this.app.post('/api/legal/impugnacao', this.authenticateRequest, this.generateImpugnacao);

    // Precificação Inteligente
    this.app.post('/api/pricing/analyze', this.authenticateRequest, this.analyzePricing);
    this.app.post('/api/pricing/recommend', this.authenticateRequest, this.recommendPricing);

    // Analytics
    this.app.get('/api/analytics/dashboard', this.authenticateRequest, this.getDashboardAnalytics);
    this.app.get('/api/analytics/performance', this.authenticateRequest, this.getPerformanceAnalytics);

    // Webhooks
    this.app.post('/api/webhooks/:endpoint', this.authenticateRequest, this.handleWebhook);

    // Exportação de dados
    this.app.get('/api/export/opportunities', this.authenticateRequest, this.exportOpportunities);
    this.app.get('/api/export/bids', this.authenticateRequest, this.exportBids);

    // Error handling
    this.app.use(this.errorHandler);
  }

  private requestLogger = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const startTime = Date.now();
    
    res.on('finish', async () => {
      const duration = Date.now() - startTime;
      
      // Log da requisição
      console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
      
      // Salvar estatísticas se for uma API key
      const apiKey = req.headers['x-api-key'] as string;
      if (apiKey) {
        await this.logAPIUsage({
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode,
          responseTime: duration,
          timestamp: new Date(),
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }, apiKey);
      }
    });
    
    next();
  };

  private authenticateToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido', code: 'UNAUTHORIZED' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({ error: 'Token inválido', code: 'FORBIDDEN' });
    }
  };

  private authenticateAPIKey = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({ error: 'API Key não fornecida', code: 'UNAUTHORIZED' });
    }

    try {
      const keyData = await this.validateAPIKey(apiKey);
      
      if (!keyData) {
        return res.status(403).json({ error: 'API Key inválida', code: 'FORBIDDEN' });
      }

      // Verificar rate limit da API key
      const rateLimitOk = await this.checkAPIKeyRateLimit(keyData.id);
      if (!rateLimitOk) {
        return res.status(429).json({ 
          error: 'Limite de requisições da API Key excedido',
          retryAfter: 3600 
        });
      }

      req.apiKey = keyData;
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Erro na validação da API Key' });
    }
  };

  private authenticateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Aceita tanto JWT quanto API Key
    const hasJWT = req.headers['authorization'];
    const hasAPIKey = req.headers['x-api-key'];

    if (hasJWT) {
      return this.authenticateToken(req, res, next);
    } else if (hasAPIKey) {
      return this.authenticateAPIKey(req, res, next);
    } else {
      return res.status(401).json({ 
        error: 'Autenticação necessária. Forneça um token JWT ou API Key',
        code: 'UNAUTHORIZED'
      });
    }
  };

  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Verificação de saúde da API
   *     description: Endpoint para verificar se a API está funcionando corretamente
   *     tags: [Sistema]
   *     responses:
   *       200:
   *         description: API funcionando normalmente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: "healthy"
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                 version:
   *                   type: string
   *                   example: "1.0.0"
   */
  private healthCheck = (req: express.Request, res: express.Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  };

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Autenticação de usuário
   *     description: Autentica um usuário e retorna um token JWT
   *     tags: [Autenticação]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "usuario@empresa.com"
   *               password:
   *                 type: string
   *                 format: password
   *                 example: "senha123"
   *     responses:
   *       200:
   *         description: Login realizado com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 token:
   *                   type: string
   *                   description: Token JWT para autenticação
   *                 refreshToken:
   *                   type: string
   *                   description: Token para renovação
   *                 user:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     email:
   *                       type: string
   *                     name:
   *                       type: string
   *                     role:
   *                       type: string
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  private login = async (req: express.Request, res: express.Response) => {
    try {
      const { email, password } = LoginSchema.parse(req.body);
      
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          password: true,
          isActive: true
        }
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Verificar senha (implementar bcrypt)
      const validPassword = await this.verifyPassword(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Gerar tokens
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.REFRESH_TOKEN_SECRET!,
        { expiresIn: '7d' }
      );

      // Salvar refresh token
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
        }
      });

      res.json({
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  /**
   * @swagger
   * /keys:
   *   post:
   *     summary: Criar nova API Key
   *     description: Cria uma nova chave de API para integração
   *     tags: [API Keys]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - permissions
   *             properties:
   *               name:
   *                 type: string
   *                 example: "Integração ERP"
   *               permissions:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["opportunities:read", "bids:write"]
   *               expiresAt:
   *                 type: string
   *                 format: date-time
   *                 example: "2024-12-31T23:59:59Z"
   *     responses:
   *       201:
   *         description: API Key criada com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   type: string
   *                 name:
   *                   type: string
   *                 key:
   *                   type: string
   *                   description: "Chave da API (mostrada apenas uma vez)"
   *                 permissions:
   *                   type: array
   *                   items:
   *                     type: string
   */
  private createAPIKey = async (req: express.Request, res: express.Response) => {
    try {
      const { name, permissions, expiresAt } = CreateAPIKeySchema.parse(req.body);
      const userId = req.user.userId;

      const apiKey = this.generateAPIKey();
      const hashedKey = await this.hashAPIKey(apiKey);

      const keyData = await prisma.apiKey.create({
        data: {
          name,
          key: apiKey.substring(0, 8) + '...',
          hashedKey,
          userId,
          permissions,
          isActive: true,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          requestCount: 0,
          dailyLimit: 10000
        }
      });

      res.status(201).json({
        id: keyData.id,
        name: keyData.name,
        key: apiKey, // Retorna apenas na criação
        permissions: keyData.permissions,
        expiresAt: keyData.expiresAt,
        dailyLimit: keyData.dailyLimit
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      }
      res.status(500).json({ error: 'Erro ao criar API Key' });
    }
  };

  /**
   * @swagger
   * /opportunities:
   *   get:
   *     summary: Listar oportunidades de licitação
   *     description: Retorna uma lista paginada de oportunidades com filtros
   *     tags: [Oportunidades]
   *     security:
   *       - bearerAuth: []
   *       - apiKeyAuth: []
   *     parameters:
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *         description: Categoria da licitação
   *       - in: query
   *         name: entity
   *         schema:
   *           type: string
   *         description: Órgão público
   *       - in: query
   *         name: minValue
   *         schema:
   *           type: number
   *         description: Valor mínimo
   *       - in: query
   *         name: maxValue
   *         schema:
   *           type: number
   *         description: Valor máximo
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Página
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *           maximum: 100
   *         description: Itens por página
   *     responses:
   *       200:
   *         description: Lista de oportunidades
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Opportunity'
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     page:
   *                       type: integer
   *                     limit:
   *                       type: integer
   *                     total:
   *                       type: integer
   *                     pages:
   *                       type: integer
   */
  private getOpportunities = async (req: express.Request, res: express.Response) => {
    try {
      const query = OpportunityQuerySchema.parse(req.query);
      
      const where: any = {};
      
      if (query.category) where.category = query.category;
      if (query.entity) where.entity = { contains: query.entity, mode: 'insensitive' };
      if (query.minValue || query.maxValue) {
        where.value = {};
        if (query.minValue) where.value.gte = query.minValue;
        if (query.maxValue) where.value.lte = query.maxValue;
      }
      if (query.status) where.status = query.status;
      if (query.state) where.state = query.state;
      if (query.city) where.city = { contains: query.city, mode: 'insensitive' };

      const orderBy = this.buildOrderBy(query.sortBy, query.sortOrder);
      
      const [opportunities, total] = await Promise.all([
        prisma.opportunity.findMany({
          where,
          orderBy,
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          include: {
            entity: true,
            _count: {
              select: { bids: true }
            }
          }
        }),
        prisma.opportunity.count({ where })
      ]);

      res.json({
        data: opportunities,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          pages: Math.ceil(total / query.limit)
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Parâmetros inválidos', details: error.errors });
      }
      res.status(500).json({ error: 'Erro ao buscar oportunidades' });
    }
  };

  // Implementar outros endpoints...

  private async validateAPIKey(key: string): Promise<APIKey | null> {
    try {
      const hashedKey = await this.hashAPIKey(key);
      
      const apiKey = await prisma.apiKey.findFirst({
        where: {
          hashedKey,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      });

      if (apiKey) {
        // Atualizar último uso
        await prisma.apiKey.update({
          where: { id: apiKey.id },
          data: { 
            lastUsed: new Date(),
            requestCount: { increment: 1 }
          }
        });
      }

      return apiKey as APIKey;
    } catch (error) {
      return null;
    }
  }

  private async checkAPIKeyRateLimit(keyId: string): Promise<boolean> {
    const key = await prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!key) return false;

    // Verificar limite diário (implementação simplificada)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyUsage = await prisma.apiUsageStats.count({
      where: {
        keyId,
        timestamp: { gte: today }
      }
    });

    return dailyUsage < key.dailyLimit;
  }

  private generateAPIKey(): string {
    const prefix = 'lf_';
    const random = require('crypto').randomBytes(32).toString('hex');
    return prefix + random;
  }

  private async hashAPIKey(key: string): Promise<string> {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const bcrypt = require('bcryptjs');
    return bcrypt.compare(password, hashedPassword);
  }

  private buildOrderBy(sortBy: string, sortOrder: string): any {
    const orderMap: Record<string, any> = {
      deadline: { deadline: sortOrder },
      value: { value: sortOrder },
      published: { publishedAt: sortOrder },
      relevance: [
        { value: 'desc' },
        { deadline: 'asc' }
      ]
    };

    return orderMap[sortBy] || orderMap.relevance;
  }

  private async logAPIUsage(stats: Omit<APIUsageStats, 'keyId'>, apiKey: string): Promise<void> {
    try {
      const keyData = await this.validateAPIKey(apiKey);
      if (keyData) {
        await prisma.apiUsageStats.create({
          data: {
            ...stats,
            keyId: keyData.id
          }
        });
      }
    } catch (error) {
      console.error('Erro ao registrar uso da API:', error);
    }
  }

  private errorHandler = (error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', error);

    if (error.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Payload muito grande' });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Dados inválidos', details: error.details });
    }

    res.status(500).json({ 
      error: 'Erro interno do servidor',
      requestId: req.headers['x-request-id'] || 'unknown'
    });
  };

  // Outros métodos privados não implementados por brevidade...
  private refreshToken = async (req: express.Request, res: express.Response) => {};
  private logout = async (req: express.Request, res: express.Response) => {};
  private listAPIKeys = async (req: express.Request, res: express.Response) => {};
  private revokeAPIKey = async (req: express.Request, res: express.Response) => {};
  private getOpportunity = async (req: express.Request, res: express.Response) => {};
  private watchOpportunity = async (req: express.Request, res: express.Response) => {};
  private submitBid = async (req: express.Request, res: express.Response) => {};
  private getBids = async (req: express.Request, res: express.Response) => {};
  private getBid = async (req: express.Request, res: express.Response) => {};
  private updateBid = async (req: express.Request, res: express.Response) => {};
  private analyzeLegalDocument = async (req: express.Request, res: express.Response) => {};
  private generateImpugnacao = async (req: express.Request, res: express.Response) => {};
  private analyzePricing = async (req: express.Request, res: express.Response) => {};
  private recommendPricing = async (req: express.Request, res: express.Response) => {};
  private getDashboardAnalytics = async (req: express.Request, res: express.Response) => {};
  private getPerformanceAnalytics = async (req: express.Request, res: express.Response) => {};
  private handleWebhook = async (req: express.Request, res: express.Response) => {};
  private exportOpportunities = async (req: express.Request, res: express.Response) => {};
  private exportBids = async (req: express.Request, res: express.Response) => {};

  public getApp(): express.Application {
    return this.app;
  }
}

// Instância singleton
export const publicAPI = new PublicAPIManager();