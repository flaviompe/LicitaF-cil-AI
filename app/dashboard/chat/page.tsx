import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ChatInterface } from '@/components/chat/chat-interface'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  Users,
  HeadphonesIcon,
  TrendingUp,
  MessageSquare,
  Phone,
  Video
} from 'lucide-react'

export default async function ChatPage() {
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

  // Estatísticas de chat do usuário
  const chatStats = await Promise.all([
    // Total de chats
    db.$queryRaw`
      SELECT COUNT(*) as total
      FROM chat_sessions
      WHERE user_id = ${session.user.id}
    `,
    // Chats ativos
    db.$queryRaw`
      SELECT COUNT(*) as active
      FROM chat_sessions
      WHERE user_id = ${session.user.id} AND status IN ('waiting', 'active')
    `,
    // Tempo médio de resposta
    db.$queryRaw`
      SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, updated_at)) as avg_response
      FROM chat_sessions
      WHERE user_id = ${session.user.id} AND status = 'closed'
    `,
    // Últimas sessões
    db.$queryRaw`
      SELECT s.*, COUNT(m.id) as message_count
      FROM chat_sessions s
      LEFT JOIN chat_messages m ON s.id = m.chat_id
      WHERE s.user_id = ${session.user.id}
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `
  ])

  const totalChats = (chatStats[0] as any)[0]?.total || 0
  const activeChats = (chatStats[1] as any)[0]?.active || 0
  const avgResponse = (chatStats[2] as any)[0]?.avg_response || 0
  const recentSessions = chatStats[3] || []

  const planFeatures = {
    'Starter': {
      maxConcurrentChats: 1,
      chatHistory: 7,
      features: ['Chat básico', 'Suporte por email'],
      priority: 'Padrão'
    },
    'Professional': {
      maxConcurrentChats: 3,
      chatHistory: 30,
      features: ['Chat avançado', 'Chamadas de voz', 'Prioridade média'],
      priority: 'Média'
    },
    'Enterprise': {
      maxConcurrentChats: 10,
      chatHistory: 365,
      features: ['Chat premium', 'Videochamadas', 'Suporte 24/7', 'Prioridade alta'],
      priority: 'Alta'
    }
  }

  const currentFeatures = planFeatures[currentPlan as keyof typeof planFeatures] || planFeatures['Starter']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Chat de Suporte
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Converse com nossa equipe de suporte em tempo real
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            📋 Plano {currentPlan}
          </Badge>
          <Badge variant="outline" className={
            activeChats > 0 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
          }>
            {activeChats > 0 ? `${activeChats} Chat(s) Ativo(s)` : 'Nenhum chat ativo'}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Chats
            </CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalChats}
            </div>
            <div className="text-sm text-muted-foreground">
              Conversas realizadas
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Chats Ativos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeChats}
            </div>
            <div className="text-sm text-muted-foreground">
              Conversas em andamento
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tempo Médio
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(avgResponse)}min
            </div>
            <div className="text-sm text-muted-foreground">
              Tempo de resposta
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Satisfação
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              4.8/5
            </div>
            <div className="text-sm text-muted-foreground">
              Avaliação média
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Features */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <CardHeader>
          <CardTitle className="flex items-center">
            <HeadphonesIcon className="h-5 w-5 mr-2" />
            Recursos do Plano {currentPlan}
          </CardTitle>
          <CardDescription>
            Recursos de suporte disponíveis no seu plano atual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Chats Simultâneos</span>
                <span className="text-sm text-gray-600">
                  {currentFeatures.maxConcurrentChats}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Histórico</span>
                <span className="text-sm text-gray-600">
                  {currentFeatures.chatHistory} dias
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Prioridade</span>
                <Badge variant="outline" className={
                  currentFeatures.priority === 'Alta' ? 'bg-red-100 text-red-800' :
                  currentFeatures.priority === 'Média' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }>
                  {currentFeatures.priority}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium">Recursos Inclusos</span>
                <div className="space-y-1 mt-1">
                  {currentFeatures.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium">Canais de Suporte</span>
                <div className="space-y-2 mt-1">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-600">Chat em tempo real</span>
                  </div>
                  {currentPlan !== 'Starter' && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-600">Chamadas de voz</span>
                    </div>
                  )}
                  {currentPlan === 'Enterprise' && (
                    <div className="flex items-center space-x-2">
                      <Video className="h-4 w-4 text-purple-500" />
                      <span className="text-sm text-gray-600">Videochamadas</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      {(recentSessions as any).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conversas Recentes</CardTitle>
            <CardDescription>
              Suas últimas conversas com o suporte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(recentSessions as any).map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      session.status === 'active' ? 'bg-green-500' :
                      session.status === 'waiting' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`} />
                    <div>
                      <div className="font-medium">{session.subject}</div>
                      <div className="text-sm text-gray-500">
                        {session.department} • {session.message_count} mensagens
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={
                      session.status === 'active' ? 'bg-green-100 text-green-800' :
                      session.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {session.status === 'active' ? 'Ativo' :
                       session.status === 'waiting' ? 'Aguardando' :
                       'Fechado'}
                    </Badge>
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(session.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade CTA */}
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
                    Suporte Avançado
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Acesse chamadas de voz, prioridade média e histórico estendido
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-2">
                  A partir de R$ 97/mês
                </div>
                <Button>
                  Fazer Upgrade
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Chat Interface */}
      <Card className="min-h-[600px]">
        <ChatInterface />
      </Card>
    </div>
  )
}