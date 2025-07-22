import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  TrendingUp, 
  FileText, 
  AlertTriangle, 
  DollarSign, 
  Activity,
  Shield,
  Settings
} from 'lucide-react'

interface AdminDashboardProps {
  user: any
  stats: {
    totalUsers: number
    totalOpportunities: number
    totalProposals: number
    totalCompanies: number
    systemHealth: string
    revenueThisMonth: number
    criticalAlerts: number
  }
}

export function AdminDashboard({ user, stats }: AdminDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Cabeçalho Administrativo */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Shield className="h-6 w-6 mr-2" />
              Painel Administrativo
            </h1>
            <p className="text-blue-100">Bem-vindo, {user.name} - Administrador Geral</p>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white">
            Sistema: {stats.systemHealth}
          </Badge>
        </div>
      </div>

      {/* Alertas Críticos */}
      {stats.criticalAlerts > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Alertas Críticos do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">
              {stats.criticalAlerts} alertas críticos requerem atenção imediata
            </p>
          </CardContent>
        </Card>
      )}

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Usuários ativos no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Ativas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompanies}</div>
            <p className="text-xs text-muted-foreground">Empresas utilizando o sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oportunidades</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOpportunities}</div>
            <p className="text-xs text-muted-foreground">Licitações no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.revenueThisMonth.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Receita mensal atual</p>
          </CardContent>
        </Card>
      </div>

      {/* Gestão Rápida */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Gestão do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Usuários Pendentes</span>
                <Badge variant="outline">3</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Backups Automáticos</span>
                <Badge variant="secondary">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Manutenção Programada</span>
                <Badge variant="outline">Domingo 02:00</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Performance do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">CPU</span>
                <Badge variant="secondary">45%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Memória</span>
                <Badge variant="secondary">67%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Armazenamento</span>
                <Badge variant="outline">23%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}