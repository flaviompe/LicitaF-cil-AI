import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Analytics } from '@/lib/analytics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  BarChart3, 
  TrendingUp, 
  FileText, 
  Award, 
  Calendar,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react'

export default async function ReportsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/login')
  }

  const userAnalytics = await Analytics.getUserAnalytics(session.user.id)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Relatórios e Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Acompanhe seu desempenho e melhore seus resultados
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Propostas
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userAnalytics.totalProposals}</div>
            <div className="text-sm text-muted-foreground">
              Propostas enviadas
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Sucesso
            </CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {userAnalytics.successRate.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              {userAnalytics.acceptedProposals} aceitas
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Propostas Pendentes
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {userAnalytics.pendingProposals}
            </div>
            <div className="text-sm text-muted-foreground">
              Aguardando resultado
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Oportunidades
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {userAnalytics.totalOpportunities}
            </div>
            <div className="text-sm text-muted-foreground">
              Participações
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Desempenho</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="certificates">Certidões</TabsTrigger>
          <TabsTrigger value="activity">Atividade</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance por Mês */}
            <Card>
              <CardHeader>
                <CardTitle>Desempenho Mensal</CardTitle>
                <CardDescription>
                  Suas propostas nos últimos meses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(userAnalytics.proposalsByMonth)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .slice(0, 6)
                    .map(([month, data]) => (
                      <div key={month} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {new Date(month + '-01').toLocaleDateString('pt-BR', { 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </div>
                          <div className="text-sm text-gray-500">
                            {data.total} proposta(s)
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">
                            {data.total > 0 ? ((data.accepted / data.total) * 100).toFixed(1) : 0}%
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatCurrency(data.value)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Status das Propostas */}
            <Card>
              <CardHeader>
                <CardTitle>Status das Propostas</CardTitle>
                <CardDescription>
                  Distribuição por situação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Aceitas</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500"
                          style={{ 
                            width: `${userAnalytics.totalProposals > 0 ? 
                              (userAnalytics.acceptedProposals / userAnalytics.totalProposals) * 100 : 0}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-green-600">
                        {userAnalytics.acceptedProposals}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Pendentes</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-500"
                          style={{ 
                            width: `${userAnalytics.totalProposals > 0 ? 
                              (userAnalytics.pendingProposals / userAnalytics.totalProposals) * 100 : 0}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-yellow-600">
                        {userAnalytics.pendingProposals}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Rejeitadas</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-500"
                          style={{ 
                            width: `${userAnalytics.totalProposals > 0 ? 
                              (userAnalytics.rejectedProposals / userAnalytics.totalProposals) * 100 : 0}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-red-600">
                        {userAnalytics.rejectedProposals}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Propostas</CardTitle>
              <CardDescription>
                Suas últimas propostas enviadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Aqui você pode adicionar uma tabela com o histórico */}
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Histórico detalhado será implementado aqui</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Certidões</CardTitle>
              <CardDescription>
                Status das suas certidões e documentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total de Certidões</span>
                  <Badge variant="outline">
                    {userAnalytics.certificatesCount}
                  </Badge>
                </div>
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Detalhes das certidões serão exibidos aqui</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
              <CardDescription>
                Suas últimas ações no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userAnalytics.recentActivity.slice(0, 10).map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b">
                    <div>
                      <div className="font-medium">{activity.event}</div>
                      <div className="text-sm text-gray-500">
                        {formatDate(activity.timestamp)}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.event.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
                {userAnalytics.recentActivity.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhuma atividade recente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}