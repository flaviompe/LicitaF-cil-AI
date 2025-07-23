import { OpenAI } from 'openai'
import { db } from '@/lib/db'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface EditalAnalysis {
  id: string
  opportunityId: string
  summary: string
  keyRequirements: string[]
  eligibilityCriteria: string[]
  riskAssessment: {
    level: 'LOW' | 'MEDIUM' | 'HIGH'
    factors: string[]
  }
  competitiveAnalysis: {
    estimatedCompetitors: number
    marketAdvantage: string[]
    challenges: string[]
  }
  recommendations: string[]
  estimatedSuccessRate: number
  requiredDocuments: string[]
  timeline: {
    phases: Array<{
      name: string
      date: string
      description: string
    }>
  }
  budgetAnalysis: {
    estimatedCost: number
    profitMargin: number
    costBreakdown: Array<{
      category: string
      amount: number
      percentage: number
    }>
  }
  confidence: number
  createdAt: Date
  updatedAt: Date
}

export class AIAnalysisService {
  private static readonly ANALYSIS_PROMPT = `
    Você é um especialista em licitações públicas brasileiras. Analise o seguinte edital e forneça:
    
    1. RESUMO EXECUTIVO (máximo 200 palavras)
    2. REQUISITOS PRINCIPAIS (lista com 5-10 itens)
    3. CRITÉRIOS DE HABILITAÇÃO (lista detalhada)
    4. AVALIAÇÃO DE RISCO (BAIXO/MÉDIO/ALTO com justificativa)
    5. ANÁLISE COMPETITIVA (número estimado de concorrentes)
    6. RECOMENDAÇÕES ESTRATÉGICAS (5-8 recomendações)
    7. TAXA DE SUCESSO ESTIMADA (percentual)
    8. DOCUMENTOS NECESSÁRIOS (lista completa)
    9. CRONOGRAMA (fases principais)
    10. ANÁLISE ORÇAMENTÁRIA (custos estimados)
    
    Responda em formato JSON estruturado.
  `

  static async analyzeEdital(editalText: string, opportunityId: string): Promise<EditalAnalysis> {
    try {
      // COMENTADO: editalAnalysis não existe no schema Prisma
      // const existingAnalysis = await db.editalAnalysis.findUnique({
      //   where: { opportunityId }
      // })

      // if (existingAnalysis) {
      //   return existingAnalysis as EditalAnalysis
      // }

      // Implementação temporária - sempre processar nova análise
      const existingAnalysis = null

      // Chamar OpenAI para análise
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: this.ANALYSIS_PROMPT
          },
          {
            role: 'user',
            content: `Analise este edital de licitação:\n\n${editalText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      })

      const aiResponse = response.choices[0]?.message?.content

      if (!aiResponse) {
        throw new Error('Erro na resposta da IA')
      }

      // Processar resposta da IA
      const analysis = this.processAIResponse(aiResponse, opportunityId)

      // COMENTADO: editalAnalysis não existe no schema Prisma
      // const savedAnalysis = await db.editalAnalysis.create({
      //   data: {
      //     opportunityId,
      //     summary: analysis.summary,
      //     keyRequirements: analysis.keyRequirements,
      //     eligibilityCriteria: analysis.eligibilityCriteria,
      //     riskLevel: analysis.riskAssessment.level,
      //     riskFactors: analysis.riskAssessment.factors,
      //     estimatedCompetitors: analysis.competitiveAnalysis.estimatedCompetitors,
      //     marketAdvantage: analysis.competitiveAnalysis.marketAdvantage,
      //     challenges: analysis.competitiveAnalysis.challenges,
      //     recommendations: analysis.recommendations,
      //     estimatedSuccessRate: analysis.estimatedSuccessRate,
      //     requiredDocuments: analysis.requiredDocuments,
      //     timeline: analysis.timeline,
      //     budgetAnalysis: analysis.budgetAnalysis,
      //     confidence: analysis.confidence,
      //   }
      // })

      // Implementação temporária - retornar análise sem salvar no banco
      analysis.id = Date.now().toString()
      return analysis

    } catch (error) {
      console.error('Erro na análise de edital:', error)
      throw new Error('Falha na análise do edital')
    }
  }

  private static processAIResponse(response: string, opportunityId: string): EditalAnalysis {
    try {
      // Tentar parsear como JSON
      const parsed = JSON.parse(response)
      
      return {
        id: '', // Será preenchido pelo banco
        opportunityId,
        summary: parsed.summary || '',
        keyRequirements: parsed.keyRequirements || [],
        eligibilityCriteria: parsed.eligibilityCriteria || [],
        riskAssessment: {
          level: parsed.riskAssessment?.level || 'MEDIUM',
          factors: parsed.riskAssessment?.factors || []
        },
        competitiveAnalysis: {
          estimatedCompetitors: parsed.competitiveAnalysis?.estimatedCompetitors || 5,
          marketAdvantage: parsed.competitiveAnalysis?.marketAdvantage || [],
          challenges: parsed.competitiveAnalysis?.challenges || []
        },
        recommendations: parsed.recommendations || [],
        estimatedSuccessRate: parsed.estimatedSuccessRate || 50,
        requiredDocuments: parsed.requiredDocuments || [],
        timeline: parsed.timeline || { phases: [] },
        budgetAnalysis: parsed.budgetAnalysis || {
          estimatedCost: 0,
          profitMargin: 0,
          costBreakdown: []
        },
        confidence: parsed.confidence || 0.7,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    } catch (error) {
      // Fallback para análise básica se JSON falhar
      return this.createBasicAnalysis(response, opportunityId)
    }
  }

  private static createBasicAnalysis(response: string, opportunityId: string): EditalAnalysis {
    return {
      id: '',
      opportunityId,
      summary: response.substring(0, 500) + '...',
      keyRequirements: ['Análise detalhada indisponível'],
      eligibilityCriteria: ['Verificar edital completo'],
      riskAssessment: {
        level: 'MEDIUM',
        factors: ['Análise automática limitada']
      },
      competitiveAnalysis: {
        estimatedCompetitors: 3,
        marketAdvantage: ['A ser determinado'],
        challenges: ['A ser determinado']
      },
      recommendations: ['Revisar edital manualmente'],
      estimatedSuccessRate: 50,
      requiredDocuments: ['Consultar edital'],
      timeline: { phases: [] },
      budgetAnalysis: {
        estimatedCost: 0,
        profitMargin: 0,
        costBreakdown: []
      },
      confidence: 0.3,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  static async getAnalysisHistory(userId: string): Promise<EditalAnalysis[]> {
    try {
      // COMENTADO: editalAnalysis não existe no schema Prisma
      // const analyses = await db.editalAnalysis.findMany({
      //   where: {
      //     opportunity: {
      //       company: {
      //         userId
      //       }
      //     }
      //   },
      //   include: {
      //     opportunity: {
      //       select: {
      //         title: true,
      //         organ: true,
      //         publishDate: true
      //       }
      //     }
      //   },
      //   orderBy: {
      //     createdAt: 'desc'
      //   },
      //   take: 20
      // })

      // return analyses as EditalAnalysis[]

      // Implementação temporária - retornar lista vazia
      return []
    } catch (error) {
      console.error('Erro ao buscar histórico de análises:', error)
      throw new Error('Falha ao carregar histórico')
    }
  }

  static async generateProposalTemplate(analysisId: string): Promise<string> {
    try {
      // COMENTADO: editalAnalysis não existe no schema Prisma
      // const analysis = await db.editalAnalysis.findUnique({
      //   where: { id: analysisId },
      //   include: {
      //     opportunity: true
      //   }
      // })

      // if (!analysis) {
      //   throw new Error('Análise não encontrada')
      // }

      // Implementação temporária - usar dados simulados
      const analysis = {
        summary: 'Análise temporária',
        keyRequirements: ['Requisito 1', 'Requisito 2'],
        recommendations: ['Recomendação 1', 'Recomendação 2']
      }

      const templatePrompt = `
        Com base na análise do edital, gere um template de proposta técnica seguindo:
        
        1. ESTRUTURA PADRÃO
        2. PONTOS CHAVE A ABORDAR
        3. ARGUMENTOS TÉCNICOS
        4. DIFERENCIAIS COMPETITIVOS
        5. CRONOGRAMA SUGERIDO
        6. METODOLOGIA
        
        Dados da análise:
        - Resumo: ${analysis.summary}
        - Requisitos: ${analysis.keyRequirements.join(', ')}
        - Recomendações: ${analysis.recommendations.join(', ')}
      `

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em elaboração de propostas técnicas para licitações públicas.'
          },
          {
            role: 'user',
            content: templatePrompt
          }
        ],
        temperature: 0.4,
        max_tokens: 1500,
      })

      return response.choices[0]?.message?.content || 'Template não pôde ser gerado'

    } catch (error) {
      console.error('Erro ao gerar template:', error)
      throw new Error('Falha na geração do template')
    }
  }

  static async analyzeCompetitorStrength(opportunityId: string, userProfile: any): Promise<{
    strength: 'LOW' | 'MEDIUM' | 'HIGH'
    factors: string[]
    recommendations: string[]
  }> {
    try {
      // COMENTADO: editalAnalysis não existe no schema Prisma
      // const analysis = await db.editalAnalysis.findUnique({
      //   where: { opportunityId }
      // })

      // if (!analysis) {
      //   throw new Error('Análise não encontrada')
      // }

      // Implementação temporária - usar dados simulados
      const analysis = {
        keyRequirements: ['Requisito simulado'],
        estimatedCompetitors: 3
      }

      // Analisar perfil do usuário vs requisitos
      const competitorPrompt = `
        Analise a força competitiva desta empresa para a licitação:
        
        Perfil da Empresa:
        - Tipo: ${userProfile.businessType}
        - Porte: ${userProfile.employeeCount}
        - Experiência: ${userProfile.description}
        
        Requisitos da Licitação:
        ${analysis.keyRequirements.join('\n')}
        
        Concorrentes Estimados: ${analysis.estimatedCompetitors}
        
        Retorne análise de força competitiva (LOW/MEDIUM/HIGH) com fatores e recomendações.
      `

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'Analise a competitividade da empresa para esta licitação.'
          },
          {
            role: 'user',
            content: competitorPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800,
      })

      const result = response.choices[0]?.message?.content || ''
      
      // Processar resposta (simplificado)
      return {
        strength: result.includes('HIGH') ? 'HIGH' : result.includes('LOW') ? 'LOW' : 'MEDIUM',
        factors: ['Análise baseada em IA'],
        recommendations: ['Revisar estratégia competitiva']
      }

    } catch (error) {
      console.error('Erro na análise competitiva:', error)
      throw new Error('Falha na análise competitiva')
    }
  }
}

export const AI_ANALYSIS_FEATURES = {
  BASIC: {
    name: 'Análise Básica',
    features: [
      'Resumo do edital',
      'Requisitos principais',
      'Documentos necessários'
    ],
    limit: 5, // por mês
  },
  PROFESSIONAL: {
    name: 'Análise Profissional',
    features: [
      'Análise completa',
      'Avaliação de risco',
      'Análise competitiva',
      'Recomendações estratégicas',
      'Template de proposta'
    ],
    limit: 50, // por mês
  },
  ENTERPRISE: {
    name: 'Análise Enterprise',
    features: [
      'Análise ilimitada',
      'IA personalizada',
      'Análise de força competitiva',
      'Suporte prioritário',
      'Relatórios customizados'
    ],
    limit: -1, // ilimitado
  }
} as const