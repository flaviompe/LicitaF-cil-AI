'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Target } from 'lucide-react'

interface RevenueMetricsProps {
  metrics: {
    totalRevenue: number
    monthlyRevenue: number
    revenueGrowth: number
    averageRevenuePerUser: number
    subscriptionRevenue: number
    oneTimeRevenue: number
    churnRate: number
    revenueByPlan: Array<{
      plan: string
      revenue: number
      percentage: number
    }>
    monthlyRevenueHistory: Array<{
      month: string
      revenue: number
      growth: number
    }>
  }
}

export function RevenueMetrics({ metrics }: RevenueMetricsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Acumulado total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.monthlyRevenue)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {metrics.revenueGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className={metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {metrics.revenueGrowth > 0 ? '+' : ''}{metrics.revenueGrowth.toFixed(1)}%
              </span>
              <span className="ml-1">vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita por Usuário</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.averageRevenuePerUser)}</div>
            <p className="text-xs text-muted-foreground">
              ARPU médio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Churn</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.churnRate.toFixed(1)}%</div>
            <Progress value={metrics.churnRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Cancelamentos mensais
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Composição da Receita</CardTitle>
            <CardDescription>
              Divisão entre assinaturas e vendas únicas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <span className="text-sm font-medium">Assinaturas</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatCurrency(metrics.subscriptionRevenue)}</div>
                  <div className="text-sm text-muted-foreground">
                    {((metrics.subscriptionRevenue / metrics.totalRevenue) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <span className="text-sm font-medium">Vendas Únicas</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatCurrency(metrics.oneTimeRevenue)}</div>
                  <div className="text-sm text-muted-foreground">
                    {((metrics.oneTimeRevenue / metrics.totalRevenue) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Visual representation */}
              <div className="mt-4">
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 float-left"
                    style={{ width: `${(metrics.subscriptionRevenue / metrics.totalRevenue) * 100}%` }}
                  ></div>
                  <div 
                    className="h-full bg-green-600 float-left"
                    style={{ width: `${(metrics.oneTimeRevenue / metrics.totalRevenue) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receita por Plano</CardTitle>
            <CardDescription>
              Performance de cada plano de assinatura
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.revenueByPlan.map((plan) => (
                <div key={plan.plan} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant={plan.plan === 'PRO' ? 'default' : 'outline'}>
                      {plan.plan}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(plan.revenue)}</div>
                      <div className="text-sm text-muted-foreground">
                        {plan.percentage.toFixed(1)}%
                      </div>
                    </div>
                    <div className="w-20">
                      <Progress value={plan.percentage} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução da Receita Mensal</CardTitle>
          <CardDescription>
            Histórico de receita dos últimos meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.monthlyRevenueHistory.slice(-6).map((data) => (
              <div key={data.month} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <div className="font-medium">{data.month}</div>
                  <div className="text-2xl font-bold">{formatCurrency(data.revenue)}</div>
                </div>
                <div className="flex items-center space-x-2">
                  {data.growth >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`text-lg font-medium ${
                    data.growth >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {data.growth > 0 ? '+' : ''}{data.growth.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Financeiro</CardTitle>
          <CardDescription>
            Principais indicadores de performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {((metrics.subscriptionRevenue / metrics.totalRevenue) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Receita Recorrente</div>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(metrics.averageRevenuePerUser)}
              </div>
              <div className="text-sm text-muted-foreground">ARPU Médio</div>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {(100 - metrics.churnRate).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Taxa de Retenção</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}