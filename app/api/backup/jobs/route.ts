import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { backupService } from '@/lib/backup'

// GET /api/backup/jobs - Listar jobs de backup
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as any

    const url = new URL(request.url)
    const configId = url.searchParams.get('configId')
    const status = url.searchParams.get('status')
    
    // Construir filtros
    const where: any = {
      config: {
        userId: sessionUser.id
      }
    }
    
    if (configId) {
      where.configId = configId
    }
    
    if (status) {
      where.status = status
    }

    // COMENTADO: backupJob não existe no schema Prisma
    // const jobs = await db.backupJob.findMany({
    //   where,
    //   include: {
    //     config: {
    //       select: {
    //         name: true
    //       }
    //     }
    //   },
    //   orderBy: { startedAt: 'desc' },
    //   take: 50
    // })

    // Implementação temporária
    const jobs = []

    return NextResponse.json({ jobs })

  } catch (error) {
    console.error('Erro ao buscar jobs de backup:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

