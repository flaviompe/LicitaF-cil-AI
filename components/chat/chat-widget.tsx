'use client';

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  MessageCircle, 
  X, 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical,
  Phone,
  Video,
  Info,
  MinusCircle,
  Maximize2,
  Minimize2
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

interface ChatWidgetProps {
  className?: string
}

export function ChatWidget({ className }: ChatWidgetProps) {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [chatSession, setChatSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const [typing, setTyping] = useState<string[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Conectar WebSocket
  useEffect(() => {
    if (session?.user?.id && isOpen) {
      connectWebSocket()
    }
    
    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [session, isOpen])

  // Scroll automático para última mensagem
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Atualizar contador de não lidas
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0)
    }
  }, [isOpen])

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
      case 'connected':
        console.log('WebSocket conectado:', data.connectionId)
        break
      
      case 'chat_started':
        setChatSession(data.session)
        setMessages([data.message])
        break
      
      case 'new_message':
        setMessages(prev => [...prev, data.message])
        if (!isOpen) {
          setUnreadCount(prev => prev + 1)
        }
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

  const startChat = (subject?: string, department?: string, priority?: 'low' | 'medium' | 'high') => {
    if (!ws || !session?.user?.id) return

    ws.send(JSON.stringify({
      type: 'start_chat',
      data: {
        subject: subject || 'Suporte Geral',
        department: department || 'Suporte',
        priority: priority || 'medium'
      }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-500'
      case 'active': return 'bg-green-500'
      case 'closed': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return 'Aguardando'
      case 'active': return 'Ativo'
      case 'closed': return 'Fechado'
      default: return 'Desconectado'
    }
  }

  if (!session) {
    return null
  }

  return (
    <div className={cn('fixed bottom-4 right-4 z-50', className)}>
      {/* Widget Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="relative h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
        >
          <MessageCircle className="h-6 w-6 text-white" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className={cn(
          'w-80 h-96 shadow-xl transition-all duration-300',
          isMinimized ? 'h-14' : 'h-96'
        )}>
          {/* Header */}
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={cn('w-3 h-3 rounded-full', getStatusColor(chatSession?.status || 'disconnected'))} />
                <CardTitle className="text-sm">
                  {chatSession?.agentName || 'Suporte LicitaFácil'}
                </CardTitle>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-8 w-8 p-0"
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {!isMinimized && (
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {getStatusText(chatSession?.status || 'disconnected')}
                  </Badge>
                  {connectionStatus === 'connected' && (
                    <span className="text-green-600">● Online</span>
                  )}
                </div>
                {chatSession?.status === 'active' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeChat}
                    className="h-6 text-xs text-red-600 hover:text-red-700"
                  >
                    Encerrar Chat
                  </Button>
                )}
              </div>
            )}
          </CardHeader>

          {!isMinimized && (
            <CardContent className="p-0 flex flex-col h-full">
              {/* Chat Messages */}
              <ScrollArea className="flex-1 px-4 pb-4">
                {!chatSession ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <MessageCircle className="h-12 w-12 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-4">
                      Inicie uma conversa com nossa equipe de suporte
                    </p>
                    <Button
                      onClick={() => startChat()}
                      className="w-full"
                      disabled={connectionStatus !== 'connected'}
                    >
                      {connectionStatus === 'connecting' ? 'Conectando...' : 'Iniciar Chat'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          'flex',
                          message.senderRole === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-xs px-3 py-2 rounded-lg text-sm',
                            message.senderRole === 'user'
                              ? 'bg-blue-600 text-white'
                              : message.senderRole === 'system'
                              ? 'bg-gray-100 text-gray-600 text-xs'
                              : 'bg-gray-200 text-gray-800'
                          )}
                        >
                          {message.senderRole !== 'user' && message.senderRole !== 'system' && (
                            <div className="font-medium text-xs mb-1">{message.senderName}</div>
                          )}
                          <div>{message.content}</div>
                          <div className={cn(
                            'text-xs mt-1',
                            message.senderRole === 'user' ? 'text-blue-100' : 'text-gray-500'
                          )}>
                            {formatTime(message.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {typing.length > 0 && (
                      <div className="flex justify-start">
                        <div className="bg-gray-200 px-3 py-2 rounded-lg text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                            <span className="text-xs">digitando...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              {chatSession && chatSession.status !== 'closed' && (
                <div className="p-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Input
                      ref={inputRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Digite sua mensagem..."
                      className="flex-1"
                      disabled={connectionStatus !== 'connected'}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || connectionStatus !== 'connected'}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}