'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { FileText, TrendingUp, TrendingDown, Award, Clock, CheckCircle, XCircle } from 'lucide-react'

interface ProposalMetricsProps {
  metrics: {
    totalProposals: number
    successfulProposals: number
    pendingProposals: number
    rejectedProposals: number
    averageSuccessRate: number
    totalValueProposed: number
    totalValueWon: number
    proposalsByStatus: Array<{
      status: string
      count: number
      percentage: number
    }>
    proposalsByCategory: Array<{
      category: string
      count: number
      successRate: number
      totalValue: number
    }>
    monthlyProposalTrends: Array<{
      month: string
      submitted: number
      won: number
      successRate: number
      value: number
    }>
    topPerformingProposals: Array<{
      id: string
      title: string
      value: number
      category: string
      status: 'WON' | 'PENDING' | 'REJECTED'
      submittedDate: string
      userName: string
    }>
  }
}

export function ProposalMetrics({ metrics }: ProposalMetricsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'WON':
      case 'GANHOU':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'REJECTED':
      case 'REJEITADA':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'PENDING':
      case 'PENDENTE':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <FileText className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'WON':
      case 'GANHOU':
        return 'text-green-600 bg-green-100'
      case 'REJECTED':
      case 'REJEITADA':
        return 'text-red-600 bg-red-100'
      case 'PENDING':
      case 'PENDENTE':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Propostas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProposals.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Submetidas na plataforma
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propostas Ganhas</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.successfulProposals.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.averageSuccessRate.toFixed(1)}% taxa de sucesso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.pendingProposals.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando resultado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Ganho</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalValueWon)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(metrics.totalValueProposed)} propostos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>
              Status atual das propostas submetidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.proposalsByStatus.map((status) => (
                <div key={status.status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(status.status)}
                    <span className="text-sm font-medium capitalize">{status.status.toLowerCase()}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-bold">{status.count.toLocaleString()}</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={status.percentage} className="w-20" />
                      <span className="text-sm text-muted-foreground min-w-[3rem]">
                        {status.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance por Categoria</CardTitle>
            <CardDescription>
              Taxa de sucesso por setor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.proposalsByCategory.map((category) => (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{category.category}</Badge>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600">
                        {category.successRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {category.count} propostas
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Progress value={category.successRate} className="flex-1 mr-2" />
                    <div className="text-sm font-medium">
                      {formatCurrency(category.totalValue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Mensal das Propostas</CardTitle>
          <CardDescription>
            Histórico de submissões e aprovações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.monthlyProposalTrends.slice(-6).map((data) => (
              <div key={data.month} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/50">
                <div>
                  <div className="font-medium">{data.month}</div>
                  <div className="text-sm text-muted-foreground">
                    {data.submitted} submetidas
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-green-600">{data.won}</div>
                  <div className="text-sm text-muted-foreground">ganhas</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{data.successRate.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">sucesso</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatCurrency(data.value)}</div>
                  <div className="text-sm text-muted-foreground">valor total</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Proposals */}
      <Card>
        <CardHeader>
          <CardTitle>Propostas de Destaque</CardTitle>
          <CardDescription>
            Propostas com maior valor e impacto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.topPerformingProposals.slice(0, 10).map((proposal, index) => (
              <div key={proposal.id} className="flex items-center space-x-4 p-4 rounded-lg border">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                  proposal.status === 'WON' ? 'bg-green-500' : 
                  proposal.status === 'PENDING' ? 'bg-yellow-500' : 'bg-red-500'
                }`}>
                  {index + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{proposal.title}</div>
                  <div className="flex items-center space-x-4 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {proposal.category}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      por {proposal.userName}
                    </span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    {formatCurrency(proposal.value)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(proposal.submittedDate)}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                    {getStatusIcon(proposal.status)}
                    <span className="ml-1 capitalize">{proposal.status.toLowerCase()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Taxa de Conversão</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {metrics.averageSuccessRate.toFixed(1)}%
            </div>
            <Progress value={metrics.averageSuccessRate} className="mb-2" />
            <p className="text-sm text-muted-foreground">
              {metrics.successfulProposals} de {metrics.totalProposals} propostas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Valor Médio por Proposta</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {formatCurrency(metrics.totalValueProposed / metrics.totalProposals)}
            </div>
            <p className="text-sm text-muted-foreground">
              Valor médio proposto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Eficiência de Conversão</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {((metrics.totalValueWon / metrics.totalValueProposed) * 100).toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">
              Do valor proposto foi conquistado
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}