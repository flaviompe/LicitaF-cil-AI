// Sistema Avançado de Compliance e Auditoria para Licitações Públicas
import { EventEmitter } from 'events'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

export interface ComplianceRule {
  id: string
  name: string
  description: string
  category: 'LGPD' | 'SECURITY' | 'LEGAL' | 'OPERATIONAL' | 'FINANCIAL' | 'TECHNICAL'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  regulation: string // Lei ou norma aplicável
  checkFunction: string // Nome da função de verificação
  autoCheck: boolean
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ON_EVENT'
  enabled: boolean
  remediation: string // Ações para correção
  metadata: Record<string, any>
}

export interface AuditEvent {
  id: string
  timestamp: Date
  userId?: string
  sessionId?: string
  action: string
  resource: string
  resourceId?: string
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
  success: boolean
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category: 'AUTH' | 'DATA' | 'SYSTEM' | 'BUSINESS' | 'SECURITY'
  compliance: {
    lgpd: boolean
    dataProcessing: boolean
    sensitiveData: boolean
  }
}

export interface ComplianceViolation {
  id: string
  ruleId: string
  ruleName: string
  severity: ComplianceRule['severity']
  category: ComplianceRule['category']
  description: string
  detectedAt: Date
  resolvedAt?: Date
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'FALSE_POSITIVE'
  assignedTo?: string
  evidence: AuditEvent[]
  remediation: {
    required: boolean
    actions: string[]
    deadline?: Date
    completed: boolean
    completedAt?: Date
    completedBy?: string
  }
  impact: {
    dataSubjects?: number
    businessCritical: boolean
    externalReporting: boolean
    financialImpact?: number
  }
  metadata: Record<string, any>
}

export interface DataProcessingActivity {
  id: string
  name: string
  purpose: string
  legalBasis: 'CONSENT' | 'CONTRACT' | 'LEGAL_OBLIGATION' | 'VITAL_INTERESTS' | 'PUBLIC_TASK' | 'LEGITIMATE_INTERESTS'
  dataCategories: string[]
  dataSubjects: string[]
  recipients: string[]
  internationalTransfers: boolean
  retentionPeriod: string
  securityMeasures: string[]
  privacyImpactAssessment: boolean
  consentRecords: boolean
  automated: boolean
  profiling: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SecurityIncident {
  id: string
  title: string
  description: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category: 'DATA_BREACH' | 'UNAUTHORIZED_ACCESS' | 'SYSTEM_COMPROMISE' | 'MALWARE' | 'PHISHING' | 'OTHER'
  status: 'DETECTED' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED'
  detectedAt: Date
  reportedAt?: Date
  resolvedAt?: Date
  affectedSystems: string[]
  affectedData: {
    types: string[]
    recordsCount: number
    sensitiveData: boolean
    personalData: boolean
  }
  response: {
    containmentActions: string[]
    investigationFindings: string
    remediationActions: string[]
    lessonsLearned: string[]
  }
  reporting: {
    supervisoryAuthority: boolean
    dataSubjects: boolean
    externalParties: string[]
    reportedAt?: Date
  }
  assignedTo: string[]
  metadata: Record<string, any>
}

export class ComplianceAuditSystem extends EventEmitter {
  private static instance: ComplianceAuditSystem
  private rules: Map<string, ComplianceRule> = new Map()
  private violations: Map<string, ComplianceViolation> = new Map()
  private dataActivities: Map<string, DataProcessingActivity> = new Map()
  private incidents: Map<string, SecurityIncident> = new Map()
  private auditBuffer: AuditEvent[] = []
  private isProcessing = false

  private constructor() {
    super()
    this.initializeComplianceRules()
    this.startAuditProcessor()
    this.initializeDataActivities()
  }

  static getInstance(): ComplianceAuditSystem {
    if (!ComplianceAuditSystem.instance) {
      ComplianceAuditSystem.instance = new ComplianceAuditSystem()
    }
    return ComplianceAuditSystem.instance
  }

  private initializeComplianceRules() {
    const defaultRules: ComplianceRule[] = [
      // LGPD Compliance Rules
      {
        id: 'lgpd_consent_record',
        name: 'Registro de Consentimento LGPD',
        description: 'Verificar se consentimentos estão sendo registrados adequadamente',
        category: 'LGPD',
        severity: 'HIGH',
        regulation: 'Lei Geral de Proteção de Dados (LGPD) - Art. 8º',
        checkFunction: 'checkConsentRecords',
        autoCheck: true,
        frequency: 'DAILY',
        enabled: true,
        remediation: 'Implementar sistema de registro de consentimento com timestamp e IP',
        metadata: { dataTypes: ['personal', 'sensitive'], retention: '5 years' }
      },
      {
        id: 'lgpd_data_minimization',
        name: 'Princípio da Minimização de Dados',
        description: 'Verificar coleta excessiva de dados pessoais',
        category: 'LGPD',
        severity: 'MEDIUM',
        regulation: 'LGPD - Art. 6º, III',
        checkFunction: 'checkDataMinimization',
        autoCheck: true,
        frequency: 'WEEKLY',
        enabled: true,
        remediation: 'Revisar formulários e processos de coleta de dados',
        metadata: { maxFields: 20, requiredJustification: true }
      },
      {
        id: 'lgpd_retention_period',
        name: 'Período de Retenção de Dados',
        description: 'Verificar se dados estão sendo mantidos além do necessário',
        category: 'LGPD',
        severity: 'HIGH',
        regulation: 'LGPD - Art. 15',
        checkFunction: 'checkDataRetention',
        autoCheck: true,
        frequency: 'MONTHLY',
        enabled: true,
        remediation: 'Implementar política automática de purga de dados',
        metadata: { maxRetentionDays: 1825, categories: ['user_data', 'proposals', 'communications'] }
      },

      // Security Compliance Rules
      {
        id: 'security_password_policy',
        name: 'Política de Senhas Seguras',
        description: 'Verificar conformidade com política de senhas',
        category: 'SECURITY',
        severity: 'MEDIUM',
        regulation: 'ISO 27001 - Anexo A.9.4.3',
        checkFunction: 'checkPasswordPolicy',
        autoCheck: true,
        frequency: 'DAILY',
        enabled: true,
        remediation: 'Implementar validação rigorosa de senhas e rotação periódica',
        metadata: { minLength: 12, requireSpecialChars: true, rotationDays: 90 }
      },
      {
        id: 'security_access_logs',
        name: 'Logs de Acesso e Auditoria',
        description: 'Verificar integridade e completude dos logs de auditoria',
        category: 'SECURITY',
        severity: 'HIGH',
        regulation: 'ISO 27001 - Anexo A.12.4.1',
        checkFunction: 'checkAuditLogs',
        autoCheck: true,
        frequency: 'DAILY',
        enabled: true,
        remediation: 'Implementar logging estruturado e backup de logs',
        metadata: { retentionDays: 2555, encryptLogs: true, tamperProof: true }
      },
      {
        id: 'security_data_encryption',
        name: 'Criptografia de Dados Sensíveis',
        description: 'Verificar se dados sensíveis estão adequadamente criptografados',
        category: 'SECURITY',
        severity: 'CRITICAL',
        regulation: 'LGPD - Art. 46 + ISO 27001',
        checkFunction: 'checkDataEncryption',
        autoCheck: true,
        frequency: 'WEEKLY',
        enabled: true,
        remediation: 'Implementar criptografia AES-256 para dados em repouso e em trânsito',
        metadata: { algorithm: 'AES-256', keyRotationDays: 365 }
      },

      // Legal Compliance Rules
      {
        id: 'legal_contract_validity',
        name: 'Validade de Contratos Digitais',
        description: 'Verificar validade legal de contratos e propostas digitais',
        category: 'LEGAL',
        severity: 'HIGH',
        regulation: 'Lei 14.133/2021 + MP 2.200-2/2001',
        checkFunction: 'checkContractValidity',
        autoCheck: true,
        frequency: 'ON_EVENT',
        enabled: true,
        remediation: 'Implementar assinatura digital ICP-Brasil e timestamps qualificados',
        metadata: { requireDigitalSignature: true, timestampRequired: true }
      },
      {
        id: 'legal_me_epp_benefits',
        name: 'Aplicação Correta de Benefícios ME/EPP',
        description: 'Verificar se benefícios ME/EPP estão sendo aplicados corretamente',
        category: 'LEGAL',
        severity: 'MEDIUM',
        regulation: 'LC 123/2006',
        checkFunction: 'checkMEEPPBenefits',
        autoCheck: true,
        frequency: 'ON_EVENT',
        enabled: true,
        remediation: 'Revisar algoritmo de aplicação de benefícios ME/EPP',
        metadata: { empateFicto: 10, documentacaoPosterior: true }
      },

      // Financial Compliance Rules
      {
        id: 'financial_anti_corruption',
        name: 'Prevenção à Corrupção e Lavagem de Dinheiro',
        description: 'Verificar indicadores de atividades suspeitas',
        category: 'FINANCIAL',
        severity: 'CRITICAL',
        regulation: 'Lei 12.846/2013 (Lei Anticorrupção) + Lei 9.613/98',
        checkFunction: 'checkAntiCorruption',
        autoCheck: true,
        frequency: 'DAILY',
        enabled: true,
        remediation: 'Implementar due diligence automatizada e reporting de atividades suspeitas',
        metadata: { suspiciousThreshold: 50000, patternDetection: true }
      },
      {
        id: 'financial_tax_compliance',
        name: 'Conformidade Tributária',
        description: 'Verificar cálculos tributários e retenções',
        category: 'FINANCIAL',
        severity: 'HIGH',
        regulation: 'CTN + IN RFB + Legislação Estadual/Municipal',
        checkFunction: 'checkTaxCompliance',
        autoCheck: true,
        frequency: 'WEEKLY',
        enabled: true,
        remediation: 'Atualizar tabelas tributárias e validar cálculos',
        metadata: { taxTables: ['IRRF', 'PIS', 'COFINS', 'CSLL', 'ISS', 'ICMS'] }
      }
    ]

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule)
    })
  }

  private initializeDataActivities() {
    const defaultActivities: DataProcessingActivity[] = [
      {
        id: 'user_registration',
        name: 'Cadastro de Usuários',
        purpose: 'Criação de conta para acesso à plataforma',
        legalBasis: 'CONTRACT',
        dataCategories: ['identificacao', 'contato', 'profissional'],
        dataSubjects: ['usuarios', 'representantes_legais'],
        recipients: ['equipe_suporte', 'equipe_comercial'],
        internationalTransfers: false,
        retentionPeriod: '5 anos após encerramento da conta',
        securityMeasures: ['criptografia', 'controle_acesso', 'logs_auditoria'],
        privacyImpactAssessment: false,
        consentRecords: true,
        automated: false,
        profiling: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'proposal_processing',
        name: 'Processamento de Propostas',
        purpose: 'Análise e envio de propostas em licitações',
        legalBasis: 'LEGITIMATE_INTERESTS',
        dataCategories: ['empresarial', 'financeiro', 'tecnico'],
        dataSubjects: ['empresas', 'representantes'],
        recipients: ['orgaos_publicos', 'equipe_juridica'],
        internationalTransfers: false,
        retentionPeriod: '10 anos conforme legislação licitatória',
        securityMeasures: ['criptografia_fim_a_fim', 'assinatura_digital', 'backup_encrypted'],
        privacyImpactAssessment: true,
        consentRecords: false,
        automated: true,
        profiling: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'ai_analysis',
        name: 'Análise Jurídica com IA',
        purpose: 'Análise automatizada de editais e documentos legais',
        legalBasis: 'LEGITIMATE_INTERESTS',
        dataCategories: ['documentos_publicos', 'metadados_analise'],
        dataSubjects: ['usuarios'],
        recipients: ['provedores_ia', 'equipe_juridica'],
        internationalTransfers: true, // OpenAI
        retentionPeriod: '3 anos para treinamento do modelo',
        securityMeasures: ['anonimizacao', 'criptografia', 'contratos_dpa'],
        privacyImpactAssessment: true,
        consentRecords: true,
        automated: true,
        profiling: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    defaultActivities.forEach(activity => {
      this.dataActivities.set(activity.id, activity)
    })
  }

  private startAuditProcessor() {
    // Processar eventos de auditoria a cada 10 segundos
    setInterval(async () => {
      await this.processAuditBuffer()
    }, 10000)

    // Executar verificações automáticas diárias
    setInterval(async () => {
      await this.runAutomaticComplianceChecks()
    }, 24 * 60 * 60 * 1000)
  }

  private async processAuditBuffer() {
    if (this.isProcessing || this.auditBuffer.length === 0) return

    this.isProcessing = true

    try {
      const events = [...this.auditBuffer]
      this.auditBuffer = []

      // Salvar eventos no banco
      await this.saveAuditEvents(events)

      // Analisar eventos para detectar violações
      for (const event of events) {
        await this.analyzeEventForViolations(event)
      }

      // Executar regras de compliance aplicáveis
      await this.runEventTriggeredChecks(events)

    } finally {
      this.isProcessing = false
    }
  }

  private async runAutomaticComplianceChecks() {
    const rulesToCheck = Array.from(this.rules.values()).filter(rule => 
      rule.enabled && rule.autoCheck && rule.frequency === 'DAILY'
    )

    for (const rule of rulesToCheck) {
      await this.runComplianceCheck(rule)
    }
  }

  private async runComplianceCheck(rule: ComplianceRule): Promise<ComplianceViolation[]> {
    try {
      const violations: ComplianceViolation[] = []
      
      switch (rule.checkFunction) {
        case 'checkConsentRecords':
          violations.push(...await this.checkConsentRecords(rule))
          break
        case 'checkDataMinimization':
          violations.push(...await this.checkDataMinimization(rule))
          break
        case 'checkDataRetention':
          violations.push(...await this.checkDataRetention(rule))
          break
        case 'checkPasswordPolicy':
          violations.push(...await this.checkPasswordPolicy(rule))
          break
        case 'checkAuditLogs':
          violations.push(...await this.checkAuditLogs(rule))
          break
        case 'checkDataEncryption':
          violations.push(...await this.checkDataEncryption(rule))
          break
        case 'checkContractValidity':
          violations.push(...await this.checkContractValidity(rule))
          break
        case 'checkMEEPPBenefits':
          violations.push(...await this.checkMEEPPBenefits(rule))
          break
        case 'checkAntiCorruption':
          violations.push(...await this.checkAntiCorruption(rule))
          break
        case 'checkTaxCompliance':
          violations.push(...await this.checkTaxCompliance(rule))
          break
      }

      // Processar violações encontradas
      for (const violation of violations) {
        await this.handleViolation(violation)
      }

      return violations

    } catch (error) {
      console.error(`Erro ao executar regra ${rule.id}:`, error)
      return []
    }
  }

  // Implementação das verificações de compliance
  private async checkConsentRecords(rule: ComplianceRule): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = []
    
    try {
      // Verificar registros de consentimento dos últimos 30 dias
      const recentConsents = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM user_consents 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND (ip_address IS NULL OR user_agent IS NULL OR timestamp IS NULL)
      `

      const invalidConsents = (recentConsents as any)[0]?.count || 0

      if (invalidConsents > 0) {
        violations.push({
          id: this.generateViolationId(),
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          category: rule.category,
          description: `${invalidConsents} registros de consentimento sem informações obrigatórias (IP, User Agent, Timestamp)`,
          detectedAt: new Date(),
          status: 'OPEN',
          evidence: [],
          remediation: {
            required: true,
            actions: [
              'Corrigir formulários para capturar IP e User Agent',
              'Implementar timestamp automático',
              'Revisar consentimentos inválidos'
            ],
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            completed: false
          },
          impact: {
            businessCritical: true,
            externalReporting: true,
            dataSubjects: invalidConsents
          },
          metadata: { checkDate: new Date(), invalidCount: invalidConsents }
        })
      }
    } catch (error) {
      console.error('Erro na verificação de consentimentos:', error)
    }

    return violations
  }

  private async checkDataRetention(rule: ComplianceRule): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = []
    const maxRetentionDays = rule.metadata.maxRetentionDays as number

    try {
      // Verificar dados antigos que deveriam ter sido excluídos
      const oldData = await prisma.$queryRaw`
        SELECT 'users' as table_name, COUNT(*) as count
        FROM users 
        WHERE deleted_at IS NULL 
          AND last_login_at < DATE_SUB(NOW(), INTERVAL ${maxRetentionDays} DAY)
        UNION ALL
        SELECT 'proposals' as table_name, COUNT(*) as count
        FROM proposals 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL ${maxRetentionDays} DAY)
          AND status = 'INACTIVE'
      `

      for (const row of oldData as any[]) {
        if (row.count > 0) {
          violations.push({
            id: this.generateViolationId(),
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            category: rule.category,
            description: `${row.count} registros na tabela ${row.table_name} excedendo período de retenção`,
            detectedAt: new Date(),
            status: 'OPEN',
            evidence: [],
            remediation: {
              required: true,
              actions: [
                `Implementar processo automático de purga para ${row.table_name}`,
                'Definir política clara de retenção',
                'Executar limpeza manual dos dados expirados'
              ],
              deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              completed: false
            },
            impact: {
              businessCritical: false,
              externalReporting: true,
              dataSubjects: row.count
            },
            metadata: { tableName: row.table_name, recordCount: row.count }
          })
        }
      }
    } catch (error) {
      console.error('Erro na verificação de retenção de dados:', error)
    }

    return violations
  }

  private async checkDataEncryption(rule: ComplianceRule): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = []

    // Verificar se dados sensíveis estão criptografados
    // Esta é uma verificação simulada - na implementação real, 
    // verificaria configurações de banco e aplicação
    
    const sensitiveFields = ['cpf', 'cnpj', 'phone', 'financial_data']
    const unencryptedFields = [] // Simular verificação

    if (unencryptedFields.length > 0) {
      violations.push({
        id: this.generateViolationId(),
        ruleId: rule.id,
        ruleName: rule.name,
        severity: 'CRITICAL',
        category: rule.category,
        description: `Campos sensíveis não criptografados: ${unencryptedFields.join(', ')}`,
        detectedAt: new Date(),
        status: 'OPEN',
        evidence: [],
        remediation: {
          required: true,
          actions: [
            'Implementar criptografia AES-256 para campos sensíveis',
            'Migrar dados existentes para formato criptografado',
            'Atualizar aplicação para trabalhar com dados criptografados'
          ],
          deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          completed: false
        },
        impact: {
          businessCritical: true,
          externalReporting: true,
          dataSubjects: undefined
        },
        metadata: { unencryptedFields, algorithm: rule.metadata.algorithm }
      })
    }

    return violations
  }

  private async checkAntiCorruption(rule: ComplianceRule): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = []
    const threshold = rule.metadata.suspiciousThreshold as number

    try {
      // Verificar transações suspeitas
      const suspiciousActivities = await prisma.$queryRaw`
        SELECT 
          u.id as user_id,
          u.name as user_name,
          COUNT(p.id) as proposal_count,
          AVG(p.value) as avg_value,
          MAX(p.value) as max_value
        FROM users u
        JOIN proposals p ON u.id = p.user_id
        WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY u.id, u.name
        HAVING avg_value > ${threshold} OR proposal_count > 50
      `

      for (const activity of suspiciousActivities as any[]) {
        violations.push({
          id: this.generateViolationId(),
          ruleId: rule.id,
          ruleName: rule.name,
          severity: 'CRITICAL',
          category: rule.category,
          description: `Atividade suspeita detectada: Usuário ${activity.user_name} com ${activity.proposal_count} propostas, valor médio R$ ${activity.avg_value}`,
          detectedAt: new Date(),
          status: 'OPEN',
          evidence: [],
          remediation: {
            required: true,
            actions: [
              'Investigar atividade do usuário',
              'Verificar documentação de due diligence',
              'Considerar relatório aos órgãos competentes se confirmado'
            ],
            deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
            completed: false
          },
          impact: {
            businessCritical: true,
            externalReporting: true,
            financialImpact: activity.max_value
          },
          metadata: { 
            userId: activity.user_id,
            userName: activity.user_name,
            proposalCount: activity.proposal_count,
            avgValue: activity.avg_value
          }
        })
      }
    } catch (error) {
      console.error('Erro na verificação anticorrupção:', error)
    }

    return violations
  }

  // Implementação das outras verificações (checkPasswordPolicy, checkAuditLogs, etc.)
  private async checkPasswordPolicy(rule: ComplianceRule): Promise<ComplianceViolation[]> {
    // Implementar verificação de política de senhas
    return []
  }

  private async checkAuditLogs(rule: ComplianceRule): Promise<ComplianceViolation[]> {
    // Implementar verificação de logs de auditoria
    return []
  }

  private async checkContractValidity(rule: ComplianceRule): Promise<ComplianceViolation[]> {
    // Implementar verificação de validade de contratos
    return []
  }

  private async checkMEEPPBenefits(rule: ComplianceRule): Promise<ComplianceViolation[]> {
    // Implementar verificação de benefícios ME/EPP
    return []
  }

  private async checkTaxCompliance(rule: ComplianceRule): Promise<ComplianceViolation[]> {
    // Implementar verificação de compliance tributário
    return []
  }

  private async checkDataMinimization(rule: ComplianceRule): Promise<ComplianceViolation[]> {
    // Implementar verificação de minimização de dados
    return []
  }

  // Métodos de apoio
  private async analyzeEventForViolations(event: AuditEvent): Promise<void> {
    // Analisar evento para detectar violações automáticas
    
    // Exemplo: Detectar tentativas de acesso suspeitas
    if (event.action === 'LOGIN_FAILED' && event.riskLevel === 'HIGH') {
      // Criar violação de segurança se houver muitas tentativas falhadas
      const recentFailures = this.auditBuffer.filter(e => 
        e.action === 'LOGIN_FAILED' && 
        e.ipAddress === event.ipAddress &&
        e.timestamp.getTime() > Date.now() - 60 * 60 * 1000 // última hora
      )

      if (recentFailures.length > 5) {
        const violation: ComplianceViolation = {
          id: this.generateViolationId(),
          ruleId: 'security_brute_force',
          ruleName: 'Detecção de Força Bruta',
          severity: 'HIGH',
          category: 'SECURITY',
          description: `Múltiplas tentativas de login falhadas do IP ${event.ipAddress}`,
          detectedAt: new Date(),
          status: 'OPEN',
          evidence: [event, ...recentFailures],
          remediation: {
            required: true,
            actions: [
              'Bloquear IP temporariamente',
              'Investigar origem das tentativas',
              'Notificar usuários afetados'
            ],
            completed: false
          },
          impact: {
            businessCritical: true,
            externalReporting: false
          },
          metadata: { 
            ipAddress: event.ipAddress,
            attemptCount: recentFailures.length 
          }
        }

        await this.handleViolation(violation)
      }
    }
  }

  private async runEventTriggeredChecks(events: AuditEvent[]): Promise<void> {
    const rulesToCheck = Array.from(this.rules.values()).filter(rule => 
      rule.enabled && rule.autoCheck && rule.frequency === 'ON_EVENT'
    )

    for (const rule of rulesToCheck) {
      await this.runComplianceCheck(rule)
    }
  }

  private async handleViolation(violation: ComplianceViolation): Promise<void> {
    this.violations.set(violation.id, violation)
    
    // Salvar no banco
    await this.saveViolation(violation)
    
    // Emitir evento
    this.emit('violation_detected', violation)
    
    // Notificações baseadas na severidade
    if (violation.severity === 'CRITICAL') {
      await this.sendCriticalViolationAlert(violation)
    }
    
    console.log(`🚨 Violação detectada: ${violation.ruleName} - ${violation.severity}`)
  }

  // APIs Públicas

  async logAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    }

    this.auditBuffer.push(auditEvent)
    this.emit('audit_event', auditEvent)
  }

  async createSecurityIncident(incident: Omit<SecurityIncident, 'id' | 'detectedAt'>): Promise<SecurityIncident> {
    const securityIncident: SecurityIncident = {
      ...incident,
      id: this.generateIncidentId(),
      detectedAt: new Date()
    }

    this.incidents.set(securityIncident.id, securityIncident)
    await this.saveSecurityIncident(securityIncident)
    
    this.emit('security_incident', securityIncident)
    
    return securityIncident
  }

  async getComplianceReport(startDate?: Date, endDate?: Date): Promise<any> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate || new Date()

    const violations = Array.from(this.violations.values())
      .filter(v => v.detectedAt >= start && v.detectedAt <= end)

    return {
      period: { start, end },
      summary: {
        totalViolations: violations.length,
        criticalViolations: violations.filter(v => v.severity === 'CRITICAL').length,
        resolvedViolations: violations.filter(v => v.status === 'RESOLVED').length,
        openViolations: violations.filter(v => v.status === 'OPEN').length
      },
      byCategory: this.groupBy(violations, 'category'),
      bySeverity: this.groupBy(violations, 'severity'),
      trends: await this.calculateComplianceTrends(start, end),
      recommendations: await this.generateComplianceRecommendations(violations)
    }
  }

  async getDataProcessingInventory(): Promise<DataProcessingActivity[]> {
    return Array.from(this.dataActivities.values()).filter(a => a.isActive)
  }

  async updateDataProcessingActivity(id: string, updates: Partial<DataProcessingActivity>): Promise<void> {
    const activity = this.dataActivities.get(id)
    if (!activity) throw new Error('Activity not found')

    const updated = { ...activity, ...updates, updatedAt: new Date() }
    this.dataActivities.set(id, updated)
    
    await this.saveDataActivity(updated)
    this.emit('data_activity_updated', updated)
  }

  // Métodos auxiliares
  private generateViolationId(): string {
    return `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateIncidentId(): string {
    return `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((groups, item) => {
      const group = String(item[key])
      groups[group] = (groups[group] || 0) + 1
      return groups
    }, {} as Record<string, number>)
  }

  private async saveAuditEvents(events: AuditEvent[]): Promise<void> {
    // Implementar salvamento em lote no banco
    console.log(`Salvando ${events.length} eventos de auditoria`)
  }

  private async saveViolation(violation: ComplianceViolation): Promise<void> {
    // Implementar salvamento da violação
    console.log(`Salvando violação: ${violation.id}`)
  }

  private async saveSecurityIncident(incident: SecurityIncident): Promise<void> {
    // Implementar salvamento do incidente
    console.log(`Salvando incidente de segurança: ${incident.id}`)
  }

  private async saveDataActivity(activity: DataProcessingActivity): Promise<void> {
    // Implementar salvamento da atividade
    console.log(`Salvando atividade de processamento: ${activity.id}`)
  }

  private async sendCriticalViolationAlert(violation: ComplianceViolation): Promise<void> {
    // Implementar alerta crítico (email, SMS, etc.)
    console.log(`🚨 ALERTA CRÍTICO: ${violation.ruleName}`)
  }

  private async calculateComplianceTrends(start: Date, end: Date): Promise<any> {
    // Implementar cálculo de tendências
    return {
      improvementRate: 85,
      riskScore: 25,
      automationRate: 90
    }
  }

  private async generateComplianceRecommendations(violations: ComplianceViolation[]): Promise<string[]> {
    const recommendations = [
      'Implementar treinamento regular de conscientização em segurança',
      'Automatizar processo de backup e teste de restauração',
      'Revisar políticas de retenção de dados conforme LGPD'
    ]

    // Adicionar recomendações específicas baseadas nas violações
    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL')
    if (criticalViolations.length > 0) {
      recommendations.push('Priorizar resolução de violações críticas identificadas')
    }

    return recommendations
  }
}

// Singleton export
export const complianceAuditSystem = ComplianceAuditSystem.getInstance()

// Helper functions para logging de auditoria
export async function logUserAction(userId: string, action: string, resource: string, details: any = {}) {
  await complianceAuditSystem.logAuditEvent({
    userId,
    action,
    resource,
    details,
    success: true,
    riskLevel: 'LOW',
    category: 'BUSINESS',
    compliance: {
      lgpd: true,
      dataProcessing: false,
      sensitiveData: false
    }
  })
}

export async function logSecurityEvent(action: string, ipAddress: string, success: boolean, details: any = {}) {
  await complianceAuditSystem.logAuditEvent({
    action,
    resource: 'AUTH',
    details,
    ipAddress,
    success,
    riskLevel: success ? 'LOW' : 'HIGH',
    category: 'SECURITY',
    compliance: {
      lgpd: false,
      dataProcessing: false,
      sensitiveData: false
    }
  })
}

export async function logDataProcessing(userId: string, dataType: string, purpose: string, details: any = {}) {
  await complianceAuditSystem.logAuditEvent({
    userId,
    action: 'DATA_PROCESSING',
    resource: dataType,
    details: { purpose, ...details },
    success: true,
    riskLevel: 'MEDIUM',
    category: 'DATA',
    compliance: {
      lgpd: true,
      dataProcessing: true,
      sensitiveData: details.sensitive || false
    }
  })
}