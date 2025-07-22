'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  MessageCircle, 
  Clock, 
  User, 
  AlertCircle, 
  CheckCircle, 
  Search,
  Filter,
  MoreVertical,
  PhoneCall,
  Video,
  FileText,
  Star,
  TrendingUp,
  Users,
  MessageSquare,
  Timer
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatSession {
  id: string
  userId: string
  userName: string
  userEmail: string
  agentId?: string
  agentName?: string
  status: 'waiting' | 'active' | 'closed'
  subject: string
  department: string
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
  lastActivity: Date
  messageCount: number
  waitingTime?: number
  rating?: number
}

interface AgentStats {
  totalChats: number
  activeChats: number
  avgResponseTime: number
  avgRating: number
  todayChats: number
  resolvedChats: number
}

export function AdminChatPanel() {
  const { data: session } = useSession()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [agentStats, setAgentStats] = useState<AgentStats>({
    totalChats: 0,
    activeChats: 0,
    avgResponseTime: 0,
    avgRating: 0,
    todayChats: 0,
    resolvedChats: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
    fetchAgentStats()
    
    // Atualizar dados a cada 30 segundos
    const interval = setInterval(() => {
      fetchSessions()
      fetchAgentStats()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/chat/admin/sessions')
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions)
      }
    } catch (error) {
      console.error('Erro ao buscar sessões:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAgentStats = async () => {
    try {
      const response = await fetch('/api/chat/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setAgentStats(data.stats)
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
    }
  }

  const takeChat = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/admin/sessions/${sessionId}/take`, {
        method: 'POST'
      })
      if (response.ok) {
        await fetchSessions()
      }
    } catch (error) {
      console.error('Erro ao assumir chat:', error)
    }
  }

  const closeChat = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/admin/sessions/${sessionId}/close`, {
        method: 'POST'
      })
      if (response.ok) {
        await fetchSessions()
        setSelectedSession(null)
      }
    } catch (error) {
      console.error('Erro ao fechar chat:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800'
      case 'active': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return 'Aguardando'
      case 'active': return 'Ativo'
      case 'closed': return 'Fechado'
      default: return 'Desconhecido'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta'
      case 'medium': return 'Média'
      case 'low': return 'Baixa'
      default: return 'Média'
    }
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const filteredSessions = sessions.filter(session => {
    const matchesStatus = filterStatus === 'all' || session.status === filterStatus
    const matchesPriority = filterPriority === 'all' || session.priority === filterPriority
    const matchesSearch = searchTerm === '' || 
      session.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesPriority && matchesSearch
  })

  const waitingSessions = filteredSessions.filter(s => s.status === 'waiting')
  const activeSessions = filteredSessions.filter(s => s.status === 'active')
  const closedSessions = filteredSessions.filter(s => s.status === 'closed')

  if (!session) {
    return null
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header com Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Chats Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {agentStats.activeChats}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aguardando
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {waitingSessions.length}
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
              {agentStats.todayChats}
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
              {agentStats.resolvedChats}
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
              {formatDuration(agentStats.avgResponseTime)}
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
              {agentStats.avgRating.toFixed(1)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por usuário, assunto ou email..."
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="w-40">
              <Label htmlFor="status">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="waiting">Aguardando</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="closed">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-40">
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Chats */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Aguardando */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-yellow-600" />
              Aguardando ({waitingSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {waitingSessions.map((session) => (
                  <div 
                    key={session.id} 
                    className={cn(
                      'p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors',
                      selectedSession?.id === session.id && 'bg-blue-50 border-blue-200'
                    )}
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {session.userName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{session.userName}</div>
                          <div className="text-xs text-gray-500">{session.userEmail}</div>
                        </div>
                      </div>
                      <Badge className={getPriorityColor(session.priority)}>
                        {getPriorityText(session.priority)}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-700 mb-2">
                      {session.subject}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{session.department}</span>
                      <span>{formatTime(session.createdAt)}</span>
                    </div>
                    
                    <div className="mt-2">
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation()
                          takeChat(session.id)
                        }}
                        className="w-full"
                      >
                        Assumir Chat
                      </Button>
                    </div>
                  </div>
                ))}
                
                {waitingSessions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Nenhum chat aguardando</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Ativos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageCircle className="h-5 w-5 mr-2 text-green-600" />
              Ativos ({activeSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {activeSessions.map((session) => (
                  <div 
                    key={session.id} 
                    className={cn(
                      'p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors',
                      selectedSession?.id === session.id && 'bg-blue-50 border-blue-200'
                    )}
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {session.userName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{session.userName}</div>
                          <div className="text-xs text-gray-500">{session.agentName}</div>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        Ativo
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-700 mb-2">
                      {session.subject}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{session.messageCount} mensagens</span>
                      <span>{formatTime(session.lastActivity)}</span>
                    </div>
                    
                    <div className="mt-2 flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Abrir chat
                        }}
                        className="flex-1"
                      >
                        Abrir Chat
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          closeChat(session.id)
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        Fechar
                      </Button>
                    </div>
                  </div>
                ))}
                
                {activeSessions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Nenhum chat ativo</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Fechados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-red-600" />
              Fechados ({closedSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {closedSessions.map((session) => (
                  <div 
                    key={session.id} 
                    className={cn(
                      'p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors',
                      selectedSession?.id === session.id && 'bg-blue-50 border-blue-200'
                    )}
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {session.userName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{session.userName}</div>
                          <div className="text-xs text-gray-500">{session.agentName}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {session.rating && (
                          <div className="flex items-center">
                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                            <span className="text-xs ml-1">{session.rating}</span>
                          </div>
                        )}
                        <Badge className="bg-red-100 text-red-800">
                          Fechado
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-700 mb-2">
                      {session.subject}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{session.messageCount} mensagens</span>
                      <span>{formatTime(session.createdAt)}</span>
                    </div>
                    
                    <div className="mt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Ver histórico
                        }}
                        className="w-full"
                      >
                        Ver Histórico
                      </Button>
                    </div>
                  </div>
                ))}
                
                {closedSessions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Nenhum chat fechado</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}