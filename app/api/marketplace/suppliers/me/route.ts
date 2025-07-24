import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { marketplaceService } from '@/lib/marketplace'

// GET /api/marketplace/suppliers/me - Obter meu perfil de fornecedor
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as { id: string; email: string; name?: string }
    const supplier = await marketplaceService.getSupplierByUserId(sessionUser.id)
    
    if (!supplier) {
      return NextResponse.json(
        { error: 'Fornecedor não encontrado' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ supplier })
  } catch (error) {
    console.error('Erro ao buscar fornecedor:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/marketplace/suppliers/me - Atualizar meu perfil de fornecedor
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as { id: string; email: string; name?: string }
    const supplier = await marketplaceService.getSupplierByUserId(sessionUser.id)
    
    if (!supplier) {
      return NextResponse.json(
        { error: 'Fornecedor não encontrado' },
        { status: 404 }
      )
    }
    
    const body = await request.json()
    
    // Atualizar fornecedor
    const updatedSupplier = await marketplaceService.updateSupplier(supplier.id, body)
    
    return NextResponse.json({ 
      success: true, 
      supplier: updatedSupplier,
      message: 'Perfil atualizado com sucesso!'
    })
  } catch (error) {
    console.error('Erro ao atualizar fornecedor:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}