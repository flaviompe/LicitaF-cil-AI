import { EventEmitter } from 'events'
import { db } from './db'
import { randomUUID } from 'crypto'

export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketCategory = 'technical' | 'billing' | 'feature_request' | 'bug_report' | 'general'

export interface TicketAttachment {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  uploadedAt: Date
}

export interface TicketMessage {
  id: string
  ticketId: string
  authorId: string
  authorName: string
  authorRole: 'user' | 'agent' | 'system'
  content: string
  isInternal: boolean
  attachments: TicketAttachment[]
  createdAt: Date
  updatedAt: Date
}

export interface Ticket {
  id: string
  number: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  category: TicketCategory
  userId: string
  userName: string
  userEmail: string
  assigneeId?: string
  assigneeName?: string
  departmentId?: string
  departmentName?: string
  tags: string[]
  customFields: Record<string, any>
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
  closedAt?: Date
  firstResponseAt?: Date
  lastActivityAt: Date
  dueDate?: Date
  estimatedHours?: number
  actualHours?: number
  satisfactionRating?: number
  satisfactionComment?: string
  messages: TicketMessage[]
  attachments: TicketAttachment[]
  linkedTickets: string[]
  sourceChannel: 'web' | 'email' | 'chat' | 'phone' | 'api'
  metadata: Record<string, any>
}

export interface TicketFilter {
  status?: TicketStatus[]
  priority?: TicketPriority[]
  category?: TicketCategory[]
  assigneeId?: string
  userId?: string
  departmentId?: string
  tags?: string[]
  search?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

export interface TicketStats {
  total: number
  open: number
  inProgress: number
  waiting: number
  resolved: number
  closed: number
  avgResolutionTime: number
  avgFirstResponseTime: number
  satisfactionScore: number
  totalSatisfactionRatings: number
  overdueCount: number
  todayCreated: number
  todayResolved: number
}

export class TicketService extends EventEmitter {
  private static instance: TicketService
  private autoNumberCounter: number = 1

  private constructor() {
    super()
    this.setupDatabase()
    this.initializeAutoNumber()
  }

  static getInstance(): TicketService {
    if (!TicketService.instance) {
      TicketService.instance = new TicketService()
    }
    return TicketService.instance
  }

  async setupDatabase() {
    try {
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS tickets (
          id VARCHAR(36) PRIMARY KEY,
          number VARCHAR(20) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(50) DEFAULT 'open',
          priority VARCHAR(50) DEFAULT 'medium',
          category VARCHAR(50) DEFAULT 'general',
          user_id VARCHAR(36) NOT NULL,
          user_name VARCHAR(255) NOT NULL,
          user_email VARCHAR(255) NOT NULL,
          assignee_id VARCHAR(36),
          assignee_name VARCHAR(255),
          department_id VARCHAR(36),
          department_name VARCHAR(100),
          tags JSON,
          custom_fields JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          resolved_at TIMESTAMP,
          closed_at TIMESTAMP,
          first_response_at TIMESTAMP,
          last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          due_date TIMESTAMP,
          estimated_hours DECIMAL(5,2),
          actual_hours DECIMAL(5,2),
          satisfaction_rating INT,
          satisfaction_comment TEXT,
          linked_tickets JSON,
          source_channel VARCHAR(50) DEFAULT 'web',
          metadata JSON,
          INDEX idx_status (status),
          INDEX idx_priority (priority),
          INDEX idx_category (category),
          INDEX idx_user_id (user_id),
          INDEX idx_assignee_id (assignee_id),
          INDEX idx_created_at (created_at),
          INDEX idx_updated_at (updated_at)
        )
      `

      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS ticket_messages (
          id VARCHAR(36) PRIMARY KEY,
          ticket_id VARCHAR(36) NOT NULL,
          author_id VARCHAR(36) NOT NULL,
          author_name VARCHAR(255) NOT NULL,
          author_role VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          is_internal BOOLEAN DEFAULT false,
          attachments JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
          INDEX idx_ticket_id (ticket_id),
          INDEX idx_created_at (created_at)
        )
      `

      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS ticket_attachments (
          id VARCHAR(36) PRIMARY KEY,
          ticket_id VARCHAR(36) NOT NULL,
          message_id VARCHAR(36),
          filename VARCHAR(255) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          mime_type VARCHAR(100) NOT NULL,
          size INT NOT NULL,
          url VARCHAR(500) NOT NULL,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
          FOREIGN KEY (message_id) REFERENCES ticket_messages(id) ON DELETE CASCADE,
          INDEX idx_ticket_id (ticket_id),
          INDEX idx_message_id (message_id)
        )
      `

      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS ticket_history (
          id VARCHAR(36) PRIMARY KEY,
          ticket_id VARCHAR(36) NOT NULL,
          user_id VARCHAR(36) NOT NULL,
          user_name VARCHAR(255) NOT NULL,
          action VARCHAR(100) NOT NULL,
          field_name VARCHAR(100),
          old_value TEXT,
          new_value TEXT,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
          INDEX idx_ticket_id (ticket_id),
          INDEX idx_created_at (created_at)
        )
      `

      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS ticket_departments (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          email VARCHAR(255),
          auto_assign BOOLEAN DEFAULT false,
          default_assignee_id VARCHAR(36),
          sla_hours INT DEFAULT 24,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `

      // Criar departamentos padrão
      await db.$executeRaw`
        INSERT IGNORE INTO ticket_departments (id, name, description, sla_hours)
        VALUES 
          ('${randomUUID()}', 'Suporte Técnico', 'Problemas técnicos e dúvidas sobre o sistema', 24),
          ('${randomUUID()}', 'Comercial', 'Vendas, planos e questões comerciais', 12),
          ('${randomUUID()}', 'Financeiro', 'Pagamentos, faturas e questões financeiras', 48),
          ('${randomUUID()}', 'Geral', 'Outras questões e suporte geral', 24)
      `
    } catch (error) {
      console.error('Erro ao configurar banco de dados dos tickets:', error)
    }
  }

  async initializeAutoNumber() {
    try {
      const result = await db.$queryRaw`
        SELECT MAX(CAST(SUBSTRING(number, 2) AS UNSIGNED)) as max_number 
        FROM tickets 
        WHERE number LIKE 'T%'
      `
      
      const maxNumber = (result as any)[0]?.max_number || 0
      this.autoNumberCounter = maxNumber + 1
    } catch (error) {
      console.error('Erro ao inicializar numeração automática:', error)
    }
  }

  private generateTicketNumber(): string {
    const number = `T${String(this.autoNumberCounter).padStart(6, '0')}`
    this.autoNumberCounter++
    return number
  }

  async createTicket(data: {
    title: string
    description: string
    priority: TicketPriority
    category: TicketCategory
    userId: string
    userName: string
    userEmail: string
    departmentId?: string
    tags?: string[]
    customFields?: Record<string, any>
    dueDate?: Date
    estimatedHours?: number
    sourceChannel?: 'web' | 'email' | 'chat' | 'phone' | 'api'
    attachments?: TicketAttachment[]
  }): Promise<Ticket> {
    try {
      const ticketId = randomUUID()
      const ticketNumber = this.generateTicketNumber()
      
      // Buscar departamento se especificado
      let departmentName = undefined
      if (data.departmentId) {
        const department = await db.$queryRaw`
          SELECT name FROM ticket_departments WHERE id = ${data.departmentId}
        `
        departmentName = (department as any)[0]?.name
      }

      // Criar ticket
      await db.$executeRaw`
        INSERT INTO tickets (
          id, number, title, description, priority, category, user_id, user_name, user_email,
          department_id, department_name, tags, custom_fields, due_date, estimated_hours,
          source_channel, metadata
        ) VALUES (
          ${ticketId}, ${ticketNumber}, ${data.title}, ${data.description}, ${data.priority},
          ${data.category}, ${data.userId}, ${data.userName}, ${data.userEmail},
          ${data.departmentId || null}, ${departmentName || null}, ${JSON.stringify(data.tags || [])},
          ${JSON.stringify(data.customFields || {})}, ${data.dueDate || null}, ${data.estimatedHours || null},
          ${data.sourceChannel || 'web'}, ${JSON.stringify({})}
        )
      `

      // Criar mensagem inicial
      const initialMessageId = randomUUID()
      await db.$executeRaw`
        INSERT INTO ticket_messages (id, ticket_id, author_id, author_name, author_role, content, is_internal)
        VALUES (${initialMessageId}, ${ticketId}, ${data.userId}, ${data.userName}, 'user', ${data.description}, false)
      `

      // Adicionar anexos se houver
      if (data.attachments && data.attachments.length > 0) {
        for (const attachment of data.attachments) {
          await db.$executeRaw`
            INSERT INTO ticket_attachments (id, ticket_id, message_id, filename, original_name, mime_type, size, url)
            VALUES (${attachment.id}, ${ticketId}, ${initialMessageId}, ${attachment.filename}, ${attachment.originalName}, ${attachment.mimeType}, ${attachment.size}, ${attachment.url})
          `
        }
      }

      // Registrar no histórico
      await db.$executeRaw`
        INSERT INTO ticket_history (id, ticket_id, user_id, user_name, action, description)
        VALUES (${randomUUID()}, ${ticketId}, ${data.userId}, ${data.userName}, 'created', 'Ticket criado')
      `

      // Buscar ticket criado
      const ticket = await this.getTicketById(ticketId)
      
      if (ticket) {
        this.emit('ticket_created', ticket)
        
        // Auto-assign se configurado
        await this.autoAssignTicket(ticket)
        
        return ticket
      }
      
      throw new Error('Erro ao criar ticket')
    } catch (error) {
      console.error('Erro ao criar ticket:', error)
      throw error
    }
  }

  async getTicketById(id: string): Promise<Ticket | null> {
    try {
      const tickets = await db.$queryRaw`
        SELECT * FROM tickets WHERE id = ${id}
      `
      
      if (!(tickets as any).length) {
        return null
      }
      
      const ticketData = (tickets as any)[0]
      
      // Buscar mensagens
      const messages = await db.$queryRaw`
        SELECT * FROM ticket_messages 
        WHERE ticket_id = ${id} 
        ORDER BY created_at ASC
      `
      
      // Buscar anexos
      const attachments = await db.$queryRaw`
        SELECT * FROM ticket_attachments 
        WHERE ticket_id = ${id}
      `
      
      return {
        id: ticketData.id,
        number: ticketData.number,
        title: ticketData.title,
        description: ticketData.description,
        status: ticketData.status,
        priority: ticketData.priority,
        category: ticketData.category,
        userId: ticketData.user_id,
        userName: ticketData.user_name,
        userEmail: ticketData.user_email,
        assigneeId: ticketData.assignee_id,
        assigneeName: ticketData.assignee_name,
        departmentId: ticketData.department_id,
        departmentName: ticketData.department_name,
        tags: JSON.parse(ticketData.tags || '[]'),
        customFields: JSON.parse(ticketData.custom_fields || '{}'),
        createdAt: ticketData.created_at,
        updatedAt: ticketData.updated_at,
        resolvedAt: ticketData.resolved_at,
        closedAt: ticketData.closed_at,
        firstResponseAt: ticketData.first_response_at,
        lastActivityAt: ticketData.last_activity_at,
        dueDate: ticketData.due_date,
        estimatedHours: ticketData.estimated_hours,
        actualHours: ticketData.actual_hours,
        satisfactionRating: ticketData.satisfaction_rating,
        satisfactionComment: ticketData.satisfaction_comment,
        linkedTickets: JSON.parse(ticketData.linked_tickets || '[]'),
        sourceChannel: ticketData.source_channel,
        metadata: JSON.parse(ticketData.metadata || '{}'),
        messages: (messages as any).map((msg: any) => ({
          id: msg.id,
          ticketId: msg.ticket_id,
          authorId: msg.author_id,
          authorName: msg.author_name,
          authorRole: msg.author_role,
          content: msg.content,
          isInternal: msg.is_internal,
          attachments: JSON.parse(msg.attachments || '[]'),
          createdAt: msg.created_at,
          updatedAt: msg.updated_at
        })),
        attachments: (attachments as any).map((att: any) => ({
          id: att.id,
          filename: att.filename,
          originalName: att.original_name,
          mimeType: att.mime_type,
          size: att.size,
          url: att.url,
          uploadedAt: att.uploaded_at
        }))
      }
    } catch (error) {
      console.error('Erro ao buscar ticket:', error)
      return null
    }
  }

  async updateTicket(id: string, updates: Partial<Ticket>, userId: string, userName: string): Promise<Ticket | null> {
    try {
      const ticket = await this.getTicketById(id)
      if (!ticket) {
        throw new Error('Ticket não encontrado')
      }

      // Construir query de atualização
      const updateFields: string[] = []
      const updateValues: any[] = []
      
      if (updates.title) {
        updateFields.push('title = ?')
        updateValues.push(updates.title)
      }
      
      if (updates.description) {
        updateFields.push('description = ?')
        updateValues.push(updates.description)
      }
      
      if (updates.status) {
        updateFields.push('status = ?')
        updateValues.push(updates.status)
        
        // Atualizar timestamps baseado no status
        if (updates.status === 'resolved') {
          updateFields.push('resolved_at = CURRENT_TIMESTAMP')
        } else if (updates.status === 'closed') {
          updateFields.push('closed_at = CURRENT_TIMESTAMP')
        }
      }
      
      if (updates.priority) {
        updateFields.push('priority = ?')
        updateValues.push(updates.priority)
      }
      
      if (updates.category) {
        updateFields.push('category = ?')
        updateValues.push(updates.category)
      }
      
      if (updates.assigneeId !== undefined) {
        updateFields.push('assignee_id = ?')
        updateValues.push(updates.assigneeId)
        
        if (updates.assigneeName) {
          updateFields.push('assignee_name = ?')
          updateValues.push(updates.assigneeName)
        }
      }
      
      if (updates.tags) {
        updateFields.push('tags = ?')
        updateValues.push(JSON.stringify(updates.tags))
      }
      
      if (updates.customFields) {
        updateFields.push('custom_fields = ?')
        updateValues.push(JSON.stringify(updates.customFields))
      }
      
      if (updates.dueDate !== undefined) {
        updateFields.push('due_date = ?')
        updateValues.push(updates.dueDate)
      }
      
      if (updates.estimatedHours !== undefined) {
        updateFields.push('estimated_hours = ?')
        updateValues.push(updates.estimatedHours)
      }
      
      if (updates.actualHours !== undefined) {
        updateFields.push('actual_hours = ?')
        updateValues.push(updates.actualHours)
      }

      // Sempre atualizar last_activity_at
      updateFields.push('last_activity_at = CURRENT_TIMESTAMP')
      updateValues.push(id)

      if (updateFields.length === 1) { // Apenas last_activity_at
        return ticket
      }

      const query = `
        UPDATE tickets 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `
      
      await db.$executeRaw(query, ...updateValues)

      // Registrar mudanças no histórico
      for (const [field, value] of Object.entries(updates)) {
        if (field in ticket && (ticket as any)[field] !== value) {
          await db.$executeRaw`
            INSERT INTO ticket_history (id, ticket_id, user_id, user_name, action, field_name, old_value, new_value)
            VALUES (${randomUUID()}, ${id}, ${userId}, ${userName}, 'updated', ${field}, ${JSON.stringify((ticket as any)[field])}, ${JSON.stringify(value)})
          `
        }
      }

      const updatedTicket = await this.getTicketById(id)
      
      if (updatedTicket) {
        this.emit('ticket_updated', updatedTicket, ticket)
        return updatedTicket
      }
      
      return null
    } catch (error) {
      console.error('Erro ao atualizar ticket:', error)
      throw error
    }
  }

  async addMessage(ticketId: string, authorId: string, authorName: string, authorRole: 'user' | 'agent', content: string, isInternal: boolean = false, attachments: TicketAttachment[] = []): Promise<TicketMessage> {
    try {
      const messageId = randomUUID()
      
      await db.$executeRaw`
        INSERT INTO ticket_messages (id, ticket_id, author_id, author_name, author_role, content, is_internal, attachments)
        VALUES (${messageId}, ${ticketId}, ${authorId}, ${authorName}, ${authorRole}, ${content}, ${isInternal}, ${JSON.stringify(attachments)})
      `
      
      // Atualizar última atividade do ticket
      await db.$executeRaw`
        UPDATE tickets 
        SET last_activity_at = CURRENT_TIMESTAMP,
            first_response_at = CASE 
              WHEN first_response_at IS NULL AND ? = 'agent' THEN CURRENT_TIMESTAMP 
              ELSE first_response_at 
            END
        WHERE id = ${ticketId}
      `
      
      // Buscar mensagem criada
      const messages = await db.$queryRaw`
        SELECT * FROM ticket_messages WHERE id = ${messageId}
      `
      
      const messageData = (messages as any)[0]
      
      const message: TicketMessage = {
        id: messageData.id,
        ticketId: messageData.ticket_id,
        authorId: messageData.author_id,
        authorName: messageData.author_name,
        authorRole: messageData.author_role,
        content: messageData.content,
        isInternal: messageData.is_internal,
        attachments: JSON.parse(messageData.attachments || '[]'),
        createdAt: messageData.created_at,
        updatedAt: messageData.updated_at
      }
      
      this.emit('message_added', message)
      
      return message
    } catch (error) {
      console.error('Erro ao adicionar mensagem:', error)
      throw error
    }
  }

  async getTickets(filter: TicketFilter = {}, limit: number = 50, offset: number = 0): Promise<{ tickets: Ticket[], total: number }> {
    try {
      // Construir WHERE clause
      let whereClause = 'WHERE 1=1'
      const params: any[] = []
      
      if (filter.status && filter.status.length > 0) {
        whereClause += ` AND status IN (${filter.status.map(() => '?').join(', ')})`
        params.push(...filter.status)
      }
      
      if (filter.priority && filter.priority.length > 0) {
        whereClause += ` AND priority IN (${filter.priority.map(() => '?').join(', ')})`
        params.push(...filter.priority)
      }
      
      if (filter.category && filter.category.length > 0) {
        whereClause += ` AND category IN (${filter.category.map(() => '?').join(', ')})`
        params.push(...filter.category)
      }
      
      if (filter.assigneeId) {
        whereClause += ` AND assignee_id = ?`
        params.push(filter.assigneeId)
      }
      
      if (filter.userId) {
        whereClause += ` AND user_id = ?`
        params.push(filter.userId)
      }
      
      if (filter.departmentId) {
        whereClause += ` AND department_id = ?`
        params.push(filter.departmentId)
      }
      
      if (filter.search) {
        whereClause += ` AND (title LIKE ? OR description LIKE ? OR number LIKE ?)`
        const searchTerm = `%${filter.search}%`
        params.push(searchTerm, searchTerm, searchTerm)
      }
      
      if (filter.dateRange) {
        whereClause += ` AND created_at BETWEEN ? AND ?`
        params.push(filter.dateRange.start, filter.dateRange.end)
      }
      
      // Buscar tickets
      const tickets = await db.$queryRaw(`
        SELECT * FROM tickets 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `, ...params)
      
      // Contar total
      const totalResult = await db.$queryRaw(`
        SELECT COUNT(*) as total FROM tickets ${whereClause}
      `, ...params)
      
      const total = (totalResult as any)[0]?.total || 0
      
      // Converter para objetos Ticket
      const ticketPromises = (tickets as any).map(async (ticketData: any) => {
        return await this.getTicketById(ticketData.id)
      })
      
      const ticketObjects = await Promise.all(ticketPromises)
      
      return {
        tickets: ticketObjects.filter(t => t !== null) as Ticket[],
        total
      }
    } catch (error) {
      console.error('Erro ao buscar tickets:', error)
      throw error
    }
  }

  async getTicketStats(filter: TicketFilter = {}): Promise<TicketStats> {
    try {
      // Construir WHERE clause
      let whereClause = 'WHERE 1=1'
      const params: any[] = []
      
      if (filter.assigneeId) {
        whereClause += ` AND assignee_id = ?`
        params.push(filter.assigneeId)
      }
      
      if (filter.userId) {
        whereClause += ` AND user_id = ?`
        params.push(filter.userId)
      }
      
      if (filter.departmentId) {
        whereClause += ` AND department_id = ?`
        params.push(filter.departmentId)
      }
      
      if (filter.dateRange) {
        whereClause += ` AND created_at BETWEEN ? AND ?`
        params.push(filter.dateRange.start, filter.dateRange.end)
      }
      
      const stats = await Promise.all([
        // Contadores por status
        db.$queryRaw(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
            SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN status = 'waiting_customer' THEN 1 ELSE 0 END) as waiting,
            SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
            SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed
          FROM tickets ${whereClause}
        `, ...params),
        
        // Tempo médio de resolução
        db.$queryRaw(`
          SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_resolution
          FROM tickets 
          ${whereClause} AND resolved_at IS NOT NULL
        `, ...params),
        
        // Tempo médio de primeira resposta
        db.$queryRaw(`
          SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, first_response_at)) as avg_first_response
          FROM tickets 
          ${whereClause} AND first_response_at IS NOT NULL
        `, ...params),
        
        // Satisfação
        db.$queryRaw(`
          SELECT AVG(satisfaction_rating) as avg_satisfaction, COUNT(*) as total_ratings
          FROM tickets 
          ${whereClause} AND satisfaction_rating IS NOT NULL
        `, ...params),
        
        // Tickets vencidos
        db.$queryRaw(`
          SELECT COUNT(*) as overdue
          FROM tickets 
          ${whereClause} AND due_date < NOW() AND status NOT IN ('resolved', 'closed')
        `, ...params),
        
        // Tickets criados hoje
        db.$queryRaw(`
          SELECT COUNT(*) as today_created
          FROM tickets 
          ${whereClause} AND DATE(created_at) = CURDATE()
        `, ...params),
        
        // Tickets resolvidos hoje
        db.$queryRaw(`
          SELECT COUNT(*) as today_resolved
          FROM tickets 
          ${whereClause} AND DATE(resolved_at) = CURDATE()
        `, ...params)
      ])
      
      const statusStats = (stats[0] as any)[0]
      const resolutionStats = (stats[1] as any)[0]
      const responseStats = (stats[2] as any)[0]
      const satisfactionStats = (stats[3] as any)[0]
      const overdueStats = (stats[4] as any)[0]
      const todayCreatedStats = (stats[5] as any)[0]
      const todayResolvedStats = (stats[6] as any)[0]
      
      return {
        total: statusStats?.total || 0,
        open: statusStats?.open || 0,
        inProgress: statusStats?.in_progress || 0,
        waiting: statusStats?.waiting || 0,
        resolved: statusStats?.resolved || 0,
        closed: statusStats?.closed || 0,
        avgResolutionTime: resolutionStats?.avg_resolution || 0,
        avgFirstResponseTime: responseStats?.avg_first_response || 0,
        satisfactionScore: satisfactionStats?.avg_satisfaction || 0,
        totalSatisfactionRatings: satisfactionStats?.total_ratings || 0,
        overdueCount: overdueStats?.overdue || 0,
        todayCreated: todayCreatedStats?.today_created || 0,
        todayResolved: todayResolvedStats?.today_resolved || 0
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
      throw error
    }
  }

  private async autoAssignTicket(ticket: Ticket): Promise<void> {
    try {
      if (!ticket.departmentId) return
      
      // Buscar configuração do departamento
      const departments = await db.$queryRaw`
        SELECT * FROM ticket_departments 
        WHERE id = ${ticket.departmentId} AND auto_assign = true
      `
      
      if (!(departments as any).length) return
      
      const department = (departments as any)[0]
      
      if (department.default_assignee_id) {
        // Buscar informações do usuário
        const user = await db.user.findUnique({
          where: { id: department.default_assignee_id }
        })
        
        if (user) {
          await this.updateTicket(ticket.id, {
            assigneeId: user.id,
            assigneeName: user.name,
            status: 'in_progress'
          }, 'system', 'Sistema')
        }
      }
    } catch (error) {
      console.error('Erro no auto-assign:', error)
    }
  }

  async getDepartments(): Promise<any[]> {
    try {
      const departments = await db.$queryRaw`
        SELECT * FROM ticket_departments 
        WHERE active = true
        ORDER BY name
      `
      
      return departments as any[]
    } catch (error) {
      console.error('Erro ao buscar departamentos:', error)
      return []
    }
  }
}

export const ticketService = TicketService.getInstance()