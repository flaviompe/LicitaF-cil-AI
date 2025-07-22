'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { formatDate } from '@/lib/utils'
import { 
  Settings, 
  CreditCard, 
  AlertTriangle, 
  Calendar,
  Shield,
  ExternalLink
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Subscription {
  id: string
  status: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  stripeCustomerId: string | null
  plan: {
    id: string
    name: string
    price: number
    features: string[]
  }
}

interface SubscriptionDetailsProps {
  subscription: Subscription | null
}

export function SubscriptionDetails({ subscription }: SubscriptionDetailsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleCancelSubscription = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Erro ao cancelar assinatura')
      }

      toast({
        title: 'Assinatura cancelada',
        description: 'Sua assinatura será cancelada ao final do período atual.',
      })

      // Recarregar página para mostrar status atualizado
      window.location.reload()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível cancelar a assinatura. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReactivateSubscription = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/reactivate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Erro ao reativar assinatura')
      }

      toast({
        title: 'Assinatura reativada',
        description: 'Sua assinatura foi reativada com sucesso.',
      })

      window.location.reload()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível reativar a assinatura. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Erro ao acessar portal de cobrança')
      }

      const { url } = await response.json()
      window.open(url, '_blank')
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível acessar o portal de cobrança. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Detalhes da Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>Nenhuma assinatura ativa</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Detalhes da Assinatura
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informações do plano */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Plano Atual
            </span>
            <Badge variant="outline">{subscription.plan.name}</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Status
            </span>
            <Badge 
              variant={subscription.status === 'ACTIVE' ? 'default' : 'secondary'}
            >
              {subscription.status === 'ACTIVE' ? 'Ativa' : subscription.status}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Período Atual
            </span>
            <span className="text-sm">
              {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
            </span>
          </div>
          
          {subscription.cancelAtPeriodEnd && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                Cancelamento Agendado
              </span>
              <span className="text-sm text-orange-600 dark:text-orange-400">
                {formatDate(subscription.currentPeriodEnd)}
              </span>
            </div>
          )}
        </div>

        {/* Features do plano */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Recursos Inclusos
          </h4>
          <ul className="space-y-1">
            {subscription.plan.features.map((feature, index) => (
              <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <Shield className="h-3 w-3 text-green-500 mr-2" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Ações */}
        <div className="space-y-3 pt-4 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={handleManageBilling}
            disabled={isLoading}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Gerenciar Cobrança
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
          
          {subscription.cancelAtPeriodEnd ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={handleReactivateSubscription}
              disabled={isLoading}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Reativar Assinatura
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-red-600 hover:text-red-700"
                  disabled={isLoading}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Cancelar Assinatura
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar Assinatura</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja cancelar sua assinatura? Você continuará tendo acesso 
                    aos recursos até o final do período atual ({formatDate(subscription.currentPeriodEnd)}).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Manter Assinatura</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleCancelSubscription}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Cancelar Assinatura
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  )
}