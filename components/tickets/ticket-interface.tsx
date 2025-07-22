'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Ticket, 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  User, 
  AlertCircle, 
  CheckCircle,
  MessageSquare,
  Paperclip,
  Send,
  Star,
  MoreVertical,
  Tag,
  Calendar as CalendarIcon,
  Timer,
  Users,
  Building
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TicketData {
  id: string
  number: string
  title: string
  description: string
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: 'technical' | 'billing' | 'feature_request' | 'bug_report' | 'general'
  userId: string
  userName: string
  userEmail: string
  assigneeId?: string
  assigneeName?: string
  departmentName?: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
  dueDate?: Date
  satisfactionRating?: number
  messages: TicketMessage[]
}

interface TicketMessage {
  id: string
  authorId: string
  authorName: string
  authorRole: 'user' | 'agent'
  content: string
  isInternal: boolean
  createdAt: Date
  attachments: any[]
}

interface TicketInterfaceProps {
  className?: string
}

export function TicketInterface({ className }: TicketInterfaceProps) {
  const { data: session } = useSession()
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [newMessage, setNewMessage] = useState('')
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    category: 'general' as const,
    departmentId: ''
  })
  const [departments, setDepartments] = useState<any[]>([])
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    waiting: 0,
    resolved: 0,
    closed: 0
  })

  useEffect(() => {
    fetchTickets()
    fetchDepartments()
    fetchStats()
  }, [filterStatus, filterPriority, filterCategory, searchTerm])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (filterStatus !== 'all') params.append('status', filterStatus)
      if (filterPriority !== 'all') params.append('priority', filterPriority)
      if (filterCategory !== 'all') params.append('category', filterCategory)
      if (searchTerm) params.append('search', searchTerm)
      
      const response = await fetch(`/api/tickets?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets)
      }
    } catch (error) {
      console.error('Erro ao buscar tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/tickets/departments')
      if (response.ok) {
        const data = await response.json()
        setDepartments(data.departments)
      }
    } catch (error) {
      console.error('Erro ao buscar departamentos:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/tickets/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
    }
  }

  const createTicket = async () => {
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTicket)
      })
      
      if (response.ok) {
        const data = await response.json()
        setTickets(prev => [data.ticket, ...prev])
        setShowCreateDialog(false)
        setNewTicket({
          title: '',
          description: '',
          priority: 'medium',
          category: 'general',
          departmentId: ''
        })
        fetchStats()
      }
    } catch (error) {
      console.error('Erro ao criar ticket:', error)
    }
  }

  const addMessage = async (ticketId: string) => {
    if (!newMessage.trim()) return
    
    try {
      const response = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage,
          isInternal: false
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setSelectedTicket(prev => prev ? {
          ...prev,
          messages: [...prev.messages, data.message]
        } : null)
        setNewMessage('')
      }
    } catch (error) {
      console.error('Erro ao adicionar mensagem:', error)
    }
  }

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })
      
      if (response.ok) {
        const data = await response.json()
        setTickets(prev => prev.map(ticket => 
          ticket.id === ticketId ? { ...ticket, status: status as any } : ticket
        ))
        setSelectedTicket(prev => prev ? { ...prev, status: status as any } : null)
        fetchStats()
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'waiting_customer': return 'bg-orange-100 text-orange-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Aberto'
      case 'in_progress': return 'Em Progresso'
      case 'waiting_customer': return 'Aguardando Cliente'
      case 'resolved': return 'Resolvido'
      case 'closed': return 'Fechado'
      default: return 'Desconhecido'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgente'
      case 'high': return 'Alta'
      case 'medium': return 'Média'
      case 'low': return 'Baixa'
      default: return 'Média'
    }
  }

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'technical': return 'Técnico'
      case 'billing': return 'Financeiro'
      case 'feature_request': return 'Solicitação de Recurso'
      case 'bug_report': return 'Relatório de Bug'
      case 'general': return 'Geral'
      default: return 'Geral'
    }
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = searchTerm === '' || 
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.number.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Faça login para acessar os tickets</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('h-full flex flex-col space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tickets de Suporte</h1>
          <p className="text-gray-600">Gerencie suas solicitações de suporte</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Descreva brevemente o problema..."
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva detalhadamente o problema..."
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Prioridade</Label>
                  <Select
                    value={newTicket.priority}
                    onValueChange={(value) => setNewTicket(prev => ({ ...prev, priority: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={newTicket.category}
                    onValueChange={(value) => setNewTicket(prev => ({ ...prev, category: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Técnico</SelectItem>
                      <SelectItem value="billing">Financeiro</SelectItem>
                      <SelectItem value="feature_request">Solicitação de Recurso</SelectItem>
                      <SelectItem value="bug_report">Relatório de Bug</SelectItem>
                      <SelectItem value="general">Geral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="department">Departamento</Label>
                <Select
                  value={newTicket.departmentId}
                  onValueChange={(value) => setNewTicket(prev => ({ ...prev, departmentId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={createTicket}
                  disabled={!newTicket.title || !newTicket.description}
                >
                  Criar Ticket
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Abertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Em Progresso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Aguardando</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.waiting}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Resolvidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Fechados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.closed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
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
                  placeholder="Buscar por título, descrição ou número..."
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
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="waiting_customer">Aguardando</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
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
                  <SelectItem value="urgent">Urgente</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-40">
              <Label htmlFor="category">Categoria</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="technical">Técnico</SelectItem>
                  <SelectItem value="billing">Financeiro</SelectItem>
                  <SelectItem value="feature_request">Solicitação</SelectItem>
                  <SelectItem value="bug_report">Bug</SelectItem>
                  <SelectItem value="general">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {filteredTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className={cn(
                        'p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors',
                        selectedTicket?.id === ticket.id && 'bg-blue-50 border-blue-200'
                      )}
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {ticket.number}
                          </Badge>
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {getPriorityText(ticket.priority)}
                          </Badge>
                        </div>
                        <Badge className={getStatusColor(ticket.status)}>
                          {getStatusText(ticket.status)}
                        </Badge>
                      </div>
                      
                      <div className="font-medium text-sm mb-1">{ticket.title}</div>
                      <div className="text-xs text-gray-500 mb-2">
                        {getCategoryText(ticket.category)}
                        {ticket.departmentName && ` • ${ticket.departmentName}`}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatDate(ticket.createdAt)}</span>
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>{ticket.messages?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredTickets.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Ticket className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>Nenhum ticket encontrado</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Ticket Details */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Badge variant="outline">{selectedTicket.number}</Badge>
                      <span>{selectedTicket.title}</span>
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Criado em {formatDate(selectedTicket.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(selectedTicket.status)}>
                      {getStatusText(selectedTicket.status)}
                    </Badge>
                    <Badge className={getPriorityColor(selectedTicket.priority)}>
                      {getPriorityText(selectedTicket.priority)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <Tabs defaultValue="messages" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="messages">Mensagens</TabsTrigger>
                    <TabsTrigger value="details">Detalhes</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="messages" className="space-y-4">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {selectedTicket.messages?.map((message) => (
                          <div
                            key={message.id}
                            className={cn(
                              'flex',
                              message.authorRole === 'user' ? 'justify-end' : 'justify-start'
                            )}
                          >
                            <div className={cn(
                              'flex items-start space-x-2 max-w-md',
                              message.authorRole === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                            )}>
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {message.authorName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div className={cn(
                                'rounded-lg px-4 py-2',
                                message.authorRole === 'user'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-800'
                              )}>
                                <div className="text-sm">{message.content}</div>
                                <div className={cn(
                                  'text-xs mt-1',
                                  message.authorRole === 'user' ? 'text-blue-100' : 'text-gray-500'
                                )}>
                                  {message.authorName} • {formatTime(message.createdAt)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    
                    {selectedTicket.status !== 'closed' && (
                      <div className="flex items-end space-x-2">
                        <div className="flex-1">
                          <Textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Digite sua mensagem..."
                            rows={3}
                          />
                        </div>
                        <Button
                          onClick={() => addMessage(selectedTicket.id)}
                          disabled={!newMessage.trim()}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="details" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Categoria</Label>
                        <p className="text-sm text-gray-600">{getCategoryText(selectedTicket.category)}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Departamento</Label>
                        <p className="text-sm text-gray-600">{selectedTicket.departmentName || 'Não definido'}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Criado por</Label>
                        <p className="text-sm text-gray-600">{selectedTicket.userName}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Atribuído a</Label>
                        <p className="text-sm text-gray-600">{selectedTicket.assigneeName || 'Não atribuído'}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Última atualização</Label>
                        <p className="text-sm text-gray-600">{formatDate(selectedTicket.updatedAt)}</p>
                      </div>
                      
                      {selectedTicket.resolvedAt && (
                        <div>
                          <Label className="text-sm font-medium">Resolvido em</Label>
                          <p className="text-sm text-gray-600">{formatDate(selectedTicket.resolvedAt)}</p>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Descrição</Label>
                      <p className="text-sm text-gray-600 mt-1">{selectedTicket.description}</p>
                    </div>
                    
                    {selectedTicket.tags && selectedTicket.tags.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Tags</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedTicket.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedTicket.status !== 'closed' && (
                      <div className="flex space-x-2">
                        <Select
                          value={selectedTicket.status}
                          onValueChange={(value) => updateTicketStatus(selectedTicket.id, value)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Aberto</SelectItem>
                            <SelectItem value="in_progress">Em Progresso</SelectItem>
                            <SelectItem value="waiting_customer">Aguardando Cliente</SelectItem>
                            <SelectItem value="resolved">Resolvido</SelectItem>
                            <SelectItem value="closed">Fechado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Selecione um ticket para ver os detalhes</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}