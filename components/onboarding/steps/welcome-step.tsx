'use client';

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Rocket, 
  Target, 
  Shield, 
  Zap, 
  Trophy,
  Users,
  ArrowRight
} from 'lucide-react'

interface WelcomeStepProps {
  user: any
  onNext: () => void
}

export function WelcomeStep({ user, onNext }: WelcomeStepProps) {
  const benefits = [
    {
      icon: Target,
      title: 'Encontre Oportunidades',
      description: 'Monitore automaticamente licitações em todos os portais oficiais',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: Shield,
      title: 'Gerencie Documentos',
      description: 'Controle vencimentos de certidões e mantenha-se sempre regular',
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: Zap,
      title: 'Automatize Processos',
      description: 'Receba alertas e notificações sobre prazos importantes',
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      icon: Trophy,
      title: 'Melhore Resultados',
      description: 'Use relatórios e analytics para aumentar sua taxa de sucesso',
      color: 'bg-purple-100 text-purple-600',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header personalizado */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
          <Rocket className="h-8 w-8 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Olá, {user.name}! 👋
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Seja bem-vindo ao LicitaFácil Pro! Vamos configurar sua conta para você começar 
          a participar de licitações públicas de forma profissional.
        </p>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          ✅ Conta criada com sucesso
        </Badge>
      </div>

      {/* Benefícios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {benefits.map((benefit, index) => (
          <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg ${benefit.color}`}>
                  <benefit.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {benefit.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Estatísticas */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-blue-600 mb-2">500+</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Empresas Cadastradas
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600 mb-2">R$ 2.5M</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Em Contratos Conquistados
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-600 mb-2">98%</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Satisfação dos Usuários
            </div>
          </div>
        </div>
      </div>

      {/* Próximos passos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          O que vamos fazer nos próximos passos:
        </h3>
        <ul className="space-y-3">
          <li className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
              1
            </div>
            Completar informações da sua empresa
          </li>
          <li className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
              2
            </div>
            Cadastrar certidões e documentos importantes
          </li>
          <li className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <div className="w-6 h-6 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
              3
            </div>
            Configurar preferências e notificações
          </li>
          <li className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
              4
            </div>
            Começar a encontrar oportunidades!
          </li>
        </ul>
      </div>

      {/* Call to Action */}
      <div className="text-center">
        <Button size="lg" onClick={onNext} className="px-8">
          Vamos Começar
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          Leva apenas 3 minutos para configurar tudo
        </p>
      </div>
    </div>
  )
}