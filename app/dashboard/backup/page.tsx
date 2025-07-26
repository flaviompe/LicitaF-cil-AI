import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { BackupManagement } from '@/components/backup/backup-management'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Database, 
  Shield, 
  Clock, 
  HardDrive,
  Cloud,
  Lock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Settings
} from 'lucide-react'

export default async function BackupPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/login')
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      company: true
      // TODO: Adicionar subscriptions quando o modelo for criado no schema
    }
  })

  if (!user) {
    redirect('/login')
  }

  // TODO: Implementar lógica real de planos quando o modelo subscription for criado
  const currentPlan = 'Professional' // Mock temporário

  // Simular dados de backup
  const backupStats = {
    totalBackups: 12,
    totalSize: 1024 * 1024 * 150, // 150MB
    successRate: 95.8,
    lastBackup: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
    nextScheduled: new Date(Date.now() + 22 * 60 * 60 * 1000), // em 22 horas
    activeConfigs: 2,
    systemStatus: 'healthy'
  }

  const planFeatures = {
    'Starter': {
      maxConfigs: 1,
      maxRetention: 7,
      destinations: ['Local'],
      encryption: false,
      scheduling: 'Básico'
    },
    'Professional': {
      maxConfigs: 3,
      maxRetention: 30,
      destinations: ['Local', 'AWS S3', 'Google Cloud'],
      encryption: true,
      scheduling: 'Avançado'
    },
    'Enterprise': {
      maxConfigs: 10,
      maxRetention: 365,
      destinations: ['Local', 'AWS S3', 'Google Cloud', 'Azure', 'FTP'],
      encryption: true,
      scheduling: 'Personalizado'
    }
  }

  const currentFeatures = planFeatures[currentPlan as keyof typeof planFeatures] || planFeatures['Starter']

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Backup e Recuperação
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Proteja seus dados com backups automáticos e seguros
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-100 text-green-800">
            {backupStats.systemStatus === 'healthy' ? '✅ Sistema OK' : '⚠️ Verificar'}
          </Badge>
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            📋 Plano {currentPlan}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Backups Totais
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {backupStats.totalBackups}
            </div>
            <div className="text-sm text-muted-foreground">
              {backupStats.activeConfigs} configurações ativas
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tamanho Total
            </CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Math.round(backupStats.totalSize / (1024 * 1024))} MB
            </div>
            <div className="text-sm text-muted-foreground">
              Dados protegidos
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Sucesso
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {backupStats.successRate}%
            </div>
            <div className="text-sm text-muted-foreground">
              Últimos 30 dias
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Próximo Backup
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {Math.round((backupStats.nextScheduled.getTime() - Date.now()) / (1000 * 60 * 60))}h
            </div>
            <div className="text-sm text-muted-foreground">
              Backup automático
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup Features */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Backup Automático e Seguro
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Seus dados protegidos com backups automáticos, criptografia e múltiplos destinos
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Agendamento automático
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <Lock className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Criptografia avançada
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <Cloud className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Múltiplos destinos
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Recursos do Plano {currentPlan}
          </CardTitle>
          <CardDescription>
            Recursos de backup disponíveis no seu plano atual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Configurações</span>
                <span className="text-sm text-gray-600">
                  {currentFeatures.maxConfigs} máximo
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Retenção</span>
                <span className="text-sm text-gray-600">
                  {currentFeatures.maxRetention} dias
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Agendamento</span>
                <span className="text-sm text-gray-600">
                  {currentFeatures.scheduling}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium">Destinos Disponíveis</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {currentFeatures.destinations.map((dest) => (
                    <Badge key={dest} variant="outline">{dest}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Criptografia</span>
                {currentFeatures.encryption ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
            Status do Sistema de Backup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Serviço de Backup</span>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Operacional</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Armazenamento Local</span>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">85% Livre</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Scheduler</span>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Ativo</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Último Backup</span>
                <span className="text-sm text-gray-600">
                  {backupStats.lastBackup.toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Próximo Agendado</span>
                <span className="text-sm text-gray-600">
                  {backupStats.nextScheduled.toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Tempo de Execução</span>
                <span className="text-sm text-gray-600">{'< 5min'}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Backups Hoje</span>
                <span className="text-sm text-gray-600">2</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Falhas (7d)</span>
                <span className="text-sm text-gray-600">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Disponibilidade</span>
                <span className="text-sm text-green-600">99.9%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade CTA */}
      {currentPlan === 'Starter' && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-purple-100 p-3 rounded-full">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Backup Avançado
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Desbloqueie backups na nuvem, criptografia e maior retenção
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-2">
                  A partir de R$ 97/mês
                </div>
                <Button>
                  Fazer Upgrade
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Alert */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          Último backup executado com sucesso há {Math.round((Date.now() - backupStats.lastBackup.getTime()) / (1000 * 60 * 60))} horas. 
          Próximo backup agendado para {backupStats.nextScheduled.toLocaleDateString('pt-BR')} às {backupStats.nextScheduled.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
        </AlertDescription>
      </Alert>

      {/* Main Backup Management */}
      <BackupManagement currentPlan={currentPlan} />
    </div>
  )
}