import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Cpu, 
  Database, 
  Shield, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Wrench,
  Monitor
} from 'lucide-react'

interface TecnicoDashboardProps {
  user: any
  stats: {
    systemUptime: number
    activeServers: number
    totalServers: number
    pendingUpdates: number
    securityAlerts: number
    backupStatus: string
    performanceScore: number
    criticalIssues: number
  }
}

export function TecnicoDashboard({ user, stats }: TecnicoDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Cabeçalho Técnico */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Settings className="h-6 w-6 mr-2" />
              Painel Técnico
            </h1>
            <p className="text-purple-100">Bem-vindo, {user.name} - Especialista Técnico</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-purple-100">Uptime do Sistema</div>
            <div className="text-2xl font-bold">{stats.systemUptime}%</div>
          </div>
        </div>
      </div>

      {/* Alertas Técnicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.criticalIssues > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center text-red-800">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Problemas Críticos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">
                {stats.criticalIssues} problemas críticos requerem atenção imediata
              </p>
            </CardContent>
          </Card>
        )}

        {stats.pendingUpdates > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-800">
                <Shield className="h-5 w-5 mr-2" />
                Atualizações Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-orange-700">
                {stats.pendingUpdates} atualizações de segurança aguardando instalação
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Métricas Técnicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Servidores Ativos</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeServers}/{stats.totalServers}</div>
            <p className="text-xs text-muted-foreground">Servidores operacionais</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.performanceScore}/100</div>
            <p className="text-xs text-muted-foreground">Score de performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backup Status</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.backupStatus}</div>
            <p className="text-xs text-muted-foreground">Último backup</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas de Segurança</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.securityAlerts}</div>
            <p className="text-xs text-muted-foreground">Alertas ativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Monitoramento de Sistemas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Monitor className="h-5 w-5 mr-2" />
              Status dos Serviços
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">API Gateway</span>
                <Badge variant="secondary">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Base de Dados</span>
                <Badge variant="secondary">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Sistema de Arquivos</span>
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Atenção
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wrench className="h-5 w-5 mr-2" />
              Tarefas de Manutenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Limpeza de Logs</span>
                <Badge variant="outline">Programada</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Backup Incremental</span>
                <Badge variant="secondary">Em Execução</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Atualização de Segurança</span>
                <Badge variant="destructive">Urgente</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recursos do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Utilização de Recursos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">45%</div>
              <div className="text-sm text-gray-600">CPU</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">62%</div>
              <div className="text-sm text-gray-600">RAM</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">78%</div>
              <div className="text-sm text-gray-600">Disco</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}