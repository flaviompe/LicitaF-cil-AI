// API para análise de oportunidades com IA superior
import { NextRequest, NextResponse } from 'next/server'
import { analyzeOpportunityWithAI } from '@/lib/ai-superior-bidding-system'

export async function POST(request: NextRequest) {
  try {
    const { opportunityId, companyId } = await request.json()

    if (!opportunityId || !companyId) {
      return NextResponse.json({
        success: false,
        error: 'opportunityId e companyId são obrigatórios'
      }, { status: 400 })
    }

    console.log(`🧠 Iniciando análise de IA para oportunidade ${opportunityId}`)

    const intelligence = await analyzeOpportunityWithAI(opportunityId, companyId)

    return NextResponse.json({
      success: true,
      message: 'Análise de IA concluída com sucesso',
      data: intelligence
    })
  } catch (error: any) {
    console.error('❌ Erro na análise de IA:', error)
    return NextResponse.json({
      success: false,
      error: 'Falha na análise de IA',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const opportunityId = url.searchParams.get('opportunityId')
  const companyId = url.searchParams.get('companyId')

  if (!opportunityId || !companyId) {
    return NextResponse.json({
      success: false,
      error: 'opportunityId e companyId são obrigatórios'
    }, { status: 400 })
  }

  try {
    const intelligence = await analyzeOpportunityWithAI(opportunityId, companyId)
    
    return NextResponse.json({
      success: true,
      data: intelligence
    })
  } catch (error: any) {
    console.error('❌ Erro ao obter análise:', error)
    return NextResponse.json({
      success: false,
      error: 'Falha ao obter análise'
    }, { status: 500 })
  }
}