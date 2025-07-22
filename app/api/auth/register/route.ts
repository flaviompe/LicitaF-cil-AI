import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  cnpj: z.string().min(14, 'CNPJ inválido'),
  companyName: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password, cnpj, companyName, phone, address, city, state, zipCode } = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Usuário já existe com este email' },
        { status: 400 }
      )
    }

    // Check if CNPJ already exists
    const existingCompany = await db.company.findUnique({
      where: { cnpj }
    })

    if (existingCompany) {
      return NextResponse.json(
        { error: 'CNPJ já cadastrado' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user and company in transaction
    const result = await db.$transaction(async (prisma) => {
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        }
      })

      const company = await prisma.company.create({
        data: {
          cnpj,
          name: companyName,
          email,
          phone,
          address,
          city,
          state,
          zipCode,
          userId: user.id,
        }
      })

      return { user, company }
    })

    return NextResponse.json(
      { 
        message: 'Usuário criado com sucesso',
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          company: {
            id: result.company.id,
            name: result.company.name,
            cnpj: result.company.cnpj,
          }
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    
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