'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  Database, 
  Plus, 
  Play, 
  Download, 
  Upload, 
  Settings,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  HardDrive,
  Cloud,
  Shield,
  History,
  Trash2,
  RefreshCw
} from 'lucide-react'

interface BackupConfig {
  id: string
  name: string
  schedule: 'daily' | 'weekly' | 'monthly'
  enabled: boolean
  retention: number
  includeFiles: boolean
  compression: boolean
  encryption: boolean
  destinations: BackupDestination[]
  tables: string[]
  createdAt: Date
  updatedAt: Date
}

interface BackupDestination {
  type: 'local' | 's3' | 'gcs' | 'azure' | 'ftp'
  config: Record<string, any>
  enabled: boolean
}

interface BackupJob {
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

interface BackupFile {
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

interface BackupManagementProps {
  currentPlan: string
}

export function BackupManagement({ currentPlan }: BackupManagementProps) {
  const [configs, setConfigs] = useState<BackupConfig[]>([])
  const [jobs, setJobs] = useState<BackupJob[]>([])
  const [files, setFiles] = useState<BackupFile[]>([])
  const [showNewConfigForm, setShowNewConfigForm] = useState(false)
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalBackups: 0,
    totalSize: 0,
    successRate: 0,
    lastBackup: undefined as Date | undefined,
    nextScheduled: undefined as Date | undefined
  })
  const { toast } = useToast()

  const [newConfig, setNewConfig] = useState({
    name: '',
    schedule: 'daily' as 'daily' | 'weekly' | 'monthly',
    enabled: true,
    retention: 30,
    includeFiles: false,
    compression: true,
    encryption: false,
    destinations: [{ type: 'local', config: {}, enabled: true }] as BackupDestination[],
    tables: [] as string[]
  })

  const availableTables = [
    'User', 'Company', 'Opportunity', 'Proposal', 'Certificate', 
    'Payment', 'Subscription', 'Plan', 'ApiKey', 'Webhook',
    'Notification', 'EditalAnalysis', 'MonitoringEvent'
  ]

  const destinationTypes = [
    { value: 'local', label: 'Armazenamento Local', icon: HardDrive },
    { value: 's3', label: 'Amazon S3', icon: Cloud },
    { value: 'gcs', label: 'Google Cloud Storage', icon: Cloud },
    { value: 'azure', label: 'Azure Blob Storage', icon: Cloud },
    { value: 'ftp', label: 'FTP/SFTP', icon: Upload }
  ]

  const planLimits = {
    'Starter': { maxConfigs: 1, maxRetention: 7, destinations: ['local'] },
    'Professional': { maxConfigs: 3, maxRetention: 30, destinations: ['local', 's3', 'gcs'] },
    'Enterprise': { maxConfigs: 10, maxRetention: 365, destinations: ['local', 's3', 'gcs', 'azure', 'ftp'] }
  }

  const currentLimits = planLimits[currentPlan as keyof typeof planLimits] || planLimits['Starter']

  useEffect(() => {
    loadData()
    
    // Atualizar status dos jobs em execução a cada 5 segundos
    const interval = setInterval(() => {
      if (runningJobs.size > 0) {
        updateRunningJobs()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [runningJobs])

  const loadData = async () => {
    try {
      const [configsRes, jobsRes, filesRes, statsRes] = await Promise.all([
        fetch('/api/backup/configs'),
        fetch('/api/backup/jobs'),
        fetch('/api/backup/files'),
        fetch('/api/backup/stats')
      ])

      const [configsData, jobsData, filesData, statsData] = await Promise.all([
        configsRes.json(),
        jobsRes.json(),
        filesRes.json(),
        statsRes.json()
      ])

      setConfigs(configsData.configs || [])
      setJobs(jobsData.jobs || [])
      setFiles(filesData.files || [])
      setStats(statsData.stats || stats)
    } catch (error) {
      console.error('Erro ao carregar dados de backup:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateRunningJobs = async () => {
    try {
      const response = await fetch('/api/backup/jobs')
      const data = await response.json()
      const updatedJobs = data.jobs || []
      
      setJobs(updatedJobs)
      
      // Atualizar lista de jobs em execução
      const newRunningJobs = new Set(
        updatedJobs
          .filter((job: BackupJob) => job.status === 'running')
          .map((job: BackupJob) => job.id)
      )
      setRunningJobs(newRunningJobs)
    } catch (error) {
      console.error('Erro ao atualizar jobs:', error)
    }
  }

  const createConfig = async () => {
    try {
      if (!newConfig.name.trim()) {
        toast({
          title: 'Erro',
          description: 'Nome é obrigatório',
          variant: 'destructive'
        })
        return
      }

      const response = await fetch('/api/backup/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      const data = await response.json()
      setConfigs([...configs, data.config])
      setShowNewConfigForm(false)
      setNewConfig({
        name: '',
        schedule: 'daily',
        enabled: true,
        retention: 30,
        includeFiles: false,
        compression: true,
        encryption: false,
        destinations: [{ type: 'local', config: {}, enabled: true }],
        tables: []
      })

      toast({
        title: 'Configuração criada',
        description: 'Configuração de backup criada com sucesso'
      })
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const executeBackup = async (configId: string) => {
    try {
      const response = await fetch('/api/backup/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      const data = await response.json()
      const jobId = data.jobId
      
      setRunningJobs(prev => new Set(prev).add(jobId))
      
      toast({
        title: 'Backup iniciado',
        description: 'O backup foi iniciado com sucesso'
      })

      // Recarregar jobs
      setTimeout(loadData, 1000)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const deleteConfig = async (configId: string) => {
    try {
      const response = await fetch(`/api/backup/configs/${configId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      setConfigs(configs.filter(c => c.id !== configId))
      
      toast({
        title: 'Configuração removida',
        description: 'Configuração de backup removida com sucesso'
      })
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const downloadBackup = async (fileId: string) => {
    try {
      const response = await fetch(`/api/backup/download/${fileId}`)
      
      if (!response.ok) {
        throw new Error('Erro ao baixar backup')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup_${fileId}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle
      case 'running': return RefreshCw
      case 'failed': return XCircle
      case 'pending': return Clock
      default: return Clock
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const canCreateConfig = configs.length < currentLimits.maxConfigs

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Sistema de Backup Automático
          </CardTitle>
          <CardDescription>
            Proteja seus dados com backups automáticos e seguros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalBackups}
              </div>
              <div className="text-sm text-gray-600">Backups Totais</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatSize(stats.totalSize)}
              </div>
              <div className="text-sm text-gray-600">Tamanho Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.successRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Taxa de Sucesso</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.lastBackup ? formatDate(stats.lastBackup).split(' ')[0] : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Último Backup</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Limitations */}
      {currentPlan === 'Starter' && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Plano Starter:</strong> Apenas backups locais com retenção de 7 dias. 
            Faça upgrade para backups na nuvem e maior retenção.
            <Button variant="link" className="p-0 h-auto font-normal ml-2">
              Ver planos
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="configs" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configs">Configurações</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="files">Arquivos</TabsTrigger>
          <TabsTrigger value="restore">Restaurar</TabsTrigger>
        </TabsList>

        <TabsContent value="configs" className="space-y-4">
          {/* Configs Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Configurações de Backup</h3>
              <p className="text-sm text-gray-600">
                {configs.length} / {currentLimits.maxConfigs} configurações
              </p>
            </div>
            <Button 
              onClick={() => setShowNewConfigForm(true)}
              disabled={!canCreateConfig}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Configuração
            </Button>
          </div>

          {/* New Config Form */}
          {showNewConfigForm && (
            <Card>
              <CardHeader>
                <CardTitle>Nova Configuração de Backup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="configName">Nome</Label>
                    <Input
                      id="configName"
                      value={newConfig.name}
                      onChange={(e) => setNewConfig({...newConfig, name: e.target.value})}
                      placeholder="Ex: Backup Diário"
                    />
                  </div>
                  <div>
                    <Label htmlFor="schedule">Frequência</Label>
                    <Select value={newConfig.schedule} onValueChange={(value: any) => setNewConfig({...newConfig, schedule: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diário</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="retention">Retenção (dias)</Label>
                    <Input
                      id="retention"
                      type="number"
                      value={newConfig.retention}
                      onChange={(e) => setNewConfig({...newConfig, retention: parseInt(e.target.value) || 30})}
                      max={currentLimits.maxRetention}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Opções</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="enabled"
                          checked={newConfig.enabled}
                          onCheckedChange={(checked) => setNewConfig({...newConfig, enabled: !!checked})}
                        />
                        <Label htmlFor="enabled">Ativo</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="compression"
                          checked={newConfig.compression}
                          onCheckedChange={(checked) => setNewConfig({...newConfig, compression: !!checked})}
                        />
                        <Label htmlFor="compression">Compressão</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeFiles"
                          checked={newConfig.includeFiles}
                          onCheckedChange={(checked) => setNewConfig({...newConfig, includeFiles: !!checked})}
                        />
                        <Label htmlFor="includeFiles">Incluir Arquivos</Label>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Tabelas para Backup</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                    {availableTables.map((table) => (
                      <div key={table} className="flex items-center space-x-2">
                        <Checkbox
                          id={table}
                          checked={newConfig.tables.includes(table)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewConfig({
                                ...newConfig,
                                tables: [...newConfig.tables, table]
                              })
                            } else {
                              setNewConfig({
                                ...newConfig,
                                tables: newConfig.tables.filter(t => t !== table)
                              })
                            }
                          }}
                        />
                        <Label htmlFor={table} className="text-sm">{table}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setNewConfig({...newConfig, tables: availableTables})}
                    >
                      Selecionar Todas
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button onClick={createConfig}>
                    Criar Configuração
                  </Button>
                  <Button variant="outline" onClick={() => setShowNewConfigForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Configs List */}
          <div className="space-y-3">
            {configs.map((config) => (
              <Card key={config.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium">{config.name}</h4>
                        <Badge variant={config.enabled ? "default" : "secondary"}>
                          {config.enabled ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Badge variant="outline">
                          {config.schedule === 'daily' ? 'Diário' : 
                           config.schedule === 'weekly' ? 'Semanal' : 'Mensal'}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>
                          Retenção: {config.retention} dias
                        </div>
                        <div>
                          Tabelas: {config.tables.length > 0 ? config.tables.join(', ') : 'Todas'}
                        </div>
                        <div>
                          Destinos: {config.destinations.filter(d => d.enabled).map(d => d.type).join(', ')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => executeBackup(config.id)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Executar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteConfig(config.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {configs.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma configuração criada ainda</p>
                  <Button 
                    className="mt-4"
                    onClick={() => setShowNewConfigForm(true)}
                    disabled={!canCreateConfig}
                  >
                    Criar primeira configuração
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Jobs de Backup</h3>
              <p className="text-sm text-gray-600">
                Histórico de execuções de backup
              </p>
            </div>
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>

          <div className="space-y-3">
            {jobs.map((job) => {
              const StatusIcon = getStatusIcon(job.status)
              return (
                <Card key={job.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <StatusIcon className={`h-4 w-4 ${job.status === 'running' ? 'animate-spin' : ''}`} />
                          <span className="font-medium">
                            {configs.find(c => c.id === job.configId)?.name || 'Configuração removida'}
                          </span>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status === 'completed' ? 'Concluído' :
                             job.status === 'running' ? 'Executando' :
                             job.status === 'failed' ? 'Falhou' : 'Pendente'}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>
                            {job.startedAt && `Iniciado: ${formatDate(job.startedAt)}`}
                            {job.completedAt && ` - Concluído: ${formatDate(job.completedAt)}`}
                          </div>
                          {job.size && (
                            <div>Tamanho: {formatSize(job.size)}</div>
                          )}
                          {job.status === 'running' && (
                            <div>
                              {job.details.currentOperation} 
                              ({job.details.tablesProcessed}/{job.details.totalTables} tabelas)
                            </div>
                          )}
                          {job.error && (
                            <div className="text-red-600">Erro: {job.error}</div>
                          )}
                        </div>
                        
                        {job.status === 'running' && (
                          <div className="mt-2">
                            <Progress value={job.progress} className="h-2" />
                            <div className="text-xs text-gray-500 mt-1">
                              {job.progress}% concluído
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            
            {jobs.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhum job de backup executado ainda</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Arquivos de Backup</h3>
              <p className="text-sm text-gray-600">
                Arquivos disponíveis para download e restauração
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {files.map((file) => (
              <Card key={file.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">{file.filename}</span>
                        {file.compressed && <Badge variant="outline">Comprimido</Badge>}
                        {file.encrypted && <Badge variant="outline">Criptografado</Badge>}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>
                          Tamanho: {formatSize(file.size)} • 
                          Criado: {formatDate(file.createdAt)}
                        </div>
                        <div>
                          Destino: {file.destination} • 
                          Checksum: {file.checksum.substring(0, 16)}...
                        </div>
                        {file.expiresAt && (
                          <div>
                            Expira em: {formatDate(file.expiresAt)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadBackup(file.id)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {files.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhum arquivo de backup disponível</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="restore" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Restaurar Backup
              </CardTitle>
              <CardDescription>
                Restaure dados de um backup anterior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Atenção:</strong> A restauração de backup irá sobrescrever dados existentes. 
                  Esta operação não pode ser desfeita. Certifique-se de ter um backup atual antes de prosseguir.
                </AlertDescription>
              </Alert>
              
              <div className="mt-6 space-y-4">
                <div>
                  <Label>Selecionar Arquivo de Backup</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um arquivo de backup" />
                    </SelectTrigger>
                    <SelectContent>
                      {files.map((file) => (
                        <SelectItem key={file.id} value={file.id}>
                          {file.filename} - {formatDate(file.createdAt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="destructive" disabled>
                    <Upload className="h-4 w-4 mr-2" />
                    Restaurar Backup
                  </Button>
                  <span className="text-sm text-gray-500">
                    Funcionalidade em desenvolvimento
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}