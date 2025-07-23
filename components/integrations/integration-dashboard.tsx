'use client';

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { 
  Globe, 
  Building2, 
  MapPin, 
  Activity, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  TrendingUp,
  Database,
  Clock
} from 'lucide-react'

interface Platform {
  id: string
  name: string
  scope: 'FEDERAL' | 'ESTADUAL' | 'MUNICIPAL'
  url: string
  enabled: boolean
  syncInterval: number
  lastSync?: string
}

interface IntegrationStats {
  totalPlatforms: number
  enabledPlatforms: number
  federalPlatforms: number
  statePlatforms: number
  municipalPlatforms: number
  activeSyncs: number
}

export function IntegrationDashboard() {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [stats, setStats] = useState<IntegrationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [integrationStatus, setIntegrationStatus] = useState('stopped')

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000) // Atualizar a cada 30 segundos
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      // Carregar plataformas
      const platformsResponse = await fetch('/api/integrations/platforms')
      const platformsData = await platformsResponse.json()
      
      if (platformsData.success) {
        setPlatforms(platformsData.data)
      }

      // Carregar estatísticas
      const statsResponse = await fetch('/api/integrations/start')
      const statsData = await statsResponse.json()
      
      if (statsData.success) {
        setStats(statsData.data)
        setIntegrationStatus('running')
      }
    } catch (error) {
      console.error('Erro ao carregar dados das integrações:', error)
    } finally {
      setLoading(false)
    }
  }

  const startIntegrations = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/integrations/start', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        setIntegrationStatus('running')
        await loadData()
      }
    } catch (error) {
      console.error('Erro ao iniciar integrações:', error)
    }
    setLoading(false)
  }

  const togglePlatform = async (platformId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/integrations/platforms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId, enabled })
      })
      
      if (response.ok) {
        await loadData()
      }
    } catch (error) {
      console.error('Erro ao atualizar plataforma:', error)
    }
  }

  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'FEDERAL': return <Globe className="h-4 w-4" />
      case 'ESTADUAL': return <Building2 className="h-4 w-4" />
      case 'MUNICIPAL': return <MapPin className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getScopeBadgeColor = (scope: string) => {
    switch (scope) {
      case 'FEDERAL': return 'bg-blue-500'
      case 'ESTADUAL': return 'bg-green-500'
      case 'MUNICIPAL': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando integrações...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Integrações de Licitações</h1>
          <p className="text-muted-foreground">
            Monitoramento de todas as plataformas de licitações do Brasil
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          {integrationStatus === 'stopped' && (
            <Button onClick={startIntegrations} disabled={loading}>
              <Activity className="h-4 w-4 mr-2" />
              Iniciar Integrações
            </Button>
          )}
        </div>
      </div>

      {/* Status Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Plataformas</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPlatforms}</div>
              <p className="text-xs text-muted-foreground">
                Cobertura nacional completa
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Plataformas Ativas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.enabledPlatforms}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.enabledPlatforms / stats.totalPlatforms) * 100)}% de cobertura
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sincronizações Ativas</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSyncs}</div>
              <p className="text-xs text-muted-foreground">
                Monitoramento em tempo real
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cobertura por Âmbito</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Federal: {stats.federalPlatforms}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Estadual: {stats.statePlatforms}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Municipal: {stats.municipalPlatforms}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Platforms List */}
      <Card>
        <CardHeader>
          <CardTitle>Plataformas de Licitações</CardTitle>
          <CardDescription>
            Configure e monitore todas as plataformas de licitações integradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {platforms.map((platform) => (
              <div 
                key={platform.id} 
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getScopeIcon(platform.scope)}
                    <Badge 
                      variant="secondary" 
                      className={`text-white ${getScopeBadgeColor(platform.scope)}`}
                    >
                      {platform.scope}
                    </Badge>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">{platform.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Sincronização a cada {platform.syncInterval} minutos
                    </p>
                    {platform.lastSync && (
                      <p className="text-xs text-muted-foreground flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        Última sincronização: {new Date(platform.lastSync).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {platform.enabled ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">
                      {platform.enabled ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  
                  <Switch
                    checked={platform.enabled}
                    onCheckedChange={(enabled) => togglePlatform(platform.id, enabled)}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Coverage Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo da Cobertura Nacional</CardTitle>
          <CardDescription>
            Status da integração com plataformas de licitações por âmbito
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <Globe className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <h3 className="font-semibold">Âmbito Federal</h3>
              <p className="text-2xl font-bold text-blue-600">
                {platforms.filter(p => p.scope === 'FEDERAL' && p.enabled).length}
              </p>
              <p className="text-sm text-muted-foreground">
                Plataformas ativas
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <Building2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <h3 className="font-semibold">Âmbito Estadual</h3>
              <p className="text-2xl font-bold text-green-600">
                {platforms.filter(p => p.scope === 'ESTADUAL' && p.enabled).length}
              </p>
              <p className="text-sm text-muted-foreground">
                Estados cobertos
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <MapPin className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <h3 className="font-semibold">Âmbito Municipal</h3>
              <p className="text-2xl font-bold text-purple-600">
                {platforms.filter(p => p.scope === 'MUNICIPAL' && p.enabled).length}
              </p>
              <p className="text-sm text-muted-foreground">
                Principais capitais
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}