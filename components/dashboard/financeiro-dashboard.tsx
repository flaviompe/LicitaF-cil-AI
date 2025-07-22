import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  PieChart, 
  Calendar,
  Receipt,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

interface FinanceiroDashboardProps {
  user: any
  stats: {
    monthlyRevenue: number
    monthlyExpenses: number
    profit: number
    profitMargin: number
    pendingPayments: number
    overdueBills: number
    cashFlow: number
    projectedRevenue: number
    budgetVariance: number
  }
}

export function FinanceiroDashboard({ user, stats }: FinanceiroDashboardProps) {
  const isProfit = stats.profit > 0
  const isCashFlowPositive = stats.cashFlow > 0

  return (
    <div className="space-y-6">
      {/* Cabeçalho Financeiro */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <DollarSign className="h-6 w-6 mr-2" />
              Painel Financeiro
            </h1>
            <p className="text-green-100">Bem-vindo, {user.name} - Gestor Financeiro</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-green-100">Lucro Mensal</div>
            <div className={`text-2xl font-bold ${isProfit ? 'text-white' : 'text-red-200'}`}>
              {isProfit ? '+' : ''}R$ {stats.profit.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Alertas Financeiros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.overdueBills > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center text-red-800">
                <Receipt className="h-5 w-5 mr-2" />
                Contas em Atraso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">
                {stats.overdueBills} contas vencidas requerem pagamento imediato
              </p>
            </CardContent>
          </Card>
        )}

        {stats.pendingPayments > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-800">
                <CreditCard className="h-5 w-5 mr-2" />
                Pagamentos Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-orange-700">
                R$ {stats.pendingPayments.toLocaleString()} em pagamentos pendentes
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Métricas Financeiras */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {stats.monthlyRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <ArrowUpRight className="h-3 w-3 inline mr-1" />
              +12% vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Mensais</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {stats.monthlyExpenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <ArrowDownRight className="h-3 w-3 inline mr-1" />
              -3% vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem de Lucro</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.profitMargin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Margem líquida</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fluxo de Caixa</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isCashFlowPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isCashFlowPositive ? '+' : ''}R$ {stats.cashFlow.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Saldo atual</p>
          </CardContent>
        </Card>
      </div>

      {/* Análise Financeira */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Análise de Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Receita Projetada</span>
                <span className="font-semibold text-green-600">
                  R$ {stats.projectedRevenue.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Variação Orçamentária</span>
                <Badge variant={stats.budgetVariance > 0 ? "secondary" : "destructive"}>
                  {stats.budgetVariance > 0 ? '+' : ''}{stats.budgetVariance.toFixed(1)}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">ROI Mensal</span>
                <span className="font-semibold">24.5%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Compromissos Financeiros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Folha de Pagamento</span>
                <Badge variant="outline">15/01</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Impostos Federais</span>
                <Badge variant="secondary">20/01</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Fornecedores</span>
                <Badge variant="destructive">Vencido</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Financeiro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChart className="h-5 w-5 mr-2" />
            Distribuição de Custos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">35%</div>
              <div className="text-sm text-gray-600">Pessoal</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">25%</div>
              <div className="text-sm text-gray-600">Operacional</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-orange-600">20%</div>
              <div className="text-sm text-gray-600">Impostos</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">20%</div>
              <div className="text-sm text-gray-600">Outros</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}