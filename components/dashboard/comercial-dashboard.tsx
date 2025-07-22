import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  Target, 
  DollarSign, 
  Users, 
  Calendar, 
  Award,
  FileText,
  BarChart3
} from 'lucide-react'

interface ComercialDashboardProps {
  user: any
  stats: {
    monthlyRevenue: number
    proposalsWon: number
    proposalsSubmitted: number
    winRate: number
    activePipeline: number
    monthlyTarget: number
    newOpportunities: number
    closingOpportunities: number
  }
}

export function ComercialDashboard({ user, stats }: ComercialDashboardProps) {
  const targetProgress = (stats.monthlyRevenue / stats.monthlyTarget) * 100

  return (
    <div className="space-y-6">
      {/* Cabeçalho Comercial */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Target className="h-6 w-6 mr-2" />
              Painel Comercial
            </h1>
            <p className="text-blue-100">Bem-vindo, {user.name} - Gestor Comercial</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-100">Meta do Mês</div>
            <div className="text-2xl font-bold">{targetProgress.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Indicadores de Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Meta: R$ {stats.monthlyTarget.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Vitória</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.proposalsWon} de {stats.proposalsSubmitted} propostas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Ativo</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePipeline}</div>
            <p className="text-xs text-muted-foreground">Oportunidades em andamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novas Oportunidades</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newOpportunities}</div>
            <p className="text-xs text-muted-foreground">Esta semana</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Comerciais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.closingOpportunities > 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <Calendar className="h-5 w-5 mr-2" />
                Oportunidades Fechando
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-green-700">
                {stats.closingOpportunities} oportunidades fecham nos próximos 7 dias
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <BarChart3 className="h-5 w-5 mr-2" />
              Performance do Trimestre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-700">
              Meta trimestral: 78% atingida
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ações Comerciais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Oportunidades Prioritárias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Licitação Petrobras - R$ 2.5M</span>
                <Badge variant="destructive">Fecha hoje</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Pregão Banco do Brasil - R$ 890K</span>
                <Badge variant="secondary">3 dias</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Concorrência Vale - R$ 1.2M</span>
                <Badge variant="outline">7 dias</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Equipe Comercial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">João Silva - Vendedor</span>
                <Badge variant="secondary">85% meta</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Maria Santos - Vendedora</span>
                <Badge variant="secondary">92% meta</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Pedro Costa - Vendedor</span>
                <Badge variant="outline">68% meta</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}