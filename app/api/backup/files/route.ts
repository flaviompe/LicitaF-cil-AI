import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/backup/files - Listar arquivos de backup
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const url = new URL(request.url)
    const configId = url.searchParams.get('configId')
    
    // Construir filtros
    const where: any = {
      config: {
        userId: session.user.id
      }
    }
    
    if (configId) {
      where.configId = configId
    }

    const files = await db.backupFile.findMany({
      where,
      include: {
        config: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

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
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const fileId = params.id
    
    // Verificar se o arquivo pertence ao usuário
    const file = await db.backupFile.findFirst({
      where: {
        id: fileId,
        config: {
          userId: session.user.id
        }
      }
    })

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo não encontrado' },
        { status: 404 }
      )
    }

    // Deletar arquivo físico
    try {
      const fs = require('fs')
      const path = require('path')
      const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')
      const filepath = path.join(backupDir, file.filename)
      
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath)
      }
    } catch (error) {
      console.error('Erro ao deletar arquivo físico:', error)
      // Continuar mesmo se não conseguir deletar o arquivo físico
    }

    // Deletar registro do banco
    await db.backupFile.delete({
      where: { id: fileId }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao deletar arquivo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}