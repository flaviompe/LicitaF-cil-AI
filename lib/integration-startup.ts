// Sistema de inicialização automática das integrações
import { completeBiddingIntegrator } from './complete-bidding-integrations'

class IntegrationStartup {
  private static instance: IntegrationStartup
  private isInitialized = false

  private constructor() {}

  static getInstance(): IntegrationStartup {
    if (!IntegrationStartup.instance) {
      IntegrationStartup.instance = new IntegrationStartup()
    }
    return IntegrationStartup.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ Integrações já foram inicializadas')
      return
    }

    console.log('🚀 INICIANDO SISTEMA COMPLETO DE INTEGRAÇÕES DE LICITAÇÕES')
    console.log('📍 Cobertura: Federal, Estadual e Municipal - Brasil inteiro')
    
    try {
      // Configurar listeners para eventos das integrações
      this.setupEventListeners()
      
      // Inicializar todas as integrações
      await completeBiddingIntegrator.startAllIntegrations()
      
      this.isInitialized = true
      
      const stats = completeBiddingIntegrator.getIntegrationStats()
      
      console.log('✅ SISTEMA DE INTEGRAÇÕES ATIVO!')
      console.log(`📊 Status das Integrações:`)
      console.log(`   • Total de Plataformas: ${stats.totalPlatforms}`)
      console.log(`   • Plataformas Ativas: ${stats.enabledPlatforms}`)
      console.log(`   • Âmbito Federal: ${stats.federalPlatforms} plataformas`)
      console.log(`   • Âmbito Estadual: ${stats.statePlatforms} plataformas`)
      console.log(`   • Âmbito Municipal: ${stats.municipalPlatforms} plataformas`)
      console.log(`   • Sincronizações Ativas: ${stats.activeSyncs}`)
      console.log('')
      console.log('🎯 COBERTURA NACIONAL COMPLETA ATIVADA!')
      console.log('📡 Monitoramento automático de licitações em tempo real')
      
    } catch (error) {
      console.error('❌ ERRO CRÍTICO ao inicializar integrações:', error)
      throw error
    }
  }

  private setupEventListeners(): void {
    // Listener para novas oportunidades
    completeBiddingIntegrator.on('new_opportunity', (opportunity) => {
      console.log(`🆕 Nova oportunidade detectada: ${opportunity.title} (${opportunity.organ})`)
    })

    // Listener para oportunidades ME/EPP
    completeBiddingIntegrator.on('me_opportunity', (opportunity) => {
      console.log(`🎯 OPORTUNIDADE ME/EPP: ${opportunity.title} - ${opportunity.organ}`)
    })

    // Listener para sincronizações concluídas
    completeBiddingIntegrator.on('platform_synced', (data) => {
      console.log(`✅ ${data.platformName}: ${data.opportunitiesCount} oportunidades sincronizadas`)
    })

    // Listener para erros
    completeBiddingIntegrator.on('sync_error', (data) => {
      console.error(`❌ Erro de sincronização na plataforma ${data.platformId}: ${data.error}`)
    })

    // Listener para início das integrações
    completeBiddingIntegrator.on('integrations_started', (data) => {
      console.log(`🚀 Integrações iniciadas: ${data.enabledPlatforms}/${data.totalPlatforms} plataformas ativas`)
    })
  }

  getInitializationStatus(): {
    isInitialized: boolean
    stats?: any
  } {
    return {
      isInitialized: this.isInitialized,
      ...(this.isInitialized && { stats: completeBiddingIntegrator.getIntegrationStats() })
    }
  }
}

export const integrationStartup = IntegrationStartup.getInstance()

// Auto-inicialização quando o módulo for carregado
if (process.env.NODE_ENV === 'production' || process.env.AUTO_START_INTEGRATIONS === 'true') {
  integrationStartup.initialize().catch(error => {
    console.error('❌ FALHA CRÍTICA na inicialização automática das integrações:', error)
  })
}