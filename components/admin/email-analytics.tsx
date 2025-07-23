'use client';

import { useState, useEffect } from 'react'
import { 
  ChartBarIcon, 
  EnvelopeIcon, 
  EyeIcon, 
  CursorArrowRaysIcon,
  ExclamationTriangleIcon,
  UserMinusIcon,
  CalendarIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'

interface AnalyticsData {
  period: {
    start: string
    end: string
  }
  totalEmails: number
  totalDelivered: number
  totalOpened: number
  totalClicked: number
  totalBounced: number
  totalComplaints: number
  totalUnsubscribes: number
  deliveryRate: number
  openRate: number
  clickRate: number
  bounceRate: number
  complaintRate: number
  unsubscribeRate: number
  clickToOpenRate: number
  byDay: Array<{
    date: string
    sent: number
    opened: number
    clicked: number
    bounced: number
  }>
  topLinks: Array<{
    url: string
    text: string
    clicks: number
    uniqueClicks: number
  }>
  deviceStats: {
    desktop: number
    mobile: number
    tablet: number
    unknown: number
  }
}

interface RealtimeStats {
  emailsSentToday: number
  emailsOpenedToday: number
  emailsClickedToday: number
  recentActivity: Array<{
    id: string
    emailId: string
    userEmail: string
    eventType: string
    timestamp: string
  }>
}

export default function EmailAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadAnalytics()
    loadRealtimeStats()
    
    // Refresh realtime stats every 30 seconds
    const interval = setInterval(loadRealtimeStats, 30000)
    return () => clearInterval(interval)
  }, [selectedPeriod, selectedTemplate])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        type: 'summary'
      })
      
      if (selectedTemplate) {
        params.set('templateId', selectedTemplate)
      }

      const response = await fetch(`/api/emails/analytics?${params}`)
      const result = await response.json()

      if (result.success) {
        setAnalyticsData(result.data)
        setError('')
      } else {
        setError(result.error || 'Failed to load analytics')
      }
    } catch (err) {
      setError('Failed to load analytics data')
      console.error('Analytics error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadRealtimeStats = async () => {
    try {
      const response = await fetch('/api/emails/analytics?type=realtime')
      const result = await response.json()

      if (result.success) {
        setRealtimeStats(result.data)
      }
    } catch (err) {
      console.error('Realtime stats error:', err)
    }
  }

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('pt-BR').format(num)
  }

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow border">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Erro ao carregar analytics
            </h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Acompanhe o desempenho dos seus emails
          </p>
        </div>
        
        <div className="flex space-x-4">
          <select 
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="">Todos os templates</option>
            <option value="welcome">Boas-vindas</option>
            <option value="opportunity-alert">Alerta de Oportunidade</option>
            <option value="certificate-expiry">Vencimento de Certidão</option>
            <option value="password-reset">Redefinição de Senha</option>
          </select>
          
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {/* Realtime Stats */}
      {realtimeStats && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-900 mb-3">Estatísticas de Hoje</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(realtimeStats.emailsSentToday)}
              </div>
              <div className="text-sm text-blue-700">Emails Enviados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(realtimeStats.emailsOpenedToday)}
              </div>
              <div className="text-sm text-green-700">Emails Abertos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatNumber(realtimeStats.emailsClickedToday)}
              </div>
              <div className="text-sm text-purple-700">Cliques</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Metrics */}
      {analyticsData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <EnvelopeIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {formatNumber(analyticsData.totalEmails)}
                  </h3>
                  <p className="text-sm text-gray-500">Emails Enviados</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-sm text-gray-600">
                  Taxa de Entrega: {formatPercentage(analyticsData.deliveryRate)}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${analyticsData.deliveryRate}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <EyeIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {formatNumber(analyticsData.totalOpened)}
                  </h3>
                  <p className="text-sm text-gray-500">Emails Abertos</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-sm text-gray-600">
                  Taxa de Abertura: {formatPercentage(analyticsData.openRate)}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${Math.min(analyticsData.openRate, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CursorArrowRaysIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {formatNumber(analyticsData.totalClicked)}
                  </h3>
                  <p className="text-sm text-gray-500">Cliques</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-sm text-gray-600">
                  Taxa de Cliques: {formatPercentage(analyticsData.clickRate)}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: `${Math.min(analyticsData.clickRate * 5, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {formatPercentage(analyticsData.clickToOpenRate)}
                  </h3>
                  <p className="text-sm text-gray-500">Click-to-Open Rate</p>
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <div className="text-xs text-gray-500">
                  Bounces: {analyticsData.totalBounced} ({formatPercentage(analyticsData.bounceRate)})
                </div>
                <div className="text-xs text-gray-500">
                  Unsubscribes: {analyticsData.totalUnsubscribes} ({formatPercentage(analyticsData.unsubscribeRate)})
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Performance */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Performance Diária
              </h3>
              <div className="space-y-3">
                {analyticsData.byDay.slice(-7).map((day, index) => (
                  <div key={day.date} className="flex items-center space-x-4">
                    <div className="w-20 text-sm text-gray-500">
                      {new Date(day.date).toLocaleDateString('pt-BR', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-blue-600">{day.sent} enviados</span>
                        <span className="text-green-600">{day.opened} abertos</span>
                        <span className="text-purple-600">{day.clicked} cliques</span>
                      </div>
                      <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ 
                            width: `${day.sent > 0 ? (day.opened / day.sent) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Device Stats */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Dispositivos
              </h3>
              <div className="space-y-4">
                {Object.entries(analyticsData.deviceStats).map(([device, count]) => {
                  const total = Object.values(analyticsData.deviceStats).reduce((a, b) => a + b, 0)
                  const percentage = total > 0 ? (count / total) * 100 : 0
                  
                  return (
                    <div key={device} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {device === 'desktop' ? 'Desktop' :
                         device === 'mobile' ? 'Mobile' :
                         device === 'tablet' ? 'Tablet' : 'Desconhecido'}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">{count}</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500 w-12">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Top Links */}
          {analyticsData.topLinks.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Links Mais Clicados
              </h3>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Link
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliques Totais
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliques Únicos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analyticsData.topLinks.slice(0, 5).map((link, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm">
                          <div className="flex items-center">
                            <CursorArrowRaysIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <div className="font-medium text-gray-900">{link.text}</div>
                              <div className="text-gray-500 truncate max-w-xs">{link.url}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {formatNumber(link.clicks)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {formatNumber(link.uniqueClicks)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {realtimeStats?.recentActivity && realtimeStats.recentActivity.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Atividade Recente
              </h3>
              <div className="space-y-3">
                {realtimeStats.recentActivity.slice(0, 10).map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-3 text-sm">
                    <div className="flex-shrink-0">
                      {activity.eventType === 'opened' && (
                        <EyeIcon className="h-4 w-4 text-green-500" />
                      )}
                      {activity.eventType === 'clicked' && (
                        <CursorArrowRaysIcon className="h-4 w-4 text-purple-500" />
                      )}
                      {activity.eventType === 'sent' && (
                        <EnvelopeIcon className="h-4 w-4 text-blue-500" />
                      )}
                      {activity.eventType === 'bounced' && (
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                      )}
                      {activity.eventType === 'unsubscribed' && (
                        <UserMinusIcon className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="text-gray-900">{activity.userEmail}</span>
                      <span className="text-gray-500 ml-2">
                        {activity.eventType === 'opened' ? 'abriu um email' :
                         activity.eventType === 'clicked' ? 'clicou em um link' :
                         activity.eventType === 'sent' ? 'recebeu um email' :
                         activity.eventType === 'bounced' ? 'email retornou' :
                         activity.eventType === 'unsubscribed' ? 'cancelou inscrição' :
                         activity.eventType}
                      </span>
                    </div>
                    <div className="text-gray-400 text-xs">
                      {new Date(activity.timestamp).toLocaleTimeString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}