import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { 
  Users, 
  UserPlus, 
  Target, 
  FileText, 
  TrendingUp, 
  DollarSign,
  Activity,
  Award
} from 'lucide-react'

interface BusinessMetrics {
  totalUsers: number
  activeUsers: number
  newUsersToday: number
  newUsersThisMonth: number
  totalOpportunities: number
  totalProposals: number
  successRate: number
  averageProposalValue: number
  revenue: {
    total: number
    thisMonth: number
    lastMonth: number
    growth: number
  }
}

interface AnalyticsOverviewProps {
  metrics: BusinessMetrics
}

export function AnalyticsOverview({ metrics }: AnalyticsOverviewProps) {
  const cards = [
    {
      title: 'Total de Usuários',
      value: metrics.totalUsers.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: `+${metrics.newUsersThisMonth} este mês`,
      changeType: 'positive' as const,
    },
    {
      title: 'Usuários Ativos',
      value: metrics.activeUsers.toLocaleString(),
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: `${((metrics.activeUsers / metrics.totalUsers) * 100).toFixed(1)}% do total`,
      changeType: 'neutral' as const,
    },
    {
      title: 'Novos Hoje',
      value: metrics.newUsersToday.toLocaleString(),
      icon: UserPlus,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: `+${metrics.newUsersThisMonth} este mês`,
      changeType: 'positive' as const,
    },
    {
      title: 'Oportunidades',
      value: metrics.totalOpportunities.toLocaleString(),
      icon: Target,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      change: 'Total cadastradas',
      changeType: 'neutral' as const,
    },
    {
      title: 'Propostas',
      value: metrics.totalProposals.toLocaleString(),
      icon: FileText,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      change: `${metrics.successRate.toFixed(1)}% de sucesso`,
      changeType: 'positive' as const,
    },
    {
      title: 'Taxa de Sucesso',
      value: `${metrics.successRate.toFixed(1)}%`,
      icon: Award,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: 'Propostas aceitas',
      changeType: 'positive' as const,
    },
    {
      title: 'Receita Total',
      value: formatCurrency(metrics.revenue.total),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: `${metrics.revenue.growth >= 0 ? '+' : ''}${metrics.revenue.growth.toFixed(1)}% vs mês passado`,
      changeType: metrics.revenue.growth >= 0 ? 'positive' as const : 'negative' as const,
    },
    {
      title: 'Receita Mensal',
      value: formatCurrency(metrics.revenue.thisMonth),
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: `vs ${formatCurrency(metrics.revenue.lastMonth)} mês passado`,
      changeType: metrics.revenue.thisMonth >= metrics.revenue.lastMonth ? 'positive' as const : 'negative' as const,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <Card key={card.title} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="flex items-center">
                <Badge 
                  variant={card.changeType === 'positive' ? 'default' : 
                          card.changeType === 'negative' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {card.change}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}