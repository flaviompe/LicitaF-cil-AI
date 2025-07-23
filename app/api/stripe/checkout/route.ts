import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { stripe, createCheckoutSession, createStripeCustomer, PLANS } from '@/lib/stripe'
import { z } from 'zod'

const checkoutSchema = z.object({
  planId: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
  interval: z.enum(['month', 'year']).default('month'),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as any

    const body = await request.json()
    const { planId, interval } = checkoutSchema.parse(body)

    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      include: { company: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const plan = PLANS[planId]
    if (!plan) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 })
    }

    // COMENTADO: subscription não existe no schema Prisma
    // const existingSubscription = await db.subscription.findUnique({
    //   where: { userId: sessionUser.id }
    // })

    // if (existingSubscription && existingSubscription.status === 'ACTIVE') {
    //   return NextResponse.json({ error: 'Usuário já possui uma assinatura ativa' }, { status: 400 })
    // }

    // Implementação temporária - simular verificação de assinatura
    const existingSubscription = null // Temporário

    // Criar ou buscar customer no Stripe
    let stripeCustomerId = null // Temporário - será obtido do Stripe

    if (!stripeCustomerId) {
      const customer = await createStripeCustomer(
        user.email,
        user.name || user.company?.name || 'Usuário'
      )
      stripeCustomerId = customer.id
    }

    // Criar sessão de checkout
    const checkoutSession = await createCheckoutSession(
      stripeCustomerId,
      plan.stripePriceId!,
      `${process.env.NEXTAUTH_URL}/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      `${process.env.NEXTAUTH_URL}/dashboard/billing/cancel`
    )

    // COMENTADO: subscription não existe no schema Prisma
    // await db.subscription.upsert({
    //   where: { userId: sessionUser.id },
    //   update: {
    //     stripeCustomerId,
    //     status: 'INCOMPLETE',
    //   },
    //   create: {
    //     userId: sessionUser.id,
    //     planId: planId,
    //     stripeCustomerId,
    //     status: 'INCOMPLETE',
    //     currentPeriodStart: new Date(),
    //     currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
    //   }
    // })

    // Implementação temporária - salvar dados da sessão em notification para rastreamento
    await db.notification.create({
      data: {
        userId: sessionUser.id,
        title: 'Checkout Iniciado',
        message: `Checkout para plano ${planId} iniciado. Customer ID: ${stripeCustomerId}`,
        type: 'SYSTEM'
      }
    })

    return NextResponse.json({ 
      sessionId: checkoutSession.id,
      url: checkoutSession.url 
    })

  } catch (error) {
    console.error('Checkout error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}