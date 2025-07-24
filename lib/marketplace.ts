import { EventEmitter } from 'events'
import { db } from './db'
import { randomUUID } from 'crypto'

export type SupplierCategory = 
  | 'engineering' 
  | 'construction' 
  | 'services' 
  | 'technology' 
  | 'consulting' 
  | 'supplies' 
  | 'healthcare' 
  | 'education' 
  | 'security' 
  | 'cleaning' 
  | 'food' 
  | 'transportation' 
  | 'other'

export type SupplierStatus = 'pending' | 'active' | 'suspended' | 'rejected'
export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'negotiating' | 'completed'
export type ContractStatus = 'draft' | 'active' | 'completed' | 'cancelled'

export interface SupplierCertification {
  id: string
  name: string
  issuedBy: string
  issuedAt: Date
  expiresAt?: Date
  documentUrl: string
  verified: boolean
}

export interface SupplierDocument {
  id: string
  type: 'cnpj' | 'license' | 'certification' | 'portfolio' | 'other'
  name: string
  url: string
  uploadedAt: Date
  verified: boolean
}

export interface SupplierReview {
  id: string
  supplierId: string
  clientId: string
  clientName: string
  rating: number
  comment: string
  contractId?: string
  createdAt: Date
  response?: {
    content: string
    respondedAt: Date
  }
}

export interface Supplier {
  id: string
  userId: string
  companyName: string
  tradeName: string
  cnpj: string
  description: string
  categories: SupplierCategory[]
  specialties: string[]
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  contact: {
    phone: string
    email: string
    website?: string
    whatsapp?: string
  }
  workingHours: {
    monday: { open: string; close: string; closed: boolean }
    tuesday: { open: string; close: string; closed: boolean }
    wednesday: { open: string; close: string; closed: boolean }
    thursday: { open: string; close: string; closed: boolean }
    friday: { open: string; close: string; closed: boolean }
    saturday: { open: string; close: string; closed: boolean }
    sunday: { open: string; close: string; closed: boolean }
  }
  serviceAreas: string[]
  portfolio: {
    projectsCompleted: number
    yearsExperience: number
    teamSize: number
    monthlyCapacity: number
    averageProjectValue: number
  }
  certifications: SupplierCertification[]
  documents: SupplierDocument[]
  reviews: SupplierReview[]
  rating: {
    average: number
    count: number
    breakdown: {
      5: number
      4: number
      3: number
      2: number
      1: number
    }
  }
  status: SupplierStatus
  featured: boolean
  verified: boolean
  premiumUntil?: Date
  createdAt: Date
  updatedAt: Date
  lastActiveAt: Date
  responseTime: number // em horas
  responseRate: number // porcentagem
  completionRate: number // porcentagem
  repeatClientRate: number // porcentagem
  metadata: Record<string, any>
}

export interface ServiceRequest {
  id: string
  clientId: string
  clientName: string
  clientCompany: string
  title: string
  description: string
  category: SupplierCategory
  budget: {
    min: number
    max: number
    currency: string
  }
  deadline: Date
  location: {
    city: string
    state: string
    allowsRemote: boolean
  }
  requirements: string[]
  attachments: Array<{
    id: string
    name: string
    url: string
    size: number
    type: string
  }>
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  proposals: Proposal[]
  selectedProposalId?: string
  createdAt: Date
  updatedAt: Date
  expiresAt: Date
  views: number
  interestedSuppliers: string[]
}

export interface Proposal {
  id: string
  requestId: string
  supplierId: string
  supplierName: string
  price: number
  deliveryTime: number // em dias
  description: string
  methodology: string
  timeline: Array<{
    phase: string
    description: string
    duration: number
    deliverables: string[]
  }>
  terms: string
  attachments: Array<{
    id: string
    name: string
    url: string
    size: number
    type: string
  }>
  status: ProposalStatus
  submittedAt: Date
  responseTime: number // minutos desde a criação do request
  negotiations: Array<{
    id: string
    fromUserId: string
    fromUserName: string
    message: string
    createdAt: Date
    price?: number
    deliveryTime?: number
  }>
  validUntil: Date
}

export interface Contract {
  id: string
  requestId: string
  proposalId: string
  clientId: string
  clientName: string
  supplierId: string
  supplierName: string
  title: string
  description: string
  value: number
  currency: string
  startDate: Date
  endDate: Date
  milestones: Array<{
    id: string
    title: string
    description: string
    value: number
    dueDate: Date
    status: 'pending' | 'in_progress' | 'completed' | 'overdue'
    deliverables: string[]
    completedAt?: Date
  }>
  terms: string
  status: ContractStatus
  paymentTerms: {
    method: string
    schedule: string
    penaltyRate: number
    lateFee: number
  }
  documents: Array<{
    id: string
    name: string
    url: string
    type: string
    uploadedBy: string
    uploadedAt: Date
  }>
  signatures: Array<{
    userId: string
    userName: string
    signedAt: Date
    ipAddress: string
  }>
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  cancelledAt?: Date
  cancelReason?: string
}

export interface MarketplaceStats {
  totalSuppliers: number
  activeSuppliers: number
  verifiedSuppliers: number
  totalRequests: number
  openRequests: number
  totalProposals: number
  totalContracts: number
  activeContracts: number
  totalValue: number
  averageProjectValue: number
  averageResponseTime: number
  successRate: number
  topCategories: Array<{
    category: SupplierCategory
    count: number
    percentage: number
  }>
  topStates: Array<{
    state: string
    count: number
    percentage: number
  }>
  monthlyGrowth: {
    suppliers: number
    requests: number
    contracts: number
    value: number
  }
}

export class MarketplaceService extends EventEmitter {
  private static instance: MarketplaceService

  private constructor() {
    super()
    this.setupDatabase()
  }

  static getInstance(): MarketplaceService {
    if (!MarketplaceService.instance) {
      MarketplaceService.instance = new MarketplaceService()
    }
    return MarketplaceService.instance
  }

  async setupDatabase() {
    try {
      // Tabela de fornecedores
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS suppliers (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          company_name VARCHAR(255) NOT NULL,
          trade_name VARCHAR(255),
          cnpj VARCHAR(18) UNIQUE NOT NULL,
          description TEXT,
          categories JSON,
          specialties JSON,
          address JSON,
          contact JSON,
          working_hours JSON,
          service_areas JSON,
          portfolio JSON,
          certifications JSON,
          documents JSON,
          status VARCHAR(50) DEFAULT 'pending',
          featured BOOLEAN DEFAULT false,
          verified BOOLEAN DEFAULT false,
          premium_until TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          response_time DECIMAL(5,2) DEFAULT 24.0,
          response_rate DECIMAL(5,2) DEFAULT 100.0,
          completion_rate DECIMAL(5,2) DEFAULT 100.0,
          repeat_client_rate DECIMAL(5,2) DEFAULT 0.0,
          metadata JSON,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_status (status),
          INDEX idx_categories (categories),
          INDEX idx_verified (verified),
          INDEX idx_featured (featured),
          INDEX idx_created_at (created_at)
        )
      `

      // Tabela de avaliações
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS supplier_reviews (
          id VARCHAR(36) PRIMARY KEY,
          supplier_id VARCHAR(36) NOT NULL,
          client_id VARCHAR(36) NOT NULL,
          client_name VARCHAR(255) NOT NULL,
          rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comment TEXT,
          contract_id VARCHAR(36),
          response_content TEXT,
          response_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
          FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_supplier_id (supplier_id),
          INDEX idx_rating (rating),
          INDEX idx_created_at (created_at)
        )
      `

      // Tabela de solicitações de serviço
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS service_requests (
          id VARCHAR(36) PRIMARY KEY,
          client_id VARCHAR(36) NOT NULL,
          client_name VARCHAR(255) NOT NULL,
          client_company VARCHAR(255),
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          category VARCHAR(50) NOT NULL,
          budget JSON,
          deadline TIMESTAMP NOT NULL,
          location JSON,
          requirements JSON,
          attachments JSON,
          status VARCHAR(50) DEFAULT 'open',
          selected_proposal_id VARCHAR(36),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          views INT DEFAULT 0,
          interested_suppliers JSON,
          FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_status (status),
          INDEX idx_category (category),
          INDEX idx_created_at (created_at),
          INDEX idx_deadline (deadline)
        )
      `

      // Tabela de propostas
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS proposals (
          id VARCHAR(36) PRIMARY KEY,
          request_id VARCHAR(36) NOT NULL,
          supplier_id VARCHAR(36) NOT NULL,
          supplier_name VARCHAR(255) NOT NULL,
          price DECIMAL(15,2) NOT NULL,
          delivery_time INT NOT NULL,
          description TEXT NOT NULL,
          methodology TEXT,
          timeline JSON,
          terms TEXT,
          attachments JSON,
          status VARCHAR(50) DEFAULT 'pending',
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          response_time INT,
          negotiations JSON,
          valid_until TIMESTAMP,
          FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
          FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
          INDEX idx_request_id (request_id),
          INDEX idx_supplier_id (supplier_id),
          INDEX idx_status (status),
          INDEX idx_submitted_at (submitted_at)
        )
      `

      // Tabela de contratos
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS contracts (
          id VARCHAR(36) PRIMARY KEY,
          request_id VARCHAR(36) NOT NULL,
          proposal_id VARCHAR(36) NOT NULL,
          client_id VARCHAR(36) NOT NULL,
          client_name VARCHAR(255) NOT NULL,
          supplier_id VARCHAR(36) NOT NULL,
          supplier_name VARCHAR(255) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          value DECIMAL(15,2) NOT NULL,
          currency VARCHAR(3) DEFAULT 'BRL',
          start_date TIMESTAMP NOT NULL,
          end_date TIMESTAMP NOT NULL,
          milestones JSON,
          terms TEXT,
          status VARCHAR(50) DEFAULT 'draft',
          payment_terms JSON,
          documents JSON,
          signatures JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          completed_at TIMESTAMP,
          cancelled_at TIMESTAMP,
          cancel_reason TEXT,
          FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
          FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
          FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
          INDEX idx_client_id (client_id),
          INDEX idx_supplier_id (supplier_id),
          INDEX idx_status (status),
          INDEX idx_created_at (created_at)
        )
      `

      // Tabela de categorias (para referência)
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS supplier_categories (
          id VARCHAR(36) PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          icon VARCHAR(100),
          color VARCHAR(7),
          active BOOLEAN DEFAULT true,
          sort_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `

      // Inserir categorias padrão
      const categories = [
        { id: randomUUID(), code: 'engineering', name: 'Engenharia', description: 'Projetos de engenharia civil, elétrica, mecânica', icon: 'Building', color: '#3B82F6' },
        { id: randomUUID(), code: 'construction', name: 'Construção', description: 'Obras, reformas e construções em geral', icon: 'Hammer', color: '#EF4444' },
        { id: randomUUID(), code: 'services', name: 'Serviços Gerais', description: 'Prestação de serviços diversos', icon: 'Briefcase', color: '#10B981' },
        { id: randomUUID(), code: 'technology', name: 'Tecnologia', description: 'Desenvolvimento de software, TI e sistemas', icon: 'Monitor', color: '#8B5CF6' },
        { id: randomUUID(), code: 'consulting', name: 'Consultoria', description: 'Consultoria especializada e assessoria', icon: 'Users', color: '#F59E0B' },
        { id: randomUUID(), code: 'supplies', name: 'Fornecimentos', description: 'Fornecimento de materiais e produtos', icon: 'Package', color: '#06B6D4' },
        { id: randomUUID(), code: 'healthcare', name: 'Saúde', description: 'Serviços e produtos para área da saúde', icon: 'Heart', color: '#EC4899' },
        { id: randomUUID(), code: 'education', name: 'Educação', description: 'Serviços educacionais e treinamentos', icon: 'BookOpen', color: '#14B8A6' },
        { id: randomUUID(), code: 'security', name: 'Segurança', description: 'Segurança patrimonial e eletrônica', icon: 'Shield', color: '#6366F1' },
        { id: randomUUID(), code: 'cleaning', name: 'Limpeza', description: 'Serviços de limpeza e conservação', icon: 'Sparkles', color: '#84CC16' },
        { id: randomUUID(), code: 'food', name: 'Alimentação', description: 'Fornecimento de alimentos e bebidas', icon: 'Coffee', color: '#F97316' },
        { id: randomUUID(), code: 'transportation', name: 'Transporte', description: 'Transporte de cargas e passageiros', icon: 'Truck', color: '#64748B' }
      ]

      for (const category of categories) {
        await db.$executeRaw`
          INSERT IGNORE INTO supplier_categories (id, code, name, description, icon, color)
          VALUES (${category.id}, ${category.code}, ${category.name}, ${category.description}, ${category.icon}, ${category.color})
        `
      }

      console.log('Banco de dados do marketplace configurado com sucesso')
    } catch (error) {
      console.error('Erro ao configurar banco de dados do marketplace:', error)
    }
  }

  async createSupplier(data: Omit<Supplier, 'id' | 'reviews' | 'rating' | 'createdAt' | 'updatedAt' | 'lastActiveAt'>): Promise<Supplier> {
    try {
      const supplierId = randomUUID()
      
      await db.$executeRaw`
        INSERT INTO suppliers (
          id, user_id, company_name, trade_name, cnpj, description, categories, specialties,
          address, contact, working_hours, service_areas, portfolio, certifications, documents,
          status, featured, verified, premium_until, response_time, response_rate, 
          completion_rate, repeat_client_rate, metadata
        ) VALUES (
          ${supplierId}, ${data.userId}, ${data.companyName}, ${data.tradeName}, ${data.cnpj},
          ${data.description}, ${JSON.stringify(data.categories)}, ${JSON.stringify(data.specialties)},
          ${JSON.stringify(data.address)}, ${JSON.stringify(data.contact)}, ${JSON.stringify(data.workingHours)},
          ${JSON.stringify(data.serviceAreas)}, ${JSON.stringify(data.portfolio)}, ${JSON.stringify(data.certifications)},
          ${JSON.stringify(data.documents)}, ${data.status}, ${data.featured}, ${data.verified},
          ${data.premiumUntil || null}, ${data.responseTime}, ${data.responseRate},
          ${data.completionRate}, ${data.repeatClientRate}, ${JSON.stringify(data.metadata)}
        )
      `

      const supplier = await this.getSupplierById(supplierId)
      
      if (supplier) {
        this.emit('supplier_created', supplier)
        return supplier
      }
      
      throw new Error('Erro ao criar fornecedor')
    } catch (error) {
      console.error('Erro ao criar fornecedor:', error)
      throw error
    }
  }

  async getSupplierById(id: string): Promise<Supplier | null> {
    try {
      const suppliers = await db.$queryRaw`
        SELECT * FROM suppliers WHERE id = ${id}
      `
      
      if (!(suppliers as any).length) {
        return null
      }
      
      const supplierData = (suppliers as any)[0]
      
      // Buscar avaliações
      const reviews = await db.$queryRaw`
        SELECT * FROM supplier_reviews 
        WHERE supplier_id = ${id} 
        ORDER BY created_at DESC
      `
      
      // Calcular estatísticas de avaliação
      const rating = this.calculateRating(reviews as any[])
      
      return {
        id: supplierData.id,
        userId: supplierData.user_id,
        companyName: supplierData.company_name,
        tradeName: supplierData.trade_name,
        cnpj: supplierData.cnpj,
        description: supplierData.description,
        categories: JSON.parse(supplierData.categories || '[]'),
        specialties: JSON.parse(supplierData.specialties || '[]'),
        address: JSON.parse(supplierData.address || '{}'),
        contact: JSON.parse(supplierData.contact || '{}'),
        workingHours: JSON.parse(supplierData.working_hours || '{}'),
        serviceAreas: JSON.parse(supplierData.service_areas || '[]'),
        portfolio: JSON.parse(supplierData.portfolio || '{}'),
        certifications: JSON.parse(supplierData.certifications || '[]'),
        documents: JSON.parse(supplierData.documents || '[]'),
        reviews: (reviews as any[]).map(review => ({
          id: review.id,
          supplierId: review.supplier_id,
          clientId: review.client_id,
          clientName: review.client_name,
          rating: review.rating,
          comment: review.comment,
          contractId: review.contract_id,
          createdAt: review.created_at,
          response: review.response_content ? {
            content: review.response_content,
            respondedAt: review.response_date
          } : undefined
        })),
        rating,
        status: supplierData.status,
        featured: supplierData.featured,
        verified: supplierData.verified,
        premiumUntil: supplierData.premium_until,
        createdAt: supplierData.created_at,
        updatedAt: supplierData.updated_at,
        lastActiveAt: supplierData.last_active_at,
        responseTime: supplierData.response_time,
        responseRate: supplierData.response_rate,
        completionRate: supplierData.completion_rate,
        repeatClientRate: supplierData.repeat_client_rate,
        metadata: JSON.parse(supplierData.metadata || '{}')
      }
    } catch (error) {
      console.error('Erro ao buscar fornecedor:', error)
      return null
    }
  }

  async getSupplierByUserId(userId: string): Promise<Supplier | null> {
    try {
      const suppliers = await db.$queryRaw`
        SELECT * FROM suppliers WHERE user_id = ${userId}
      `
      
      if (!(suppliers as any).length) {
        return null
      }
      
      const supplierData = (suppliers as any)[0]
      
      // Buscar avaliações
      const reviews = await db.$queryRaw`
        SELECT * FROM supplier_reviews 
        WHERE supplier_id = ${supplierData.id} 
        ORDER BY created_at DESC
      `
      
      // Calcular estatísticas de avaliação
      const rating = this.calculateRating(reviews as any[])
      
      return {
        id: supplierData.id,
        userId: supplierData.user_id,
        companyName: supplierData.company_name,
        tradeName: supplierData.trade_name,
        cnpj: supplierData.cnpj,
        description: supplierData.description,
        categories: JSON.parse(supplierData.categories || '[]'),
        specialties: JSON.parse(supplierData.specialties || '[]'),
        address: JSON.parse(supplierData.address || '{}'),
        contact: JSON.parse(supplierData.contact || '{}'),
        workingHours: JSON.parse(supplierData.working_hours || '{}'),
        serviceAreas: JSON.parse(supplierData.service_areas || '[]'),
        portfolio: JSON.parse(supplierData.portfolio || '{}'),
        certifications: JSON.parse(supplierData.certifications || '[]'),
        documents: JSON.parse(supplierData.documents || '[]'),
        reviews: (reviews as any[]).map(review => ({
          id: review.id,
          supplierId: review.supplier_id,
          clientId: review.client_id,
          clientName: review.client_name,
          rating: review.rating,
          comment: review.comment,
          contractId: review.contract_id,
          createdAt: review.created_at,
          response: review.response_content ? {
            content: review.response_content,
            respondedAt: review.response_date
          } : undefined
        })),
        rating,
        status: supplierData.status,
        featured: supplierData.featured,
        verified: supplierData.verified,
        premiumUntil: supplierData.premium_until,
        createdAt: supplierData.created_at,
        updatedAt: supplierData.updated_at,
        lastActiveAt: supplierData.last_active_at,
        responseTime: supplierData.response_time,
        responseRate: supplierData.response_rate,
        completionRate: supplierData.completion_rate,
        repeatClientRate: supplierData.repeat_client_rate,
        metadata: JSON.parse(supplierData.metadata || '{}')
      }
    } catch (error) {
      console.error('Erro ao buscar fornecedor por userId:', error)
      return null
    }
  }

  async getSupplierByCnpj(cnpj: string): Promise<Supplier | null> {
    try {
      const suppliers = await db.$queryRaw`
        SELECT * FROM suppliers WHERE cnpj = ${cnpj}
      `
      
      if (!(suppliers as any).length) {
        return null
      }
      
      const supplierData = (suppliers as any)[0]
      
      // Buscar avaliações
      const reviews = await db.$queryRaw`
        SELECT * FROM supplier_reviews 
        WHERE supplier_id = ${supplierData.id} 
        ORDER BY created_at DESC
      `
      
      // Calcular estatísticas de avaliação
      const rating = this.calculateRating(reviews as any[])
      
      return {
        id: supplierData.id,
        userId: supplierData.user_id,
        companyName: supplierData.company_name,
        tradeName: supplierData.trade_name,
        cnpj: supplierData.cnpj,
        description: supplierData.description,
        categories: JSON.parse(supplierData.categories || '[]'),
        specialties: JSON.parse(supplierData.specialties || '[]'),
        address: JSON.parse(supplierData.address || '{}'),
        contact: JSON.parse(supplierData.contact || '{}'),
        workingHours: JSON.parse(supplierData.working_hours || '{}'),
        serviceAreas: JSON.parse(supplierData.service_areas || '[]'),
        portfolio: JSON.parse(supplierData.portfolio || '{}'),
        certifications: JSON.parse(supplierData.certifications || '[]'),
        documents: JSON.parse(supplierData.documents || '[]'),
        reviews: (reviews as any[]).map(review => ({
          id: review.id,
          supplierId: review.supplier_id,
          clientId: review.client_id,
          clientName: review.client_name,
          rating: review.rating,
          comment: review.comment,
          contractId: review.contract_id,
          createdAt: review.created_at,
          response: review.response_content ? {
            content: review.response_content,
            respondedAt: review.response_date
          } : undefined
        })),
        rating,
        status: supplierData.status,
        featured: supplierData.featured,
        verified: supplierData.verified,
        premiumUntil: supplierData.premium_until,
        createdAt: supplierData.created_at,
        updatedAt: supplierData.updated_at,
        lastActiveAt: supplierData.last_active_at,
        responseTime: supplierData.response_time,
        responseRate: supplierData.response_rate,
        completionRate: supplierData.completion_rate,
        repeatClientRate: supplierData.repeat_client_rate,
        metadata: JSON.parse(supplierData.metadata || '{}')
      }
    } catch (error) {
      console.error('Erro ao buscar fornecedor por CNPJ:', error)
      return null
    }
  }

  async createServiceRequest(data: Omit<ServiceRequest, 'id' | 'proposals' | 'createdAt' | 'updatedAt' | 'views' | 'interestedSuppliers'>): Promise<ServiceRequest> {
    try {
      const requestId = randomUUID()
      
      await db.$executeRaw`
        INSERT INTO service_requests (
          id, client_id, client_name, client_company, title, description, category,
          budget, deadline, location, requirements, attachments, status, expires_at
        ) VALUES (
          ${requestId}, ${data.clientId}, ${data.clientName}, ${data.clientCompany},
          ${data.title}, ${data.description}, ${data.category}, ${JSON.stringify(data.budget)},
          ${data.deadline}, ${JSON.stringify(data.location)}, ${JSON.stringify(data.requirements)},
          ${JSON.stringify(data.attachments)}, ${data.status}, ${data.expiresAt}
        )
      `

      const request = await this.getServiceRequestById(requestId)
      
      if (request) {
        this.emit('service_request_created', request)
        return request
      }
      
      throw new Error('Erro ao criar solicitação de serviço')
    } catch (error) {
      console.error('Erro ao criar solicitação de serviço:', error)
      throw error
    }
  }

  async getServiceRequestById(id: string): Promise<ServiceRequest | null> {
    try {
      const requests = await db.$queryRaw`
        SELECT * FROM service_requests WHERE id = ${id}
      `
      
      if (!(requests as any).length) {
        return null
      }
      
      const requestData = (requests as any)[0]
      
      // Buscar propostas
      const proposals = await db.$queryRaw`
        SELECT * FROM proposals 
        WHERE request_id = ${id} 
        ORDER BY submitted_at DESC
      `
      
      return {
        id: requestData.id,
        clientId: requestData.client_id,
        clientName: requestData.client_name,
        clientCompany: requestData.client_company,
        title: requestData.title,
        description: requestData.description,
        category: requestData.category,
        budget: JSON.parse(requestData.budget || '{}'),
        deadline: requestData.deadline,
        location: JSON.parse(requestData.location || '{}'),
        requirements: JSON.parse(requestData.requirements || '[]'),
        attachments: JSON.parse(requestData.attachments || '[]'),
        status: requestData.status,
        proposals: (proposals as any[]).map(proposal => ({
          id: proposal.id,
          requestId: proposal.request_id,
          supplierId: proposal.supplier_id,
          supplierName: proposal.supplier_name,
          price: proposal.price,
          deliveryTime: proposal.delivery_time,
          description: proposal.description,
          methodology: proposal.methodology,
          timeline: JSON.parse(proposal.timeline || '[]'),
          terms: proposal.terms,
          attachments: JSON.parse(proposal.attachments || '[]'),
          status: proposal.status,
          submittedAt: proposal.submitted_at,
          responseTime: proposal.response_time,
          negotiations: JSON.parse(proposal.negotiations || '[]'),
          validUntil: proposal.valid_until
        })),
        selectedProposalId: requestData.selected_proposal_id,
        createdAt: requestData.created_at,
        updatedAt: requestData.updated_at,
        expiresAt: requestData.expires_at,
        views: requestData.views,
        interestedSuppliers: JSON.parse(requestData.interested_suppliers || '[]')
      }
    } catch (error) {
      console.error('Erro ao buscar solicitação de serviço:', error)
      return null
    }
  }

  async getMarketplaceStats(): Promise<MarketplaceStats> {
    try {
      const stats = await Promise.all([
        // Fornecedores
        db.$queryRaw`SELECT COUNT(*) as total FROM suppliers`,
        db.$queryRaw`SELECT COUNT(*) as active FROM suppliers WHERE status = 'active'`,
        db.$queryRaw`SELECT COUNT(*) as verified FROM suppliers WHERE verified = true`,
        
        // Solicitações
        db.$queryRaw`SELECT COUNT(*) as total FROM service_requests`,
        db.$queryRaw`SELECT COUNT(*) as open FROM service_requests WHERE status = 'open'`,
        
        // Propostas
        db.$queryRaw`SELECT COUNT(*) as total FROM proposals`,
        
        // Contratos
        db.$queryRaw`SELECT COUNT(*) as total FROM contracts`,
        db.$queryRaw`SELECT COUNT(*) as active FROM contracts WHERE status = 'active'`,
        db.$queryRaw`SELECT SUM(value) as total_value FROM contracts WHERE status != 'cancelled'`,
        db.$queryRaw`SELECT AVG(value) as avg_value FROM contracts WHERE status != 'cancelled'`,
        
        // Tempo de resposta
        db.$queryRaw`SELECT AVG(response_time) as avg_response FROM suppliers WHERE status = 'active'`,
        
        // Taxa de sucesso
        db.$queryRaw`
          SELECT 
            COUNT(*) as total_requests,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_requests
          FROM service_requests
        `,
        
        // Top categorias
        db.$queryRaw`
          SELECT category, COUNT(*) as count
          FROM service_requests
          GROUP BY category
          ORDER BY count DESC
          LIMIT 5
        `,
        
        // Top estados
        db.$queryRaw`
          SELECT JSON_UNQUOTE(JSON_EXTRACT(address, '$.state')) as state, COUNT(*) as count
          FROM suppliers
          WHERE status = 'active'
          GROUP BY state
          ORDER BY count DESC
          LIMIT 5
        `
      ])

      const totalSuppliers = (stats[0] as any)[0]?.total || 0
      const activeSuppliers = (stats[1] as any)[0]?.active || 0
      const verifiedSuppliers = (stats[2] as any)[0]?.verified || 0
      const totalRequests = (stats[3] as any)[0]?.total || 0
      const openRequests = (stats[4] as any)[0]?.open || 0
      const totalProposals = (stats[5] as any)[0]?.total || 0
      const totalContracts = (stats[6] as any)[0]?.total || 0
      const activeContracts = (stats[7] as any)[0]?.active || 0
      const totalValue = (stats[8] as any)[0]?.total_value || 0
      const averageProjectValue = (stats[9] as any)[0]?.avg_value || 0
      const averageResponseTime = (stats[10] as any)[0]?.avg_response || 0
      const successStats = (stats[11] as any)[0]
      const successRate = successStats?.total_requests > 0 ? 
        (successStats.completed_requests / successStats.total_requests) * 100 : 0
      const topCategories = (stats[12] as any[]).map(cat => ({
        category: cat.category,
        count: cat.count,
        percentage: totalRequests > 0 ? (cat.count / totalRequests) * 100 : 0
      }))
      const topStates = (stats[13] as any[]).map(state => ({
        state: state.state,
        count: state.count,
        percentage: totalSuppliers > 0 ? (state.count / totalSuppliers) * 100 : 0
      }))

      return {
        totalSuppliers,
        activeSuppliers,
        verifiedSuppliers,
        totalRequests,
        openRequests,
        totalProposals,
        totalContracts,
        activeContracts,
        totalValue,
        averageProjectValue,
        averageResponseTime,
        successRate,
        topCategories,
        topStates,
        monthlyGrowth: {
          suppliers: 0, // Calcular baseado em dados históricos
          requests: 0,
          contracts: 0,
          value: 0
        }
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas do marketplace:', error)
      throw error
    }
  }

  async incrementSupplierViews(supplierId: string): Promise<void> {
    try {
      await db.$executeRaw`
        UPDATE suppliers 
        SET views = COALESCE(views, 0) + 1, 
            last_viewed_at = NOW()
        WHERE id = ${supplierId}
      `
    } catch (error) {
      console.error('Erro ao incrementar visualizações do fornecedor:', error)
      // Don't throw error to avoid breaking the main flow
    }
  }

  async updateSupplier(supplierId: string, data: Partial<Supplier>): Promise<Supplier> {
    try {
      // Simple update approach - only update commonly used fields
      if (data.companyName !== undefined) {
        await db.$executeRaw`
          UPDATE suppliers 
          SET company_name = ${data.companyName}, updated_at = NOW()
          WHERE id = ${supplierId}
        `
      }
      if (data.description !== undefined) {
        await db.$executeRaw`
          UPDATE suppliers 
          SET description = ${data.description}, updated_at = NOW()
          WHERE id = ${supplierId}
        `
      }
      if (data.status !== undefined) {
        await db.$executeRaw`
          UPDATE suppliers 
          SET status = ${data.status}, updated_at = NOW()
          WHERE id = ${supplierId}
        `
      }
      
      // Update timestamp in any case
      await db.$executeRaw`
        UPDATE suppliers 
        SET updated_at = NOW()
        WHERE id = ${supplierId}
      `
      
      const updatedSupplier = await this.getSupplierById(supplierId)
      if (!updatedSupplier) {
        throw new Error('Fornecedor não encontrado após atualização')
      }
      
      this.emit('supplier_updated', updatedSupplier)
      return updatedSupplier
    } catch (error) {
      console.error('Erro ao atualizar fornecedor:', error)
      throw error
    }
  }

  async deleteSupplier(supplierId: string): Promise<void> {
    try {
      await db.$executeRaw`
        DELETE FROM suppliers 
        WHERE id = ${supplierId}
      `
      
      this.emit('supplier_deleted', supplierId)
    } catch (error) {
      console.error('Erro ao deletar fornecedor:', error)
      throw error
    }
  }

  async getActiveContractsBySupplier(supplierId: string): Promise<Contract[]> {
    try {
      // Return empty array for now - contracts would be in a separate table
      return []
    } catch (error) {
      console.error('Erro ao buscar contratos ativos do fornecedor:', error)
      throw error
    }
  }

  async searchSuppliers(params: any): Promise<{ data: Supplier[], total: number }> {
    try {
      // Simple implementation - just get all suppliers and filter in memory for now
      const allSuppliers = await db.$queryRaw`
        SELECT * FROM suppliers 
        WHERE status = 'active'
        ORDER BY created_at DESC
        LIMIT 100
      ` as any[]
      
      // Convert to Supplier objects (simplified version)
      const suppliers: Supplier[] = allSuppliers.map(supplierData => ({
        id: supplierData.id,
        userId: supplierData.user_id,
        companyName: supplierData.company_name,
        tradeName: supplierData.trade_name,
        cnpj: supplierData.cnpj,
        description: supplierData.description,
        categories: JSON.parse(supplierData.categories || '[]'),
        specialties: JSON.parse(supplierData.specialties || '[]'),
        address: JSON.parse(supplierData.address || '{}'),
        contact: JSON.parse(supplierData.contact || '{}'),
        workingHours: JSON.parse(supplierData.working_hours || '{}'),
        serviceAreas: JSON.parse(supplierData.service_areas || '[]'),
        portfolio: JSON.parse(supplierData.portfolio || '{}'),
        certifications: JSON.parse(supplierData.certifications || '[]'),
        documents: JSON.parse(supplierData.documents || '[]'),
        reviews: [], // Skip reviews for search performance
        rating: {
          average: 0,
          count: 0,
          breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        },
        status: supplierData.status,
        featured: supplierData.featured,
        verified: supplierData.verified,
        premiumUntil: supplierData.premium_until,
        createdAt: supplierData.created_at,
        updatedAt: supplierData.updated_at,
        lastActiveAt: supplierData.last_active_at,
        responseTime: supplierData.response_time,
        responseRate: supplierData.response_rate,
        completionRate: supplierData.completion_rate,
        repeatClientRate: supplierData.repeat_client_rate,
        metadata: JSON.parse(supplierData.metadata || '{}')
      }))
      
      // Apply basic filtering
      let filteredSuppliers = suppliers
      
      if (params.search) {
        const searchTerm = params.search.toLowerCase()
        filteredSuppliers = filteredSuppliers.filter(supplier => 
          supplier.companyName.toLowerCase().includes(searchTerm) ||
          supplier.description.toLowerCase().includes(searchTerm)
        )
      }
      
      if (params.categories && Array.isArray(params.categories)) {
        filteredSuppliers = filteredSuppliers.filter(supplier =>
          params.categories.some((cat: string) => 
            supplier.categories.includes(cat)
          )
        )
      }
      
      // Simple pagination
      const page = parseInt(params.page) || 1
      const limit = parseInt(params.limit) || 20
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      
      const paginatedSuppliers = filteredSuppliers.slice(startIndex, endIndex)
      
      return {
        data: paginatedSuppliers,
        total: filteredSuppliers.length
      }
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error)
      // Return empty result on error
      return {
        data: [],
        total: 0
      }
    }
  }

  private calculateRating(reviews: any[]): Supplier['rating'] {
    if (reviews.length === 0) {
      return {
        average: 0,
        count: 0,
        breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      }
    }

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    let total = 0

    reviews.forEach(review => {
      const rating = review.rating
      breakdown[rating as keyof typeof breakdown]++
      total += rating
    })

    return {
      average: total / reviews.length,
      count: reviews.length,
      breakdown
    }
  }
}

export const marketplaceService = MarketplaceService.getInstance()