import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { marketplaceService } from '@/lib/marketplace'
import { db } from '@/lib/db'

// GET /api/marketplace/suppliers/[id] - Obter fornecedor específico
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supplierId = params.id
    
    const supplier = await marketplaceService.getSupplierById(supplierId)
    
    if (!supplier) {
      return NextResponse.json(
        { error: 'Fornecedor não encontrado' },
        { status: 404 }
      )
    }
    
    // Incrementar visualizações
    await marketplaceService.incrementSupplierViews(supplierId)
    
    return NextResponse.json({ supplier })
  } catch (error) {
    console.error('Erro ao buscar fornecedor:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/marketplace/suppliers/[id] - Atualizar fornecedor (admin)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as any
    
    const supplierId = params.id
    const supplier = await marketplaceService.getSupplierById(supplierId)
    
    if (!supplier) {
      return NextResponse.json(
        { error: 'Fornecedor não encontrado' },
        { status: 404 }
      )
    }
    
    // Verificar se o usuário tem permissão para editar
    const user = await db.user.findUnique({
      where: { id: sessionUser.id }
    })
    
    if (supplier.userId !== sessionUser.id && user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Sem permissão para editar este fornecedor' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    // Atualizar fornecedor
    const updatedSupplier = await marketplaceService.updateSupplier(supplierId, body)
    
    return NextResponse.json({ 
      success: true, 
      supplier: updatedSupplier,
      message: 'Fornecedor atualizado com sucesso!'
    })
  } catch (error) {
    console.error('Erro ao atualizar fornecedor:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/marketplace/suppliers/[id] - Deletar fornecedor
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as any
    
    const supplierId = params.id
    const supplier = await marketplaceService.getSupplierById(supplierId)
    
    if (!supplier) {
      return NextResponse.json(
        { error: 'Fornecedor não encontrado' },
        { status: 404 }
      )
    }
    
    // Verificar se o usuário tem permissão para deletar
    const user = await db.user.findUnique({
      where: { id: sessionUser.id }
    })
    
    if (supplier.userId !== sessionUser.id && user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Sem permissão para deletar este fornecedor' },
        { status: 403 }
      )
    }
    
    // Verificar se não há contratos ativos
    const activeContracts = await marketplaceService.getActiveContractsBySupplier(supplierId)
    if (activeContracts.length > 0) {
      return NextResponse.json(
        { error: 'Não é possível deletar fornecedor com contratos ativos' },
        { status: 409 }
      )
    }
    
    // Deletar fornecedor
    await marketplaceService.deleteSupplier(supplierId)
    
    return NextResponse.json({ 
      success: true,
      message: 'Fornecedor deletado com sucesso!'
    })
  } catch (error) {
    console.error('Erro ao deletar fornecedor:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}