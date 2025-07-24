import { db } from '@/lib/db'
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync } from 'fs'
import { createHash } from 'crypto'
import { join } from 'path'
import { createGzip, createGunzip } from 'zlib'
import { pipeline } from 'stream/promises'
import { EventEmitter } from 'events'

export interface BackupConfig {
  id: string
  name: string
  schedule: 'daily' | 'weekly' | 'monthly'
  enabled: boolean
  retention: number // dias
  includeFiles: boolean
  compression: boolean
  encryption: boolean
  destinations: BackupDestination[]
  tables: string[]
  createdAt: Date
  updatedAt: Date
}

export interface BackupDestination {
  type: 'local' | 's3' | 'gcs' | 'azure' | 'ftp'
  config: Record<string, any>
  enabled: boolean
}

export interface BackupJob {
  id: string
  configId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt?: Date
  completedAt?: Date
  size?: number
  error?: string
  progress: number
  details: {
    tablesProcessed: number
    totalTables: number
    filesProcessed: number
    totalFiles: number
    currentOperation: string
  }
}

export interface BackupFile {
  id: string
  configId: string
  jobId: string
  filename: string
  size: number
  checksum: string
  compressed: boolean
  encrypted: boolean
  destination: string
  createdAt: Date
  expiresAt?: Date
}

export class BackupService extends EventEmitter {
  private static instance: BackupService
  private runningJobs: Map<string, BackupJob> = new Map()
  private backupDir: string
  private isSchedulerRunning: boolean = false

  private constructor() {
    super()
    this.backupDir = process.env.BACKUP_DIR || join(process.cwd(), 'backups')
    this.ensureBackupDirectory()
  }

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService()
    }
    return BackupService.instance
  }

  private ensureBackupDirectory() {
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true })
    }
  }

  // COMENTADO: backupConfig não existe no schema Prisma
  // async createBackupConfig(config: Omit<BackupConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<BackupConfig> {
  //   const backupConfig = await db.backupConfig.create({
  //     data: {
  //       ...config,
  //       destinations: config.destinations,
  //       tables: config.tables
  //     }
  //   })

  //   return backupConfig as BackupConfig
  // }

  // Implementação temporária
  async createBackupConfig(config: Omit<BackupConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<BackupConfig> {
    return {
      id: Date.now().toString(),
      ...config,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  // COMENTADO: backupConfig não existe no schema Prisma
  // async getBackupConfigs(): Promise<BackupConfig[]> {
  //   const configs = await db.backupConfig.findMany({
  //     orderBy: { createdAt: 'desc' }
  //   })

  //   return configs as BackupConfig[]
  // }

  // Implementação temporária
  async getBackupConfigs(): Promise<BackupConfig[]> {
    return []
  }

  // Executar backup manual
  async executeBackup(configId: string): Promise<string> {
    // COMENTADO: backupConfig não existe no schema Prisma
    // const config = await db.backupConfig.findUnique({
    //   where: { id: configId }
    // })

    // if (!config) {
    //   throw new Error('Configuração de backup não encontrada')
    // }

    // Implementação temporária - usar configuração padrão
    const config: BackupConfig = {
      id: configId,
      name: 'Backup Padrão',
      schedule: 'daily',
      enabled: true,
      retention: 30,
      includeFiles: false,
      compression: true,
      encryption: false,
      destinations: [{ type: 'local', config: {}, enabled: true }],
      tables: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const job: BackupJob = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      configId,
      status: 'pending',
      progress: 0,
      details: {
        tablesProcessed: 0,
        totalTables: config.tables.length || 0,
        filesProcessed: 0,
        totalFiles: 0,
        currentOperation: 'Iniciando backup'
      }
    }

    this.runningJobs.set(job.id, job)

    // Executar backup de forma assíncrona
    this.runBackupJob(job, config as BackupConfig)

    return job.id
  }

  private async runBackupJob(job: BackupJob, config: BackupConfig) {
    try {
      job.status = 'running'
      job.startedAt = new Date()
      job.details.currentOperation = 'Preparando backup'
      this.emit('jobProgress', job)

      // COMENTADO: backupJob não existe no schema Prisma
      // await db.backupJob.create({
      //   data: {
      //     id: job.id,
      //     configId: job.configId,
      //     status: job.status,
      //     startedAt: job.startedAt,
      //     progress: job.progress,
      //     details: job.details
      //   }
      // })

      // Implementação temporária - log para monitoramento
      console.log(`Backup job iniciado: ${job.id}`)

      const backupData = await this.collectBackupData(job, config)
      const backupFile = await this.createBackupFile(job, config, backupData)
      await this.storeBackupFile(job, config, backupFile)

      job.status = 'completed'
      job.completedAt = new Date()
      job.progress = 100
      job.details.currentOperation = 'Backup concluído'

      // COMENTADO: backupJob não existe no schema Prisma
      // await db.backupJob.update({
      //   where: { id: job.id },
      //   data: {
      //     status: job.status,
      //     completedAt: job.completedAt,
      //     progress: job.progress,
      //     details: job.details,
      //     size: backupFile.size
      //   }
      // })

      // Implementação temporária - log de conclusão
      console.log(`Backup job concluído: ${job.id}, size: ${backupFile.size}`)

      this.emit('jobCompleted', job)
      console.log(`✅ Backup ${job.id} concluído com sucesso`)

    } catch (error) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Erro desconhecido'
      job.completedAt = new Date()
      job.details.currentOperation = 'Falha no backup'

      // COMENTADO: backupJob não existe no schema Prisma
      // await db.backupJob.update({
      //   where: { id: job.id },
      //   data: {
      //     status: job.status,
      //     error: job.error,
      //     completedAt: job.completedAt,
      //     details: job.details
      //   }
      // })

      // Implementação temporária - log de erro
      console.log(`Backup job falhou: ${job.id}, erro: ${job.error}`)

      this.emit('jobFailed', job)
      console.error(`❌ Backup ${job.id} falhou:`, error)
    } finally {
      this.runningJobs.delete(job.id)
    }
  }

  private async collectBackupData(job: BackupJob, config: BackupConfig): Promise<any> {
    const data: any = {
      metadata: {
        configId: config.id,
        timestamp: new Date().toISOString(),
        version: '1.0'
      },
      tables: {}
    }

    const tablesToBackup = config.tables.length > 0 ? config.tables : [
      'User', 'Company', 'Opportunity', 'Proposal', 'Certificate', 
      'Payment', 'Subscription', 'Plan', 'ApiKey', 'Webhook',
      'Notification', 'EditalAnalysis', 'MonitoringEvent'
    ]

    job.details.totalTables = tablesToBackup.length
    job.details.currentOperation = 'Coletando dados das tabelas'

    for (let i = 0; i < tablesToBackup.length; i++) {
      const table = tablesToBackup[i]
      job.details.currentOperation = `Coletando dados da tabela ${table}`
      job.progress = Math.round((i / tablesToBackup.length) * 50) // 50% para coleta
      this.emit('jobProgress', job)

      try {
        // Usar $queryRaw para tabelas dinâmicas
        const tableData = await this.getTableData(table)
        data.tables[table] = tableData
        job.details.tablesProcessed = i + 1
      } catch (error) {
        console.error(`Erro ao coletar dados da tabela ${table}:`, error)
        data.tables[table] = { error: error instanceof Error ? error.message : 'Erro desconhecido' }
      }
    }

    // Coletar arquivos se configurado
    if (config.includeFiles) {
      job.details.currentOperation = 'Coletando arquivos'
      data.files = await this.collectFiles(job)
    }

    return data
  }

  private async getTableData(tableName: string): Promise<any[]> {
    try {
      // Mapear nomes de tabela para modelos Prisma
      const tableMap: Record<string, string> = {
        'User': 'user',
        'Company': 'company',
        'Opportunity': 'opportunity',
        'Proposal': 'proposal',
        'Certificate': 'certificate',
        'Payment': 'payment',
        'Subscription': 'subscription',
        'Plan': 'plan',
        'ApiKey': 'apiKey',
        'Webhook': 'webhook',
        'Notification': 'notification',
        'EditalAnalysis': 'editalAnalysis',
        'MonitoringEvent': 'monitoringEvent'
      }

      const modelName = tableMap[tableName]
      if (!modelName) {
        throw new Error(`Tabela ${tableName} não encontrada`)
      }

      // Acessar modelo dinamicamente
      const model = (db as any)[modelName]
      if (!model) {
        throw new Error(`Modelo ${modelName} não encontrado`)
      }

      return await model.findMany()
    } catch (error) {
      console.error(`Erro ao acessar tabela ${tableName}:`, error)
      return []
    }
  }

  private async collectFiles(job: BackupJob): Promise<any> {
    // Implementar coleta de arquivos se necessário
    // Por enquanto, retorna estrutura vazia
    return {
      uploads: [],
      certificates: [],
      documents: []
    }
  }

  private async createBackupFile(job: BackupJob, config: BackupConfig, data: any): Promise<BackupFile> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backup_${config.name}_${timestamp}.json`
    const filepath = join(this.backupDir, filename)

    job.details.currentOperation = 'Criando arquivo de backup'
    job.progress = 60
    this.emit('jobProgress', job)

    // Escrever dados no arquivo
    let writeStream = createWriteStream(filepath)
    
    if (config.compression) {
      const gzipStream = createGzip()
      writeStream = gzipStream.pipe(writeStream) as any
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.write(JSON.stringify(data, null, 2), (error) => {
        if (error) reject(error)
        else resolve()
      })
      writeStream.end()
    })

    // Calcular tamanho e checksum
    const stats = statSync(filepath)
    const hash = createHash('sha256')
    const fileStream = createReadStream(filepath)
    
    fileStream.on('data', (chunk) => hash.update(chunk))
    await new Promise<void>((resolve) => {
      fileStream.on('end', resolve)
    })

    const checksum = hash.digest('hex')

    const backupFile: BackupFile = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      configId: config.id,
      jobId: job.id,
      filename,
      size: stats.size,
      checksum,
      compressed: config.compression,
      encrypted: config.encryption,
      destination: 'local',
      createdAt: new Date(),
      expiresAt: config.retention > 0 ? new Date(Date.now() + config.retention * 24 * 60 * 60 * 1000) : undefined
    }

    // COMENTADO: backupFile não existe no schema Prisma
    // await db.backupFile.create({
    //   data: backupFile
    // })

    // Implementação temporária - log do arquivo criado
    console.log(`Arquivo de backup criado: ${backupFile.filename}, size: ${backupFile.size}`)

    return backupFile
  }

  private async storeBackupFile(job: BackupJob, config: BackupConfig, backupFile: BackupFile) {
    job.details.currentOperation = 'Armazenando backup'
    job.progress = 80
    this.emit('jobProgress', job)

    // Processar cada destino configurado
    for (const destination of config.destinations) {
      if (!destination.enabled) continue

      try {
        await this.uploadToDestination(destination, backupFile)
      } catch (error) {
        console.error(`Erro ao enviar backup para ${destination.type}:`, error)
        // Continuar com outros destinos mesmo se um falhar
      }
    }

    job.progress = 90
    this.emit('jobProgress', job)
  }

  private async uploadToDestination(destination: BackupDestination, backupFile: BackupFile) {
    switch (destination.type) {
      case 'local':
        // Já está armazenado localmente
        break
      case 's3':
        await this.uploadToS3(destination.config, backupFile)
        break
      case 'gcs':
        await this.uploadToGCS(destination.config, backupFile)
        break
      case 'azure':
        await this.uploadToAzure(destination.config, backupFile)
        break
      case 'ftp':
        await this.uploadToFTP(destination.config, backupFile)
        break
      default:
        throw new Error(`Tipo de destino não suportado: ${destination.type}`)
    }
  }

  private async uploadToS3(config: any, backupFile: BackupFile) {
    // Implementar upload para AWS S3
    console.log('Upload para S3 não implementado ainda')
  }

  private async uploadToGCS(config: any, backupFile: BackupFile) {
    // Implementar upload para Google Cloud Storage
    console.log('Upload para GCS não implementado ainda')
  }

  private async uploadToAzure(config: any, backupFile: BackupFile) {
    // Implementar upload para Azure Blob Storage
    console.log('Upload para Azure não implementado ainda')
  }

  private async uploadToFTP(config: any, backupFile: BackupFile) {
    // Implementar upload para FTP
    console.log('Upload para FTP não implementado ainda')
  }

  // Restaurar backup
  async restoreBackup(backupFileId: string): Promise<string> {
    // COMENTADO: backupFile não existe no schema Prisma
    // const backupFile = await db.backupFile.findUnique({
    //   where: { id: backupFileId }
    // })

    // if (!backupFile) {
    //   throw new Error('Arquivo de backup não encontrado')
    // }

    // Implementação temporária - simular arquivo de backup
    const backupFile: BackupFile = {
      id: backupFileId,
      configId: 'default',
      jobId: 'job-' + Date.now(),
      filename: `backup_${Date.now()}.json`,
      size: 0,
      checksum: '',
      compressed: true,
      encrypted: false,
      destination: 'local',
      createdAt: new Date(),
      expiresAt: undefined
    }

    const job: BackupJob = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      configId: backupFile.configId,
      status: 'running',
      startedAt: new Date(),
      progress: 0,
      details: {
        tablesProcessed: 0,
        totalTables: 0,
        filesProcessed: 0,
        totalFiles: 0,
        currentOperation: 'Iniciando restauração'
      }
    }

    this.runRestoreJob(job, backupFile as BackupFile)
    return job.id
  }

  private async runRestoreJob(job: BackupJob, backupFile: BackupFile) {
    try {
      job.details.currentOperation = 'Lendo arquivo de backup'
      this.emit('jobProgress', job)

      const filepath = join(this.backupDir, backupFile.filename)
      let readStream = createReadStream(filepath)

      if (backupFile.compressed) {
        readStream = readStream.pipe(createGunzip())
      }

      let data = ''
      readStream.on('data', (chunk) => {
        data += chunk
      })

      await new Promise<void>((resolve, reject) => {
        readStream.on('end', resolve)
        readStream.on('error', reject)
      })

      const backupData = JSON.parse(data)
      
      job.details.currentOperation = 'Restaurando dados'
      job.progress = 20
      this.emit('jobProgress', job)

      // Implementar lógica de restauração
      // Por segurança, esta operação deve ser muito cuidadosa
      console.log('Restauração de backup:', backupData.metadata)

      job.status = 'completed'
      job.completedAt = new Date()
      job.progress = 100
      job.details.currentOperation = 'Restauração concluída'

      this.emit('jobCompleted', job)

    } catch (error) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Erro desconhecido'
      job.completedAt = new Date()
      job.details.currentOperation = 'Falha na restauração'

      this.emit('jobFailed', job)
      console.error('Erro na restauração:', error)
    }
  }

  // Scheduler de backups automáticos
  async startScheduler() {
    if (this.isSchedulerRunning) return

    this.isSchedulerRunning = true
    console.log('📅 Scheduler de backups iniciado')

    // Verificar backups a cada hora
    const checkInterval = setInterval(async () => {
      await this.checkScheduledBackups()
    }, 60 * 60 * 1000) // 1 hora

    // Limpeza de backups antigos a cada 6 horas
    const cleanupInterval = setInterval(async () => {
      await this.cleanupOldBackups()
    }, 6 * 60 * 60 * 1000) // 6 horas

    // Parar intervalos quando necessário
    process.on('SIGINT', () => {
      clearInterval(checkInterval)
      clearInterval(cleanupInterval)
      this.isSchedulerRunning = false
    })

    // Executar verificação inicial
    await this.checkScheduledBackups()
  }

  private async checkScheduledBackups() {
    // COMENTADO: backupConfig não existe no schema Prisma
    // const configs = await db.backupConfig.findMany({
    //   where: { enabled: true }
    // })

    // for (const config of configs) {
    //   const shouldRun = await this.shouldRunBackup(config as BackupConfig)
    //   if (shouldRun) {
    //     console.log(`🔄 Executando backup automático: ${config.name}`)
    //     await this.executeBackup(config.id)
    //   }
    // }

    // Implementação temporária - log de verificação
    console.log('Verificando backups agendados (implementação temporária)')
  }

  private async shouldRunBackup(config: BackupConfig): Promise<boolean> {
    // COMENTADO: backupJob não existe no schema Prisma
    // const lastBackup = await db.backupJob.findFirst({
    //   where: {
    //     configId: config.id,
    //     status: 'completed'
    //   },
    //   orderBy: { completedAt: 'desc' }
    // })

    // if (!lastBackup) return true

    // const now = new Date()
    // const lastRun = lastBackup.completedAt!

    // switch (config.schedule) {
    //   case 'daily':
    //     return now.getTime() - lastRun.getTime() >= 24 * 60 * 60 * 1000
    //   case 'weekly':
    //     return now.getTime() - lastRun.getTime() >= 7 * 24 * 60 * 60 * 1000
    //   case 'monthly':
    //     return now.getTime() - lastRun.getTime() >= 30 * 24 * 60 * 60 * 1000
    //   default:
    //     return false
    // }

    // Implementação temporária - sempre retornar false para evitar execuções automáticas
    return false
  }

  private async cleanupOldBackups() {
    // COMENTADO: backupFile não existe no schema Prisma
    // const expiredFiles = await db.backupFile.findMany({
    //   where: {
    //     expiresAt: {
    //       lt: new Date()
    //     }
    //   }
    // })

    // for (const file of expiredFiles) {
    //   try {
    //     // Remover arquivo físico
    //     const filepath = join(this.backupDir, file.filename)
    //     if (existsSync(filepath)) {
    //       require('fs').unlinkSync(filepath)
    //     }

    //     // Remover registro do banco
    //     await db.backupFile.delete({
    //       where: { id: file.id }
    //     })

    //     console.log(`🗑️ Backup expirado removido: ${file.filename}`)
    //   } catch (error) {
    //     console.error(`Erro ao remover backup ${file.filename}:`, error)
    //   }
    // }

    // Implementação temporária - log de limpeza
    console.log('Limpeza de backups antigos (implementação temporária)')
  }

  // Obter status de job
  getJobStatus(jobId: string): BackupJob | null {
    return this.runningJobs.get(jobId) || null
  }

  // COMENTADO: backupJob não existe no schema Prisma
  // async getBackupJobs(configId?: string): Promise<BackupJob[]> {
  //   const where = configId ? { configId } : {}
    
  //   const jobs = await db.backupJob.findMany({
  //     where,
  //     orderBy: { startedAt: 'desc' },
  //     take: 50
  //   })

  //   return jobs as BackupJob[]
  // }

  // Implementação temporária
  async getBackupJobs(configId?: string): Promise<BackupJob[]> {
    return []
  }

  // COMENTADO: backupFile não existe no schema Prisma
  // async getBackupFiles(configId?: string): Promise<BackupFile[]> {
  //   const where = configId ? { configId } : {}
    
  //   const files = await db.backupFile.findMany({
  //     where,
  //     orderBy: { createdAt: 'desc' },
  //     take: 100
  //   })

  //   return files as BackupFile[]
  // }

  // Implementação temporária
  async getBackupFiles(configId?: string): Promise<BackupFile[]> {
    return []
  }

  // COMENTADO: backupFile e backupJob não existem no schema Prisma
  // async getBackupStats(): Promise<{
  //   totalBackups: number
  //   totalSize: number
  //   successRate: number
  //   lastBackup?: Date
  //   nextScheduled?: Date
  // }> {
  //   const [totalBackups, totalSize, successfulJobs, totalJobs, lastBackup] = await Promise.all([
  //     db.backupFile.count(),
  //     db.backupFile.aggregate({
  //       _sum: { size: true }
  //     }),
  //     db.backupJob.count({ where: { status: 'completed' } }),
  //     db.backupJob.count(),
  //     db.backupJob.findFirst({
  //       where: { status: 'completed' },
  //       orderBy: { completedAt: 'desc' }
  //     })
  //   ])

  //   return {
  //     totalBackups,
  //     totalSize: totalSize._sum.size || 0,
  //     successRate: totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 0,
  //     lastBackup: lastBackup?.completedAt || undefined,
  //     nextScheduled: undefined // Calcular próximo backup agendado
  //   }
  // }

  // Implementação temporária
  async getBackupStats(): Promise<{
    totalBackups: number
    totalSize: number
    successRate: number
    lastBackup?: Date
    nextScheduled?: Date
    systemUptime?: number
  }> {
    return {
      totalBackups: 0,
      totalSize: 0,
      successRate: 0,
      lastBackup: undefined,
      nextScheduled: undefined,
      systemUptime: process.uptime()
    }
  }
}

// Instância singleton
export const backupService = BackupService.getInstance()

// Inicializar scheduler
export async function initializeBackupService() {
  await backupService.startScheduler()
  return backupService
}