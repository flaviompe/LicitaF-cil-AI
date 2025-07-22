import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, FileText, CheckCircle, Clock } from 'lucide-react'

interface DashboardStatsProps {
  totalProposals: number
  acceptedProposals: number
  pendingProposals: number
  successRate: number
}

export function DashboardStats({
  totalProposals,
  acceptedProposals,
  pendingProposals,
  successRate,
}: DashboardStatsProps) {
  const stats = [
    {
      title: 'Total de Propostas',
      value: totalProposals,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Propostas Aceitas',
      value: acceptedProposals,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Propostas Pendentes',
      value: pendingProposals,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Taxa de Sucesso',
      value: `${successRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}