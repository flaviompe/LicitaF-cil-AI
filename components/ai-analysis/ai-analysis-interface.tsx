'use client';

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  Brain, 
  Upload, 
  FileText, 
  Zap, 
  Target,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users,
  Clock,
  DollarSign
} from 'lucide-react'

interface AIAnalysisInterfaceProps {
  userId: string
  currentPlan: string
  remainingAnalyses: number
}

interface AnalysisResult {
  summary: string
  keyRequirements: string[]
  eligibilityCriteria: string[]
  riskAssessment: {
    level: 'LOW' | 'MEDIUM' | 'HIGH'
    factors: string[]
  }
  competitiveAnalysis: {
    estimatedCompetitors: number
    marketAdvantage: string[]
    challenges: string[]
  }
  recommendations: string[]
  estimatedSuccessRate: number
  requiredDocuments: string[]
  timeline: {
    phases: Array<{
      name: string
      date: string
      description: string
    }>
  }
  budgetAnalysis: {
    estimatedCost: number
    profitMargin: number
    costBreakdown: Array<{
      category: string
      amount: number
      percentage: number
    }>
  }
  confidence: number
}

export function AIAnalysisInterface({ userId, currentPlan, remainingAnalyses }: AIAnalysisInterfaceProps) {
  const [editalText, setEditalText] = useState('')
  const [analysisType, setAnalysisType] = useState('complete')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()

  const handleAnalyze = async () => {
    if (!editalText.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, insira o texto do edital para análise.',
        variant: 'destructive'
      })
      return
    }

    setIsAnalyzing(true)
    setProgress(0)
    setAnalysisResult(null)

    try {
      // Simular progresso
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      const response = await fetch('/api/ai-analysis/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          editalText,
          analysisType,
          userId
        }),
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        throw new Error('Erro na análise')
      }

      const result = await response.json()
      setAnalysisResult(result.analysis)

      toast({
        title: 'Análise Concluída',
        description: 'O edital foi analisado com sucesso pela IA.',
      })

    } catch (error) {
      console.error('Erro na análise:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao analisar o edital. Tente novamente.',
        variant: 'destructive'
      })
    } finally {
      setIsAnalyzing(false)
      setProgress(0)
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'bg-green-100 text-green-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'HIGH': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'LOW': return CheckCircle
      case 'MEDIUM': return AlertTriangle
      case 'HIGH': return AlertTriangle
      default: return AlertTriangle
    }
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Analisar Edital
          </CardTitle>
          <CardDescription>
            Cole o texto do edital ou faça upload do arquivo para análise com IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="editalText">Texto do Edital</Label>
            <Textarea
              id="editalText"
              placeholder="Cole aqui o texto completo do edital de licitação..."
              value={editalText}
              onChange={(e) => setEditalText(e.target.value)}
              rows={8}
              className="min-h-[200px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="analysisType">Tipo de Análise</Label>
              <Select value={analysisType} onValueChange={setAnalysisType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick">Análise Rápida</SelectItem>
                  <SelectItem value="complete">Análise Completa</SelectItem>
                  <SelectItem value="competitive">Análise Competitiva</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Análises Restantes</Label>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {remainingAnalyses === -1 ? 'Ilimitado' : `${remainingAnalyses} restantes`}
                </Badge>
                <Badge variant="outline">{currentPlan}</Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !editalText.trim()}
              className="flex items-center"
            >
              {isAnalyzing ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Analisar com IA
                </>
              )}
            </Button>

            <Button variant="outline" disabled>
              <Upload className="h-4 w-4 mr-2" />
              Upload de Arquivo
            </Button>
          </div>

          {isAnalyzing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processando análise...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Resumo Executivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300">
                {analysisResult.summary}
              </p>
              <div className="mt-4 flex items-center space-x-4">
                <Badge variant="outline">
                  Confiança: {(analysisResult.confidence * 100).toFixed(1)}%
                </Badge>
                <Badge variant="outline">
                  Taxa de Sucesso: {analysisResult.estimatedSuccessRate}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Target className="h-4 w-4 mr-2" />
                  Sucesso Estimado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {analysisResult.estimatedSuccessRate}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Concorrentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {analysisResult.competitiveAnalysis.estimatedCompetitors}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Fases
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {analysisResult.timeline.phases.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Custo Estimado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  R$ {analysisResult.budgetAnalysis.estimatedCost.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Avaliação de Risco
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <Badge className={getRiskColor(analysisResult.riskAssessment.level)}>
                  {analysisResult.riskAssessment.level === 'LOW' ? 'Baixo' :
                   analysisResult.riskAssessment.level === 'MEDIUM' ? 'Médio' : 'Alto'}
                </Badge>
              </div>
              <div className="space-y-2">
                {analysisResult.riskAssessment.factors.map((factor, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mr-2" />
                    {factor}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Recomendações Estratégicas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysisResult.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {rec}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Próximas Ações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar Proposta
                </Button>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Exportar Análise
                </Button>
                <Button variant="outline">
                  <Target className="h-4 w-4 mr-2" />
                  Salvar Oportunidade
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}