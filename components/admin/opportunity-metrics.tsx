'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Target, TrendingUp, TrendingDown, Eye, Calendar, MapPin } from 'lucide-react'

interface OpportunityMetricsProps {
  metrics: {
    totalOpportunities: number
    activeOpportunities: number
    newOpportunitiesThisMonth: number
    opportunitiesGrowth: number
    averageOpportunityValue: number
    opportunitiesByCategory: Array<{
      category: string
      count: number
      percentage: number
      averageValue: number
    }>
    opportunitiesByRegion: Array<{
      region: string
      count: number
      percentage: number
    }>
    opportunityTrends: Array<{
      month: string
      count: number
      value: number
      growth: number
    }>
    topOpportunities: Array<{
      id: string
      title: string
      value: number
      category: string
      region: string
      deadline: string
      viewCount: number
    }>
  }
}

export function OpportunityMetrics({ metrics }: OpportunityMetricsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Oportunidades</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOpportunities.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Cadastradas na plataforma
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oportunidades Ativas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeOpportunities.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((metrics.activeOpportunities / metrics.totalOpportunities) * 100).toFixed(1)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novas Este Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.newOpportunitiesThisMonth.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {metrics.opportunitiesGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className={metrics.opportunitiesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {metrics.opportunitiesGrowth > 0 ? '+' : ''}{metrics.opportunitiesGrowth.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Médio</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.averageOpportunityValue)}</div>
            <p className="text-xs text-muted-foreground">
              Por oportunidade
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Categories and Regions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Oportunidades por Categoria</CardTitle>
            <CardDescription>
              Distribuição das oportunidades por setor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.opportunitiesByCategory.map((category) => (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{category.category}</Badge>
                      <span className="text-sm font-medium">
                        {category.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{formatCurrency(category.averageValue)}</div>
                      <div className="text-xs text-muted-foreground">valor médio</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Progress value={category.percentage} className="flex-1" />
                    <span className="text-sm text-muted-foreground min-w-[3rem]">
                      {category.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Oportunidades por Região</CardTitle>
            <CardDescription>
              Distribuição geográfica das oportunidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.opportunitiesByRegion.map((region) => (
                <div key={region.region} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{region.region}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-bold">{region.count.toLocaleString()}</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={region.percentage} className="w-20" />
                      <span className="text-sm text-muted-foreground min-w-[3rem]">
                        {region.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução das Oportunidades</CardTitle>
          <CardDescription>
            Histórico de oportunidades e valores nos últimos meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.opportunityTrends.slice(-6).map((data) => (
              <div key={data.month} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <div className="font-medium">{data.month}</div>
                  <div className="text-sm text-muted-foreground">
                    {data.count.toLocaleString()} oportunidades
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{formatCurrency(data.value)}</div>
                  <div className="text-sm text-muted-foreground">valor total</div>
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

      {/* Top Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle>Oportunidades em Destaque</CardTitle>
          <CardDescription>
            Oportunidades com maior valor e engagement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.topOpportunities.slice(0, 10).map((opportunity, index) => (
              <div key={opportunity.id} className="flex items-center space-x-4 p-4 rounded-lg border">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                  index < 3 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gray-400'
                }`}>
                  {index + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{opportunity.title}</div>
                  <div className="flex items-center space-x-4 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {opportunity.category}
                    </Badge>
                    <span className="text-sm text-muted-foreground flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {opportunity.region}
                    </span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    {formatCurrency(opportunity.value)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(opportunity.deadline)}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Eye className="h-3 w-3 mr-1" />
                    {opportunity.viewCount}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    visualizações
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