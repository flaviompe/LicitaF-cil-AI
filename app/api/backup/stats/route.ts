import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { backupService } from '@/lib/backup'

// GET /api/backup/stats - Obter estatísticas de backup
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar estatísticas do serviço de backup
    const stats = await backupService.getBackupStats()

    // Estatísticas específicas do usuário
    const userStats = await Promise.all([
      // Total de backups do usuário
      db.backupFile.count({
        where: {
          config: {
            userId: session.user.id
          }
        }
      }),
      
      // Tamanho total dos backups
      db.backupFile.aggregate({
        where: {
          config: {
            userId: session.user.id
          }
        },
        _sum: {
          size: true
        }
      }),
      
      // Taxa de sucesso
      db.backupJob.findMany({
        where: {
          config: {
            userId: session.user.id
          }
        },
        select: {
          status: true
        }
      }),
      
      // Último backup
      db.backupJob.findFirst({
        where: {
          config: {
            userId: session.user.id
          },
          status: 'completed'
        },
        orderBy: {
          completedAt: 'desc'
        }
      }),
      
      // Próximo backup agendado
      db.backupConfig.findFirst({
        where: {
          userId: session.user.id,
          enabled: true
        },
        orderBy: {
          updatedAt: 'desc'
        }
      })
    ])

    const [totalBackups, totalSizeResult, jobs, lastBackup, nextConfig] = userStats
    
    const totalJobs = jobs.length
    const successfulJobs = jobs.filter(job => job.status === 'completed').length
    const successRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 0

    // Calcular próximo backup estimado
    let nextScheduled: Date | undefined
    if (nextConfig && lastBackup) {
      const lastRun = lastBackup.completedAt!
      const now = new Date()
      
      switch (nextConfig.schedule) {
        case 'daily':
          nextScheduled = new Date(lastRun.getTime() + 24 * 60 * 60 * 1000)
          break
        case 'weekly':
          nextScheduled = new Date(lastRun.getTime() + 7 * 24 * 60 * 60 * 1000)
          break
        case 'monthly':
          nextScheduled = new Date(lastRun.getTime() + 30 * 24 * 60 * 60 * 1000)
          break
      }
      
      // Se a data já passou, o backup deve ser executado agora
      if (nextScheduled && nextScheduled < now) {
        nextScheduled = now
      }
    }

    const userBackupStats = {
      totalBackups,
      totalSize: totalSizeResult._sum.size || 0,
      successRate,
      lastBackup: lastBackup?.completedAt || undefined,
      nextScheduled,
      configurations: await db.backupConfig.count({
        where: { userId: session.user.id }
      }),
      recentJobs: await db.backupJob.count({
        where: {
          config: {
            userId: session.user.id
          },
          startedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 dias
          }
        }
      })
    }

    return NextResponse.json({ 
      stats: userBackupStats,
      global: {
        systemUptime: stats.systemUptime || 0,
        totalSystemBackups: stats.totalBackups || 0
      }
    })

  } catch (error) {
    console.error('Erro ao buscar estatísticas de backup:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}