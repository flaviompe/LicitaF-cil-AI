'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Brain, 
  Target, 
  TrendingUp, 
  Clock, 
  Users, 
  DollarSign,
  FileText,
  BarChart3,
  Activity,
  Zap,
  Trophy,
  AlertTriangle,
  CheckCircle,
  Timer
} from 'lucide-react'

interface BiddingIntelligence {
  opportunityId: string
  companyId: string
  analysis: {
    viabilityScore: number
    competitiveAdvantage: string[]
    risksIdentified: string[]
    strategicRecommendations: string[]
    optimalBidPrice: number
    winProbability: number
    marketPosition: string
  }
  predictiveInsights: {
    participantsPrediction: number
    priceRangePrediction: {
      min: number
      max: number
      optimal: number
    }
    winningStrategyPrediction: string
    deadlinePressureFactor: number
  }
  competitorIntelligence: {
    identifiedCompetitors: any[]
    marketShare: Record<string, number>
  }
  generatedAt: string
  confidence: number
}

interface LiveBiddingSession {
  sessionId: string
  realTimeData: {
    currentLeader: string
    leadingBid: number
    remainingTime: number
    participantCount: number
    biddingPhase: string
  }
  aiRecommendations: {
    suggestedAction: string
    recommendedValue: number
    reasoning: string
    confidence: number
    riskLevel: string
  }
}

export function AIBiddingDashboard() {
  const [activeTab, setActiveTab] = useState('analysis')
  const [intelligence, setIntelligence] = useState<BiddingIntelligence | null>(null)
  const [liveSession, setLiveSession] = useState<LiveBiddingSession | null>(null)
  const [loading, setLoading] = useState(false)

  const analyzeOpportunity = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai-bidding/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: 'opp_001',
          companyId: 'comp_001'
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setIntelligence(data.data)
      }
    } catch (error) {
      console.error('Erro ao analisar oportunidade:', error)
    }
    setLoading(false)
  }

  const generateProposal = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai-bidding/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: 'opp_001',
          companyId: 'comp_001'
        })
      })
      
      const data = await response.json()
      if (data.success) {
        alert('Proposta gerada com sucesso!')
      }
    } catch (error) {
      console.error('Erro ao gerar proposta:', error)
    }
    setLoading(false)
  }

  const startLiveSession = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai-bidding/live-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: 'opp_001',
          companyId: 'comp_001'
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setLiveSession(data.data.session)
        // Iniciar polling para atualizações
        const interval = setInterval(async () => {
          const updateResponse = await fetch(`/api/ai-bidding/live-session?sessionId=${data.data.sessionId}`)
          const updateData = await updateResponse.json()
          if (updateData.success) {
            setLiveSession(updateData.data)
          }
        }, 30000)
        
        // Limpar polling após 10 minutos
        setTimeout(() => clearInterval(interval), 600000)
      }
    } catch (error) {
      console.error('Erro ao iniciar sessão ao vivo:', error)
    }
    setLoading(false)
  }

  const getViabilityColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getProbabilityColor = (prob: number) => {
    if (prob >= 0.7) return 'bg-green-500'
    if (prob >= 0.5) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'bg-green-100 text-green-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'HIGH': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'BID_NOW': return 'bg-green-500'
      case 'FINAL_PUSH': return 'bg-red-500'
      case 'AGGRESSIVE_BID': return 'bg-orange-500'
      case 'WAIT': return 'bg-blue-500'
      case 'WITHDRAW': return 'bg-gray-500'
      default: return 'bg-blue-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            IA Superior para Pregões
          </h1>
          <p className="text-muted-foreground">
            Tecnologia de IA mais avançada do mercado para licitações
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={analyzeOpportunity}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Brain className="h-4 w-4 mr-2" />
            Analisar com IA
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b">
        {[
          { id: 'analysis', label: 'Análise Inteligente', icon: Brain },
          { id: 'proposal', label: 'Geração de Proposta', icon: FileText },
          { id: 'live', label: 'Pregão ao Vivo', icon: Activity }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-purple-600 text-purple-600' 
                : 'border-transparent hover:text-purple-600'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Análise Inteligente Tab */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          {intelligence ? (
            <>
              {/* Cards de Métricas Principais */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Score de Viabilidade</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getViabilityColor(intelligence.analysis.viabilityScore)}`}>
                      {intelligence.analysis.viabilityScore}%
                    </div>
                    <Progress 
                      value={intelligence.analysis.viabilityScore} 
                      className="mt-2" 
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Probabilidade de Vitória</CardTitle>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.round(intelligence.analysis.winProbability * 100)}%
                    </div>
                    <Progress 
                      value={intelligence.analysis.winProbability * 100}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Lance Ótimo</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      R$ {intelligence.analysis.optimalBidPrice.toLocaleString('pt-BR')}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Baseado em IA preditiva
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Confiança da IA</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.round(intelligence.confidence * 100)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Precisão do modelo
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Análise Detalhada */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Vantagens Competitivas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {intelligence.analysis.competitiveAdvantage.map((advantage, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{advantage}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      Riscos Identificados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {intelligence.analysis.risksIdentified.map((risk, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Recomendações Estratégicas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    Recomendações Estratégicas da IA
                  </CardTitle>
                  <CardDescription>
                    Baseadas em análise de big data e machine learning
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {intelligence.analysis.strategicRecommendations.map((recommendation, index) => (
                      <div key={index} className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                        <p className="text-sm font-medium text-purple-900">
                          {recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Predições de Mercado */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    Predições de Mercado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-blue-600">
                        {intelligence.predictiveInsights.participantsPrediction}
                      </div>
                      <p className="text-sm text-blue-800">Participantes Esperados</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-green-600">
                        R$ {intelligence.predictiveInsights.priceRangePrediction.optimal.toLocaleString('pt-BR')}
                      </div>
                      <p className="text-sm text-green-800">Preço Ótimo Previsto</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-purple-600">
                        {intelligence.analysis.marketPosition}
                      </div>
                      <p className="text-sm text-purple-800">Posição no Mercado</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Brain className="h-12 w-12 text-purple-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Análise de IA Disponível
                </h3>
                <p className="text-gray-500 text-center mb-4">
                  Clique em "Analisar com IA" para obter insights avançados sobre a oportunidade
                </p>
                <Button 
                  onClick={analyzeOpportunity}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Analisar com IA
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Geração de Proposta Tab */}
      {activeTab === 'proposal' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Geração Automática de Proposta
              </CardTitle>
              <CardDescription>
                IA gera proposta técnica e comercial completa em segundos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-6 border rounded-lg">
                    <FileText className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">Proposta Técnica</h3>
                    <p className="text-sm text-muted-foreground">
                      Metodologia, cronograma, equipe técnica
                    </p>
                  </div>
                  <div className="text-center p-6 border rounded-lg">
                    <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">Proposta Comercial</h3>
                    <p className="text-sm text-muted-foreground">
                      Precificação ótima e condições
                    </p>
                  </div>
                  <div className="text-center p-6 border rounded-lg">
                    <CheckCircle className="h-8 w-8 text-purple-500 mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">Compliance Check</h3>
                    <p className="text-sm text-muted-foreground">
                      Verificação automática de conformidade
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <Button 
                    onClick={generateProposal}
                    disabled={loading}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar Proposta com IA
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pregão ao Vivo Tab */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          {liveSession ? (
            <>
              {/* Status da Sessão */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Líder Atual</CardTitle>
                    <Trophy className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {liveSession.realTimeData.currentLeader}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      R$ {liveSession.realTimeData.leadingBid.toLocaleString('pt-BR')}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tempo Restante</CardTitle>
                    <Timer className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {Math.floor(liveSession.realTimeData.remainingTime / 60)}min
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Fase: {liveSession.realTimeData.biddingPhase}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Participantes</CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {liveSession.realTimeData.participantCount}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Empresas ativas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Recomendação IA</CardTitle>
                    <Brain className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <Badge className={`${getActionColor(liveSession.aiRecommendations.suggestedAction)} text-white`}>
                      {liveSession.aiRecommendations.suggestedAction}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Confiança: {Math.round(liveSession.aiRecommendations.confidence * 100)}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recomendação Detalhada */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    Recomendação da IA em Tempo Real
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold">
                          Valor Recomendado: R$ {liveSession.aiRecommendations.recommendedValue.toLocaleString('pt-BR')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Ação: {liveSession.aiRecommendations.suggestedAction}
                        </div>
                      </div>
                      <Badge className={getRiskColor(liveSession.aiRecommendations.riskLevel)}>
                        Risco {liveSession.aiRecommendations.riskLevel}
                      </Badge>
                    </div>
                    
                    <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <p className="text-sm text-blue-900">
                        <strong>Estratégia:</strong> {liveSession.aiRecommendations.reasoning}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Activity className="h-12 w-12 text-red-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Simulação de Pregão ao Vivo
                </h3>
                <p className="text-gray-500 text-center mb-4">
                  Inicie uma sessão de pregão ao vivo para receber recomendações em tempo real
                </p>
                <Button 
                  onClick={startLiveSession}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Iniciar Pregão ao Vivo
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}