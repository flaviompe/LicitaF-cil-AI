import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { BillingOverview } from '@/components/billing/billing-overview'
import { SubscriptionDetails } from '@/components/billing/subscription-details'
import { PaymentHistory } from '@/components/billing/payment-history'
import { InvoiceHistory } from '@/components/billing/invoice-history'
import { PlanUpgrade } from '@/components/billing/plan-upgrade'

export default async function BillingPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/login')
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      // TODO: Adicionar subscriptions quando o modelo for criado no schema
      // TODO: Adicionar payments quando o modelo for criado no schema
      // TODO: Adicionar invoices quando o modelo for criado no schema
    },
  })

  if (!user) {
    redirect('/login')
  }

  // TODO: Implementar lógica real de subscriptions quando o modelo for criado
  const currentSubscription = null // Mock temporário
  const hasActiveSubscription = false // Mock temporário

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Faturamento
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Gerencie sua assinatura, pagamentos e faturas
        </p>
      </div>

      {/* Overview */}
      <BillingOverview 
        subscription={currentSubscription}
        hasActiveSubscription={hasActiveSubscription}
      />

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Coluna esquerda */}
        <div className="space-y-6">
          {/* Detalhes da assinatura */}
          <SubscriptionDetails subscription={currentSubscription} />
          
          {/* Histórico de pagamentos */}
          <PaymentHistory payments={[]} />
        </div>

        {/* Coluna direita */}
        <div className="space-y-6">
          {/* Upgrade/Downgrade de plano */}
          {hasActiveSubscription && (
            <PlanUpgrade currentSubscription={currentSubscription} />
          )}
          
          {/* Histórico de faturas */}
          <InvoiceHistory invoices={[]} />
        </div>
      </div>

      {/* Plano não ativo */}
      {!hasActiveSubscription && (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Nenhuma assinatura ativa
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Escolha um plano para começar a usar todas as funcionalidades
          </p>
          <PlanUpgrade currentSubscription={null} />
        </div>
      )}
    </div>
  )
}