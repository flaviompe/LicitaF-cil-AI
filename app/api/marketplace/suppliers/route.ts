import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { marketplaceService } from '@/lib/marketplace'
import { z } from 'zod'

const supplierSchema = z.object({
  companyName: z.string().min(1, 'Nome da empresa é obrigatório'),
  tradeName: z.string().optional(),
  cnpj: z.string().min(14, 'CNPJ deve ter 14 dígitos'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  categories: z.array(z.string()).min(1, 'Selecione pelo menos uma categoria'),
  specialties: z.array(z.string()).optional(),
  address: z.object({
    street: z.string().min(1, 'Endereço é obrigatório'),
    city: z.string().min(1, 'Cidade é obrigatória'),
    state: z.string().min(2, 'Estado é obrigatório'),
    zipCode: z.string().min(8, 'CEP deve ter 8 dígitos'),
    country: z.string().default('Brasil')
  }),
  contact: z.object({
    phone: z.string().min(10, 'Telefone é obrigatório'),
    email: z.string().email('Email inválido'),
    website: z.string().optional(),
    whatsapp: z.string().optional()
  }),
  workingHours: z.object({
    monday: z.object({
      open: z.string(),
      close: z.string(),
      closed: z.boolean()
    }),
    tuesday: z.object({
      open: z.string(),
      close: z.string(),
      closed: z.boolean()
    }),
    wednesday: z.object({
      open: z.string(),
      close: z.string(),
      closed: z.boolean()
    }),
    thursday: z.object({
      open: z.string(),
      close: z.string(),
      closed: z.boolean()
    }),
    friday: z.object({
      open: z.string(),
      close: z.string(),
      closed: z.boolean()
    }),
    saturday: z.object({
      open: z.string(),
      close: z.string(),
      closed: z.boolean()
    }),
    sunday: z.object({
      open: z.string(),
      close: z.string(),
      closed: z.boolean()
    })
  }),
  serviceAreas: z.array(z.string()).optional(),
  portfolio: z.object({
    projectsCompleted: z.number().min(0),
    yearsExperience: z.number().min(0),
    teamSize: z.number().min(1),
    monthlyCapacity: z.number().min(0),
    averageProjectValue: z.number().min(0)
  }),
  documents: z.array(z.object({
    type: z.string(),
    name: z.string(),
    url: z.string()
  })).optional()
})

const searchSchema = z.object({
  query: z.string().optional(),
  categories: z.array(z.string()).optional(),
  states: z.array(z.string()).optional(),
  minRating: z.number().min(0).max(5).optional(),
  maxPrice: z.number().min(0).optional(),
  verified: z.boolean().optional(),
  featured: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort: z.enum(['rating', 'price', 'experience', 'recent']).default('rating')
})

// GET /api/marketplace/suppliers - Buscar fornecedores
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams)
    
    // Converter arrays de string para arrays
    const params: any = { ...searchParams }
    if (searchParams.categories) {
      params.categories = searchParams.categories.split(',')
    }
    if (searchParams.states) {
      params.states = searchParams.states.split(',')
    }
    
    // Converter valores numéricos
    if (params.minRating) {
      params.minRating = parseFloat(params.minRating)
    }
    if (params.maxPrice) {
      params.maxPrice = parseFloat(params.maxPrice)
    }
    if (params.page) {
      params.page = parseInt(params.page)
    }
    if (params.limit) {
      params.limit = parseInt(params.limit)
    }
    
    // Converter valores booleanos
    if (params.verified) {
      params.verified = params.verified === 'true'
    }
    if (params.featured) {
      params.featured = params.featured === 'true'
    }
    
    const validatedParams = searchSchema.parse(params)
    
    // Buscar fornecedores (implementar lógica de busca)
    const suppliers = await marketplaceService.searchSuppliers(validatedParams)
    
    return NextResponse.json({
      suppliers: suppliers.data,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total: suppliers.total,
        pages: Math.ceil(suppliers.total / validatedParams.limit)
      }
    })
  } catch (error) {
    console.error('Erro ao buscar fornecedores:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/marketplace/suppliers - Criar fornecedor
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as any
    
    const body = await request.json()
    const validatedData = supplierSchema.parse(body)
    
    // Verificar se o usuário já tem um fornecedor
    const existingSupplier = await marketplaceService.getSupplierByUserId(sessionUser.id)
    if (existingSupplier) {
      return NextResponse.json(
        { error: 'Usuário já possui um fornecedor cadastrado' },
        { status: 409 }
      )
    }
    
    // Verificar se o CNPJ já existe
    const existingCnpj = await marketplaceService.getSupplierByCnpj(validatedData.cnpj)
    if (existingCnpj) {
      return NextResponse.json(
        { error: 'CNPJ já cadastrado' },
        { status: 409 }
      )
    }
    
    // Processar documentos com propriedades necessárias
    const processedDocuments = (validatedData.documents || []).map((doc: any) => ({
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: doc.type || 'other',
      name: doc.name,
      url: doc.url,
      uploadedAt: new Date(),
      verified: false
    }))
    
    // Criar fornecedor
    const supplier = await marketplaceService.createSupplier({
      ...validatedData,
      tradeName: validatedData.tradeName || validatedData.companyName,
      userId: sessionUser.id,
      certifications: [],
      documents: processedDocuments,
      status: 'pending',
      featured: false,
      verified: false,
      responseTime: 24,
      responseRate: 100,
      completionRate: 100,
      repeatClientRate: 0,
      metadata: {
        createdFrom: 'web',
        userAgent: request.headers.get('user-agent'),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      supplier,
      message: 'Fornecedor criado com sucesso! Aguarde a verificação.'
    })
  } catch (error) {
    console.error('Erro ao criar fornecedor:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}