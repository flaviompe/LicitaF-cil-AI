import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const onboardingSchema = z.object({
  welcome: z.any().optional(),
  company: z.object({
    fantasyName: z.string().optional(),
    phone: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    businessType: z.string(),
    website: z.string().optional(),
    description: z.string().optional(),
    employeeCount: z.string().optional(),
  }),
  documents: z.object({
    certificates: z.array(z.object({
      type: z.string(),
      issuer: z.string(),
      expiryDate: z.string(),
      documentUrl: z.string().optional(),
    })).optional(),
  }).optional(),
  preferences: z.object({
    interests: z.array(z.string()).optional(),
    notificationFrequency: z.string().optional(),
    preferredRegions: z.array(z.string()).optional(),
  }).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    whatsapp: z.boolean().optional(),
    telegram: z.boolean().optional(),
    sms: z.boolean().optional(),
    whatsappNumber: z.string().optional(),
    telegramUsername: z.string().optional(),
  }).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as any

    const body = await request.json()
    const data = onboardingSchema.parse(body)

    // Buscar usuário e empresa
    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      include: { company: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Usar transação para garantir consistência
    await db.$transaction(async (prisma) => {
      // Atualizar dados da empresa
      if (data.company && user.company) {
        await prisma.company.update({
          where: { id: user.company.id },
          data: {
            fantasyName: data.company.fantasyName,
            phone: data.company.phone,
            address: data.company.address,
            city: data.company.city,
            state: data.company.state,
            zipCode: data.company.zipCode,
            businessType: data.company.businessType,
            isActive: true, // Marcar como ativo após onboarding
          }
        })
      }

      // Criar/atualizar perfil do usuário
      await prisma.user.update({
        where: { id: sessionUser.id },
        data: {
          // Aqui podemos adicionar campos específicos do usuário se necessário
        }
      })

      // Salvar certificados se fornecidos
      if (data.documents?.certificates && data.documents.certificates.length > 0) {
        const certificates = data.documents.certificates.map(cert => ({
          userId: sessionUser.id,
          companyId: user.company!.id,
          type: cert.type as any, // Validar com enum
          issuer: cert.issuer,
          issueDate: new Date(),
          expiryDate: new Date(cert.expiryDate),
          status: 'VALID' as any,
          documentUrl: cert.documentUrl,
        }))

        await prisma.certificate.createMany({
          data: certificates
        })
      }

      // Criar notificação de boas-vindas
      await prisma.notification.create({
        data: {
          userId: sessionUser.id,
          title: 'Bem-vindo ao LicitaFácil Pro!',
          message: 'Sua conta foi configurada com sucesso. Agora você pode começar a participar de licitações públicas.',
          type: 'SYSTEM',
        }
      })

      // Configurar preferências de notificação
      if (data.notifications) {
        // Aqui você pode salvar as preferências em uma tabela específica
        // ou campos no modelo User/Company
      }
    })

    return NextResponse.json({ 
      message: 'Onboarding concluído com sucesso',
      redirectTo: '/dashboard'
    })

  } catch (error) {
    console.error('Onboarding completion error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}