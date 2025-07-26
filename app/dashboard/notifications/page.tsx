import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { NotificationCenter } from '@/components/notifications/notification-center'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Bell, 
  Settings, 
  Mail, 
  MessageSquare, 
  Smartphone,
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Volume2,
  VolumeX
} from 'lucide-react'

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/login')
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      company: true
      // TODO: Adicionar subscriptions quando o modelo for criado no schema
    }
  })

  if (!user) {
    redirect('/login')
  }

  // TODO: Implementar lógica real de planos quando o modelo subscription for criado
  const currentPlan: 'Starter' | 'Professional' | 'Enterprise' = 'Professional' // Mock temporário

  // Simular dados de notificação
  const notificationStats = {
    totalNotifications: 47,
    unreadCount: 8,
    todayCount: 12,
    criticalCount: 2,
    channels: {
      email: true,
      whatsapp: false,
      telegram: false,
      push: true,
      sms: false
    },
    systemStatus: 'active'
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Notificações
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gerencie suas notificações e configure como deseja ser informado
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-100 text-green-800">
            {notificationStats.systemStatus === 'active' ? '🔔 Ativo' : '🔕 Inativo'}
          </Badge>
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            📋 Plano {currentPlan}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Não Lidas
            </CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {notificationStats.unreadCount}
            </div>
            <div className="text-sm text-muted-foreground">
              de {notificationStats.totalNotifications} total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hoje
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {notificationStats.todayCount}
            </div>
            <div className="text-sm text-muted-foreground">
              Notificações recebidas
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Críticas
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {notificationStats.criticalCount}
            </div>
            <div className="text-sm text-muted-foreground">
              Requerem atenção
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Canais Ativos
            </CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Object.values(notificationStats.channels).filter(Boolean).length}
            </div>
            <div className="text-sm text-muted-foreground">
              de 5 disponíveis
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Features */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Notificações Inteligentes
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Receba alertas personalizados sobre oportunidades e prazos importantes
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Email e WhatsApp
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <Bell className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Notificações push
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Horário de silêncio
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
            Status do Sistema de Notificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Serviço de Email</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Operacional</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                  <span className="text-sm">WhatsApp API</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Operacional</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4 text-purple-600" />
                  <span className="text-sm">Push Notifications</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Operacional</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Taxa de Entrega</span>
                <span className="text-sm text-green-600">98.7%</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tempo Médio de Envio</span>
                <span className="text-sm text-blue-600">{'< 5s'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Disponibilidade</span>
                <span className="text-sm text-green-600">99.9%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Canais Configurados
          </CardTitle>
          <CardDescription>
            Canais de notificação ativos na sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className={`p-4 border rounded-lg ${notificationStats.channels.email ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className={`h-5 w-5 ${notificationStats.channels.email ? 'text-green-600' : 'text-gray-400'}`} />
                  <div>
                    <div className="font-medium">Email</div>
                    <div className="text-sm text-gray-600">
                      {user.email}
                    </div>
                  </div>
                </div>
                {notificationStats.channels.email ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <VolumeX className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>

            <div className={`p-4 border rounded-lg ${notificationStats.channels.whatsapp ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MessageSquare className={`h-5 w-5 ${notificationStats.channels.whatsapp ? 'text-green-600' : 'text-gray-400'}`} />
                  <div>
                    <div className="font-medium">WhatsApp</div>
                    <div className="text-sm text-gray-600">
                      {notificationStats.channels.whatsapp ? user.phone || 'Configurado' : 'Não configurado'}
                    </div>
                  </div>
                </div>
                {notificationStats.channels.whatsapp ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <VolumeX className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>

            <div className={`p-4 border rounded-lg ${notificationStats.channels.push ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Smartphone className={`h-5 w-5 ${notificationStats.channels.push ? 'text-green-600' : 'text-gray-400'}`} />
                  <div>
                    <div className="font-medium">Push</div>
                    <div className="text-sm text-gray-600">
                      {notificationStats.channels.push ? 'Ativo' : 'Inativo'}
                    </div>
                  </div>
                </div>
                {notificationStats.channels.push ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <VolumeX className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Premium Features */}
      {currentPlan === 'Starter' && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-purple-100 p-3 rounded-full">
                  <Zap className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Notificações Premium
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Desbloqueie WhatsApp, Telegram, templates personalizados e muito mais
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-2">
                  A partir de R$ 97/mês
                </div>
                <Button>
                  Fazer Upgrade
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Critical Notifications Alert */}
      {notificationStats.criticalCount > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Você tem {notificationStats.criticalCount} notificações críticas que requerem atenção imediata.
            <Button variant="link" className="p-0 h-auto font-normal text-red-600 ml-2">
              Ver agora
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Notification Center */}
      <NotificationCenter userId={session.user.id} />
    </div>
  )
}