'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  Plus, 
  MessageCircle, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  Filter,
  Search
} from 'lucide-react'

interface SupportTicketsProps {
  userId: string
}

export function SupportTickets({ userId }: SupportTicketsProps) {
  const [tickets, setTickets] = useState([
    {
      id: '1',
      title: 'Problema com análise de IA',
      description: 'A análise não está funcionando corretamente',
      status: 'open',
      priority: 'high',
      category: 'technical',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
      responses: [
        {
          id: '1',
          message: 'Olá! Obrigado por entrar em contato. Estamos investigando o problema.',
          author: 'Suporte LicitaFácil',
          createdAt: new Date('2024-01-15')
        }
      ]
    },
    {
      id: '2',
      title: 'Dúvida sobre planos',
      description: 'Gostaria de saber mais sobre o plano Professional',
      status: 'resolved',
      priority: 'medium',
      category: 'billing',
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-12'),
      responses: [
        {
          id: '1',
          message: 'Claro! O plano Professional inclui...',
          author: 'Suporte LicitaFácil',
          createdAt: new Date('2024-01-10')
        }
      ]
    }
  ])

  const [showNewTicket, setShowNewTicket] = useState(false)
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium'
  })
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Aberto'
      case 'in_progress': return 'Em Andamento'
      case 'resolved': return 'Resolvido'
      case 'closed': return 'Fechado'
      default: return 'Desconhecido'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return MessageCircle
      case 'in_progress': return Clock
      case 'resolved': return CheckCircle
      case 'closed': return CheckCircle
      default: return MessageCircle
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low': return 'Baixa'
      case 'medium': return 'Média'
      case 'high': return 'Alta'
      default: return 'Média'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'technical': return 'Técnico'
      case 'billing': return 'Faturamento'
      case 'feature': return 'Recurso'
      case 'bug': return 'Bug'
      case 'question': return 'Pergunta'
      default: return 'Geral'
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const handleCreateTicket = () => {
    if (!newTicket.title.trim() || !newTicket.description.trim() || !newTicket.category) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive'
      })
      return
    }

    const ticket = {
      id: Date.now().toString(),
      title: newTicket.title,
      description: newTicket.description,
      status: 'open',
      priority: newTicket.priority,
      category: newTicket.category,
      createdAt: new Date(),
      updatedAt: new Date(),
      responses: []
    }

    setTickets([ticket, ...tickets])
    setNewTicket({
      title: '',
      description: '',
      category: '',
      priority: 'medium'
    })
    setShowNewTicket(false)

    toast({
      title: 'Ticket Criado',
      description: 'Seu ticket foi criado com sucesso. Responderemos em breve.',
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Pesquisar tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Abertos</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="resolved">Resolvidos</SelectItem>
              <SelectItem value="closed">Fechados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowNewTicket(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Ticket
        </Button>
      </div>

      {/* New Ticket Form */}
      {showNewTicket && (
        <Card>
          <CardHeader>
            <CardTitle>Criar Novo Ticket</CardTitle>
            <CardDescription>
              Descreva seu problema ou dúvida detalhadamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Título *</label>
              <Input
                placeholder="Descreva brevemente o problema"
                value={newTicket.title}
                onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria *</label>
                <Select value={newTicket.category} onValueChange={(value) => setNewTicket({...newTicket, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Técnico</SelectItem>
                    <SelectItem value="billing">Faturamento</SelectItem>
                    <SelectItem value="feature">Solicitação de Recurso</SelectItem>
                    <SelectItem value="bug">Relatar Bug</SelectItem>
                    <SelectItem value="question">Pergunta Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Prioridade</label>
                <Select value={newTicket.priority} onValueChange={(value) => setNewTicket({...newTicket, priority: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição *</label>
              <Textarea
                placeholder="Descreva o problema detalhadamente..."
                value={newTicket.description}
                onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Button onClick={handleCreateTicket}>
                Criar Ticket
              </Button>
              <Button variant="outline" onClick={() => setShowNewTicket(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <MessageCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm || filterStatus !== 'all' ? 'Nenhum ticket encontrado' : 'Nenhum ticket de suporte'}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {searchTerm || filterStatus !== 'all' 
                ? 'Tente ajustar os filtros de pesquisa' 
                : 'Crie um novo ticket para entrar em contato conosco'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => {
            const StatusIcon = getStatusIcon(ticket.status)
            return (
              <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <StatusIcon className="h-5 w-5 text-blue-600" />
                      <div>
                        <CardTitle className="text-lg">{ticket.title}</CardTitle>
                        <CardDescription>
                          #{ticket.id} • {getCategoryLabel(ticket.category)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {getPriorityLabel(ticket.priority)}
                      </Badge>
                      <Badge className={getStatusColor(ticket.status)}>
                        {getStatusLabel(ticket.status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    {ticket.description}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Criado em {formatDate(ticket.createdAt)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>Atualizado em {formatDate(ticket.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>{ticket.responses.length} respostas</span>
                      <Button size="sm" variant="outline">
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>

                  {/* Recent Response */}
                  {ticket.responses.length > 0 && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">
                          {ticket.responses[ticket.responses.length - 1].author}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(ticket.responses[ticket.responses.length - 1].createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {ticket.responses[ticket.responses.length - 1].message}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Support Information */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Tempo de resposta:</strong> Tickets de alta prioridade são respondidos em até 2 horas. 
          Tickets de média e baixa prioridade em até 24 horas durante dias úteis.
        </AlertDescription>
      </Alert>
    </div>
  )
}