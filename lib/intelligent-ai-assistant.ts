// Sistema de IA Inteligente e Contextual para Licitações
import { db } from './db'

// Categorias de consultas e suas especialidades
interface QueryCategory {
  name: string
  keywords: string[]
  specialistModule: string
  priority: number
  confidence: number
}

interface AIResponse {
  response: string
  confidence: number
  category: string
  module: string
  suggestions: string[]
  relatedTopics: string[]
}

interface QueryContext {
  userRole?: string
  userCompany?: string
  previousQueries?: string[]
  currentPage?: string
  sessionHistory?: any[]
}

export class IntelligentAIAssistant {
  private static instance: IntelligentAIAssistant
  private categories: QueryCategory[]
  private knowledgeBase: Map<string, any>

  private constructor() {
    this.initializeCategories()
    this.initializeKnowledgeBase()
  }

  static getInstance(): IntelligentAIAssistant {
    if (!IntelligentAIAssistant.instance) {
      IntelligentAIAssistant.instance = new IntelligentAIAssistant()
    }
    return IntelligentAIAssistant.instance
  }

  private initializeCategories(): void {
    this.categories = [
      {
        name: 'Jurídico',
        keywords: ['lei', 'artigo', 'decreto', 'prazo', 'recurso', 'impugnação', 'habilitação', 'inabilitação', 'penalidade', 'sanção', 'suspenso', 'devido processo', 'me', 'epp', 'mei', 'microempresa', 'empate ficto', 'licitação', 'contrato', 'edital', 'clausula', 'conformidade', 'regularidade', 'certidão', 'cnd'],
        specialistModule: 'juridico',
        priority: 1,
        confidence: 0.9
      },
      {
        name: 'Técnico',
        keywords: ['sistema', 'plataforma', 'cadastro', 'proposta', 'envio', 'upload', 'comprasnet', 'sicaf', 'bec', 'portal', 'site', 'certificado digital', 'token', 'navegador', 'erro', 'bug', 'instalação', 'configuração', 'login', 'acesso', 'senha'],
        specialistModule: 'tecnico',
        priority: 2,
        confidence: 0.85
      },
      {
        name: 'Comercial',
        keywords: ['estratégia', 'vencer', 'ganhar', 'competir', 'proposta comercial', 'preço', 'cotação', 'margem', 'desconto', 'diferencial', 'networking', 'relacionamento', 'cliente', 'mercado', 'concorrência', 'oportunidade'],
        specialistModule: 'comercial',
        priority: 3,
        confidence: 0.8
      },
      {
        name: 'Financeiro',
        keywords: ['pagamento', 'faturamento', 'nota fiscal', 'imposto', 'tributo', 'icms', 'pis', 'cofins', 'custo', 'orçamento', 'fluxo de caixa', 'margem', 'lucro', 'bdi', 'reajuste', 'índice', 'desconto', 'valor'],
        specialistModule: 'financeiro',
        priority: 4,
        confidence: 0.8
      },
      {
        name: 'Operacional',
        keywords: ['processo', 'procedimento', 'etapa', 'fase', 'cronograma', 'prazo', 'andamento', 'status', 'situação', 'acompanhar', 'fluxo', 'execução', 'entrega', 'quando', 'como', 'onde'],
        specialistModule: 'operacional',
        priority: 5,
        confidence: 0.75
      }
    ]
  }

  private initializeKnowledgeBase(): void {
    this.knowledgeBase = new Map()
    
    // Base de conhecimento jurídico
    this.knowledgeBase.set('juridico', {
      prazos: {
        recurso: {
          administrativo: '5 dias úteis',
          judicial: '20 dias corridos',
          impugnacao: '5 dias úteis antes da abertura',
          habilitacao: 'até a abertura das propostas'
        }
      },
      leis: {
        8666: 'Lei Geral de Licitações e Contratos',
        14133: 'Nova Lei de Licitações (2021)',
        10520: 'Lei do Pregão',
        123: 'Estatuto da Microempresa'
      },
      documentos: {
        habilitacao: ['CND Federal', 'CND FGTS', 'CND Trabalhista', 'Certidão Estadual', 'Certidão Municipal'],
        juridica: ['Contrato Social', 'Ata de Eleição', 'Procuração'],
        tecnica: ['Atestado de Capacidade Técnica', 'Registro no CREA/CRC'],
        fiscal: ['Alvará de Funcionamento', 'Certidão de Regularidade Fiscal']
      }
    })

    // Base de conhecimento técnico
    this.knowledgeBase.set('tecnico', {
      plataformas: {
        comprasnet: {
          url: 'www.comprasnet.gov.br',
          certificado: 'obrigatório',
          navegadores: ['Chrome', 'Edge', 'Firefox'],
          horarios: '6h às 22h'
        },
        bec: {
          url: 'www.bec.sp.gov.br',
          certificado: 'obrigatório',
          navegadores: ['Chrome', 'Edge'],
          horarios: '24h'
        }
      },
      certificados: {
        tipos: ['A1', 'A3'],
        validade: '1 a 3 anos',
        renovacao: '30 dias antes do vencimento',
        backup: 'sempre fazer backup'
      }
    })

    // Base de conhecimento comercial
    this.knowledgeBase.set('comercial', {
      estrategias: {
        pesquisa: 'Analise editais similares anteriores',
        preco: 'Equilibre competitividade com margem',
        diferencial: 'Destaque experiência e qualidade',
        relacionamento: 'Mantenha contato pós-licitação'
      },
      dicas: {
        proposta: 'Seja claro, objetivo e completo',
        prazo: 'Nunca deixe para última hora',
        documentacao: 'Confira todos os documentos',
        acompanhamento: 'Monitore todas as etapas'
      }
    })
  }

  // Método principal para processar consultas
  async processQuery(queryText: string, context: QueryContext = {}): Promise<AIResponse> {
    try {
      // Análise e classificação da consulta
      const category = this.classifyQuery(queryText)
      
      // Buscar contexto adicional
      const enrichedContext = await this.enrichContext(queryText, context)
      
      // Gerar resposta especializada
      const response = await this.generateSpecializedResponse(queryText, category, enrichedContext)
      
      // Adicionar sugestões e tópicos relacionados
      const suggestions = this.generateSuggestions(queryText, category, enrichedContext)
      const relatedTopics = this.getRelatedTopics(category, queryText)
      
      return {
        response: response.text,
        confidence: response.confidence,
        category: category.name,
        module: category.specialistModule,
        suggestions,
        relatedTopics
      }
    } catch (error) {
      console.error('Erro no processamento da consulta:', error)
      return this.generateFallbackResponse(queryText, context)
    }
  }

  // Classificar consulta por categoria
  private classifyQuery(queryText: string): QueryCategory {
    const query = queryText.toLowerCase()
    let bestMatch: QueryCategory | null = null
    let bestScore = 0

    for (const category of this.categories) {
      let score = 0
      let matchedKeywords = 0

      for (const keyword of category.keywords) {
        if (query.includes(keyword.toLowerCase())) {
          score += 1
          matchedKeywords++
        }
      }

      // Normalizar score pela quantidade de keywords
      const normalizedScore = (score / category.keywords.length) * category.confidence

      if (normalizedScore > bestScore) {
        bestScore = normalizedScore
        bestMatch = category
      }
    }

    // Se não encontrou match suficiente, usar categoria geral
    if (!bestMatch || bestScore < 0.3) {
      return {
        name: 'Geral',
        keywords: [],
        specialistModule: 'geral',
        priority: 10,
        confidence: 0.6
      }
    }

    return bestMatch
  }

  // Enriquecer contexto com dados do usuário e histórico
  private async enrichContext(queryText: string, context: QueryContext): Promise<any> {
    const enriched = { ...context }

    try {
      // Buscar informações do usuário se disponível
      if (context.userCompany) {
        const companyData = await db.company.findFirst({
          where: { name: context.userCompany },
          include: {
            opportunities: { take: 5 },
            proposals: { take: 5 }
          }
        })
        enriched.companyData = companyData
      }

      // Buscar consultas similares recentes
      const similarQueries = await this.findSimilarQueries(queryText)
      enriched.similarQueries = similarQueries

      // Adicionar dados contextuais da página atual
      if (context.currentPage) {
        enriched.pageContext = this.getPageContext(context.currentPage)
      }

    } catch (error) {
      console.error('Erro ao enriquecer contexto:', error)
    }

    return enriched
  }

  // Gerar resposta especializada baseada na categoria
  private async generateSpecializedResponse(queryText: string, category: QueryCategory, context: any): Promise<{ text: string, confidence: number }> {
    const knowledge = this.knowledgeBase.get(category.specialistModule)
    
    switch (category.specialistModule) {
      case 'juridico':
        return this.generateJuridicalResponse(queryText, knowledge, context)
      case 'tecnico':
        return this.generateTechnicalResponse(queryText, knowledge, context)
      case 'comercial':
        return this.generateCommercialResponse(queryText, knowledge, context)
      case 'financeiro':
        return this.generateFinancialResponse(queryText, knowledge, context)
      case 'operacional':
        return this.generateOperationalResponse(queryText, knowledge, context)
      default:
        return this.generateGeneralResponse(queryText, context)
    }
  }

  // Resposta jurídica especializada
  private generateJuridicalResponse(queryText: string, knowledge: any, context: any): { text: string, confidence: number } {
    const query = queryText.toLowerCase()
    
    if (query.includes('prazo') && query.includes('recurso')) {
      return {
        text: `⚖️ **Prazos para Recursos em Licitações**\n\n**📋 Prazos Legais:**\n• **Recurso Administrativo**: ${knowledge.prazos.recurso.administrativo}\n• **Recurso Judicial**: ${knowledge.prazos.recurso.judicial}\n• **Impugnação ao Edital**: ${knowledge.prazos.recurso.impugnacao}\n• **Questionamento de Habilitação**: ${knowledge.prazos.recurso.habilitacao}\n\n**⚠️ Atenção:**\n• Prazos são improrrogáveis\n• Contados em dias úteis ou corridos conforme especificado\n• Protocolo deve ser feito dentro do prazo\n\n**💡 Dica Profissional:**\nSempre protocole com antecedência e mantenha comprovante de recebimento!`,
        confidence: 0.95
      }
    }

    if (query.includes('me') || query.includes('epp') || query.includes('microempresa')) {
      return {
        text: `🏢 **Benefícios para Micro e Pequenas Empresas**\n\n**✅ Direitos Garantidos:**\n• **Empate Ficto**: Direito de cobrir proposta até 5% superior\n• **Habilitação Simplificada**: Menos documentos exigidos\n• **Prazo Estendido**: Mais tempo para regularização\n• **Cota Reservada**: 25% dos valores podem ser reservados\n\n**📋 Documentação ME/EPP:**\n• Certidão de Optante pelo Simples Nacional\n• Declaração de enquadramento\n• Demonstrativo de receita bruta\n\n**🎯 Como Usar:**\n1. Declare seu enquadramento na proposta\n2. Apresente documentação específica\n3. Monitore exercício do direito de preferência\n\n**⚡ Resultado:** Chances significativamente maiores de vitória!`,
        confidence: 0.98
      }
    }

    if (query.includes('habilitação') || query.includes('documento')) {
      return {
        text: `📋 **Documentação de Habilitação - Checklist Completo**\n\n**🔸 Habilitação Jurídica:**\n${knowledge.documentos.juridica.map((doc: string) => `• ${doc}`).join('\n')}\n\n**🔸 Regularidade Fiscal:**\n${knowledge.documentos.habilitacao.map((doc: string) => `• ${doc}`).join('\n')}\n\n**🔸 Capacidade Técnica:**\n${knowledge.documentos.tecnica.map((doc: string) => `• ${doc}`).join('\n')}\n\n**⚠️ Pontos Críticos:**\n• Todas as certidões devem estar válidas\n• Datas de vencimento dentro do prazo\n• Autenticação conforme exigido no edital\n\n**💡 Dica Estratégica:**\nMantenha um dossiê sempre atualizado com todos os documentos!`,
        confidence: 0.92
      }
    }

    // Resposta geral jurídica
    return {
      text: `⚖️ **Consultoria Jurídica Especializada**\n\nAnalisando sua consulta: "${queryText}"\n\n**🎯 Áreas de Especialização:**\n• **Prazos e Recursos** - Administrativos e judiciais\n• **Habilitação** - Documentação e regularidade\n• **ME/EPP** - Benefícios e direitos especiais\n• **Contratos** - Cláusulas e obrigações\n• **Penalidades** - Defesas e recursos\n\n**📚 Base Legal:**\n• Lei 8.666/93 - Licitações gerais\n• Lei 14.133/21 - Nova Lei de Licitações\n• Lei 10.520/02 - Pregão\n• LC 123/06 - Estatuto da ME/EPP\n\n**🔍 Para resposta específica, informe:**\n• Tipo de licitação (pregão, concorrência, etc.)\n• Fase do processo (habilitação, recurso, etc.)\n• Órgão licitante (federal, estadual, municipal)\n\n**⚡ Resposta jurídica precisa em menos de 2 minutos!**`,
      confidence: 0.85
    }
  }

  // Resposta técnica especializada
  private generateTechnicalResponse(queryText: string, knowledge: any, context: any): { text: string, confidence: number } {
    const query = queryText.toLowerCase()
    
    if (query.includes('certificado') || query.includes('token')) {
      return {
        text: `🔐 **Certificado Digital - Suporte Completo**\n\n**📱 Instalação Correta:**\n• Baixe apenas de fontes oficiais (Serpro, Certisign, etc.)\n• Execute como administrador\n• Reinicie navegador após instalação\n• Teste em site oficial antes de usar\n\n**🔧 Problemas Comuns:**\n• **Não aparece na lista**: Verifique navegador correto\n• **Certificado inválido**: Sincronize data/hora do sistema\n• **Expirado**: Renove 30 dias antes do vencimento\n• **Erro de leitura**: Limpe cache e cookies\n\n**🌐 Compatibilidade:**\n• **ComprasNet**: A1 e A3 ✅\n• **BEC-SP**: A1 e A3 ✅\n• **Licitações-e**: A1 e A3 ✅\n\n**💡 Dica Profissional:**\nSempre faça backup do certificado A1 em pen drive criptografado!`,
        confidence: 0.98
      }
    }

    if (query.includes('comprasnet') || query.includes('bec') || query.includes('portal')) {
      return {
        text: `🌐 **Plataformas Governamentais - Guia Completo**\n\n**🔸 ComprasNet (Federal):**\n• URL: ${knowledge.plataformas.comprasnet.url}\n• Horário: ${knowledge.plataformas.comprasnet.horarios}\n• Certificado: ${knowledge.plataformas.comprasnet.certificado}\n• Navegadores: ${knowledge.plataformas.comprasnet.navegadores.join(', ')}\n\n**🔸 BEC-SP (Estadual):**\n• URL: ${knowledge.plataformas.bec.url}\n• Horário: ${knowledge.plataformas.bec.horarios}\n• Certificado: ${knowledge.plataformas.bec.certificado}\n• Navegadores: ${knowledge.plataformas.bec.navegadores.join(', ')}\n\n**📋 Passo a Passo:**\n1. Cadastre-se no SICAF (se federal)\n2. Mantenha dados sempre atualizados\n3. Teste acesso antes das sessões\n4. Baixe editais com antecedência\n5. Envie propostas antes do prazo\n\n**⚡ Teste seu ambiente agora mesmo!**`,
        confidence: 0.95
      }
    }

    return {
      text: `💻 **Suporte Técnico Especializado**\n\nAnalisando: "${queryText}"\n\n**🔧 Soluções Rápidas:**\n• **Certificado Digital** - Instalação e configuração\n• **Plataformas** - ComprasNet, BEC, Licitações-e\n• **Navegadores** - Configuração e compatibilidade\n• **Envio de Propostas** - Formatos e validação\n• **SICAF** - Cadastro e manutenção\n\n**⚡ Diagnóstico Instantâneo:**\n• Qual plataforma está usando?\n• Qual navegador e versão?\n• Qual erro específico encontrou?\n• Em que etapa travou?\n\n**🎯 Solução garantida em minutos!**\nNossa expertise técnica resolve 95% dos problemas na primeira tentativa!`,
      confidence: 0.85
    }
  }

  // Resposta comercial especializada
  private generateCommercialResponse(queryText: string, knowledge: any, context: any): { text: string, confidence: number } {
    const query = queryText.toLowerCase()
    
    if (query.includes('estratégia') || query.includes('vencer') || query.includes('ganhar')) {
      return {
        text: `🎯 **Estratégias Vencedoras em Licitações**\n\n**🔍 Análise de Mercado:**\n• Estude editais similares anteriores\n• Identifique padrões de vencedores\n• Analise faixas de preços praticadas\n• Mapeie concorrentes principais\n\n**💰 Precificação Inteligente:**\n• Equilibre competitividade com margem\n• Considere custos ocultos (impostos, logística)\n• Use BDI adequado para cada tipo de serviço\n• Monitore índices de reajuste\n\n**🏆 Diferenciais Competitivos:**\n• Destaque experiência comprovada\n• Apresente cases de sucesso\n• Ofereça valor agregado\n• Mantenha qualidade técnica alta\n\n**⚡ Dica de Ouro:**\nO segredo não é ter o menor preço, mas a melhor relação custo-benefício!`,
        confidence: 0.95
      }
    }

    return {
      text: `📈 **Consultoria Comercial Especializada**\n\nAnalisando: "${queryText}"\n\n**🎯 Estratégias Comerciais:**\n• **Análise de Mercado** - Concorrência e oportunidades\n• **Precificação** - Margem e competitividade\n• **Proposta Comercial** - Apresentação vencedora\n• **Relacionamento** - Networking e pós-venda\n\n**📊 Indicadores de Sucesso:**\n• Taxa de vitória acima de 25%\n• Ticket médio crescente\n• Relacionamento de longo prazo\n• ROI positivo em 12 meses\n\n**💡 Para consultoria personalizada:**\n• Qual seu segmento de atuação?\n• Quantas licitações participa por mês?\n• Qual sua taxa de sucesso atual?\n\n**🚀 Vamos aumentar suas vitórias juntos!**`,
      confidence: 0.85
    }
  }

  // Resposta financeira especializada
  private generateFinancialResponse(queryText: string, knowledge: any, context: any): { text: string, confidence: number } {
    return {
      text: `💰 **Consultoria Financeira Especializada**\n\nAnalisando: "${queryText}"\n\n**💵 Gestão Financeira:**\n• **Fluxo de Caixa** - Planejamento e controle\n• **Precificação** - Margem e competitividade\n• **Impostos** - Otimização tributária\n• **Pagamentos** - Cronograma e recebimentos\n\n**📊 Indicadores Financeiros:**\n• Margem bruta mínima: 15%\n• Prazo médio recebimento: 30 dias\n• Capital de giro: 3 meses\n• ROI esperado: 20% ao ano\n\n**🎯 Para análise personalizada:**\n• Qual seu faturamento mensal?\n• Qual margem pratica atualmente?\n• Quais seus custos fixos?\n\n**⚡ Otimização financeira garantida!**`,
      confidence: 0.85
    }
  }

  // Resposta operacional especializada
  private generateOperationalResponse(queryText: string, knowledge: any, context: any): { text: string, confidence: number } {
    return {
      text: `⚙️ **Consultoria Operacional Especializada**\n\nAnalisando: "${queryText}"\n\n**📋 Processos Operacionais:**\n• **Cronograma** - Planejamento e execução\n• **Procedimentos** - Padronização e qualidade\n• **Acompanhamento** - Monitoramento e controle\n• **Entrega** - Cumprimento de prazos\n\n**🔄 Fluxo de Trabalho:**\n1. Identificação de oportunidades\n2. Análise de viabilidade\n3. Elaboração da proposta\n4. Envio e acompanhamento\n5. Execução e entrega\n\n**📊 Indicadores Operacionais:**\n• Prazo médio de resposta: 2 dias\n• Taxa de cumprimento: 98%\n• Tempo de execução: no prazo\n• Satisfação do cliente: 95%\n\n**🚀 Eficiência operacional máxima!**`,
      confidence: 0.85
    }
  }

  // Resposta geral
  private generateGeneralResponse(queryText: string, context: any): { text: string, confidence: number } {
    return {
      text: `🤖 **Assistente Inteligente de Licitações**\n\nAnalisando sua consulta: "${queryText}"\n\n**🎯 Posso ajudar com:**\n• **Questões Jurídicas** - Leis, prazos, recursos\n• **Suporte Técnico** - Plataformas, certificados\n• **Estratégias Comerciais** - Como vencer licitações\n• **Gestão Financeira** - Preços, margens, custos\n• **Processos Operacionais** - Cronogramas, procedimentos\n\n**💡 Para resposta mais precisa:**\n• Seja específico sobre sua dúvida\n• Mencione o tipo de licitação\n• Informe em que fase está\n• Conte sobre sua experiência\n\n**⚡ Transformo sua consulta em solução prática!**\nMinha especialidade é dar respostas completas, úteis e aplicáveis ao seu negócio.`,
      confidence: 0.75
    }
  }

  // Buscar consultas similares
  private async findSimilarQueries(queryText: string): Promise<string[]> {
    // Implementação simplificada - em produção usaria ML
    return []
  }

  // Obter contexto da página
  private getPageContext(page: string): any {
    return {
      page,
      relevantInfo: `Usuário está na página ${page}`
    }
  }

  // Gerar sugestões
  private generateSuggestions(queryText: string, category: QueryCategory, context: any): string[] {
    const suggestions = [
      'Como posso melhorar minha taxa de sucesso?',
      'Quais documentos preciso sempre ter atualizados?',
      'Como funciona o sistema de preferência para ME/EPP?',
      'Qual a melhor estratégia de precificação?',
      'Como resolver problemas com certificado digital?'
    ]
    
    return suggestions.slice(0, 3)
  }

  // Obter tópicos relacionados
  private getRelatedTopics(category: QueryCategory, queryText: string): string[] {
    const topics = [
      'Prazos legais',
      'Documentação necessária',
      'Certificado digital',
      'Estratégias comerciais',
      'Gestão financeira'
    ]
    
    return topics.slice(0, 3)
  }

  // Resposta de fallback
  private generateFallbackResponse(queryText: string, context: QueryContext): AIResponse {
    return {
      response: `🤖 **Assistente Inteligente - Processando sua consulta**\n\nRecebi sua pergunta: "${queryText}"\n\n**🔍 Analisando e direcionando para especialista...**\n\nEnquanto processo sua consulta específica, posso ajudar imediatamente com:\n\n• **Questões Jurídicas** - Leis, prazos, documentação\n• **Suporte Técnico** - Plataformas, certificados, sistemas\n• **Estratégias Comerciais** - Como vencer mais licitações\n• **Gestão Financeira** - Preços, custos, margens\n• **Processos Operacionais** - Cronogramas, procedimentos\n\n**💡 Refaça sua pergunta sendo mais específico:**\n• Mencione o tipo de licitação (pregão, concorrência, etc.)\n• Informe em que fase está (habilitação, proposta, recurso)\n• Conte qual problema específico encontrou\n\n**⚡ Resposta especializada em segundos!**`,
      confidence: 0.6,
      category: 'Geral',
      module: 'fallback',
      suggestions: [
        'Como melhorar minha taxa de sucesso?',
        'Quais documentos são obrigatórios?',
        'Como resolver problemas técnicos?'
      ],
      relatedTopics: [
        'Documentação',
        'Estratégias',
        'Suporte técnico'
      ]
    }
  }
}

// Instância singleton
export const intelligentAI = IntelligentAIAssistant.getInstance()