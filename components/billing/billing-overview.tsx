import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'

interface Subscription {
  id: string
  status: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  plan: {
    id: string
    name: string
    price: number
  }
}

interface BillingOverviewProps {
  subscription: Subscription | null
  hasActiveSubscription: boolean
}

export function BillingOverview({ subscription, hasActiveSubscription }: BillingOverviewProps) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { 
          label: 'Ativa', 
          icon: CheckCircle, 
          color: 'bg-green-100 text-green-800' 
        }
      case 'PAST_DUE':
        return { 
          label: 'Vencida', 
          icon: AlertCircle, 
          color: 'bg-red-100 text-red-800' 
        }
      case 'CANCELED':
        return { 
          label: 'Cancelada', 
          icon: AlertCircle, 
          color: 'bg-gray-100 text-gray-800' 
        }
      case 'TRIALING':
        return { 
          label: 'Período de Teste', 
          icon: Clock, 
          color: 'bg-blue-100 text-blue-800' 
        }
      default:
        return { 
          label: status, 
          icon: Clock, 
          color: 'bg-gray-100 text-gray-800' 
        }
    }
  }

  const getDaysRemaining = (endDate: Date) => {
    const now = new Date()
    const end = new Date(endDate)
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (!subscription) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-center">
            <div>
              <CreditCard className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Nenhuma assinatura ativa
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Escolha um plano para começar a usar todas as funcionalidades
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const statusInfo = getStatusInfo(subscription.status)
  const daysRemaining = getDaysRemaining(subscription.currentPeriodEnd)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Status da assinatura */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Status da Assinatura
          </CardTitle>
          <statusInfo.icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Badge className={statusInfo.color}>
              {statusInfo.label}
            </Badge>
            <div className="text-2xl font-bold">
              {subscription.plan.name}
            </div>
            {subscription.cancelAtPeriodEnd && (
              <p className="text-sm text-orange-600 dark:text-orange-400">
                Cancelamento agendado
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Valor mensal */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Valor Mensal
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold">
              {formatCurrency(subscription.plan.price)}
            </div>
            <p className="text-sm text-muted-foreground">
              Cobrança mensal
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Próxima cobrança */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Próxima Cobrança
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold">
              {formatDate(subscription.currentPeriodEnd)}
            </div>
            <p className="text-sm text-muted-foreground">
              {daysRemaining > 0 ? (
                `${daysRemaining} dia${daysRemaining > 1 ? 's' : ''} restante${daysRemaining > 1 ? 's' : ''}`
              ) : (
                'Vencida'
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}