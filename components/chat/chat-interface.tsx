'use client';

import { useState, useEffect, useRef } from 'react'
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
import { 
  MessageCircle, 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  FileText,
  Phone,
  Video,
  MoreVertical,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Bot,
  Headphones
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatMessage {
  id: string
  chatId: string
  senderId: string
  senderName: string
  senderRole: 'user' | 'agent' | 'system'
  content: string
  type: 'text' | 'image' | 'file' | 'system'
  timestamp: Date
}

interface ChatSession {
  id: string
  userId: string
  userName: string
  agentId?: string
  agentName?: string
  status: 'waiting' | 'active' | 'closed'
  subject?: string
  department?: string
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
  lastActivity: Date
  messages: ChatMessage[]
}

interface ChatInterfaceProps {
  className?: string
}

export function ChatInterface({ className }: ChatInterfaceProps) {
  const { data: session } = useSession()
  const [chatSession, setChatSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const [typing, setTyping] = useState<string[]>([])
  const [showStartForm, setShowStartForm] = useState(true)
  const [startData, setStartData] = useState({
    subject: '',
    department: 'Suporte',
    priority: 'medium' as 'low' | 'medium' | 'high'
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (session?.user?.id) {
      connectWebSocket()
    }
    
    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [session])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const connectWebSocket = () => {
    if (!session?.user?.id) return

    setConnectionStatus('connecting')
    
    const websocket = new WebSocket(
      `ws://localhost:3000/api/chat/ws?userId=${session.user.id}&role=user`
    )

    websocket.onopen = () => {
      setConnectionStatus('connected')
      setWs(websocket)
    }

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handleWebSocketMessage(data)
    }

    websocket.onclose = () => {
      setConnectionStatus('disconnected')
      setWs(null)
    }

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error)
      setConnectionStatus('disconnected')
    }
  }

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'chat_started':
        setChatSession(data.session)
        setMessages([data.message])
        setShowStartForm(false)
        break
      
      case 'new_message':
        setMessages(prev => [...prev, data.message])
        break
      
      case 'agent_joined':
        setChatSession(prev => prev ? {
          ...prev,
          agentId: data.agent.id,
          agentName: data.agent.name,
          status: 'active'
        } : null)
        setMessages(prev => [...prev, data.message])
        break
      
      case 'chat_closed':
        setChatSession(prev => prev ? { ...prev, status: 'closed' } : null)
        break
      
      case 'typing':
        setTyping(prev => {
          if (data.isTyping) {
            return prev.includes(data.userId) ? prev : [...prev, data.userId]
          } else {
            return prev.filter(id => id !== data.userId)
          }
        })
        break
      
      case 'error':
        console.error('Chat error:', data.message)
        break
    }
  }

  const startChat = () => {
    if (!ws || !session?.user?.id) return

    ws.send(JSON.stringify({
      type: 'start_chat',
      data: startData
    }))
  }

  const sendMessage = () => {
    if (!ws || !newMessage.trim() || !chatSession) return

    ws.send(JSON.stringify({
      type: 'send_message',
      data: {
        chatId: chatSession.id,
        content: newMessage.trim(),
        type: 'text'
      }
    }))

    setNewMessage('')
  }

  const closeChat = () => {
    if (!ws || !chatSession) return

    ws.send(JSON.stringify({
      type: 'close_chat',
      chatId: chatSession.id
    }))
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'text-yellow-600 bg-yellow-100'
      case 'active': return 'text-green-600 bg-green-100'
      case 'closed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return 'Aguardando Atendente'
      case 'active': return 'Chat Ativo'
      case 'closed': return 'Chat Encerrado'
      default: return 'Desconectado'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting': return <Clock className="h-4 w-4" />
      case 'active': return <CheckCircle className="h-4 w-4" />
      case 'closed': return <AlertCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-orange-600 bg-orange-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
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

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Faça login para acessar o chat</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-semibold">Chat de Suporte</h1>
            </div>
            
            {chatSession && (
              <Badge className={cn('flex items-center space-x-1', getStatusColor(chatSession.status))}>
                {getStatusIcon(chatSession.status)}
                <span>{getStatusText(chatSession.status)}</span>
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className={cn(
              'flex items-center space-x-1',
              connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'
            )}>
              <div className={cn(
                'w-2 h-2 rounded-full',
                connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
              )} />
              <span>{connectionStatus === 'connected' ? 'Conectado' : 'Desconectado'}</span>
            </Badge>
            
            {chatSession && (
              <Button
                variant="outline"
                size="sm"
                onClick={closeChat}
                className="text-red-600 hover:text-red-700"
              >
                Encerrar Chat
              </Button>
            )}
          </div>
        </div>
        
        {chatSession && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Assunto:</span>
              <p className="text-gray-600">{chatSession.subject}</p>
            </div>
            <div>
              <span className="font-medium">Departamento:</span>
              <p className="text-gray-600">{chatSession.department}</p>
            </div>
            <div>
              <span className="font-medium">Prioridade:</span>
              <Badge className={cn('ml-2', getPriorityColor(chatSession.priority))}>
                {getPriorityText(chatSession.priority)}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Iniciado em:</span>
              <p className="text-gray-600">{formatDate(chatSession.createdAt)} às {formatTime(chatSession.createdAt)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Chat Content */}
      <div className="flex-1 flex">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {showStartForm && !chatSession ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle className="text-center">Iniciar Chat de Suporte</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="subject">Assunto</Label>
                    <Input
                      id="subject"
                      value={startData.subject}
                      onChange={(e) => setStartData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Descreva brevemente sua dúvida..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="department">Departamento</Label>
                    <Select
                      value={startData.department}
                      onValueChange={(value) => setStartData(prev => ({ ...prev, department: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Suporte">Suporte Técnico</SelectItem>
                        <SelectItem value="Vendas">Vendas</SelectItem>
                        <SelectItem value="Financeiro">Financeiro</SelectItem>
                        <SelectItem value="Comercial">Comercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="priority">Prioridade</Label>
                    <Select
                      value={startData.priority}
                      onValueChange={(value) => setStartData(prev => ({ ...prev, priority: value as 'low' | 'medium' | 'high' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button
                    onClick={startChat}
                    className="w-full"
                    disabled={!startData.subject || connectionStatus !== 'connected'}
                  >
                    {connectionStatus === 'connecting' ? 'Conectando...' : 'Iniciar Chat'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              {/* Messages Area */}
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className={cn(
                      'flex',
                      message.senderRole === 'user' ? 'justify-end' : 'justify-start'
                    )}>
                      <div className={cn(
                        'flex items-start space-x-2 max-w-md',
                        message.senderRole === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                      )}>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={cn(
                            'text-xs',
                            message.senderRole === 'user' ? 'bg-blue-100 text-blue-600' :
                            message.senderRole === 'system' ? 'bg-gray-100 text-gray-600' :
                            'bg-green-100 text-green-600'
                          )}>
                            {message.senderRole === 'user' ? <User className="h-4 w-4" /> :
                             message.senderRole === 'system' ? <Bot className="h-4 w-4" /> :
                             <Headphones className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className={cn(
                          'rounded-lg px-4 py-2 max-w-xs',
                          message.senderRole === 'user'
                            ? 'bg-blue-600 text-white'
                            : message.senderRole === 'system'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-gray-200 text-gray-800'
                        )}>
                          {message.senderRole !== 'user' && message.senderRole !== 'system' && (
                            <div className="font-medium text-xs mb-1">{message.senderName}</div>
                          )}
                          <div className="text-sm">{message.content}</div>
                          <div className={cn(
                            'text-xs mt-1',
                            message.senderRole === 'user' ? 'text-blue-100' : 'text-gray-500'
                          )}>
                            {formatTime(message.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {typing.length > 0 && (
                    <div className="flex justify-start">
                      <div className="flex items-start space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-green-100 text-green-600">
                            <Headphones className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-gray-200 rounded-lg px-4 py-2">
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                            <span className="text-xs text-gray-600">digitando...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              {chatSession && chatSession.status !== 'closed' && (
                <div className="border-t p-4">
                  <div className="flex items-end space-x-2">
                    <div className="flex-1">
                      <Textarea
                        ref={inputRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            sendMessage()
                          }
                        }}
                        placeholder="Digite sua mensagem..."
                        className="min-h-[60px] resize-none"
                        disabled={connectionStatus !== 'connected'}
                      />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={connectionStatus !== 'connected'}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || connectionStatus !== 'connected'}
                        className="h-8 w-8 p-0"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        {chatSession && (
          <div className="w-64 border-l bg-gray-50 p-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Informações do Chat</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">ID:</span>
                    <p className="text-gray-600 font-mono text-xs">{chatSession.id}</p>
                  </div>
                  <div>
                    <span className="font-medium">Usuário:</span>
                    <p className="text-gray-600">{chatSession.userName}</p>
                  </div>
                  {chatSession.agentName && (
                    <div>
                      <span className="font-medium">Atendente:</span>
                      <p className="text-gray-600">{chatSession.agentName}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">Ações Rápidas</h3>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Histórico de Tickets
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Phone className="h-4 w-4 mr-2" />
                    Solicitar Ligação
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Video className="h-4 w-4 mr-2" />
                    Iniciar Videochamada
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}