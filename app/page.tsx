import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, CheckCircle, Shield, Zap, BarChart3, Bell, FileText, Users } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-primary rounded-lg p-2">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">LicitaFácil Pro</h1>
          </div>
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
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge className="mb-4" variant="secondary">
          Versão 1.0 - Lançamento Oficial
        </Badge>
        <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
          Transforme sua empresa em um{' '}
          <span className="text-primary">fornecedor público</span>
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
          Sistema completo para pequenos e médios empresários participarem de licitações públicas 
          com facilidade, automação e resultados comprovados.
        </p>
        <div className="flex items-center justify-center space-x-4">
          <Link href="/register">
            <Button size="lg" className="px-8">
              Começar Gratuitamente
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/demo">
            <Button size="lg" variant="outline">
              Ver Demonstração
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Tudo que você precisa para vencer licitações
          </h3>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Funcionalidades completas para empresários do interior
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <Zap className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Automação Inteligente</CardTitle>
              <CardDescription>
                Monitore oportunidades automaticamente em todos os portais oficiais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Compras.gov.br</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">SICAF Federal</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Portais Estaduais</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Portais Municipais</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <Shield className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Gestão de Certidões</CardTitle>
              <CardDescription>
                Controle total de vencimentos e renovações automáticas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Receita Federal</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">FGTS e INSS</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Estadual e Municipal</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Alertas de Vencimento</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <FileText className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Assistente de Propostas</CardTitle>
              <CardDescription>
                Crie propostas profissionais com templates automatizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Templates Legais</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Cálculo Automático</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Documentos Anexos</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Histórico Completo</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <Bell className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Notificações Inteligentes</CardTitle>
              <CardDescription>
                Receba alertas por email, WhatsApp e Telegram
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Novas Oportunidades</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Prazos Importantes</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Resultados</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Alertas Personalizados</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Relatórios e Analytics</CardTitle>
              <CardDescription>
                Acompanhe seu desempenho e melhore seus resultados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Taxa de Sucesso</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Análise de Mercado</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Histórico Financeiro</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Relatórios Customizados</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <Users className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Guia Completo</CardTitle>
              <CardDescription>
                Passo-a-passo para se tornar um fornecedor público
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Formalização</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Cadastros</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Documentação</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Suporte Especializado</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-xl">
          <h3 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Pronto para começar?
          </h3>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Junte-se a centenas de empresários que já transformaram seus negócios
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Link href="/register">
              <Button size="lg" className="px-8">
                Começar Agora - Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline">
                Falar com Especialista
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="bg-primary rounded-lg p-2">
                  <FileText className="h-6 w-6 text-primary-foreground" />
                </div>
                <h4 className="text-xl font-bold">LicitaFácil Pro</h4>
              </div>
              <p className="text-gray-400">
                Transformando pequenos e médios empresários em fornecedores públicos de sucesso.
              </p>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Produto</h5>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/features">Funcionalidades</Link></li>
                <li><Link href="/pricing">Preços</Link></li>
                <li><Link href="/demo">Demonstração</Link></li>
                <li><Link href="/updates">Atualizações</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Suporte</h5>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help">Central de Ajuda</Link></li>
                <li><Link href="/docs">Documentação</Link></li>
                <li><Link href="/training">Treinamentos</Link></li>
                <li><Link href="/contact">Contato</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Empresa</h5>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about">Sobre</Link></li>
                <li><Link href="/blog">Blog</Link></li>
                <li><Link href="/careers">Carreiras</Link></li>
                <li><Link href="/privacy">Privacidade</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 LicitaFácil Pro. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}