import { EventEmitter } from 'events'
import { WebSocket, WebSocketServer } from 'ws'
import { db } from './db'
import { randomUUID } from 'crypto'

export type MessageType = 'text' | 'image' | 'file' | 'system'
export type ChatStatus = 'waiting' | 'active' | 'closed'
export type ParticipantRole = 'user' | 'agent' | 'system'

export interface ChatMessage {
  id: string
  chatId: string
  senderId: string
  senderName: string
  senderRole: ParticipantRole
  content: string
  type: MessageType
  timestamp: Date
  metadata?: any
}

export interface ChatSession {
  id: string
  userId: string
  userName: string
  userEmail: string
  agentId?: string
  agentName?: string
  status: ChatStatus
  subject?: string
  department?: string
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
  closedAt?: Date
  lastActivity: Date
  messages: ChatMessage[]
}

export interface ChatParticipant {
  id: string
  chatId: string
  userId: string
  role: ParticipantRole
  name: string
  email: string
  online: boolean
  joinedAt: Date
  leftAt?: Date
}

export class ChatService extends EventEmitter {
  private static instance: ChatService
  private wss: WebSocketServer | null = null
  private connections: Map<string, WebSocket> = new Map()
  private activeSessions: Map<string, ChatSession> = new Map()
  private agents: Map<string, { id: string; name: string; status: 'online' | 'away' | 'busy' }> = new Map()
  private messageQueue: Map<string, ChatMessage[]> = new Map()

  private constructor() {
    super()
    this.setupDatabase()
  }

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService()
    }
    return ChatService.instance
  }

  async setupDatabase() {
    // Verificar se as tabelas existem, se não, criar
    try {
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          user_name VARCHAR(255) NOT NULL,
          user_email VARCHAR(255) NOT NULL,
          agent_id VARCHAR(36),
          agent_name VARCHAR(255),
          status VARCHAR(50) DEFAULT 'waiting',
          subject VARCHAR(255),
          department VARCHAR(100),
          priority VARCHAR(20) DEFAULT 'medium',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          closed_at TIMESTAMP,
          last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSON
        )
      `

      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id VARCHAR(36) PRIMARY KEY,
          chat_id VARCHAR(36) NOT NULL,
          sender_id VARCHAR(36) NOT NULL,
          sender_name VARCHAR(255) NOT NULL,
          sender_role VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'text',
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSON,
          FOREIGN KEY (chat_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
        )
      `

      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS chat_participants (
          id VARCHAR(36) PRIMARY KEY,
          chat_id VARCHAR(36) NOT NULL,
          user_id VARCHAR(36) NOT NULL,
          role VARCHAR(50) NOT NULL,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          online BOOLEAN DEFAULT false,
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          left_at TIMESTAMP,
          FOREIGN KEY (chat_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
        )
      `
    } catch (error) {
      console.error('Erro ao configurar banco de dados do chat:', error)
    }
  }

  initializeWebSocket(server: any) {
    this.wss = new WebSocketServer({ server })
    
    this.wss.on('connection', (ws: WebSocket, request: any) => {
      const url = new URL(request.url, 'http://localhost')
      const userId = url.searchParams.get('userId')
      const role = url.searchParams.get('role') || 'user'
      
      if (!userId) {
        ws.close(1008, 'User ID required')
        return
      }

      const connectionId = randomUUID()
      this.connections.set(connectionId, ws)

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString())
          await this.handleMessage(connectionId, userId, role as ParticipantRole, message)
        } catch (error) {
          console.error('Erro ao processar mensagem:', error)
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Erro ao processar mensagem'
          }))
        }
      })

      ws.on('close', () => {
        this.connections.delete(connectionId)
        this.updateUserStatus(userId, false)
      })

      ws.on('error', (error) => {
        console.error('WebSocket error:', error)
        this.connections.delete(connectionId)
      })

      // Enviar mensagem de conexão bem-sucedida
      ws.send(JSON.stringify({
        type: 'connected',
        connectionId,
        timestamp: new Date().toISOString()
      }))

      this.updateUserStatus(userId, true)
    })

    console.log('WebSocket server inicializado para chat')
  }

  private async handleMessage(connectionId: string, userId: string, role: ParticipantRole, message: any) {
    const ws = this.connections.get(connectionId)
    if (!ws) return

    switch (message.type) {
      case 'start_chat':
        await this.startChat(userId, message.data, ws)
        break
      case 'send_message':
        await this.sendMessage(userId, role, message.data, ws)
        break
      case 'join_chat':
        await this.joinChat(userId, role, message.chatId, ws)
        break
      case 'leave_chat':
        await this.leaveChat(userId, message.chatId)
        break
      case 'typing':
        await this.handleTyping(userId, message.chatId, message.isTyping)
        break
      case 'get_chat_history':
        await this.getChatHistory(message.chatId, ws)
        break
      case 'close_chat':
        await this.closeChat(userId, message.chatId)
        break
      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Tipo de mensagem não reconhecido'
        }))
    }
  }

  async startChat(userId: string, data: any, ws: WebSocket) {
    try {
      // Buscar informações do usuário
      const user = await db.user.findUnique({
        where: { id: userId },
        include: { company: true }
      })

      if (!user) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Usuário não encontrado'
        }))
        return
      }

      const chatId = randomUUID()
      const session: ChatSession = {
        id: chatId,
        userId,
        userName: user.name,
        userEmail: user.email,
        status: 'waiting',
        subject: data.subject || 'Suporte Geral',
        department: data.department || 'Suporte',
        priority: data.priority || 'medium',
        createdAt: new Date(),
        lastActivity: new Date(),
        messages: []
      }

      // Salvar sessão no banco
      await db.$executeRaw`
        INSERT INTO chat_sessions (id, user_id, user_name, user_email, status, subject, department, priority)
        VALUES (${chatId}, ${userId}, ${user.name}, ${user.email}, 'waiting', ${session.subject}, ${session.department}, ${session.priority})
      `

      // Adicionar participante
      await db.$executeRaw`
        INSERT INTO chat_participants (id, chat_id, user_id, role, name, email, online)
        VALUES (${randomUUID()}, ${chatId}, ${userId}, 'user', ${user.name}, ${user.email}, true)
      `

      this.activeSessions.set(chatId, session)

      // Enviar mensagem de boas-vindas
      const welcomeMessage: ChatMessage = {
        id: randomUUID(),
        chatId,
        senderId: 'system',
        senderName: 'Sistema',
        senderRole: 'system',
        content: `Olá ${user.name}! Bem-vindo ao suporte do LicitaFácil Pro. Um de nossos agentes estará com você em breve.`,
        type: 'text',
        timestamp: new Date()
      }

      await this.saveMessage(welcomeMessage)
      session.messages.push(welcomeMessage)

      // Notificar o usuário
      ws.send(JSON.stringify({
        type: 'chat_started',
        chatId,
        session,
        message: welcomeMessage
      }))

      // Notificar agentes disponíveis
      this.notifyAgents(session)

      this.emit('chat_started', session)

    } catch (error) {
      console.error('Erro ao iniciar chat:', error)
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Erro ao iniciar chat'
      }))
    }
  }

  async sendMessage(userId: string, role: ParticipantRole, data: any, ws: WebSocket) {
    try {
      const { chatId, content, type = 'text' } = data
      const session = this.activeSessions.get(chatId)

      if (!session) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Sessão de chat não encontrada'
        }))
        return
      }

      // Buscar nome do remetente
      const sender = role === 'user' ? 
        await db.user.findUnique({ where: { id: userId } }) :
        await db.user.findUnique({ where: { id: userId } }) // Adaptar para agentes

      if (!sender) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Remetente não encontrado'
        }))
        return
      }

      const message: ChatMessage = {
        id: randomUUID(),
        chatId,
        senderId: userId,
        senderName: sender.name,
        senderRole: role,
        content,
        type,
        timestamp: new Date()
      }

      await this.saveMessage(message)
      session.messages.push(message)
      session.lastActivity = new Date()

      // Atualizar última atividade na sessão
      await db.$executeRaw`
        UPDATE chat_sessions 
        SET last_activity = CURRENT_TIMESTAMP 
        WHERE id = ${chatId}
      `

      // Broadcast para todos os participantes
      this.broadcastToChat(chatId, {
        type: 'new_message',
        message
      })

      this.emit('message_sent', message)

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Erro ao enviar mensagem'
      }))
    }
  }

  async joinChat(userId: string, role: ParticipantRole, chatId: string, ws: WebSocket) {
    try {
      const session = this.activeSessions.get(chatId)
      if (!session) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Sessão de chat não encontrada'
        }))
        return
      }

      // Buscar informações do usuário
      const user = await db.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Usuário não encontrado'
        }))
        return
      }

      // Se for um agente entrando, atualizar a sessão
      if (role === 'agent') {
        session.agentId = userId
        session.agentName = user.name
        session.status = 'active'

        await db.$executeRaw`
          UPDATE chat_sessions 
          SET agent_id = ${userId}, agent_name = ${user.name}, status = 'active'
          WHERE id = ${chatId}
        `

        // Mensagem do sistema informando que o agente entrou
        const systemMessage: ChatMessage = {
          id: randomUUID(),
          chatId,
          senderId: 'system',
          senderName: 'Sistema',
          senderRole: 'system',
          content: `${user.name} entrou no chat`,
          type: 'system',
          timestamp: new Date()
        }

        await this.saveMessage(systemMessage)
        session.messages.push(systemMessage)

        this.broadcastToChat(chatId, {
          type: 'agent_joined',
          agent: { id: userId, name: user.name },
          message: systemMessage
        })
      }

      // Adicionar ou atualizar participante
      await db.$executeRaw`
        INSERT INTO chat_participants (id, chat_id, user_id, role, name, email, online)
        VALUES (${randomUUID()}, ${chatId}, ${userId}, ${role}, ${user.name}, ${user.email}, true)
        ON DUPLICATE KEY UPDATE online = true, left_at = NULL
      `

      // Enviar histórico do chat
      ws.send(JSON.stringify({
        type: 'chat_joined',
        chatId,
        session,
        messages: session.messages
      }))

      this.emit('user_joined', { chatId, userId, role })

    } catch (error) {
      console.error('Erro ao entrar no chat:', error)
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Erro ao entrar no chat'
      }))
    }
  }

  async leaveChat(userId: string, chatId: string) {
    try {
      await db.$executeRaw`
        UPDATE chat_participants 
        SET online = false, left_at = CURRENT_TIMESTAMP
        WHERE chat_id = ${chatId} AND user_id = ${userId}
      `

      this.broadcastToChat(chatId, {
        type: 'user_left',
        userId
      })

      this.emit('user_left', { chatId, userId })

    } catch (error) {
      console.error('Erro ao sair do chat:', error)
    }
  }

  async closeChat(userId: string, chatId: string) {
    try {
      const session = this.activeSessions.get(chatId)
      if (!session) return

      session.status = 'closed'
      session.closedAt = new Date()

      await db.$executeRaw`
        UPDATE chat_sessions 
        SET status = 'closed', closed_at = CURRENT_TIMESTAMP
        WHERE id = ${chatId}
      `

      this.broadcastToChat(chatId, {
        type: 'chat_closed',
        chatId,
        closedBy: userId
      })

      this.activeSessions.delete(chatId)
      this.emit('chat_closed', { chatId, userId })

    } catch (error) {
      console.error('Erro ao fechar chat:', error)
    }
  }

  private async saveMessage(message: ChatMessage) {
    try {
      await db.$executeRaw`
        INSERT INTO chat_messages (id, chat_id, sender_id, sender_name, sender_role, content, type, timestamp)
        VALUES (${message.id}, ${message.chatId}, ${message.senderId}, ${message.senderName}, ${message.senderRole}, ${message.content}, ${message.type}, ${message.timestamp})
      `
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error)
    }
  }

  private broadcastToChat(chatId: string, data: any) {
    // Enviar para todos os participantes conectados do chat
    this.connections.forEach((ws, connectionId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data))
      }
    })
  }

  private notifyAgents(session: ChatSession) {
    // Notificar agentes disponíveis sobre novo chat
    this.agents.forEach((agent, agentId) => {
      if (agent.status === 'online') {
        // Enviar notificação para agente
        this.sendToUser(agentId, {
          type: 'new_chat_request',
          session
        })
      }
    })
  }

  private sendToUser(userId: string, data: any) {
    // Encontrar conexão do usuário e enviar mensagem
    this.connections.forEach((ws, connectionId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data))
      }
    })
  }

  private async handleTyping(userId: string, chatId: string, isTyping: boolean) {
    this.broadcastToChat(chatId, {
      type: 'typing',
      userId,
      isTyping
    })
  }

  private async getChatHistory(chatId: string, ws: WebSocket) {
    try {
      const messages = await db.$queryRaw`
        SELECT * FROM chat_messages 
        WHERE chat_id = ${chatId}
        ORDER BY timestamp ASC
        LIMIT 100
      `

      ws.send(JSON.stringify({
        type: 'chat_history',
        chatId,
        messages
      }))
    } catch (error) {
      console.error('Erro ao buscar histórico:', error)
    }
  }

  private updateUserStatus(userId: string, online: boolean) {
    // Atualizar status do usuário
    this.emit('user_status_changed', { userId, online })
  }

  // Métodos públicos para gerenciamento
  async getActiveSessions(): Promise<ChatSession[]> {
    return Array.from(this.activeSessions.values())
  }

  async getChatStats() {
    try {
      const [totalChats, activeChats, avgResponseTime] = await Promise.all([
        db.$queryRaw`SELECT COUNT(*) as count FROM chat_sessions`,
        db.$queryRaw`SELECT COUNT(*) as count FROM chat_sessions WHERE status = 'active'`,
        db.$queryRaw`
          SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, closed_at)) as avg_time 
          FROM chat_sessions 
          WHERE status = 'closed' AND closed_at IS NOT NULL
        `
      ])

      return {
        totalChats: (totalChats as any)[0]?.count || 0,
        activeChats: (activeChats as any)[0]?.count || 0,
        avgResponseTime: (avgResponseTime as any)[0]?.avg_time || 0
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
      return { totalChats: 0, activeChats: 0, avgResponseTime: 0 }
    }
  }

  async getAgentStats(agentId: string) {
    try {
      const [totalChats, activeChats, avgRating] = await Promise.all([
        db.$queryRaw`SELECT COUNT(*) as count FROM chat_sessions WHERE agent_id = ${agentId}`,
        db.$queryRaw`SELECT COUNT(*) as count FROM chat_sessions WHERE agent_id = ${agentId} AND status = 'active'`,
        db.$queryRaw`
          SELECT AVG(rating) as avg_rating 
          FROM chat_sessions 
          WHERE agent_id = ${agentId} AND rating IS NOT NULL
        `
      ])

      return {
        totalChats: (totalChats as any)[0]?.count || 0,
        activeChats: (activeChats as any)[0]?.count || 0,
        avgRating: (avgRating as any)[0]?.avg_rating || 0
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas do agente:', error)
      return { totalChats: 0, activeChats: 0, avgRating: 0 }
    }
  }
}

export const chatService = ChatService.getInstance()
