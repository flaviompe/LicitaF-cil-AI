'use client';

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { 
  Bell, 
  Mail, 
  Smartphone,
  Clock,
  AlertTriangle,
  Calendar,
  Zap,
  ArrowRight,
  Volume2
} from 'lucide-react'

interface NotificationsStepProps {
  user: any
  data?: any
  onNext: (data?: any) => void
}

export function NotificationsStep({ user, data, onNext }: NotificationsStepProps) {
  const [notifications, setNotifications] = useState(data || {
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    newOpportunities: true,
    documentExpiry: true,
    bidDeadlines: true,
    resultNotifications: true,
    weeklyDigest: true,
    urgentAlerts: true,
    notificationTiming: 'immediately',
    quietHours: false,
    quietStart: '22:00',
    quietEnd: '08:00',
  })

  const handleSwitchChange = (field: string, checked: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [field]: checked
    }))
  }

  const handleRadioChange = (field: string, value: string) => {
    setNotifications(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleTimeChange = (field: string, value: string) => {
    setNotifications(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNext = () => {
    onNext(notifications)
  }

  const notificationTypes = [
    {
      key: 'newOpportunities',
      title: 'Novas Oportunidades',
      description: 'Quando encontramos licitações que combinam com seu perfil',
      icon: Zap,
      color: 'text-green-500',
    },
    {
      key: 'documentExpiry',
      title: 'Vencimento de Documentos',
      description: 'Alertas sobre certidões que estão prestes a vencer',
      icon: Calendar,
      color: 'text-orange-500',
    },
    {
      key: 'bidDeadlines',
      title: 'Prazos de Propostas',
      description: 'Lembretes sobre deadlines de submissão de propostas',
      icon: Clock,
      color: 'text-red-500',
    },
    {
      key: 'resultNotifications',
      title: 'Resultados de Licitações',
      description: 'Quando os resultados das licitações forem divulgados',
      icon: Bell,
      color: 'text-blue-500',
    },
    {
      key: 'weeklyDigest',
      title: 'Resumo Semanal',
      description: 'Um resumo das atividades e oportunidades da semana',
      icon: Mail,
      color: 'text-purple-500',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
          <Bell className="h-8 w-8 text-orange-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Configurar Notificações</h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Nunca perca uma oportunidade importante com nosso sistema de alertas inteligente
        </p>
      </div>

      {/* Canais de Notificação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Smartphone className="h-4 w-4 mr-2" />
            Canais de Notificação
          </CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Escolha como deseja receber suas notificações
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <Label htmlFor="emailNotifications" className="text-sm font-medium">
                  Notificações por Email
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Receber alertas no email {user.email}
                </p>
              </div>
            </div>
            <Switch
              id="emailNotifications"
              checked={notifications.emailNotifications}
              onCheckedChange={(checked) => handleSwitchChange('emailNotifications', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="h-5 w-5 text-gray-400" />
              <div>
                <Label htmlFor="pushNotifications" className="text-sm font-medium">
                  Notificações Push
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Alertas instantâneos no navegador
                </p>
              </div>
            </div>
            <Switch
              id="pushNotifications"
              checked={notifications.pushNotifications}
              onCheckedChange={(checked) => handleSwitchChange('pushNotifications', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Smartphone className="h-5 w-5 text-gray-400" />
              <div>
                <Label htmlFor="smsNotifications" className="text-sm font-medium">
                  SMS (Premium)
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Mensagens de texto para alertas urgentes
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">Premium</Badge>
              <Switch
                id="smsNotifications"
                checked={notifications.smsNotifications}
                onCheckedChange={(checked) => handleSwitchChange('smsNotifications', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tipos de Notificação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Volume2 className="h-4 w-4 mr-2" />
            Tipos de Alertas
          </CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Personalize que tipos de alertas deseja receber
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationTypes.map((type) => (
            <div key={type.key} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <type.icon className={`h-5 w-5 ${type.color}`} />
                <div>
                  <Label htmlFor={type.key} className="text-sm font-medium">
                    {type.title}
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {type.description}
                  </p>
                </div>
              </div>
              <Switch
                id={type.key}
                checked={notifications[type.key]}
                onCheckedChange={(checked) => handleSwitchChange(type.key, checked)}
              />
            </div>
          ))}
          
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <Label htmlFor="urgentAlerts" className="text-sm font-medium">
                  Alertas Urgentes
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Notificações críticas sobre prazos iminentes
                </p>
              </div>
            </div>
            <Switch
              id="urgentAlerts"
              checked={notifications.urgentAlerts}
              onCheckedChange={(checked) => handleSwitchChange('urgentAlerts', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Frequência de Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Frequência das Notificações
          </CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Defina quando deseja receber as notificações
          </p>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={notifications.notificationTiming} 
            onValueChange={(value) => handleRadioChange('notificationTiming', value)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="immediately" id="immediately" />
              <Label htmlFor="immediately" className="text-sm">
                Imediatamente
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="hourly" id="hourly" />
              <Label htmlFor="hourly" className="text-sm">
                Resumo por hora
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="daily" id="daily" />
              <Label htmlFor="daily" className="text-sm">
                Resumo diário (09:00)
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Horário Silencioso */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Volume2 className="h-4 w-4 mr-2" />
            Horário Silencioso
          </CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure um período sem notificações (exceto alertas urgentes)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="quietHours" className="text-sm font-medium">
              Ativar Horário Silencioso
            </Label>
            <Switch
              id="quietHours"
              checked={notifications.quietHours}
              onCheckedChange={(checked) => handleSwitchChange('quietHours', checked)}
            />
          </div>
          
          {notifications.quietHours && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="quietStart" className="text-sm font-medium">
                  Início
                </Label>
                <input
                  id="quietStart"
                  type="time"
                  value={notifications.quietStart}
                  onChange={(e) => handleTimeChange('quietStart', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
              <div>
                <Label htmlFor="quietEnd" className="text-sm font-medium">
                  Fim
                </Label>
                <input
                  id="quietEnd"
                  type="time"
                  value={notifications.quietEnd}
                  onChange={(e) => handleTimeChange('quietEnd', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Bell className="h-5 w-5 text-orange-500 mt-0.5" />
          <div>
            <h4 className="font-medium text-orange-900 dark:text-orange-100">Importante</h4>
            <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
              Recomendamos manter os alertas urgentes e de vencimento de documentos ativos
              para não perder oportunidades importantes ou compliance.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Button onClick={handleNext} size="lg" className="px-8">
          Finalizar Configuração
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Você pode alterar essas configurações a qualquer momento
        </p>
      </div>
    </div>
  )
}