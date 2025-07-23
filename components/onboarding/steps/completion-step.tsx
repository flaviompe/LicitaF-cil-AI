'use client';

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  Rocket, 
  Gift, 
  Target, 
  BookOpen,
  MessageCircle,
  ArrowRight
} from 'lucide-react'

interface CompletionStepProps {
  onComplete: () => void
  isLoading: boolean
}

export function CompletionStep({ onComplete, isLoading }: CompletionStepProps) {
  const nextSteps = [
    {
      icon: Target,
      title: 'Encontre sua primeira oportunidade',
      description: 'Navegue pelo painel de oportunidades e encontre licitações relevantes',
      action: 'Ver Oportunidades',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: BookOpen,
      title: 'Leia o guia completo',
      description: 'Aprenda tudo sobre licitações públicas com nosso guia passo-a-passo',
      action: 'Acessar Guia',
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: MessageCircle,
      title: 'Fale com um especialista',
      description: 'Tire dúvidas e receba orientação personalizada',
      action: 'Agendar Conversa',
      color: 'bg-purple-100 text-purple-600',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Sucesso */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Parabéns! Sua conta está configurada! 🎉
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
          Agora você está pronto para começar a participar de licitações públicas 
          com todas as ferramentas necessárias.
        </p>
        
        <div className="flex items-center justify-center space-x-4 mb-8">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            ✅ Empresa configurada
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            🔔 Notificações ativas
          </Badge>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            🎯 Preferências definidas
          </Badge>
        </div>
      </div>

      {/* Benefícios desbloqueados */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Gift className="h-6 w-6 mr-2 text-green-600" />
          Benefícios desbloqueados:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
            <span className="text-gray-700 dark:text-gray-300">
              Monitoramento automático de licitações
            </span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
            <span className="text-gray-700 dark:text-gray-300">
              Alertas de vencimento de certidões
            </span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
            <span className="text-gray-700 dark:text-gray-300">
              Assistente de criação de propostas
            </span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
            <span className="text-gray-700 dark:text-gray-300">
              Relatórios de desempenho
            </span>
          </div>
        </div>
      </div>

      {/* Próximos passos */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Próximos passos recomendados:
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {nextSteps.map((step, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${step.color}`}>
                      <step.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {step.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    {step.action}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Suporte */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 text-center">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
          Precisa de ajuda?
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Nossa equipe está pronta para ajudar você a ter sucesso nas licitações.
        </p>
        <div className="flex items-center justify-center space-x-4">
          <Button variant="outline" size="sm">
            Central de Ajuda
          </Button>
          <Button variant="outline" size="sm">
            Chat ao Vivo
          </Button>
          <Button variant="outline" size="sm">
            Agendar Treinamento
          </Button>
        </div>
      </div>

      {/* Botão principal */}
      <div className="text-center">
        <Button 
          size="lg" 
          onClick={onComplete}
          disabled={isLoading}
          className="px-8"
        >
          <Rocket className="h-5 w-5 mr-2" />
          {isLoading ? 'Finalizando...' : 'Ir para o Dashboard'}
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          Você pode alterar essas configurações a qualquer momento
        </p>
      </div>
    </div>
  )
}