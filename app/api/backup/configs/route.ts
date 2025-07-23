import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const createConfigSchema = z.object({
  name: z.string().min(1).max(100),
  schedule: z.enum(['daily', 'weekly', 'monthly']),
  enabled: z.boolean(),
  retention: z.number().min(1).max(365),
  includeFiles: z.boolean(),
  compression: z.boolean(),
  encryption: z.boolean(),
  destinations: z.array(z.object({
    type: z.enum(['local', 's3', 'gcs', 'azure', 'ftp']),
    config: z.record(z.any()),
    enabled: z.boolean()
  })),
  tables: z.array(z.string())
})

// GET /api/backup/configs - Listar configurações de backup
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as any

    // Verificar se o usuário tem permissão para backups
    const user = await db.user.findUnique({
      where: { id: sessionUser.id }
    })

    const currentPlan = 'Pro' // Temporariamente definir como Pro
    
    // Todos os planos têm acesso a backup básico
    // const configs = await db.backupConfig.findMany({
    //   where: { userId: sessionUser.id },
    //   orderBy: { createdAt: 'desc' }
    // })

    // Temporariamente retornar array vazio até modelo ser criado
    const configs: any[] = []

    return NextResponse.json({ configs })

  } catch (error) {
    console.error('Erro ao buscar configurações de backup:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/backup/configs - Criar configuração de backup
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as any

    const body = await request.json()
    const data = createConfigSchema.parse(body)
    
    // Verificar limites do plano
    const user = await db.user.findUnique({
      where: { id: sessionUser.id }
    })

    const currentPlan = 'Pro' // Temporariamente definir como Pro
    
    const planLimits = {
      'Starter': { maxConfigs: 1, maxRetention: 7, destinations: ['local'] },
      'Professional': { maxConfigs: 3, maxRetention: 30, destinations: ['local', 's3', 'gcs'] },
      'Enterprise': { maxConfigs: 10, maxRetention: 365, destinations: ['local', 's3', 'gcs', 'azure', 'ftp'] }
    }
    
    const currentLimits = planLimits[currentPlan as keyof typeof planLimits] || planLimits['Starter']
    
    // Verificar número de configurações
    // const existingConfigs = await db.backupConfig.count({
    //   where: { userId: sessionUser.id }
    // })
    const existingConfigs = 0 // Temporariamente definir como 0
    
    if (existingConfigs >= currentLimits.maxConfigs) {
      return NextResponse.json(
        { error: `Limite de ${currentLimits.maxConfigs} configurações atingido para o plano ${currentPlan}` },
        { status: 403 }
      )
    }

    // Verificar retenção
    if (data.retention > currentLimits.maxRetention) {
      return NextResponse.json(
        { error: `Retenção máxima de ${currentLimits.maxRetention} dias para o plano ${currentPlan}` },
        { status: 403 }
      )
    }

    // Verificar destinos permitidos
    const invalidDestinations = data.destinations.filter(
      dest => dest.enabled && !currentLimits.destinations.includes(dest.type)
    )
    
    if (invalidDestinations.length > 0) {
      return NextResponse.json(
        { error: `Destinos não permitidos no plano ${currentPlan}: ${invalidDestinations.map(d => d.type).join(', ')}` },
        { status: 403 }
      )
    }

    // Criar configuração
    // const config = await db.backupConfig.create({
    //   data: {
    //     ...data,
    //     userId: sessionUser.id
    //   }
    // })

    // Temporariamente simular criação
    const config = { id: 'temp-' + Date.now(), ...data, userId: sessionUser.id }

    return NextResponse.json({ config })

  } catch (error) {
    console.error('Erro ao criar configuração de backup:', error)
    
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

// PUT /api/backup/configs - Atualizar configuração
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as any

    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID da configuração é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se a configuração pertence ao usuário
    // const existingConfig = await db.backupConfig.findFirst({
    //   where: {
    //     id,
    //     userId: sessionUser.id
    //   }
    // })
    
    // if (!existingConfig) {
    //   return NextResponse.json(
    //     { error: 'Configuração não encontrada' },
    //     { status: 404 }
    //   )
    // }

    // Atualizar configuração
    // const updatedConfig = await db.backupConfig.update({
    //   where: { id },
    //   data: updateData
    // })

    // Temporariamente simular atualização
    const updatedConfig = { id, ...updateData, userId: sessionUser.id }

    return NextResponse.json({ config: updatedConfig })

  } catch (error) {
    console.error('Erro ao atualizar configuração:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/backup/configs - Deletar configuração
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as any

    const url = new URL(request.url)
    const configId = url.searchParams.get('id')
    
    if (!configId) {
      return NextResponse.json(
        { error: 'ID da configuração é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se a configuração pertence ao usuário
    // const existingConfig = await db.backupConfig.findFirst({
    //   where: {
    //     id: configId,
    //     userId: sessionUser.id
    //   }
    // })
    
    // if (!existingConfig) {
    //   return NextResponse.json(
    //     { error: 'Configuração não encontrada' },
    //     { status: 404 }
    //   )
    // }

    // Deletar configuração e jobs relacionados
    // await db.backupJob.deleteMany({
    //   where: { configId }
    // })
    
    // await db.backupFile.deleteMany({
    //   where: { configId }
    // })
    
    // await db.backupConfig.delete({
    //   where: { id: configId }
    // })

    // Temporariamente simular deleção
    console.log('Backup config deleted (simulated):', configId)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao deletar configuração:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}