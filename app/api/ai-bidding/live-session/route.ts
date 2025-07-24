// API para simulação de pregão em tempo real
import { NextRequest, NextResponse } from 'next/server'
import { startLiveBiddingWithAI, aiSuperiorBiddingSystem } from '@/lib/ai-superior-bidding-system'

export async function POST(request: NextRequest) {
  try {
    const { opportunityId, companyId } = await request.json()

    if (!opportunityId || !companyId) {
      return NextResponse.json({
        success: false,
        error: 'opportunityId e companyId são obrigatórios'
      }, { status: 400 })
    }

    console.log(`🔴 Iniciando sessão de pregão ao vivo para ${opportunityId}`)

    const sessionId = await startLiveBiddingWithAI(opportunityId, companyId)
    const session = aiSuperiorBiddingSystem.getLiveBiddingSession(sessionId)

    return NextResponse.json({
      success: true,
      message: 'Sessão de pregão iniciada',
      data: {
        sessionId,
        session
      }
    })
  } catch (error: any) {
    console.error('❌ Erro ao iniciar sessão de pregão:', error)
    return NextResponse.json({
      success: false,
      error: 'Falha ao iniciar sessão',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({
      success: false,
      error: 'sessionId é obrigatório'
    }, { status: 400 })
  }

  try {
    const session = aiSuperiorBiddingSystem.getLiveBiddingSession(sessionId)
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Sessão não encontrada'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: session
    })
  } catch (error: any) {
    console.error('❌ Erro ao obter sessão:', error)
    return NextResponse.json({
      success: false,
      error: 'Falha ao obter sessão'
    }, { status: 500 })
  }
}