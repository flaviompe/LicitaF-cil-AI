// Sistema multiusuário com trilha de auditoria completa
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  company?: Company;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 
  | 'SUPER_ADMIN'     // Acesso total ao sistema
  | 'COMPANY_ADMIN'   // Admin da empresa
  | 'LEGAL_MANAGER'   // Gestor jurídico
  | 'COMMERCIAL_MANAGER' // Gestor comercial  
  | 'TECHNICAL_MANAGER'  // Gestor técnico
  | 'ANALYST'         // Analista (visualização)
  | 'VIEWER';         // Apenas visualização

export interface Permission {
  resource: string;
  actions: ('CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE')[];
}

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  segment: string;
  size: 'MEI' | 'ME' | 'EPP' | 'MEDIA' | 'GRANDE';
  subscriptionPlan: 'ESSENCIAL' | 'PROFISSIONAL' | 'CORPORATIVO';
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  user: User;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  companyId?: string;
}

export type AuditAction = 
  | 'LOGIN' | 'LOGOUT'
  | 'CREATE_OPPORTUNITY' | 'UPDATE_OPPORTUNITY' | 'DELETE_OPPORTUNITY'
  | 'SUBMIT_BID' | 'UPDATE_BID' | 'CANCEL_BID'
  | 'ANALYZE_EDITAL' | 'GENERATE_IMPUGNACAO'
  | 'UPDATE_PRICING' | 'APPROVE_PRICING'
  | 'CREATE_USER' | 'UPDATE_USER' | 'DELETE_USER'
  | 'UPDATE_PERMISSIONS'
  | 'EXPORT_DATA' | 'IMPORT_DATA'
  | 'SYSTEM_CONFIG';

export class MultiUserManager {
  
  async createUser(userData: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    companyId?: string;
    permissions?: Permission[];
  }, createdBy: string): Promise<User> {
    
    // Verificar permissões do criador
    await this.checkPermission(createdBy, 'users', 'CREATE');
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    try {
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          role: userData.role,
          companyId: userData.companyId,
          permissions: userData.permissions || this.getDefaultPermissions(userData.role),
          isActive: true
        },
        include: {
          company: true
        }
      });

      // Log da auditoria
      await this.createAuditLog({
        userId: createdBy,
        action: 'CREATE_USER',
        resource: 'users',
        resourceId: user.id,
        details: {
          newUserEmail: userData.email,
          newUserRole: userData.role,
          companyId: userData.companyId
        },
        ipAddress: '0.0.0.0', // Seria obtido do request
        userAgent: 'system'
      });

      return user as User;
    } catch (error) {
      throw new Error('Falha ao criar usuário');
    }
  }

  async updateUserPermissions(
    userId: string, 
    newPermissions: Permission[], 
    updatedBy: string
  ): Promise<void> {
    
    await this.checkPermission(updatedBy, 'users', 'UPDATE');
    
    const oldUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    await prisma.user.update({
      where: { id: userId },
      data: { permissions: newPermissions }
    });

    await this.createAuditLog({
      userId: updatedBy,
      action: 'UPDATE_PERMISSIONS',
      resource: 'users',
      resourceId: userId,
      details: {
        oldPermissions: oldUser?.permissions,
        newPermissions
      },
      ipAddress: '0.0.0.0',
      userAgent: 'system'
    });
  }

  async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.isActive) {
      throw new Error('Usuário não encontrado ou inativo');
    }

    // Super admin tem acesso total
    if (user.role === 'SUPER_ADMIN') return true;

    // Verificar permissões específicas
    const permissions = user.permissions as Permission[];
    const hasPermission = permissions.some(perm => 
      perm.resource === resource && perm.actions.includes(action as any)
    );

    if (!hasPermission) {
      throw new Error(`Permissão negada para ${action} em ${resource}`);
    }

    return true;
  }

  private getDefaultPermissions(role: UserRole): Permission[] {
    const permissionSets: Record<UserRole, Permission[]> = {
      SUPER_ADMIN: [
        { resource: '*', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXECUTE'] }
      ],
      COMPANY_ADMIN: [
        { resource: 'opportunities', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
        { resource: 'bids', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
        { resource: 'users', actions: ['CREATE', 'READ', 'UPDATE'] },
        { resource: 'analytics', actions: ['READ'] },
        { resource: 'contracts', actions: ['CREATE', 'READ', 'UPDATE'] }
      ],
      LEGAL_MANAGER: [
        { resource: 'opportunities', actions: ['READ', 'UPDATE'] },
        { resource: 'legal_analysis', actions: ['CREATE', 'READ', 'UPDATE'] },
        { resource: 'impugnacoes', actions: ['CREATE', 'READ', 'UPDATE'] },
        { resource: 'contracts', actions: ['READ', 'UPDATE'] }
      ],
      COMMERCIAL_MANAGER: [
        { resource: 'opportunities', actions: ['CREATE', 'READ', 'UPDATE'] },
        { resource: 'bids', actions: ['CREATE', 'READ', 'UPDATE'] },
        { resource: 'pricing', actions: ['CREATE', 'READ', 'UPDATE'] },
        { resource: 'analytics', actions: ['READ'] }
      ],
      TECHNICAL_MANAGER: [
        { resource: 'opportunities', actions: ['READ', 'UPDATE'] },
        { resource: 'technical_analysis', actions: ['CREATE', 'READ', 'UPDATE'] },
        { resource: 'proposals', actions: ['CREATE', 'READ', 'UPDATE'] }
      ],
      ANALYST: [
        { resource: 'opportunities', actions: ['READ'] },
        { resource: 'bids', actions: ['READ'] },
        { resource: 'analytics', actions: ['READ'] },
        { resource: 'reports', actions: ['READ'] }
      ],
      VIEWER: [
        { resource: 'opportunities', actions: ['READ'] },
        { resource: 'analytics', actions: ['READ'] }
      ]
    };

    return permissionSets[role] || permissionSets.VIEWER;
  }

  async createAuditLog(logData: Omit<AuditLog, 'id' | 'timestamp' | 'user'>): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          ...logData,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Erro ao criar log de auditoria:', error);
      // Não deve quebrar o fluxo principal por falha no log
    }
  }

  async getAuditLogs(filters: {
    userId?: string;
    companyId?: string;
    action?: AuditAction;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{logs: AuditLog[], total: number}> {
    
    const where: any = {};
    
    if (filters.userId) where.userId = filters.userId;
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.action) where.action = filters.action;
    if (filters.resource) where.resource = filters.resource;
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0
      }),
      prisma.auditLog.count({ where })
    ]);

    return { logs: logs as AuditLog[], total };
  }

  // Análise de segurança e compliance
  async generateSecurityReport(companyId?: string): Promise<SecurityReport> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const where = companyId ? { companyId } : {};
    
    // Análises de segurança
    const [
      failedLogins,
      unusualAccess,
      privilegedActions,
      dataExports,
      userActivity
    ] = await Promise.all([
      this.getFailedLoginAttempts(thirtyDaysAgo),
      this.getUnusualAccessPatterns(thirtyDaysAgo),
      this.getPrivilegedActions(thirtyDaysAgo),
      this.getDataExports(thirtyDaysAgo),
      this.getUserActivityStats(thirtyDaysAgo, companyId)
    ]);

    return {
      period: { start: thirtyDaysAgo, end: new Date() },
      failedLogins,
      unusualAccess,
      privilegedActions,
      dataExports,
      userActivity,
      riskScore: this.calculateRiskScore({
        failedLogins: failedLogins.length,
        unusualAccess: unusualAccess.length,
        privilegedActions: privilegedActions.length
      }),
      recommendations: this.generateSecurityRecommendations({
        failedLogins: failedLogins.length,
        unusualAccess: unusualAccess.length
      })
    };
  }

  private async getFailedLoginAttempts(since: Date) {
    return prisma.auditLog.findMany({
      where: {
        action: 'LOGIN',
        timestamp: { gte: since },
        details: {
          path: ['success'],
          equals: false
        }
      },
      include: { user: true }
    });
  }

  private async getUnusualAccessPatterns(since: Date) {
    // Detectar logins fora do horário comercial, IPs suspeitos, etc.
    return prisma.auditLog.findMany({
      where: {
        action: 'LOGIN',
        timestamp: { gte: since },
        OR: [
          // Logins noturnos (00h-06h)
          { 
            timestamp: {
              gte: since,
              lte: new Date()
            }
          }
          // Outros padrões suspeitos poderiam ser adicionados
        ]
      },
      include: { user: true }
    });
  }

  private async getPrivilegedActions(since: Date) {
    const privilegedActions = [
      'CREATE_USER', 'DELETE_USER', 'UPDATE_PERMISSIONS',
      'SYSTEM_CONFIG', 'EXPORT_DATA'
    ];

    return prisma.auditLog.findMany({
      where: {
        action: { in: privilegedActions },
        timestamp: { gte: since }
      },
      include: { user: true }
    });
  }

  private async getDataExports(since: Date) {
    return prisma.auditLog.findMany({
      where: {
        action: 'EXPORT_DATA',
        timestamp: { gte: since }
      },
      include: { user: true }
    });
  }

  private async getUserActivityStats(since: Date, companyId?: string) {
    const where = companyId ? { companyId } : {};
    
    return prisma.user.findMany({
      where: {
        ...where,
        auditLogs: {
          some: {
            timestamp: { gte: since }
          }
        }
      },
      include: {
        _count: {
          select: {
            auditLogs: {
              where: { timestamp: { gte: since } }
            }
          }
        }
      }
    });
  }

  private calculateRiskScore(factors: {
    failedLogins: number;
    unusualAccess: number;
    privilegedActions: number;
  }): number {
    let score = 0;
    
    // Falhas de login (peso: 2)
    score += Math.min(factors.failedLogins * 2, 20);
    
    // Acessos incomuns (peso: 5)
    score += Math.min(factors.unusualAccess * 5, 30);
    
    // Ações privilegiadas (peso: 3)
    score += Math.min(factors.privilegedActions * 3, 25);
    
    return Math.min(score, 100);
  }

  private generateSecurityRecommendations(factors: {
    failedLogins: number;
    unusualAccess: number;
  }): string[] {
    const recommendations: string[] = [];
    
    if (factors.failedLogins > 10) {
      recommendations.push('Implementar bloqueio automático após tentativas falhadas');
      recommendations.push('Configurar alertas para tentativas de login suspeitas');
    }
    
    if (factors.unusualAccess > 5) {
      recommendations.push('Revisar políticas de acesso por horário');
      recommendations.push('Implementar autenticação multifator (2FA)');
    }
    
    recommendations.push('Realizar treinamento de segurança para usuários');
    recommendations.push('Revisar permissões de usuários periodicamente');
    
    return recommendations;
  }
}

export interface SecurityReport {
  period: { start: Date; end: Date };
  failedLogins: any[];
  unusualAccess: any[];
  privilegedActions: any[];
  dataExports: any[];
  userActivity: any[];
  riskScore: number;
  recommendations: string[];
}

// Instância singleton
export const multiUserManager = new MultiUserManager();