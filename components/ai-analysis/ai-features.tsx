'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Brain, 
  Target, 
  TrendingUp, 
  Users, 
  FileText, 
  Zap,
  Shield,
  Clock,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Award,
  DollarSign,
  Calendar
} from 'lucide-react'

interface AIFeaturesProps {
  currentPlan: string
}

export function AIFeatures({ currentPlan }: AIFeaturesProps) {
  const features = [
    {
      icon: Brain,
      title: 'Análise Inteligente',
      description: 'IA avançada analisa editais em segundos',
      available: ['Starter', 'Professional', 'Enterprise'],
      highlight: true
    },
    {
      icon: Target,
      title: 'Identificação de Requisitos',
      description: 'Extrai automaticamente requisitos críticos',
      available: ['Starter', 'Professional', 'Enterprise'],
      highlight: false
    },
    {
      icon: TrendingUp,
      title: 'Avaliação de Risco',
      description: 'Analisa riscos e probabilidade de sucesso',
      available: ['Professional', 'Enterprise'],
      highlight: false
    },
    {
      icon: Users,
      title: 'Análise Competitiva',
      description: 'Estima número de concorrentes e vantagens',
      available: ['Professional', 'Enterprise'],
      highlight: false
    },
    {
      icon: FileText,
      title: 'Geração de Propostas',
      description: 'Cria templates personalizados de propostas',
      available: ['Professional', 'Enterprise'],
      highlight: false
    },
    {
      icon: BarChart3,
      title: 'Análise Orçamentária',
      description: 'Estima custos e margem de lucro',
      available: ['Professional', 'Enterprise'],
      highlight: false
    },
    {
      icon: Shield,
      title: 'Verificação de Conformidade',
      description: 'Verifica se empresa atende requisitos',
      available: ['Enterprise'],
      highlight: false
    },
    {
      icon: Sparkles,
      title: 'IA Personalizada',
      description: 'Modelo treinado para seu setor',
      available: ['Enterprise'],
      highlight: false
    }
  ]

  const planLimits = {
    'Starter': {
      analyses: 5,
      features: 3,
      support: 'Email'
    },
    'Professional': {
      analyses: 50,
      features: 6,
      support: 'Prioritário'
    },
    'Enterprise': {
      analyses: -1,
      features: 8,
      support: 'Dedicado'
    }
  }

  const currentLimits = planLimits[currentPlan as keyof typeof planLimits] || planLimits['Starter']
  const availableFeatures = features.filter(feature => feature.available.includes(currentPlan))
  const unavailableFeatures = features.filter(feature => !feature.available.includes(currentPlan))

  return (
    <div className="space-y-6">
      {/* Current Plan Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="h-5 w-5 mr-2 text-blue-600" />
            Plano {currentPlan}
          </CardTitle>
          <CardDescription>
            Recursos de IA disponíveis no seu plano atual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {currentLimits.analyses === -1 ? '∞' : currentLimits.analyses}
              </div>
              <div className="text-sm text-gray-600">Análises/mês</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {currentLimits.features}
              </div>
              <div className="text-sm text-gray-600">Recursos IA</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {currentLimits.support}
              </div>
              <div className="text-sm text-gray-600">Suporte</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Features */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recursos Disponíveis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableFeatures.map((feature, index) => (
            <Card key={index} className={`${feature.highlight ? 'ring-2 ring-blue-500' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 p-2 rounded-full">
                      <feature.icon className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{feature.title}</CardTitle>
                      {feature.highlight && (
                        <Badge className="mt-1 bg-blue-100 text-blue-800">
                          Destaque
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Unavailable Features */}
      {unavailableFeatures.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recursos Premium
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unavailableFeatures.map((feature, index) => (
              <Card key={index} className="opacity-75">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gray-100 p-2 rounded-full">
                        <feature.icon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-gray-600">
                          {feature.title}
                        </CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {feature.available.join(', ')}
                        </Badge>
                      </div>
                    </div>
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Estatísticas de Uso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Análises Realizadas</span>
                <span className="text-sm text-gray-500">
                  {currentPlan === 'Starter' ? '3/5' : currentPlan === 'Professional' ? '12/50' : '127/∞'}
                </span>
              </div>
              <Progress 
                value={currentPlan === 'Starter' ? 60 : currentPlan === 'Professional' ? 24 : 100} 
                className="h-2"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Economia de Tempo</span>
                <span className="text-sm text-gray-500">
                  {currentPlan === 'Starter' ? '6h' : currentPlan === 'Professional' ? '24h' : '254h'}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Tempo economizado com análises automáticas
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Taxa de Sucesso Média</span>
                <span className="text-sm text-gray-500">
                  {currentPlan === 'Starter' ? '67%' : currentPlan === 'Professional' ? '74%' : '82%'}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Baseado em análises históricas
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Como Funciona a IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <div className="font-medium">Análise de Conteúdo</div>
                <div className="text-sm text-gray-600">
                  A IA processa o texto do edital e extrai informações estruturadas
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <div className="font-medium">Identificação de Padrões</div>
                <div className="text-sm text-gray-600">
                  Reconhece requisitos, prazos e critérios de habilitação
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <div className="font-medium">Análise Preditiva</div>
                <div className="text-sm text-gray-600">
                  Estima riscos, competitividade e probabilidade de sucesso
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium">
                4
              </div>
              <div>
                <div className="font-medium">Recomendações</div>
                <div className="text-sm text-gray-600">
                  Gera estratégias personalizadas para maximizar chances
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade CTA */}
      {currentPlan === 'Starter' && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-purple-100 p-3 rounded-full">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Desbloqueie Todo o Potencial da IA
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Faça upgrade para acessar análises ilimitadas e recursos avançados
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-2">
                  A partir de R$ 97/mês
                </div>
                <Button>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Fazer Upgrade
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Model Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Tecnologia IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Modelo Utilizado
              </h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Badge className="bg-blue-100 text-blue-800">
                    GPT-4 Turbo
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Mais recente e preciso
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Treinado especificamente para licitações brasileiras
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Precisão e Confiabilidade
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Precisão na análise</span>
                  <span className="text-sm font-medium">92%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Tempo de resposta</span>
                  <span className="text-sm font-medium">{'< 30s'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Disponibilidade</span>
                  <span className="text-sm font-medium">99.9%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}