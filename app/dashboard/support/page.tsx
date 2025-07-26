import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { SupportTickets } from '@/components/support/support-tickets'
import { SupportResources } from '@/components/support/support-resources'
import { ContactSupport } from '@/components/support/contact-support'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  MessageCircle, 
  Phone, 
  Mail, 
  Book, 
  Video,
  FileText,
  HeadphonesIcon,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

export default async function SupportPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/login')
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      company: true
      // TODO: Adicionar subscriptions quando o modelo for criado no schema
    }
  })

  if (!user) {
    redirect('/login')
  }

  // TODO: Implementar lógica real de planos quando o modelo subscription for criado
  const currentPlan = 'Professional' // Mock temporário

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Central de Suporte
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Encontre ajuda, documentação e entre em contato conosco
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-100 text-green-800">
            ✅ Suporte Ativo
          </Badge>
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            📋 Plano {currentPlan}
          </Badge>
        </div>
      </div>

      {/* Quick Help Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
              <MessageCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-lg">Chat ao Vivo</CardTitle>
            <CardDescription>
              Fale conosco em tempo real
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button className="w-full">
              <MessageCircle className="h-4 w-4 mr-2" />
              Iniciar Chat
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Disponível 24/7
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
              <Phone className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-lg">Telefone</CardTitle>
            <CardDescription>
              Suporte via telefone
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" className="w-full">
              <Phone className="h-4 w-4 mr-2" />
              (11) 99999-9999
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Seg-Sex 8h às 18h
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-4">
              <Mail className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle className="text-lg">Email</CardTitle>
            <CardDescription>
              Envie sua dúvida por email
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              Enviar Email
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Resposta em até 2h
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Support Status */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Todos os Sistemas Operacionais
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Plataforma funcionando normalmente
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-green-600">
                99.9% Uptime
              </div>
              <div className="text-xs text-gray-500">
                Últimas 24h
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tickets" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Meus Tickets
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center">
            <Book className="h-4 w-4 mr-2" />
            Recursos
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center">
            <HeadphonesIcon className="h-4 w-4 mr-2" />
            Contato
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center">
            <Video className="h-4 w-4 mr-2" />
            Treinamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4">
          <SupportTickets userId={session.user.id} />
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <SupportResources />
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <ContactSupport user={user} />
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Video className="h-5 w-5 mr-2" />
                  Treinamentos em Vídeo
                </CardTitle>
                <CardDescription>
                  Aprenda a usar todas as funcionalidades
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Primeiros Passos</div>
                      <div className="text-sm text-gray-500">15 min</div>
                    </div>
                    <Button size="sm" variant="outline">
                      Assistir
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Gestão de Certidões</div>
                      <div className="text-sm text-gray-500">12 min</div>
                    </div>
                    <Button size="sm" variant="outline">
                      Assistir
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Criando Propostas</div>
                      <div className="text-sm text-gray-500">20 min</div>
                    </div>
                    <Button size="sm" variant="outline">
                      Assistir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Sessões ao Vivo
                </CardTitle>
                <CardDescription>
                  Participe de treinamentos personalizados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                      <Video className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      Agende uma Sessão
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Treinamento personalizado com um especialista
                    </p>
                    <Button>
                      Agendar Treinamento
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Premium Support CTA */}
      {currentPlan === 'Starter' && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-purple-100 p-3 rounded-full">
                  <HeadphonesIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Suporte Premium
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Acesso prioritário, gerente de conta dedicado e suporte 24/7
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
    </div>
  )
}