'use client';

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  Calendar, 
  TrendingUp, 
  Target,
  Users,
  AlertTriangle,
  CheckCircle,
  Search,
  Download,
  Eye
} from 'lucide-react'

interface AnalysisHistoryProps {
  analyses: any[]
}

export function AnalysisHistory({ analyses }: AnalysisHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null)

  const filteredAnalyses = analyses.filter(analysis => 
    analysis.opportunity?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    analysis.opportunity?.organ?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    analysis.summary?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'bg-green-100 text-green-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'HIGH': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'LOW': return 'Baixo'
      case 'MEDIUM': return 'Médio'
      case 'HIGH': return 'Alto'
      default: return 'Não definido'
    }
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Pesquisar análises..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Analysis List */}
      {filteredAnalyses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'Nenhuma análise encontrada' : 'Nenhuma análise realizada'}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {searchTerm ? 'Tente termos diferentes' : 'Suas análises de editais aparecerão aqui'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAnalyses.map((analysis) => (
            <Card key={analysis.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      {analysis.opportunity?.title || 'Análise Temporária'}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {analysis.opportunity?.organ} • {formatDate(analysis.createdAt)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getRiskColor(analysis.riskLevel)}>
                      {getRiskLabel(analysis.riskLevel)}
                    </Badge>
                    <Badge variant="outline">
                      {analysis.estimatedSuccessRate}% sucesso
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-gray-600">
                      Taxa: {analysis.estimatedSuccessRate}%
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-gray-600">
                      {analysis.estimatedCompetitors} concorrentes
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-gray-600">
                      {(analysis.confidence * 100).toFixed(1)}% confiança
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
                  {analysis.summary}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {analysis.keyRequirements?.length || 0} requisitos
                    </span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-500">
                      {analysis.recommendations?.length || 0} recomendações
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedAnalysis(analysis)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Detalhes
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-1" />
                      Exportar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Analysis Details Modal */}
      {selectedAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Detalhes da Análise
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedAnalysis(null)}
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-6">
                {/* Summary */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Resumo Executivo
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {selectedAnalysis.summary}
                  </p>
                </div>

                {/* Key Requirements */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Requisitos Principais
                  </h3>
                  <ul className="space-y-1">
                    {selectedAnalysis.keyRequirements?.map((req: string, index: number) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {req}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Risk Assessment */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Avaliação de Risco
                  </h3>
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge className={getRiskColor(selectedAnalysis.riskLevel)}>
                      {getRiskLabel(selectedAnalysis.riskLevel)}
                    </Badge>
                  </div>
                  <ul className="space-y-1">
                    {selectedAnalysis.riskFactors?.map((factor: string, index: number) => (
                      <li key={index} className="flex items-start space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {factor}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommendations */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Recomendações Estratégicas
                  </h3>
                  <ul className="space-y-2">
                    {selectedAnalysis.recommendations?.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                          {index + 1}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {rec}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Competitive Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Vantagens Competitivas
                    </h3>
                    <ul className="space-y-1">
                      {selectedAnalysis.marketAdvantage?.map((advantage: string, index: number) => (
                        <li key={index} className="flex items-start space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {advantage}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Desafios Identificados
                    </h3>
                    <ul className="space-y-1">
                      {selectedAnalysis.challenges?.map((challenge: string, index: number) => (
                        <li key={index} className="flex items-start space-x-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {challenge}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6 pt-6 border-t">
                <Button variant="outline" onClick={() => setSelectedAnalysis(null)}>
                  Fechar
                </Button>
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Análise
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}