import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { unlinkSync, existsSync } from 'fs'
import { join } from 'path'

// GET /api/backup/files - Listar arquivos de backup
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as { id: string }

    const url = new URL(request.url)
    const configId = url.searchParams.get('configId')
    
    // Construir filtros
    const where: Record<string, any> = {
      config: {
        userId: sessionUser.id
      }
    }
    
    if (configId) {
      where.configId = configId
    }

    // const files = await db.backupFile.findMany({
    //   where,
    //   include: {
    //     config: {
    //       select: {
    //         name: true
    //       }
    //     }
    //   },
    //   orderBy: { createdAt: 'desc' },
    //   take: 100
    // })

    // Temporariamente retornar array vazio até modelo ser criado
    const files: Array<Record<string, any>> = []

    return NextResponse.json({ files })

  } catch (error) {
    console.error('Erro ao buscar arquivos de backup:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/backup/files/[id] - Deletar arquivo de backup
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as { id: string }
    const fileId = params.id
    
    // Verificar se o arquivo pertence ao usuário
    // const file = await db.backupFile.findFirst({
    //   where: {
    //     id: fileId,
    //     config: {
    //       userId: sessionUser.id
    //     }
    //   }
    // })
    
    // Temporariamente simular arquivo
    const file = { id: fileId, filename: 'backup-' + fileId + '.sql' }

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo não encontrado' },
        { status: 404 }
      )
    }

    // Deletar arquivo físico
    try {
      const backupDir = process.env.BACKUP_DIR || join(process.cwd(), 'backups')
      const filepath = join(backupDir, file.filename)
      
      if (existsSync(filepath)) {
        unlinkSync(filepath)
      }
    } catch (error) {
      console.error('Erro ao deletar arquivo físico:', error)
      // Continuar mesmo se não conseguir deletar o arquivo físico
    }

    // Deletar registro do banco
    // await db.backupFile.delete({
    //   where: { id: fileId }
    // })
    
    // Temporariamente simular deleção
    console.log('Backup file deleted (simulated):', fileId)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao deletar arquivo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}