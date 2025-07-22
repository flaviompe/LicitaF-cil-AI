'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  Bell, 
  Settings, 
  Mail, 
  MessageSquare, 
  Smartphone,
  Volume2,
  VolumeX,
  Clock,
  Filter,
  Search,
  MarkAsRead,
  Trash2,
  Send,
  CheckCircle,
  AlertTriangle,
  Info,
  Zap
} from 'lucide-react'

interface NotificationData {
  id: string
  type: 'opportunity' | 'certificate' | 'proposal' | 'payment' | 'system' | 'ai_analysis'
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  createdAt: Date
  readAt?: Date
  actionUrl?: string
  actionText?: string
}

interface NotificationSettings {
  emailEnabled: boolean
  whatsappEnabled: boolean
  telegramEnabled: boolean
  pushEnabled: boolean
  smsEnabled: boolean
  quietHours: {
    start: string
    end: string
  }
  preferences: {
    opportunities: boolean
    certificates: boolean
    proposals: boolean
    payments: boolean
    system: boolean
    aiAnalysis: boolean
  }
}

interface NotificationCenterProps {
  userId: string
}

export function NotificationCenter({ userId }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [settings, setSettings] = useState<NotificationSettings>({
    emailEnabled: true,
    whatsappEnabled: false,
    telegramEnabled: false,
    pushEnabled: true,
    smsEnabled: false,
    quietHours: {
      start: '22:00',
      end: '08:00'
    },
    preferences: {
      opportunities: true,
      certificates: true,
      proposals: true,
      payments: true,
      system: true,
      aiAnalysis: true
    }
  })
  const [unreadCount, setUnreadCount] = useState(0)
  const [filterType, setFilterType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadNotifications()
    loadSettings()
  }, [])

  const loadNotifications = async () => {
    try {
      // Simular carregamento de notificações
      const mockNotifications: NotificationData[] = [
        {
          id: '1',
          type: 'certificate',
          title: 'Certificado Expirando',
          message: 'Seu certificado A1 expira em 5 dias',
          priority: 'high',
          createdAt: new Date(Date.now() - 60000),
          actionUrl: '/dashboard/certificates',
          actionText: 'Renovar'
        },
        {
          id: '2',
          type: 'proposal',
          title: 'Prazo de Proposta',
          message: 'Proposta deve ser enviada em 2 dias',
          priority: 'urgent',
          createdAt: new Date(Date.now() - 120000),
          actionUrl: '/dashboard/proposals',
          actionText: 'Ver Proposta'
        },
        {
          id: '3',
          type: 'opportunity',
          title: 'Nova Oportunidade',
          message: 'Oportunidade relevante encontrada',
          priority: 'medium',
          createdAt: new Date(Date.now() - 300000),
          readAt: new Date(Date.now() - 60000),
          actionUrl: '/dashboard/opportunities',
          actionText: 'Ver Detalhes'
        },
        {
          id: '4',
          type: 'ai_analysis',
          title: 'Análise de IA Concluída',
          message: 'Análise do edital concluída com 78% de chance de sucesso',
          priority: 'medium',
          createdAt: new Date(Date.now() - 600000),
          actionUrl: '/dashboard/ai-analysis',
          actionText: 'Ver Análise'
        },
        {
          id: '5',
          type: 'payment',
          title: 'Pagamento Confirmado',
          message: 'Seu pagamento foi confirmado com sucesso',
          priority: 'low',
          createdAt: new Date(Date.now() - 86400000),
          readAt: new Date(Date.now() - 80000),
          actionUrl: '/dashboard/billing',
          actionText: 'Ver Fatura'
        }
      ]

      setNotifications(mockNotifications)
      setUnreadCount(mockNotifications.filter(n => !n.readAt).length)
    } catch (error) {
      console.error('Erro ao carregar notificações:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSettings = async () => {
    try {
      // Simular carregamento de configurações
      // Em produção, buscar do banco de dados
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const updatedNotifications = notifications.map(n => 
        n.id === notificationId ? { ...n, readAt: new Date() } : n
      )
      setNotifications(updatedNotifications)
      setUnreadCount(prev => Math.max(0, prev - 1))
      
      // Simular API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      toast({
        title: 'Notificação marcada como lida',
        description: 'A notificação foi marcada como lida.',
      })
    } catch (error) {
      console.error('Erro ao marcar como lida:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const updatedNotifications = notifications.map(n => 
        n.readAt ? n : { ...n, readAt: new Date() }
      )
      setNotifications(updatedNotifications)
      setUnreadCount(0)
      
      toast({
        title: 'Todas as notificações foram marcadas como lidas',
        description: 'Todas as notificações não lidas foram marcadas como lidas.',
      })
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const notificationToDelete = notifications.find(n => n.id === notificationId)
      const updatedNotifications = notifications.filter(n => n.id !== notificationId)
      setNotifications(updatedNotifications)
      
      if (notificationToDelete && !notificationToDelete.readAt) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      
      toast({
        title: 'Notificação removida',
        description: 'A notificação foi removida com sucesso.',
      })
    } catch (error) {
      console.error('Erro ao remover notificação:', error)
    }
  }

  const saveSettings = async () => {
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: 'Configurações salvas',
        description: 'Suas configurações de notificação foram salvas.',
      })
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configurações.',
        variant: 'destructive'
      })
    }
  }

  const testNotification = async (channel: string) => {
    try {
      toast({
        title: 'Teste enviado',
        description: `Notificação de teste enviada via ${channel}`,
      })
    } catch (error) {
      console.error('Erro ao enviar teste:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'certificate': return '🔐'
      case 'proposal': return '📄'
      case 'opportunity': return '💼'
      case 'payment': return '💳'
      case 'system': return '⚙️'
      case 'ai_analysis': return '🤖'
      default: return '🔔'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'certificate': return 'Certificado'
      case 'proposal': return 'Proposta'
      case 'opportunity': return 'Oportunidade'
      case 'payment': return 'Pagamento'
      case 'system': return 'Sistema'
      case 'ai_analysis': return 'Análise IA'
      default: return 'Geral'
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d atrás`
    if (hours > 0) return `${hours}h atrás`
    if (minutes > 0) return `${minutes}m atrás`
    return 'Agora'
  }

  const filteredNotifications = notifications.filter(notification => {
    const matchesType = filterType === 'all' || notification.type === filterType
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesType && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Bell className="h-6 w-6 text-gray-600" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Central de Notificações
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {unreadCount > 0 ? `${unreadCount} notificações não lidas` : 'Todas as notificações lidas'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <MarkAsRead className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Pesquisar notificações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="certificate">Certificados</SelectItem>
                <SelectItem value="proposal">Propostas</SelectItem>
                <SelectItem value="opportunity">Oportunidades</SelectItem>
                <SelectItem value="payment">Pagamentos</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
                <SelectItem value="ai_analysis">Análise IA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Nenhuma notificação encontrada
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {searchTerm || filterType !== 'all' 
                      ? 'Tente ajustar os filtros' 
                      : 'Suas notificações aparecerão aqui'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map((notification) => (
                <Card key={notification.id} className={`${!notification.readAt ? 'bg-blue-50 border-blue-200' : ''} hover:shadow-md transition-shadow`}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className="text-2xl">{getTypeIcon(notification.type)}</div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className={`font-medium ${!notification.readAt ? 'text-blue-900' : 'text-gray-900'}`}>
                                {notification.title}
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                {getTypeLabel(notification.type)}
                              </Badge>
                              <Badge className={getPriorityColor(notification.priority)}>
                                {notification.priority}
                              </Badge>
                            </div>
                            <p className={`text-sm ${!notification.readAt ? 'text-blue-700' : 'text-gray-600'} mb-2`}>
                              {notification.message}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>{formatTime(notification.createdAt)}</span>
                              {!notification.readAt && (
                                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                  Não lida
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {notification.actionUrl && (
                              <Button size="sm" variant="outline">
                                {notification.actionText || 'Ver'}
                              </Button>
                            )}
                            {!notification.readAt && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Notification Channels */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Canais de Notificação
                </CardTitle>
                <CardDescription>
                  Configure como você deseja receber notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">Email</div>
                      <div className="text-sm text-gray-600">Receber por email</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.emailEnabled}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        emailEnabled: checked
                      })}
                    />
                    <Button size="sm" variant="outline" onClick={() => testNotification('email')}>
                      Testar
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">WhatsApp</div>
                      <div className="text-sm text-gray-600">Receber via WhatsApp</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.whatsappEnabled}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        whatsappEnabled: checked
                      })}
                    />
                    <Button size="sm" variant="outline" onClick={() => testNotification('whatsapp')}>
                      Testar
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Send className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="font-medium">Telegram</div>
                      <div className="text-sm text-gray-600">Receber via Telegram</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.telegramEnabled}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        telegramEnabled: checked
                      })}
                    />
                    <Button size="sm" variant="outline" onClick={() => testNotification('telegram')}>
                      Testar
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="h-5 w-5 text-purple-600" />
                    <div>
                      <div className="font-medium">Push</div>
                      <div className="text-sm text-gray-600">Notificações push</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.pushEnabled}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        pushEnabled: checked
                      })}
                    />
                    <Button size="sm" variant="outline" onClick={() => testNotification('push')}>
                      Testar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Preferências de Conteúdo
                </CardTitle>
                <CardDescription>
                  Escolha que tipos de notificações receber
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-lg">💼</div>
                    <div>
                      <div className="font-medium">Oportunidades</div>
                      <div className="text-sm text-gray-600">Novas licitações</div>
                    </div>
                  </div>
                  <Switch
                    checked={settings.preferences.opportunities}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      preferences: { ...settings.preferences, opportunities: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-lg">🔐</div>
                    <div>
                      <div className="font-medium">Certificados</div>
                      <div className="text-sm text-gray-600">Vencimentos e renovações</div>
                    </div>
                  </div>
                  <Switch
                    checked={settings.preferences.certificates}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      preferences: { ...settings.preferences, certificates: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-lg">📄</div>
                    <div>
                      <div className="font-medium">Propostas</div>
                      <div className="text-sm text-gray-600">Prazos e status</div>
                    </div>
                  </div>
                  <Switch
                    checked={settings.preferences.proposals}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      preferences: { ...settings.preferences, proposals: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-lg">🤖</div>
                    <div>
                      <div className="font-medium">Análise IA</div>
                      <div className="text-sm text-gray-600">Resultados de análises</div>
                    </div>
                  </div>
                  <Switch
                    checked={settings.preferences.aiAnalysis}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      preferences: { ...settings.preferences, aiAnalysis: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-lg">💳</div>
                    <div>
                      <div className="font-medium">Pagamentos</div>
                      <div className="text-sm text-gray-600">Faturas e cobrança</div>
                    </div>
                  </div>
                  <Switch
                    checked={settings.preferences.payments}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      preferences: { ...settings.preferences, payments: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-lg">⚙️</div>
                    <div>
                      <div className="font-medium">Sistema</div>
                      <div className="text-sm text-gray-600">Atualizações e manutenção</div>
                    </div>
                  </div>
                  <Switch
                    checked={settings.preferences.system}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      preferences: { ...settings.preferences, system: checked }
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quiet Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Horário de Silêncio
              </CardTitle>
              <CardDescription>
                Configure quando não deseja receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Início</label>
                  <Input
                    type="time"
                    value={settings.quietHours.start}
                    onChange={(e) => setSettings({
                      ...settings,
                      quietHours: { ...settings.quietHours, start: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fim</label>
                  <Input
                    type="time"
                    value={settings.quietHours.end}
                    onChange={(e) => setSettings({
                      ...settings,
                      quietHours: { ...settings.quietHours, end: e.target.value }
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={saveSettings}>
              Salvar Configurações
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Templates de Notificação</CardTitle>
              <CardDescription>
                Personalize as mensagens de notificação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Esta funcionalidade está disponível apenas no plano Enterprise.
                    <Button variant="link" className="p-0 h-auto font-normal">
                      Fazer upgrade
                    </Button>
                  </AlertDescription>
                </Alert>

                <div className="opacity-50 space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Certificado Expirando</h4>
                      <Switch disabled />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Seu certificado {{certificateName}} expira em {{daysToExpire}} dias
                    </p>
                    <Button size="sm" variant="outline" disabled>
                      Editar Template
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Prazo de Proposta</h4>
                      <Switch disabled />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      A proposta para {{opportunityTitle}} deve ser enviada em {{daysToDeadline}} dias
                    </p>
                    <Button size="sm" variant="outline" disabled>
                      Editar Template
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}