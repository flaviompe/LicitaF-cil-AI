import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AIAnalysisService } from '@/lib/ai-analysis'
import { db } from '@/lib/db'
import { z } from 'zod'

const analyzeSchema = z.object({
  editalText: z.string().min(100, 'Texto do edital muito curto'),
  analysisType: z.enum(['quick', 'complete', 'competitive']),
  userId: z.string(),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as { id: string }

    const body = await request.json()
    const { editalText, analysisType, userId } = analyzeSchema.parse(body)

    // Verificar se o usuário pode usar IA
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        company: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const currentPlan = 'Pro' // Temporariamente definir como Pro

    // Verificar limite de uso (usando Proposal como proxy)
    const monthlyUsage = await db.proposal.count({
      where: {
        opportunity: {
          company: {
            userId: userId
          }
        },
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    })

    const planLimits = {
      'Starter': 5,
      'Professional': 50,
      'Enterprise': -1
    }

    const usageLimit = planLimits[currentPlan as keyof typeof planLimits] || 5
    const canUseAI = usageLimit === -1 || monthlyUsage < usageLimit

    if (!canUseAI) {
      return NextResponse.json({ 
        error: 'Limite de análises atingido para este plano' 
      }, { status: 403 })
    }

    // Criar oportunidade temporária para análise
    const tempOpportunity = await db.opportunity.create({
      data: {
        title: 'Análise Temporária',
        description: editalText.substring(0, 500),
        editalNumber: 'TEMP-' + Date.now(),
        organ: 'Análise IA',
        publishDate: new Date(),
        openingDate: new Date(),
        bidType: 'PREGAO_ELETRONICO',
        status: 'OPEN',
        companyId: user.company?.id || '',
      }
    })

    // Processar análise com IA
    let analysisResult

    try {
      if (process.env.NODE_ENV === 'development') {
        // Simular resposta da IA em desenvolvimento
        analysisResult = await simulateAIAnalysis(editalText, tempOpportunity.id)
      } else {
        // Usar OpenAI em produção
        analysisResult = await AIAnalysisService.analyzeEdital(editalText, tempOpportunity.id)
      }

      // Salvar análise no banco (temporariamente comentado - modelo não existe)
      // await db.editalAnalysis.create({ ... })
      console.log('Analysis completed for user:', userId, 'Type:', analysisType)

      return NextResponse.json({
        success: true,
        analysis: analysisResult,
        remainingAnalyses: usageLimit === -1 ? -1 : usageLimit - monthlyUsage - 1
      })

    } catch (error) {
      console.error('Erro na análise de IA:', error)
      
      // Limpar oportunidade temporária em caso de erro
      await db.opportunity.delete({
        where: { id: tempOpportunity.id }
      })

      return NextResponse.json({
        error: 'Erro na análise do edital'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Erro na API de análise:', error)
    
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

// Função para simular análise IA em desenvolvimento
async function simulateAIAnalysis(editalText: string, opportunityId: string) {
  // Simular delay da IA
  await new Promise(resolve => setTimeout(resolve, 3000))

  return {
    id: '',
    opportunityId,
    summary: `Análise do edital: ${editalText.substring(0, 200)}... Este edital apresenta oportunidade interessante para empresas do setor com foco em prestação de serviços especializados. Os requisitos são claros e o prazo é adequado para preparação de proposta competitiva.`,
    keyRequirements: [
      'Certidão de Regularidade Fiscal',
      'Comprovação de Capacidade Técnica',
      'Garantia de Proposta de 1% do valor',
      'Registro no CNPJ há mais de 2 anos',
      'Atestado de Capacidade Técnica'
    ],
    eligibilityCriteria: [
      'Empresa constituída há mais de 2 anos',
      'Certidões negativas em dia',
      'Capital social mínimo de R$ 50.000',
      'Experiência comprovada no setor'
    ],
    riskAssessment: {
      level: 'MEDIUM' as const,
      factors: [
        'Concorrência moderada esperada',
        'Requisitos técnicos específicos',
        'Prazo adequado para preparação'
      ]
    },
    competitiveAnalysis: {
      estimatedCompetitors: 8,
      marketAdvantage: [
        'Experiência no setor público',
        'Certificações específicas',
        'Equipe técnica qualificada'
      ],
      challenges: [
        'Preço competitivo necessário',
        'Documentação extensa',
        'Prazo apertado para entrega'
      ]
    },
    recommendations: [
      'Revisar detalhadamente os requisitos técnicos',
      'Preparar documentação com antecedência',
      'Considerar parcerias estratégicas',
      'Avaliar margem de lucro versus competitividade',
      'Focar na qualidade técnica da proposta'
    ],
    estimatedSuccessRate: 65,
    requiredDocuments: [
      'Certidão Receita Federal',
      'Certidão FGTS',
      'Certidão Trabalhista',
      'Balanço Patrimonial',
      'Atestado de Capacidade Técnica'
    ],
    timeline: {
      phases: [
        {
          name: 'Preparação de Documentos',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Reunir e preparar toda documentação necessária'
        },
        {
          name: 'Elaboração da Proposta',
          date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Desenvolver proposta técnica e comercial'
        },
        {
          name: 'Submissão',
          date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Enviar proposta final'
        }
      ]
    },
    budgetAnalysis: {
      estimatedCost: 150000,
      profitMargin: 20,
      costBreakdown: [
        { category: 'Mão de obra', amount: 80000, percentage: 53 },
        { category: 'Materiais', amount: 40000, percentage: 27 },
        { category: 'Overhead', amount: 20000, percentage: 13 },
        { category: 'Margem', amount: 30000, percentage: 20 }
      ]
    },
    confidence: 0.78,
    createdAt: new Date(),
    updatedAt: new Date()
  }
}