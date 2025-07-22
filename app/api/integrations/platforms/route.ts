// API para gestão de plataformas de licitações
import { NextRequest, NextResponse } from 'next/server'
import { completeBiddingIntegrator, enableBiddingPlatform } from '@/lib/complete-bidding-integrations'

export async function GET(request: NextRequest) {
  try {
    const platforms = completeBiddingIntegrator.getPlatforms()
    
    const platformsWithStats = platforms.map(platform => ({
      ...platform,
      lastSync: platform.lastSync?.toISOString() || null,
    }))
    
    return NextResponse.json({
      success: true,
      data: platformsWithStats,
      total: platforms.length
    })
  } catch (error) {
    console.error('❌ Erro ao obter plataformas:', error)
    return NextResponse.json({
      success: false,
      error: 'Falha ao obter plataformas'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { platformId, enabled } = await request.json()
    
    if (!platformId || typeof enabled !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: 'platformId e enabled são obrigatórios'
      }, { status: 400 })
    }
    
    const success = enableBiddingPlatform(platformId, enabled)
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Plataforma não encontrada'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      message: `Plataforma ${enabled ? 'habilitada' : 'desabilitada'} com sucesso`,
      data: { platformId, enabled }
    })
  } catch (error) {
    console.error('❌ Erro ao atualizar plataforma:', error)
    return NextResponse.json({
      success: false,
      error: 'Falha ao atualizar plataforma'
    }, { status: 500 })
  }
}