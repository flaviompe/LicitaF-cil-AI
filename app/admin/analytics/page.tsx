import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Analytics } from '@/lib/analytics'
import { AnalyticsOverview } from '@/components/admin/analytics-overview'
import { UserMetrics } from '@/components/admin/user-metrics'
import { RevenueMetrics } from '@/components/admin/revenue-metrics'
import { OpportunityMetrics } from '@/components/admin/opportunity-metrics'
import { ProposalMetrics } from '@/components/admin/proposal-metrics'
import { UserGrowthChart } from '@/components/admin/user-growth-chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, Users, DollarSign, Target, TrendingUp } from 'lucide-react'

export default async function AdminAnalyticsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/login')
  }

  // Verificar se é admin (você pode implementar verificação de role)
  const user = session.user as any
  const isAdmin = user.role === 'ADMIN'
  
  if (!isAdmin) {
    redirect('/dashboard')
  }

  const metrics = await Analytics.getBusinessMetrics()

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Analytics & Métricas
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Acompanhe o desempenho do LicitaFácil Pro
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-green-100 text-green-800">
              ✅ Tempo Real
            </Badge>
            <Badge variant="outline" className="bg-blue-100 text-blue-800">
              📊 Dados Atualizados
            </Badge>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <AnalyticsOverview metrics={metrics} />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="mt-8">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center">
            <DollarSign className="h-4 w-4 mr-2" />
            Receita
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="flex items-center">
            <Target className="h-4 w-4 mr-2" />
            Oportunidades
          </TabsTrigger>
          <TabsTrigger value="proposals" className="flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Propostas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UserGrowthChart data={metrics.userGrowth} />
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>
                  Usuários com melhor taxa de sucesso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.topPerformingUsers.map((user, index) => (
                    <div key={user.userId} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{user.userName}</div>
                          <div className="text-sm text-gray-500">
                            {user.proposalCount} proposta(s)
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          {user.successRate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-500">
                          sucesso
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserMetrics metrics={metrics as any} />
        </TabsContent>

        <TabsContent value="revenue" className="mt-6">
          <RevenueMetrics metrics={metrics as any} />
        </TabsContent>

        <TabsContent value="opportunities" className="mt-6">
          <OpportunityMetrics metrics={metrics as any} />
        </TabsContent>

        <TabsContent value="proposals" className="mt-6">
          <ProposalMetrics metrics={metrics as any} />
        </TabsContent>
      </Tabs>
    </div>
  )
}