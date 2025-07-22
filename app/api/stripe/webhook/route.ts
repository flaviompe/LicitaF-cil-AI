import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = headers().get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  // Buscar usuário pelo customer ID
  const subscription = await db.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    include: { user: true }
  })

  if (!subscription) {
    console.error('Subscription not found for customer:', customerId)
    return
  }

  // Atualizar subscription com dados do Stripe
  await db.subscription.update({
    where: { id: subscription.id },
    data: {
      stripeSubscriptionId: subscriptionId,
      status: 'ACTIVE',
    }
  })

  // Criar registro de pagamento
  await db.payment.create({
    data: {
      userId: subscription.userId,
      subscriptionId: subscription.id,
      amount: (session.amount_total || 0) / 100,
      currency: session.currency || 'brl',
      status: 'SUCCEEDED',
      stripePaymentId: session.payment_intent as string,
      paymentMethod: 'card',
      description: `Assinatura ${subscription.planId}`,
    }
  })

  console.log('Checkout completed for user:', subscription.userId)
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  const userSubscription = await db.subscription.findFirst({
    where: { stripeCustomerId: customerId }
  })

  if (!userSubscription) {
    console.error('User subscription not found for customer:', customerId)
    return
  }

  await db.subscription.update({
    where: { id: userSubscription.id },
    data: {
      stripeSubscriptionId: subscription.id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    }
  })

  console.log('Subscription created:', subscription.id)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userSubscription = await db.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id }
  })

  if (!userSubscription) {
    console.error('User subscription not found:', subscription.id)
    return
  }

  const status = mapStripeStatusToDb(subscription.status)

  await db.subscription.update({
    where: { id: userSubscription.id },
    data: {
      status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    }
  })

  console.log('Subscription updated:', subscription.id)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userSubscription = await db.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id }
  })

  if (!userSubscription) {
    console.error('User subscription not found:', subscription.id)
    return
  }

  await db.subscription.update({
    where: { id: userSubscription.id },
    data: {
      status: 'CANCELED',
    }
  })

  console.log('Subscription deleted:', subscription.id)
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  
  if (!subscriptionId) return

  const userSubscription = await db.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId }
  })

  if (!userSubscription) {
    console.error('User subscription not found for invoice:', invoice.id)
    return
  }

  // Criar registro de pagamento
  await db.payment.create({
    data: {
      userId: userSubscription.userId,
      subscriptionId: userSubscription.id,
      amount: (invoice.amount_paid || 0) / 100,
      currency: invoice.currency || 'brl',
      status: 'SUCCEEDED',
      stripePaymentId: invoice.payment_intent as string,
      description: `Pagamento de fatura ${invoice.number}`,
    }
  })

  // Criar/atualizar invoice
  await db.invoice.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      userId: userSubscription.userId,
      subscriptionId: userSubscription.id,
      invoiceNumber: invoice.number || `INV-${Date.now()}`,
      amount: (invoice.amount_paid || 0) / 100,
      currency: invoice.currency || 'brl',
      status: 'PAID',
      dueDate: new Date(invoice.due_date! * 1000),
      paidAt: new Date(),
      stripeInvoiceId: invoice.id,
      downloadUrl: invoice.invoice_pdf,
    },
    update: {
      status: 'PAID',
      paidAt: new Date(),
      downloadUrl: invoice.invoice_pdf,
    }
  })

  console.log('Invoice payment succeeded:', invoice.id)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  
  if (!subscriptionId) return

  const userSubscription = await db.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId }
  })

  if (!userSubscription) {
    console.error('User subscription not found for invoice:', invoice.id)
    return
  }

  // Criar registro de pagamento falhado
  await db.payment.create({
    data: {
      userId: userSubscription.userId,
      subscriptionId: userSubscription.id,
      amount: (invoice.amount_due || 0) / 100,
      currency: invoice.currency || 'brl',
      status: 'FAILED',
      description: `Falha no pagamento da fatura ${invoice.number}`,
    }
  })

  // Atualizar status da subscription para PAST_DUE
  await db.subscription.update({
    where: { id: userSubscription.id },
    data: {
      status: 'PAST_DUE',
    }
  })

  console.log('Invoice payment failed:', invoice.id)
}

function mapStripeStatusToDb(stripeStatus: string) {
  switch (stripeStatus) {
    case 'active':
      return 'ACTIVE'
    case 'past_due':
      return 'PAST_DUE'
    case 'canceled':
      return 'CANCELED'
    case 'incomplete':
      return 'INCOMPLETE'
    case 'incomplete_expired':
      return 'INCOMPLETE_EXPIRED'
    case 'trialing':
      return 'TRIALING'
    case 'unpaid':
      return 'UNPAID'
    default:
      return 'INCOMPLETE'
  }
}