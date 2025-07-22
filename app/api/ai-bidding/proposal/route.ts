// API para geração de propostas com IA superior
import { NextRequest, NextResponse } from 'next/server'
import { generateSmartProposalWithAI } from '@/lib/ai-superior-bidding-system'

export async function POST(request: NextRequest) {
  try {
    const { opportunityId, companyId } = await request.json()

    if (!opportunityId || !companyId) {
      return NextResponse.json({
        success: false,
        error: 'opportunityId e companyId são obrigatórios'
      }, { status: 400 })
    }

    console.log(`📝 Gerando proposta inteligente para ${opportunityId}`)

    const proposal = await generateSmartProposalWithAI(opportunityId, companyId)

    return NextResponse.json({
      success: true,
      message: 'Proposta gerada com sucesso pela IA',
      data: proposal
    })
  } catch (error: any) {
    console.error('❌ Erro na geração de proposta:', error)
    return NextResponse.json({
      success: false,
      error: 'Falha na geração de proposta',
      details: error.message
    }, { status: 500 })
  }
}