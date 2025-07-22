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

  // Sistema de Fila Inteligente de Chat
  private chatQueue: Map<string, { session: ChatSession; waitTime: number; priority: number }> = new Map()
  private botResponses: Map<string, { patterns: RegExp[]; responses: string[] }> = new Map()

  constructor() {
    super()
    this.setupDatabase()
    this.initializeBotResponses()
    this.startQueueProcessor()
  }

  private initializeBotResponses() {
    // Respostas automáticas do bot para perguntas frequentes
    this.botResponses.set('greeting', {
      patterns: [/ol[aá]|oi|bom dia|boa tarde|boa noite/i],
      responses: [
        'Olá! Bem-vindo ao suporte LicitaFácil Pro! Como posso ajudar você hoje?',
        'Oi! Em que posso auxiliá-lo com suas licitações?',
        'Olá! Estou aqui para ajudar com suas dúvidas sobre licitações públicas!'
      ]
    })

    this.botResponses.set('help', {
      patterns: [/ajuda|help|socorro|n[aã]o sei|como/i],
      responses: [
        'Posso ajudá-lo com: 📋 Análise de editais, 💰 Precificação, 📄 Documentação, ⚖️ Questões jurídicas, 🎯 Estratégias de participação. O que você gostaria de saber?',
        'Estou aqui para esclarecer suas dúvidas! Pode me perguntar sobre análise de editais, documentação necessária, prazos, ou qualquer outra questão sobre licitações.',
        'Conte-me sua dúvida! Posso orientá-lo sobre todo o processo licitatório, desde a análise do edital até a submissão da proposta.'
      ]
    })

    this.botResponses.set('documents', {
      patterns: [/document[oa]s?|certid[aã]o|habilitação|regularidade/i],
      responses: [
        '📄 **Documentos para licitações ME/EPP:**\n\n**Habilitação Jurídica:**\n• CNPJ\n• Contrato Social\n• Atas de eleição\n\n**Regularidade Fiscal:**\n• CND Federal\n• CND Estadual\n• CND Municipal\n• FGTS\n• CNDT\n\n**Qualificação Técnica:**\n• Atestados de capacidade\n• Certidões de acervo técnico\n\n**Qualificação Econômica:**\n• Balanço patrimonial\n• Capital social mínimo\n\nPrecisa de help com algum específico?'
      ]
    })

    this.botResponses.set('deadlines', {
      patterns: [/prazo|quando|até quando|data|vencimento/i],
      responses: [
        '⏰ **Prazos importantes:**\n\n• **Impugnação:** Até 3 dias úteis antes da abertura\n• **Esclarecimentos:** Até 3 dias úteis antes da abertura  \n• **Proposta:** Até data/hora da abertura\n• **Recursos:** 3 dias úteis após resultado\n• **Documentação ME/EPP:** Após resultado (se vencedor)\n\nQual prazo específico você quer saber?'
      ]
    })

    this.botResponses.set('pricing', {
      patterns: [/preço|valor|custo|precificação|proposta comercial/i],
      responses: [
        '💰 **Dicas de Precificação:**\n\n• Use nossa IA para análise de preços históricos\n• ME/EPP: Considere empate ficto (até 10% acima)\n• Inclua todos os custos: materiais, mão de obra, impostos\n• Margem recomendada: 8-15% dependendo da complexidade\n• Sempre valide com nossa ferramenta de precificação inteligente!\n\nQuer fazer uma análise de preços agora?'
      ]
    })

    this.botResponses.set('legal', {
      patterns: [/lei|legal|jurídico|recurso|impugnação|lc 123|14\.133|8\.666/i],
      responses: [
        '⚖️ **Questões Jurídicas:**\n\n**Principais leis:**\n• Lei 14.133/2021 (Nova Lei de Licitações)\n• LC 123/2006 (Estatuto ME/EPP)\n• Lei 10.520/2002 (Pregão)\n\n**Benefícios ME/EPP:**\n• Empate ficto até 10%\n• Documentação posterior\n• Parcelamento de lotes\n\n**Recursos disponíveis:**\n• Impugnação de edital\n• Recurso administrativo\n• Nossa IA jurídica pode analisar seu caso!\n\nPrecisa de análise jurídica específica?'
      ]
    })

    this.botResponses.set('goodbye', {
      patterns: [/tchau|adeus|obrigad[oa]|valeu|até logo|bye/i],
      responses: [
        'Foi um prazer ajudar! 😊 Sempre que precisar de suporte com licitações, estarei aqui. Boa sorte em suas participações!',
        'Obrigado por usar nosso suporte! Continue aproveitando todas as funcionalidades do LicitaFácil Pro. Até mais!',
        'Espero ter ajudado! Lembre-se: nossa IA está sempre disponível 24/7 para análises jurídicas. Sucesso nas suas licitações! 🎯'
      ]
    })
  }

  private startQueueProcessor() {
    // Processa fila de chat a cada 30 segundos
    setInterval(() => {
      this.processQueue()
    }, 30000)
  }

  private async processQueue() {
    const queuedChats = Array.from(this.chatQueue.entries())
      .sort(([, a], [, b]) => {
        // Prioridade: ALTA > MÉDIA > BAIXA
        // Tempo de espera: mais tempo = maior prioridade
        const priorityDiff = b.priority - a.priority
        if (priorityDiff !== 0) return priorityDiff
        return b.waitTime - a.waitTime
      })

    for (const [chatId, queueItem] of queuedChats) {
      const availableAgent = await this.findAvailableAgent(queueItem.session.department)
      
      if (availableAgent) {
        // Remover da fila
        this.chatQueue.delete(chatId)
        
        // Atribuir agente
        await this.assignAgent(chatId, availableAgent.id)
        
        // Notificar usuário
        this.broadcastToChat(chatId, {
          type: 'agent_assigned',
          agent: availableAgent,
          waitTime: queueItem.waitTime
        })
      } else {
        // Incrementar tempo de espera
        queueItem.waitTime += 30
        
        // Se esperando muito tempo (> 5 min), enviar update
        if (queueItem.waitTime > 300 && queueItem.waitTime % 300 === 0) {
          this.broadcastToChat(chatId, {
            type: 'queue_update',
            position: this.getQueuePosition(chatId),
            estimatedWait: this.getEstimatedWaitTime()
          })
        }
      }
    }
  }

  private async findAvailableAgent(department?: string): Promise<{ id: string; name: string } | null> {
    // Buscar agente disponível por departamento
    const availableAgents = Array.from(this.agents.entries())
      .filter(([id, agent]) => agent.status === 'online')
      .map(([id, agent]) => ({ id, ...agent }))

    if (availableAgents.length === 0) return null

    // Por enquanto, retorna o primeiro disponível
    // TODO: Implementar lógica de balanceamento de carga
    return availableAgents[0]
  }

  private async assignAgent(chatId: string, agentId: string) {
    const session = this.activeSessions.get(chatId)
    if (!session) return

    const agent = this.agents.get(agentId)
    if (!agent) return

    session.agentId = agentId
    session.agentName = agent.name
    session.status = 'active'

    await db.$executeRaw`
      UPDATE chat_sessions 
      SET agent_id = ${agentId}, agent_name = ${agent.name}, status = 'active'
      WHERE id = ${chatId}
    `

    // Atualizar status do agente para busy
    agent.status = 'busy'
  }

  private getQueuePosition(chatId: string): number {
    const sortedQueue = Array.from(this.chatQueue.entries())
      .sort(([, a], [, b]) => b.priority - a.priority || b.waitTime - a.waitTime)
    
    return sortedQueue.findIndex(([id]) => id === chatId) + 1
  }

  private getEstimatedWaitTime(): number {
    // Estimativa baseada no número de pessoas na fila e agentes disponíveis
    const queueLength = this.chatQueue.size
    const availableAgents = Array.from(this.agents.values())
      .filter(agent => agent.status === 'online').length

    if (availableAgents === 0) return 10 * 60 // 10 minutos se não há agentes

    return Math.ceil(queueLength / availableAgents) * 3 * 60 // 3 min por chat
  }

  // Sistema de Bot Inteligente
  private async processBotResponse(message: ChatMessage): Promise<ChatMessage | null> {
    const content = message.content.toLowerCase()
    
    // Procurar por padrões conhecidos
    for (const [category, { patterns, responses }] of this.botResponses) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          const randomResponse = responses[Math.floor(Math.random() * responses.length)]
          
          return {
            id: randomUUID(),
            chatId: message.chatId,
            senderId: 'bot',
            senderName: '🤖 LicitaBot',
            senderRole: 'system',
            content: randomResponse,
            type: 'text',
            timestamp: new Date()
          }
        }
      }
    }

    // Se não encontrou padrão, usar IA para resposta contextual
    return await this.generateAIResponse(message)
  }

  private async generateAIResponse(message: ChatMessage): Promise<ChatMessage | null> {
    // Integração com IA jurídica para respostas contextuais
    try {
      // TODO: Integrar com sistema de IA jurídica existente
      const aiResponse = await this.getAIResponse(message.content)
      
      if (aiResponse) {
        return {
          id: randomUUID(),
          chatId: message.chatId,
          senderId: 'ai-assistant',
          senderName: '🧠 IA Jurídica',
          senderRole: 'system',
          content: `**Resposta da IA Jurídica:**\n\n${aiResponse}\n\n*Se precisar de mais detalhes, um especialista humano pode ajudar!*`,
          type: 'text',
          timestamp: new Date()
        }
      }
    } catch (error) {
      console.error('Erro ao gerar resposta da IA:', error)
    }

    return null
  }

  private async getAIResponse(query: string): Promise<string | null> {
    // Placeholder - integrar com IA jurídica real
    if (query.includes('me/epp') || query.includes('micro') || query.includes('pequena')) {
      return 'Como ME/EPP, você tem direito a benefícios especiais:\n\n• **Empate Ficto:** Pode cobrir propostas até 10% acima da sua\n• **Documentação Posterior:** Entrega documentos só se ganhar\n• **Preferência de Contratação:** Em caso de empate real\n\nEsses benefícios estão garantidos pela LC 123/2006. Quer que eu analise uma oportunidade específica?'
    }

    if (query.includes('prazo') || query.includes('recurso')) {
      return 'Prazos para recursos em licitações:\n\n• **Pregão:** 3 dias úteis após resultado\n• **Concorrência:** 5 dias úteis (inabilitação) ou 5 dias úteis (classificação)\n• **Tomada de Preços:** 5 dias úteis\n\n⚠️ **Importante:** Prazos contam apenas dias úteis e começam no dia seguinte à publicação do resultado.'
    }

    return null
  }

  // Override do método sendMessage para incluir bot responses
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

      // Se for mensagem do usuário e não há agente, tentar resposta do bot
      if (role === 'user' && !session.agentId) {
        const botResponse = await this.processBotResponse(message)
        
        if (botResponse) {
          await this.saveMessage(botResponse)
          session.messages.push(botResponse)
          
          // Broadcast resposta do bot
          this.broadcastToChat(chatId, {
            type: 'new_message',
            message: botResponse
          })

          // Se resposta do bot sugere agente humano, adicionar à fila
          if (botResponse.content.includes('especialista humano') || 
              botResponse.content.includes('agente pode ajudar')) {
            await this.addToQueue(session)
          }
        } else {
          // Se não há resposta do bot, adicionar diretamente à fila
          await this.addToQueue(session)
        }
      }

      this.emit('message_sent', message)

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Erro ao enviar mensagem'
      }))
    }
  }

  private async addToQueue(session: ChatSession) {
    if (this.chatQueue.has(session.id)) return // Já está na fila

    const priorityMap = { high: 3, medium: 2, low: 1 }
    
    this.chatQueue.set(session.id, {
      session,
      waitTime: 0,
      priority: priorityMap[session.priority] || 2
    })

    // Notificar usuário sobre posição na fila
    this.broadcastToChat(session.id, {
      type: 'added_to_queue',
      position: this.getQueuePosition(session.id),
      estimatedWait: this.getEstimatedWaitTime()
    })

    // Mensagem do sistema
    const queueMessage: ChatMessage = {
      id: randomUUID(),
      chatId: session.id,
      senderId: 'system',
      senderName: 'Sistema',
      senderRole: 'system',
      content: `Você foi adicionado à fila de atendimento. Posição: ${this.getQueuePosition(session.id)}. Tempo estimado: ${Math.ceil(this.getEstimatedWaitTime() / 60)} minutos.`,
      type: 'system',
      timestamp: new Date()
    }

    await this.saveMessage(queueMessage)
    session.messages.push(queueMessage)
  }

  // Métodos para controle de agentes
  async registerAgent(agentId: string, name: string, departments: string[] = []) {
    this.agents.set(agentId, {
      id: agentId,
      name,
      status: 'online'
    })

    this.emit('agent_registered', { agentId, name, departments })
  }

  async updateAgentStatus(agentId: string, status: 'online' | 'away' | 'busy') {
    const agent = this.agents.get(agentId)
    if (agent) {
      agent.status = status
      this.emit('agent_status_changed', { agentId, status })
    }
  }

  async getQueueStats() {
    return {
      totalInQueue: this.chatQueue.size,
      averageWaitTime: this.getEstimatedWaitTime(),
      onlineAgents: Array.from(this.agents.values()).filter(a => a.status === 'online').length,
      busyAgents: Array.from(this.agents.values()).filter(a => a.status === 'busy').length
    }
  }

  // Analytics avançadas
  async getChatAnalytics(startDate?: Date, endDate?: Date) {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const end = endDate || new Date()

      const [
        totalChats,
        resolvedChats,
        avgResponseTime,
        avgSessionDuration,
        botResponseRate,
        customerSatisfaction
      ] = await Promise.all([
        db.$queryRaw`SELECT COUNT(*) as count FROM chat_sessions WHERE created_at >= ${start} AND created_at <= ${end}`,
        db.$queryRaw`SELECT COUNT(*) as count FROM chat_sessions WHERE status = 'closed' AND created_at >= ${start} AND created_at <= ${end}`,
        db.$queryRaw`
          SELECT AVG(TIMESTAMPDIFF(SECOND, created_at, 
            (SELECT MIN(timestamp) FROM chat_messages 
             WHERE chat_id = chat_sessions.id AND sender_role = 'agent')
          )) as avg_time
          FROM chat_sessions 
          WHERE created_at >= ${start} AND created_at <= ${end} AND agent_id IS NOT NULL
        `,
        db.$queryRaw`
          SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, closed_at)) as avg_duration
          FROM chat_sessions 
          WHERE status = 'closed' AND created_at >= ${start} AND created_at <= ${end}
        `,
        db.$queryRaw`
          SELECT 
            (SELECT COUNT(*) FROM chat_messages WHERE sender_role = 'system' AND timestamp >= ${start} AND timestamp <= ${end}) /
            (SELECT COUNT(*) FROM chat_messages WHERE timestamp >= ${start} AND timestamp <= ${end}) * 100 as bot_rate
        `,
        db.$queryRaw`
          SELECT AVG(rating) as avg_rating 
          FROM chat_sessions 
          WHERE rating IS NOT NULL AND created_at >= ${start} AND created_at <= ${end}
        `
      ])

      return {
        period: { start, end },
        totalChats: (totalChats as any)[0]?.count || 0,
        resolvedChats: (resolvedChats as any)[0]?.count || 0,
        resolutionRate: ((resolvedChats as any)[0]?.count || 0) / Math.max((totalChats as any)[0]?.count || 1, 1) * 100,
        avgResponseTime: (avgResponseTime as any)[0]?.avg_time || 0,
        avgSessionDuration: (avgSessionDuration as any)[0]?.avg_duration || 0,
        botResponseRate: (botResponseRate as any)[0]?.bot_rate || 0,
        customerSatisfaction: (customerSatisfaction as any)[0]?.avg_rating || 0
      }
    } catch (error) {
      console.error('Erro ao buscar analytics do chat:', error)
      return {
        period: { start: new Date(), end: new Date() },
        totalChats: 0,
        resolvedChats: 0,
        resolutionRate: 0,
        avgResponseTime: 0,
        avgSessionDuration: 0,
        botResponseRate: 0,
        customerSatisfaction: 0
      }
    }
  }
}

export const chatService = ChatService.getInstance()