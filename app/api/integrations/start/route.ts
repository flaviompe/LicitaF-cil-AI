// API para inicialização das integrações de licitações
import { NextRequest, NextResponse } from 'next/server'
import { completeBiddingIntegrator, startAllBiddingIntegrations, getBiddingIntegrationStats } from '@/lib/complete-bidding-integrations'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Iniciando todas as integrações via API...')
    
    await startAllBiddingIntegrations()
    
    const stats = getBiddingIntegrationStats()
    
    return NextResponse.json({
      success: true,
      message: 'Todas as integrações iniciadas com sucesso',
      data: {
        ...stats,
        startedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('❌ Erro ao iniciar integrações:', error)
    return NextResponse.json({
      success: false,
      error: 'Falha ao iniciar integrações',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const stats = getBiddingIntegrationStats()
    
    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error)
    return NextResponse.json({
      success: false,
      error: 'Falha ao obter estatísticas'
    }, { status: 500 })
  }
}