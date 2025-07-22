import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { AIAnalysisService } from '@/lib/ai-analysis'
import { AIAnalysisInterface } from '@/components/ai-analysis/ai-analysis-interface'
import { AnalysisHistory } from '@/components/ai-analysis/analysis-history'
import { AIFeatures } from '@/components/ai-analysis/ai-features'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Brain, 
  FileText, 
  TrendingUp, 
  Zap, 
  Award,
  History,
  Sparkles,
  Target,
  BarChart3
} from 'lucide-react'

export default async function AIAnalysisPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/login')
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      company: true,
      subscriptions: {
        include: {
          plan: true,
        },
        take: 1,
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  })

  if (!user) {
    redirect('/login')
  }

  const currentPlan = user.subscriptions[0]?.plan?.name || 'Starter'
  const analysisHistory = await AIAnalysisService.getAnalysisHistory(session.user.id)

  // Verificar uso mensal de IA
  const monthlyUsage = await db.editalAnalysis.count({
    where: {
      opportunity: {
        company: {
          userId: session.user.id
        }
      },
      createdAt: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    }
  })

  const planLimits = {
    'Starter': 5,
    'Professional': 50,
    'Enterprise': -1
  }

  const usageLimit = planLimits[currentPlan as keyof typeof planLimits] || 5
  const canUseAI = usageLimit === -1 || monthlyUsage < usageLimit

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Análise de Editais com IA
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Analise editais automaticamente e aumente suas chances de sucesso
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-purple-100 text-purple-800">
            🤖 IA GPT-4
          </Badge>
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            📊 Plano {currentPlan}
          </Badge>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Uso Mensal
            </CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monthlyUsage} / {usageLimit === -1 ? '∞' : usageLimit}
            </div>
            <div className="text-sm text-muted-foreground">
              Análises utilizadas
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Histórico Total
            </CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {analysisHistory.length}
            </div>
            <div className="text-sm text-muted-foreground">
              Análises realizadas
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Sucesso
            </CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analysisHistory.length > 0 ? 
                (analysisHistory.reduce((sum, a) => sum + a.estimatedSuccessRate, 0) / analysisHistory.length).toFixed(1) : 0}%
            </div>
            <div className="text-sm text-muted-foreground">
              Média estimada
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Economia de Tempo
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {analysisHistory.length * 2}h
            </div>
            <div className="text-sm text-muted-foreground">
              Tempo economizado
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Features Overview */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-purple-100 p-3 rounded-full">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Análise Inteligente de Editais
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Nossa IA analisa editais em segundos e fornece insights estratégicos
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <Target className="h-5 w-5 text-purple-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Identificação de requisitos críticos
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Análise de competitividade
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Recomendações estratégicas
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Limit Warning */}
      {!canUseAI && (
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-orange-100 p-3 rounded-full">
                  <Brain className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Limite de Análises Atingido
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Você atingiu o limite de {usageLimit} análises mensais do plano {currentPlan}
                  </p>
                </div>
              </div>
              <Button>
                Fazer Upgrade
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="analyze" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analyze" className="flex items-center">
            <Brain className="h-4 w-4 mr-2" />
            Analisar Edital
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center">
            <History className="h-4 w-4 mr-2" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center">
            <Sparkles className="h-4 w-4 mr-2" />
            Recursos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="space-y-4">
          {canUseAI ? (
            <AIAnalysisInterface 
              userId={session.user.id}
              currentPlan={currentPlan}
              remainingAnalyses={usageLimit === -1 ? -1 : usageLimit - monthlyUsage}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <Brain className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Limite de Análises Atingido
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Faça upgrade para continuar analisando editais com IA
                </p>
                <Button>
                  Ver Planos
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <AnalysisHistory analyses={analysisHistory} />
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <AIFeatures currentPlan={currentPlan} />
        </TabsContent>
      </Tabs>
    </div>
  )
}