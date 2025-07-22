import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Star, Zap, Crown } from 'lucide-react'
import Link from 'next/link'
import { PLANS } from '@/lib/stripe'

export default function PricingPage() {
  const plans = [
    {
      id: 'STARTER',
      ...PLANS.STARTER,
      icon: Zap,
      popular: false,
      color: 'blue',
    },
    {
      id: 'PROFESSIONAL',
      ...PLANS.PROFESSIONAL,
      icon: Star,
      popular: true,
      color: 'green',
    },
    {
      id: 'ENTERPRISE',
      ...PLANS.ENTERPRISE,
      icon: Crown,
      popular: false,
      color: 'purple',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-gray-900 dark:text-white">
            LicitaFácil Pro
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link href="/register">
              <Button>Começar Agora</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
          Planos para Todos os Tamanhos
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
          Escolha o plano ideal para sua empresa e comece a participar de licitações públicas 
          com as melhores ferramentas do mercado.
        </p>
        <div className="flex items-center justify-center space-x-4 mb-12">
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            ✅ 7 dias de teste grátis
          </Badge>
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            🔒 Cancele quando quiser
          </Badge>
          <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
            🎯 Suporte especializado
          </Badge>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="container mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative ${plan.popular ? 'border-2 border-primary scale-105' : 'border'} hover:shadow-lg transition-all duration-300`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    ⭐ Mais Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 mx-auto bg-${plan.color}-100`}>
                  <plan.icon className={`h-8 w-8 text-${plan.color}-600`} />
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-gray-600">
                  {plan.description}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300">/mês</span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="pt-4">
                  <Button 
                    className="w-full" 
                    size="lg"
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link href={`/register?plan=${plan.id}`}>
                      {plan.id === 'STARTER' ? 'Começar Grátis' : 'Iniciar Teste'}
                    </Link>
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Sem compromisso • Cancele quando quiser
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Perguntas Frequentes
          </h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Como funciona o período de teste?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Você tem 7 dias para testar todas as funcionalidades sem compromisso. 
                Se não gostar, cancele antes do vencimento e não será cobrado nada.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Posso mudar de plano depois?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. 
                As mudanças são aplicadas imediatamente.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Quais formas de pagamento são aceitas?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Aceitamos todas as principais bandeiras de cartão de crédito e débito. 
                Os pagamentos são processados de forma segura pelo Stripe.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Há desconto para pagamento anual?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Sim! Oferecemos 20% de desconto para pagamentos anuais. 
                Entre em contato para mais informações.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-xl">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Pronto para começar?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Junte-se a centenas de empresários que já transformaram seus negócios
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Button size="lg" asChild>
              <Link href="/register">
                Iniciar Teste Grátis
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/contact">
                Falar com Especialista
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}