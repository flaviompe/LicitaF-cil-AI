import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { backupService } from '@/lib/backup'

// GET /api/backup/jobs - Listar jobs de backup
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const url = new URL(request.url)
    const configId = url.searchParams.get('configId')
    const status = url.searchParams.get('status')
    
    // Construir filtros
    const where: any = {
      config: {
        userId: session.user.id
      }
    }
    
    if (configId) {
      where.configId = configId
    }
    
    if (status) {
      where.status = status
    }

    const jobs = await db.backupJob.findMany({
      where,
      include: {
        config: {
          select: {
            name: true
          }
        }
      },
      orderBy: { startedAt: 'desc' },
      take: 50
    })

    return NextResponse.json({ jobs })

  } catch (error) {
    console.error('Erro ao buscar jobs de backup:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET /api/backup/jobs/[id] - Obter status específico do job
export async function GET_JOB_STATUS(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const jobId = params.id
    
    // Verificar job em execução primeiro
    const runningJob = backupService.getJobStatus(jobId)
    if (runningJob) {
      return NextResponse.json({ job: runningJob })
    }

    // Buscar no banco de dados
    const job = await db.backupJob.findFirst({
      where: {
        id: jobId,
        config: {
          userId: session.user.id
        }
      },
      include: {
        config: {
          select: {
            name: true
          }
        }
      }
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ job })

  } catch (error) {
    console.error('Erro ao buscar status do job:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/backup/jobs/[id] - Cancelar job (se estiver em execução)
export async function DELETE_JOB(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const jobId = params.id
    
    // Verificar se o job pertence ao usuário
    const job = await db.backupJob.findFirst({
      where: {
        id: jobId,
        config: {
          userId: session.user.id
        }
      }
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job não encontrado' },
        { status: 404 }
      )
    }

    // Só pode cancelar jobs que estão rodando ou pendentes
    if (job.status !== 'running' && job.status !== 'pending') {
      return NextResponse.json(
        { error: 'Job não pode ser cancelado' },
        { status: 400 }
      )
    }

    // Atualizar status para cancelado
    await db.backupJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        error: 'Cancelado pelo usuário',
        completedAt: new Date()
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao cancelar job:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}