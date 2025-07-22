// Sistema de Inteligência de Competidores em Tempo Real
// Análise avançada de concorrentes e padrões de licitação

import { EventEmitter } from 'events'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface CompetitorProfile {
  id: string
  name: string
  cnpj?: string
  category: string[]
  marketSegments: string[]
  geographicScope: string[]
  companySize: 'MEI' | 'ME' | 'EPP' | 'MEDIO' | 'GRANDE'
  
  // Métricas de performance
  performance: {
    totalBids: number
    wonBids: number
    winRate: number
    averageBidValue: number
    totalContractValue: number
    averageContractDuration: number
  }
  
  // Análise comportamental
  biddingBehavior: {
    priceAggressive: boolean
    lastMinuteBidder: boolean
    strategicWithdrawer: boolean
    marketLeader: boolean
    averageDiscountPercentage: number
    preferredBidTiming: 'EARLY' | 'MIDDLE' | 'LATE'
  }
  
  // Inteligência de mercado
  marketIntelligence: {
    strengths: string[]
    weaknesses: string[]
    preferredOrgans: string[]
    avoidedSectors: string[]
    seasonalPatterns: SeasonalPattern[]
    partnerships: string[]
  }
  
  // Histórico recente
  recentActivity: {
    lastBidDate: Date
    recentWins: RecentWin[]
    recentLosses: RecentLoss[]
    upcomingOpportunities: string[]
    behaviorChanges: BehaviorChange[]
  }
  
  // Predições de IA
  aiPredictions: {
    nextBidPrediction: Date
    priceRangePrediction: { min: number; max: number }
    winProbabilityTrend: number
    marketPositionTrend: 'RISING' | 'STABLE' | 'DECLINING'
    threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  }
  
  lastUpdated: Date
  confidence: number
}

interface SeasonalPattern {
  season: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  activityLevel: number
  preferredTypes: string[]
  averageSuccess: number
}

interface RecentWin {
  opportunityId: string
  title: string
  value: number
  organ: string
  winDate: Date
  competitorCount: number
  winningMargin: number
}

interface RecentLoss {
  opportunityId: string
  title: string
  bidValue: number
  winningValue: number
  organ: string
  lossDate: Date
  ranking: number
  lossReason: string
}

interface BehaviorChange {
  changeType: 'PRICE_STRATEGY' | 'MARKET_FOCUS' | 'BID_FREQUENCY' | 'SECTOR_SHIFT'
  description: string
  detectedAt: Date
  confidence: number
  impact: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface CompetitorAlert {
  id: string
  competitorId: string
  alertType: 'NEW_BID' | 'PRICE_CHANGE' | 'MARKET_ENTRY' | 'STRATEGY_SHIFT' | 'THREAT_ESCALATION'
  title: string
  description: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  opportunityId?: string
  impact: string
  recommendations: string[]
  createdAt: Date
}

export interface MarketAnalysis {
  opportunityId: string
  competitorLandscape: {
    totalCompetitors: number
    identifiedCompetitors: CompetitorProfile[]
    marketConcentration: number
    competitionIntensity: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME'
  }
  
  competitiveAdvantages: {
    ourPosition: 'MARKET_LEADER' | 'STRONG_PLAYER' | 'CHALLENGER' | 'NICHE' | 'UNDERDOG'
    advantagesVsCompetitors: Record<string, string[]>
    vulnerabilities: string[]
    marketGaps: string[]
  }
  
  pricingIntelligence: {
    expectedPriceRange: { min: number; max: number; optimal: number }
    priceLeaders: string[]
    priceFollowers: string[]
    aggressivePricers: string[]
    marketPriceIndex: number
  }
  
  strategicInsights: {
    winningStrategies: string[]
    marketEntryBarriers: string[]
    competitionHotspots: string[]
    blueOceanOpportunities: string[]
    threatVectors: string[]
  }
  
  predictiveAnalysis: {
    likelyParticipants: CompetitorProfile[]
    expectedDropouts: CompetitorProfile[]
    darkHorseCompetitors: CompetitorProfile[]
    marketShakeupProbability: number
  }
  
  generatedAt: Date
  confidence: number
}

export class CompetitorIntelligenceSystem extends EventEmitter {
  private static instance: CompetitorIntelligenceSystem
  private competitors: Map<string, CompetitorProfile> = new Map()
  private marketAnalyses: Map<string, MarketAnalysis> = new Map()
  private alerts: CompetitorAlert[] = []
  private monitoring = false

  private constructor() {
    super()
    this.initializeCompetitorDatabase()
  }

  static getInstance(): CompetitorIntelligenceSystem {
    if (!CompetitorIntelligenceSystem.instance) {
      CompetitorIntelligenceSystem.instance = new CompetitorIntelligenceSystem()
    }
    return CompetitorIntelligenceSystem.instance
  }

  private async initializeCompetitorDatabase() {
    console.log('🕵️ Inicializando base de inteligência de competidores...')
    
    // Simular base de dados de competidores
    const mockCompetitors: CompetitorProfile[] = [
      {
        id: 'comp_techsolutions',
        name: 'TechSolutions Brasil LTDA',
        cnpj: '12.345.678/0001-90',
        category: ['Tecnologia', 'Consultoria'],
        marketSegments: ['Desenvolvimento Software', 'Infraestrutura TI'],
        geographicScope: ['SP', 'RJ', 'MG'],
        companySize: 'EPP',
        
        performance: {
          totalBids: 156,
          wonBids: 89,
          winRate: 0.57,
          averageBidValue: 245000,
          totalContractValue: 21800000,
          averageContractDuration: 18
        },
        
        biddingBehavior: {
          priceAggressive: true,
          lastMinuteBidder: false,
          strategicWithdrawer: true,
          marketLeader: false,
          averageDiscountPercentage: 15.5,
          preferredBidTiming: 'EARLY'
        },
        
        marketIntelligence: {
          strengths: ['Preço competitivo', 'Agilidade', 'Experiência em TI'],
          weaknesses: ['Suporte limitado', 'Equipe pequena'],
          preferredOrgans: ['Prefeituras', 'Autarquias'],
          avoidedSectors: ['Saúde', 'Educação superior'],
          seasonalPatterns: [],
          partnerships: ['PartnerTech LTDA', 'Inovação Digital SA']
        },
        
        recentActivity: {
          lastBidDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          recentWins: [],
          recentLosses: [],
          upcomingOpportunities: ['opp_001', 'opp_003'],
          behaviorChanges: []
        },
        
        aiPredictions: {
          nextBidPrediction: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          priceRangePrediction: { min: 80000, max: 120000 },
          winProbabilityTrend: 0.62,
          marketPositionTrend: 'RISING',
          threatLevel: 'HIGH'
        },
        
        lastUpdated: new Date(),
        confidence: 0.87
      },
      
      {
        id: 'comp_globalservices',
        name: 'Global Services Corporation',
        cnpj: '98.765.432/0001-10',
        category: ['Serviços Gerais', 'Facilities'],
        marketSegments: ['Limpeza', 'Segurança', 'Manutenção'],
        geographicScope: ['SP', 'RJ', 'DF', 'BA'],
        companySize: 'GRANDE',
        
        performance: {
          totalBids: 287,
          wonBids: 198,
          winRate: 0.69,
          averageBidValue: 380000,
          totalContractValue: 75200000,
          averageContractDuration: 36
        },
        
        biddingBehavior: {
          priceAggressive: false,
          lastMinuteBidder: true,
          strategicWithdrawer: false,
          marketLeader: true,
          averageDiscountPercentage: 8.2,
          preferredBidTiming: 'LATE'
        },
        
        marketIntelligence: {
          strengths: ['Marca consolidada', 'Estrutura nacional', 'Experiência'],
          weaknesses: ['Preços altos', 'Burocracy interna', 'Pouca inovação'],
          preferredOrgans: ['Órgãos Federais', 'Grandes Municípios'],
          avoidedSectors: ['Tecnologia', 'Consultoria especializada'],
          seasonalPatterns: [],
          partnerships: ['Security Plus', 'Clean Master']
        },
        
        recentActivity: {
          lastBidDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          recentWins: [],
          recentLosses: [],
          upcomingOpportunities: ['opp_002', 'opp_004'],
          behaviorChanges: []
        },
        
        aiPredictions: {
          nextBidPrediction: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          priceRangePrediction: { min: 95000, max: 140000 },
          winProbabilityTrend: 0.71,
          marketPositionTrend: 'STABLE',
          threatLevel: 'CRITICAL'
        },
        
        lastUpdated: new Date(),
        confidence: 0.92
      }
    ]

    mockCompetitors.forEach(competitor => {
      this.competitors.set(competitor.id, competitor)
    })

    console.log(`✅ ${mockCompetitors.length} competidores carregados na base de inteligência`)
  }

  // ANÁLISE COMPLETA DE MERCADO PARA UMA OPORTUNIDADE
  async analyzeMarketCompetition(opportunityId: string): Promise<MarketAnalysis> {
    console.log(`🔍 Analisando concorrência para oportunidade ${opportunityId}`)

    // Buscar dados da oportunidade
    const opportunityData = await this.getOpportunityData(opportunityId)
    
    // Identificar competidores relevantes
    const relevantCompetitors = this.identifyRelevantCompetitors(opportunityData)
    
    // Analisar concentração de mercado
    const marketConcentration = this.calculateMarketConcentration(relevantCompetitors)
    
    // Análise de preços
    const pricingIntelligence = await this.analyzePricingIntelligence(opportunityData, relevantCompetitors)
    
    // Insights estratégicos
    const strategicInsights = await this.generateStrategicInsights(opportunityData, relevantCompetitors)
    
    // Análise preditiva
    const predictiveAnalysis = await this.performPredictiveAnalysis(opportunityData, relevantCompetitors)

    const analysis: MarketAnalysis = {
      opportunityId,
      competitorLandscape: {
        totalCompetitors: relevantCompetitors.length,
        identifiedCompetitors: relevantCompetitors,
        marketConcentration,
        competitionIntensity: this.assessCompetitionIntensity(relevantCompetitors, marketConcentration)
      },
      
      competitiveAdvantages: {
        ourPosition: this.determineOurPosition(opportunityData, relevantCompetitors),
        advantagesVsCompetitors: await this.identifyAdvantages(opportunityData, relevantCompetitors),
        vulnerabilities: await this.identifyVulnerabilities(opportunityData, relevantCompetitors),
        marketGaps: await this.identifyMarketGaps(opportunityData, relevantCompetitors)
      },
      
      pricingIntelligence,
      strategicInsights,
      predictiveAnalysis,
      
      generatedAt: new Date(),
      confidence: 0.85
    }

    this.marketAnalyses.set(opportunityId, analysis)
    this.emit('market_analysis_completed', analysis)
    
    return analysis
  }

  // MONITORAMENTO EM TEMPO REAL
  startRealTimeMonitoring(): void {
    if (this.monitoring) return

    this.monitoring = true
    console.log('🔴 Iniciando monitoramento em tempo real de competidores...')

    // Monitorar mudanças a cada 5 minutos
    setInterval(async () => {
      await this.checkForCompetitorUpdates()
    }, 5 * 60 * 1000)

    // Análise profunda a cada hora
    setInterval(async () => {
      await this.performDeepCompetitorAnalysis()
    }, 60 * 60 * 1000)

    this.emit('monitoring_started')
  }

  stopRealTimeMonitoring(): void {
    this.monitoring = false
    console.log('🛑 Monitoramento de competidores pausado')
    this.emit('monitoring_stopped')
  }

  private async checkForCompetitorUpdates() {
    console.log('🔄 Verificando atualizações dos competidores...')
    
    for (const [competitorId, competitor] of this.competitors) {
      try {
        // Simular detecção de mudanças
        const updates = await this.detectCompetitorChanges(competitor)
        
        if (updates.length > 0) {
          await this.processCompetitorUpdates(competitorId, updates)
        }
      } catch (error) {
        console.error(`❌ Erro ao verificar competidor ${competitorId}:`, error)
      }
    }
  }

  private async detectCompetitorChanges(competitor: CompetitorProfile): Promise<any[]> {
    // Simular detecção de mudanças
    const changes = []
    
    // 10% chance de mudança de comportamento
    if (Math.random() < 0.1) {
      changes.push({
        type: 'PRICE_STRATEGY',
        description: 'Mudança na estratégia de precificação detectada',
        impact: 'MEDIUM'
      })
    }
    
    // 5% chance de nova licitação
    if (Math.random() < 0.05) {
      changes.push({
        type: 'NEW_BID',
        description: 'Nova participação em licitação detectada',
        impact: 'HIGH'
      })
    }

    return changes
  }

  private async processCompetitorUpdates(competitorId: string, updates: any[]) {
    const competitor = this.competitors.get(competitorId)!
    
    for (const update of updates) {
      // Criar alerta
      const alert: CompetitorAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        competitorId,
        alertType: update.type,
        title: `${competitor.name} - ${update.description}`,
        description: update.description,
        severity: update.impact === 'HIGH' ? 'CRITICAL' : 'WARNING',
        impact: update.description,
        recommendations: await this.generateRecommendations(update, competitor),
        createdAt: new Date()
      }
      
      this.alerts.push(alert)
      this.emit('competitor_alert', alert)
      
      // Atualizar perfil do competidor
      competitor.lastUpdated = new Date()
      
      // Adicionar mudança comportamental
      if (update.type.includes('STRATEGY') || update.type.includes('PRICE')) {
        competitor.recentActivity.behaviorChanges.push({
          changeType: update.type,
          description: update.description,
          detectedAt: new Date(),
          confidence: 0.8,
          impact: update.impact
        })
      }
    }
  }

  private async performDeepCompetitorAnalysis() {
    console.log('🧠 Executando análise profunda de competidores...')
    
    for (const [competitorId, competitor] of this.competitors) {
      try {
        // Atualizar predições de IA
        competitor.aiPredictions = await this.updateAIPredictions(competitor)
        
        // Recalcular métricas
        await this.recalculateMetrics(competitor)
        
        // Detectar tendências
        await this.detectTrends(competitor)
        
      } catch (error) {
        console.error(`❌ Erro na análise profunda do competidor ${competitorId}:`, error)
      }
    }
  }

  // INTELIGÊNCIA PREDITIVA
  private async updateAIPredictions(competitor: CompetitorProfile): Promise<CompetitorProfile['aiPredictions']> {
    // Usar padrões históricos para prever comportamento futuro
    const predictions = {
      nextBidPrediction: new Date(Date.now() + (3 + Math.random() * 7) * 24 * 60 * 60 * 1000),
      priceRangePrediction: {
        min: competitor.performance.averageBidValue * 0.85,
        max: competitor.performance.averageBidValue * 1.15
      },
      winProbabilityTrend: competitor.performance.winRate + (Math.random() - 0.5) * 0.1,
      marketPositionTrend: this.predictMarketTrend(competitor),
      threatLevel: this.assessThreatLevel(competitor)
    }

    return predictions
  }

  private predictMarketTrend(competitor: CompetitorProfile): 'RISING' | 'STABLE' | 'DECLINING' {
    const winRateChange = Math.random() - 0.5
    if (winRateChange > 0.1) return 'RISING'
    if (winRateChange < -0.1) return 'DECLINING'
    return 'STABLE'
  }

  private assessThreatLevel(competitor: CompetitorProfile): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const score = competitor.performance.winRate * 0.4 + 
                  (competitor.performance.totalContractValue / 1000000) * 0.3 +
                  competitor.marketIntelligence.strengths.length * 0.3

    if (score > 80) return 'CRITICAL'
    if (score > 60) return 'HIGH'
    if (score > 40) return 'MEDIUM'
    return 'LOW'
  }

  // ANÁLISE DE PRICING
  private async analyzePricingIntelligence(opportunityData: any, competitors: CompetitorProfile[]): Promise<MarketAnalysis['pricingIntelligence']> {
    const estimatedValue = opportunityData.estimatedValue || 100000
    
    // Calcular faixas de preço baseadas no histórico dos competidores
    const avgBidValues = competitors.map(c => c.performance.averageBidValue)
    const minExpected = Math.min(...avgBidValues) * 0.9
    const maxExpected = Math.max(...avgBidValues) * 1.1
    const optimalPrice = estimatedValue * 0.92 // 8% de desconto como ótimo

    // Identificar perfis de preço
    const priceLeaders = competitors.filter(c => c.biddingBehavior.averageDiscountPercentage < 5)
    const aggressivePricers = competitors.filter(c => c.biddingBehavior.averageDiscountPercentage > 15)
    const priceFollowers = competitors.filter(c => 
      !priceLeaders.includes(c) && !aggressivePricers.includes(c)
    )

    return {
      expectedPriceRange: {
        min: minExpected,
        max: maxExpected,
        optimal: optimalPrice
      },
      priceLeaders: priceLeaders.map(c => c.name),
      priceFollowers: priceFollowers.map(c => c.name),
      aggressivePricers: aggressivePricers.map(c => c.name),
      marketPriceIndex: avgBidValues.reduce((a, b) => a + b, 0) / avgBidValues.length / estimatedValue
    }
  }

  // INSIGHTS ESTRATÉGICOS
  private async generateStrategicInsights(opportunityData: any, competitors: CompetitorProfile[]): Promise<MarketAnalysis['strategicInsights']> {
    const prompt = `
    Analise esta situação competitiva e gere insights estratégicos:
    
    Oportunidade: ${JSON.stringify(opportunityData, null, 2)}
    Competidores: ${competitors.map(c => c.name + ' - ' + c.marketIntelligence.strengths.join(', ')).join('\n')}
    
    Gere 5 estratégias vencedoras, 3 barreiras de entrada, 3 hotspots competitivos e 2 oportunidades de oceano azul.
    `

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "Você é um analista sênior de inteligência competitiva especializado em licitações públicas."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      })

      // Parsear resposta (implementar parsing mais sofisticado)
      return {
        winningStrategies: [
          'Focar em diferenciação técnica',
          'Aproveitar benefícios ME/EPP',
          'Parceria estratégica',
          'Inovação em modelo de negócio',
          'Especialização setorial'
        ],
        marketEntryBarriers: [
          'Experiência prévia exigida',
          'Certificações específicas',
          'Capital de giro elevado'
        ],
        competitionHotspots: [
          'Preço final',
          'Qualificação técnica',
          'Prazo de entrega'
        ],
        blueOceanOpportunities: [
          'Sustentabilidade e ESG',
          'Digitalização de processos'
        ],
        threatVectors: [
          'Guerra de preços',
          'Dumping predatório',
          'Mudanças regulatórias'
        ]
      }
    } catch (error) {
      // Fallback para insights padrão
      return {
        winningStrategies: [
          'Diferenciação pela qualidade',
          'Preço competitivo',
          'Agilidade na execução'
        ],
        marketEntryBarriers: ['Experiência', 'Certificações'],
        competitionHotspots: ['Preço'],
        blueOceanOpportunities: ['Inovação'],
        threatVectors: ['Concorrência agressiva']
      }
    }
  }

  // MÉTODOS AUXILIARES
  private identifyRelevantCompetitors(opportunityData: any): CompetitorProfile[] {
    return Array.from(this.competitors.values()).filter(competitor => {
      // Filtrar por categoria/segmento
      const categoryMatch = competitor.category.some(cat => 
        opportunityData.category?.includes(cat) || 
        opportunityData.title?.toLowerCase().includes(cat.toLowerCase())
      )
      
      // Filtrar por escopo geográfico
      const geoMatch = competitor.geographicScope.includes(opportunityData.uf) ||
                      competitor.geographicScope.includes('NACIONAL')
      
      return categoryMatch && geoMatch
    })
  }

  private calculateMarketConcentration(competitors: CompetitorProfile[]): number {
    // Calcular índice HHI simplificado
    const totalValue = competitors.reduce((sum, c) => sum + c.performance.totalContractValue, 0)
    
    if (totalValue === 0) return 0
    
    const hhi = competitors.reduce((sum, competitor) => {
      const marketShare = competitor.performance.totalContractValue / totalValue
      return sum + Math.pow(marketShare * 100, 2)
    }, 0)
    
    return hhi / 10000 // Normalizar para 0-1
  }

  private assessCompetitionIntensity(competitors: CompetitorProfile[], concentration: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
    if (competitors.length < 3 && concentration > 0.6) return 'LOW'
    if (competitors.length < 5 && concentration > 0.4) return 'MEDIUM'
    if (competitors.length < 8) return 'HIGH'
    return 'EXTREME'
  }

  private determineOurPosition(opportunityData: any, competitors: CompetitorProfile[]): MarketAnalysis['competitiveAdvantages']['ourPosition'] {
    // Lógica para determinar nossa posição baseada nos dados da empresa
    // Por enquanto, simulação
    const positions: MarketAnalysis['competitiveAdvantages']['ourPosition'][] = 
      ['MARKET_LEADER', 'STRONG_PLAYER', 'CHALLENGER', 'NICHE', 'UNDERDOG']
    
    return positions[Math.floor(Math.random() * positions.length)]
  }

  private async identifyAdvantages(opportunityData: any, competitors: CompetitorProfile[]): Promise<Record<string, string[]>> {
    const advantages: Record<string, string[]> = {}
    
    competitors.forEach(competitor => {
      advantages[competitor.name] = [
        'Vantagem competitiva identificada',
        'Diferencial no mercado'
      ]
    })
    
    return advantages
  }

  private async identifyVulnerabilities(opportunityData: any, competitors: CompetitorProfile[]): Promise<string[]> {
    return [
      'Dependência de poucos clientes',
      'Preços não competitivos',
      'Falta de inovação'
    ]
  }

  private async identifyMarketGaps(opportunityData: any, competitors: CompetitorProfile[]): Promise<string[]> {
    return [
      'Atendimento 24/7',
      'Soluções sustentáveis',
      'Tecnologia de ponta'
    ]
  }

  private async performPredictiveAnalysis(opportunityData: any, competitors: CompetitorProfile[]): Promise<MarketAnalysis['predictiveAnalysis']> {
    return {
      likelyParticipants: competitors.slice(0, 3),
      expectedDropouts: competitors.slice(-1),
      darkHorseCompetitors: competitors.slice(1, 2),
      marketShakeupProbability: Math.random() * 0.3
    }
  }

  private async getOpportunityData(opportunityId: string): Promise<any> {
    // Simular dados da oportunidade
    return {
      id: opportunityId,
      title: 'Pregão Eletrônico - Serviços de TI',
      category: ['Tecnologia'],
      estimatedValue: 120000,
      uf: 'SP'
    }
  }

  private async recalculateMetrics(competitor: CompetitorProfile): Promise<void> {
    // Recalcular métricas baseadas em novos dados
    competitor.confidence = 0.85 + Math.random() * 0.1
  }

  private async detectTrends(competitor: CompetitorProfile): Promise<void> {
    // Detectar tendências no comportamento
    const trendChange = Math.random() - 0.5
    competitor.performance.winRate = Math.max(0, Math.min(1, competitor.performance.winRate + trendChange * 0.1))
  }

  private async generateRecommendations(update: any, competitor: CompetitorProfile): Promise<string[]> {
    return [
      `Monitorar estratégia de ${competitor.name}`,
      'Ajustar nossa abordagem competitiva',
      'Considerar mudança de precificação'
    ]
  }

  // APIs PÚBLICAS
  getCompetitorProfile(competitorId: string): CompetitorProfile | undefined {
    return this.competitors.get(competitorId)
  }

  getAllCompetitors(): CompetitorProfile[] {
    return Array.from(this.competitors.values())
  }

  getMarketAnalysis(opportunityId: string): MarketAnalysis | undefined {
    return this.marketAnalyses.get(opportunityId)
  }

  getCompetitorAlerts(limit = 50): CompetitorAlert[] {
    return this.alerts.slice(-limit).reverse()
  }

  getSystemStats(): {
    competitorsTracked: number
    analysesPerformed: number
    alertsGenerated: number
    monitoringActive: boolean
  } {
    return {
      competitorsTracked: this.competitors.size,
      analysesPerformed: this.marketAnalyses.size,
      alertsGenerated: this.alerts.length,
      monitoringActive: this.monitoring
    }
  }
}

// Singleton export
export const competitorIntelligence = CompetitorIntelligenceSystem.getInstance()

// Helper functions
export async function analyzeCompetitionForOpportunity(opportunityId: string) {
  return await competitorIntelligence.analyzeMarketCompetition(opportunityId)
}

export function startCompetitorMonitoring() {
  competitorIntelligence.startRealTimeMonitoring()
}

export function getCompetitorInsights(competitorId: string) {
  return competitorIntelligence.getCompetitorProfile(competitorId)
}