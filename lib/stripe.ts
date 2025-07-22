import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
})

export const PLANS = {
  STARTER: {
    name: 'Plano Starter',
    description: 'Perfeito para empresas iniciantes',
    price: 97.00,
    interval: 'month',
    features: [
      'Até 50 oportunidades monitoradas',
      'Gestão básica de certidões',
      'Notificações por email',
      'Suporte por email',
      'Dashboard básico'
    ],
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
  },
  PROFESSIONAL: {
    name: 'Plano Professional',
    description: 'Para empresas em crescimento',
    price: 197.00,
    interval: 'month',
    features: [
      'Oportunidades ilimitadas',
      'Gestão avançada de certidões',
      'Notificações WhatsApp + Telegram',
      'Assistente de propostas',
      'Relatórios avançados',
      'Suporte prioritário',
      'API de integração'
    ],
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
  },
  ENTERPRISE: {
    name: 'Plano Enterprise',
    description: 'Para grandes empresas',
    price: 397.00,
    interval: 'month',
    features: [
      'Tudo do Professional',
      'IA para análise de editais',
      'Marketplace de fornecedores',
      'Suporte 24/7',
      'Gerente de conta dedicado',
      'Treinamento personalizado',
      'Integração com ERP'
    ],
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
  }
}

export const createStripeCustomer = async (email: string, name: string) => {
  return await stripe.customers.create({
    email,
    name,
    metadata: {
      source: 'licitafacil-pro'
    }
  })
}

export const createCheckoutSession = async (
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) => {
  return await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    locale: 'pt-BR',
    currency: 'brl',
    billing_address_collection: 'required',
    customer_update: {
      address: 'auto',
    },
  })
}

export const createPortalSession = async (
  customerId: string,
  returnUrl: string
) => {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}

export const cancelSubscription = async (subscriptionId: string) => {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
}

export const reactivateSubscription = async (subscriptionId: string) => {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })
}

export const getSubscription = async (subscriptionId: string) => {
  return await stripe.subscriptions.retrieve(subscriptionId)
}

export const createInvoice = async (customerId: string, amount: number) => {
  const invoice = await stripe.invoices.create({
    customer: customerId,
    currency: 'brl',
    collection_method: 'send_invoice',
    days_until_due: 7,
  })

  await stripe.invoiceItems.create({
    customer: customerId,
    invoice: invoice.id,
    amount: amount * 100, // Stripe usa centavos
    currency: 'brl',
    description: 'Assinatura LicitaFácil Pro',
  })

  return await stripe.invoices.finalizeInvoice(invoice.id)
}