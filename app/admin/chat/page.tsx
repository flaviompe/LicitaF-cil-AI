import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { AdminChatPanel } from '@/components/chat/admin-chat-panel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  MessageCircle, 
  Clock, 
  Users, 
  TrendingUp,
  HeadphonesIcon,
  AlertCircle,
  CheckCircle,
  Timer,
  Star,
  Activity
} from 'lucide-react'

export default async function AdminChatPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/login')
  }

  const userSession = session.user as { id: string; email: string; name?: string }
  const user = await db.user.findUnique({
    where: { id: userSession.id }
  })

  if (!user || user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  // Estatísticas globais do chat
  const chatStats = await Promise.all([
    // Sessões aguardando
    db.$queryRaw`
      SELECT COUNT(*) as waiting
      FROM chat_sessions
      WHERE status = 'waiting'
    `,
    
    // Sessões ativas
    db.$queryRaw`
      SELECT COUNT(*) as active
      FROM chat_sessions
      WHERE status = 'active'
    `,
    
    // Sessões hoje
    db.$queryRaw`
      SELECT COUNT(*) as today
      FROM chat_sessions
      WHERE DATE(created_at) = CURDATE()
    `,
    
    // Sessões fechadas hoje
    db.$queryRaw`
      SELECT COUNT(*) as closed_today
      FROM chat_sessions
      WHERE status = 'closed' AND DATE(closed_at) = CURDATE()
    `,
    
    // Tempo médio de espera
    db.$queryRaw`
      SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, updated_at)) as avg_wait
      FROM chat_sessions
      WHERE status = 'active' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `,
    
    // Avaliação média
    db.$queryRaw`
      SELECT AVG(rating) as avg_rating, COUNT(*) as rated_count
      FROM chat_sessions
      WHERE rating IS NOT NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `,
    
    // Agentes ativos
    db.$queryRaw`
      SELECT COUNT(DISTINCT agent_id) as active_agents
      FROM chat_sessions
      WHERE agent_id IS NOT NULL AND status = 'active'
    `,
    
    // Taxa de resolução
    db.$queryRaw`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as resolved
      FROM chat_sessions
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `
  ])

  const [
    waitingResult,
    activeResult,
    todayResult,
    closedTodayResult,
    avgWaitResult,
    avgRatingResult,
    activeAgentsResult,
    resolutionResult
  ] = chatStats

  const waiting = (waitingResult as { waiting: number }[])[0]?.waiting || 0
  const active = (activeResult as { active: number }[])[0]?.active || 0
  const today = (todayResult as { today: number }[])[0]?.today || 0
  const closedToday = (closedTodayResult as { closed_today: number }[])[0]?.closed_today || 0
  const avgWait = (avgWaitResult as { avg_wait: number }[])[0]?.avg_wait || 0
  const avgRating = (avgRatingResult as { avg_rating: number; rated_count: number }[])[0]?.avg_rating || 0
  const ratedCount = (avgRatingResult as { avg_rating: number; rated_count: number }[])[0]?.rated_count || 0
  const activeAgents = (activeAgentsResult as { active_agents: number }[])[0]?.active_agents || 0
  const resolutionData = (resolutionResult as { total: number; resolved: number }[])[0]
  const resolutionRate = resolutionData?.total > 0 ? 
    (resolutionData.resolved / resolutionData.total) * 100 : 0

  // Estatísticas por departamento
  const departmentStats = await db.$queryRaw`
    SELECT 
      department,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed,
      AVG(rating) as avg_rating
    FROM chat_sessions
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY department
    ORDER BY total DESC
  `

  // Top agentes
  const topAgents = await db.$queryRaw`
    SELECT 
      u.name as agent_name,
      COUNT(s.id) as total_chats,
      AVG(s.rating) as avg_rating,
      AVG(TIMESTAMPDIFF(MINUTE, s.created_at, s.closed_at)) as avg_duration,
      SUM(CASE WHEN s.status = 'closed' THEN 1 ELSE 0 END) as resolved
    FROM chat_sessions s
    JOIN users u ON s.agent_id = u.id
    WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY s.agent_id, u.name
    ORDER BY total_chats DESC
    LIMIT 5
  ` as { agent_name: string; total_chats: number; avg_rating?: number; avg_duration?: number; resolved: number }[]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Administração do Chat
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gerencie todas as conversas e monitore o desempenho da equipe
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-100 text-green-800">
            {activeAgents} Agente(s) Online
          </Badge>
          <Badge variant="outline" className={
            waiting > 0 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"
          }>
            {waiting} Aguardando
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <Card className={waiting > 0 ? "border-yellow-200 bg-yellow-50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aguardando
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {waiting}
            </div>
            <div className="text-xs text-muted-foreground">
              Chats em fila
            </div>
          </CardContent>
        </Card>

        <Card className={active > 0 ? "border-green-200 bg-green-50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {active}
            </div>
            <div className="text-xs text-muted-foreground">
              Em andamento
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {today}
            </div>
            <div className="text-xs text-muted-foreground">
              Novos chats
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolvidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {closedToday}
            </div>
            <div className="text-xs text-muted-foreground">
              Fechados hoje
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tempo Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(avgWait)}min
            </div>
            <div className="text-xs text-muted-foreground">
              Tempo de espera
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avaliação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">
              {avgRating.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">
              {ratedCount} avaliações
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {waiting > 5 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <div className="font-medium text-red-800">Muitos chats aguardando</div>
                  <div className="text-sm text-red-600">
                    {waiting} usuários estão aguardando atendimento
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {avgWait > 10 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Timer className="h-5 w-5 text-yellow-600" />
                <div>
                  <div className="font-medium text-yellow-800">Tempo de espera alto</div>
                  <div className="text-sm text-yellow-600">
                    Média de {Math.round(avgWait)} minutos
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {resolutionRate < 80 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="font-medium text-orange-800">Taxa de resolução baixa</div>
                  <div className="text-sm text-orange-600">
                    {resolutionRate.toFixed(1)}% dos chats são resolvidos
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Estatísticas por Departamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Departamentos
            </CardTitle>
            <CardDescription>
              Distribuição de chats por departamento (últimos 7 dias)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(departmentStats as { department: string; total: number; waiting: number; active: number; closed: number; avg_rating?: number }[]).map((dept) => (
                <div key={dept.department} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{dept.department}</div>
                    <div className="text-sm text-gray-500">
                      {dept.total} chats • Avaliação: {dept.avg_rating?.toFixed(1) || 'N/A'}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                      {dept.waiting} aguardando
                    </Badge>
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      {dept.active} ativos
                    </Badge>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      {dept.closed} fechados
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Top Agentes
            </CardTitle>
            <CardDescription>
              Agentes com melhor desempenho (últimos 7 dias)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topAgents.map((agent, index: number) => (
                <div key={agent.agent_name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">{agent.agent_name}</div>
                      <div className="text-sm text-gray-500">
                        {agent.total_chats} chats • {agent.resolved} resolvidos
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm">{agent.avg_rating?.toFixed(1) || 'N/A'}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {Math.round(agent.avg_duration || 0)}min
                    </div>
                  </div>
                </div>
              ))}
              
              {!topAgents.length && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Nenhum agente encontrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Admin Panel */}
      <Card className="min-h-[800px]">
        <AdminChatPanel />
      </Card>
    </div>
  )
}