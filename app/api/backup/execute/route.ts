import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { backupService } from '@/lib/backup'
import { z } from 'zod'

const executeSchema = z.object({
  configId: z.string()
})

// POST /api/backup/execute - Executar backup
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as { id: string }

    const body = await request.json()
    const { configId } = executeSchema.parse(body)
    
    // Verificar se a configuração pertence ao usuário
    // const config = await db.backupConfig.findFirst({
    //   where: {
    //     id: configId,
    //     userId: sessionUser.id
    //   }
    // })
    
    // Temporariamente simular configuração
    const config = { id: configId, enabled: true, userId: sessionUser.id }
    
    if (!config) {
      return NextResponse.json(
        { error: 'Configuração não encontrada' },
        { status: 404 }
      )
    }

    if (!config.enabled) {
      return NextResponse.json(
        { error: 'Configuração está desativada' },
        { status: 400 }
      )
    }

    // Verificar se já existe um backup em execução para esta configuração
    // const runningJob = await db.backupJob.findFirst({
    //   where: {
    //     configId,
    //     status: 'running'
    //   }
    // })

    // if (runningJob) {
    //   return NextResponse.json(
    //     { error: 'Já existe um backup em execução para esta configuração' },
    //     { status: 409 }
    //   )
    // }

    // Executar backup
    // const jobId = await backupService.executeBackup(configId)
    
    // Temporariamente simular execução
    const jobId = 'job-' + Date.now()
    console.log('Backup executed (simulated):', configId, jobId)

    return NextResponse.json({ 
      success: true, 
      jobId,
      message: 'Backup iniciado com sucesso' 
    })

  } catch (error) {
    console.error('Erro ao executar backup:', error)
    
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