'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Users, UserPlus, UserCheck, UserX, TrendingUp, TrendingDown } from 'lucide-react'

interface UserMetricsProps {
  metrics: {
    totalUsers: number
    activeUsers: number
    newUsersThisMonth: number
    userRetentionRate: number
    userGrowth: Array<{
      month: string
      users: number
      growth: number
    }>
    usersByPlan: Array<{
      plan: string
      count: number
      percentage: number
    }>
    topPerformingUsers: Array<{
      userId: string
      userName: string
      proposalCount: number
      successRate: number
    }>
  }
}

export function UserMetrics({ metrics }: UserMetricsProps) {
  const growthRate = metrics.userGrowth.length > 0 
    ? metrics.userGrowth[metrics.userGrowth.length - 1].growth 
    : 0

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {growthRate > 0 ? '+' : ''}{growthRate.toFixed(1)}% este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((metrics.activeUsers / metrics.totalUsers) * 100).toFixed(1)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Usuários</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.newUsersThisMonth.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Retenção</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.userRetentionRate.toFixed(1)}%</div>
            <Progress value={metrics.userRetentionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* User Distribution by Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Plano</CardTitle>
          <CardDescription>
            Usuários por tipo de assinatura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.usersByPlan.map((plan) => (
              <div key={plan.plan} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant={plan.plan === 'PRO' ? 'default' : 'outline'}>
                    {plan.plan}
                  </Badge>
                  <span className="text-sm font-medium">
                    {plan.count.toLocaleString()} usuários
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-32">
                    <Progress value={plan.percentage} />
                  </div>
                  <span className="text-sm text-muted-foreground min-w-[3rem] text-right">
                    {plan.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Growth Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Crescimento de Usuários</CardTitle>
          <CardDescription>
            Evolução do número de usuários nos últimos meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.userGrowth.slice(-6).map((data, index) => (
              <div key={data.month} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <div className="font-medium">{data.month}</div>
                  <div className="text-sm text-muted-foreground">
                    {data.users.toLocaleString()} usuários
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {data.growth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
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

      {/* Top Performing Users */}
      <Card>
        <CardHeader>
          <CardTitle>Top Usuários</CardTitle>
          <CardDescription>
            Usuários com melhor performance em propostas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.topPerformingUsers.slice(0, 10).map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{user.userName}</div>
                    <div className="text-sm text-muted-foreground">
                      {user.proposalCount} proposta{user.proposalCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    {user.successRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    taxa de sucesso
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}