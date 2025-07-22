import { EventEmitter } from 'events'
import { WebSocket, WebSocketServer } from 'ws'
import { db } from './db'
import { randomUUID } from 'crypto'

export type MessageType = 'text' | 'image' | 'file' | 'system'
export type ChatStatus = 'waiting' | 'active' | 'closed'
export type ParticipantRole = 'user' | 'agent' | 'system' | 'bot'

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
  rating?: number
  tags?: string[]
}

export interface ChatAgent {
  id: string
  name: string
  status: 'online' | 'away' | 'busy' | 'offline'
  departments: string[]
  maxConcurrentChats: number
  currentChats: number
  skills: string[]
}

export interface BotResponse {
  patterns: RegExp[]
  responses: string[]
  requiresHuman?: boolean
  category: string
}

export class AdvancedChatService extends EventEmitter {
  private static instance: AdvancedChatService
  private wss: WebSocketServer | null = null
  private connections: Map<string, WebSocket> = new Map()
  private activeSessions: Map<string, ChatSession> = new Map()
  private agents: Map<string, ChatAgent> = new Map()
  private chatQueue: Map<string, { session: ChatSession; waitTime: number; priority: number }> = new Map()
  private botResponses: Map<string, BotResponse> = new Map()

  private constructor() {
    super()
    this.setupDatabase()
    this.initializeBotResponses()
    this.startQueueProcessor()
  }

  static getInstance(): AdvancedChatService {
    if (!AdvancedChatService.instance) {
      AdvancedChatService.instance = new AdvancedChatService()
    }
    return AdvancedChatService.instance
  }

  private initializeBotResponses() {
    // Respostas automáticas do bot especializado em licitações
    this.botResponses.set('greeting', {
      patterns: [
        /\b(ol[aá]|oi|bom\s+dia|boa\s+tarde|boa\s+noite|hey|hello)\b/i,
        /^(ol[aá]|oi)$/i
      ],
      responses: [
        '👋 Olá! Bem-vindo ao **LicitaFácil Pro**! Sou o LicitaBot, seu assistente especializado em licitações públicas.\n\n🎯 **Como posso ajudar hoje?**\n• Análise de editais\n• Documentação necessária\n• Prazos e procedimentos\n• Estratégias ME/EPP\n• Questões jurídicas\n\nDigite sua dúvida que vou orientá-lo!',
        '🤖 Oi! Sou seu assistente inteligente para licitações públicas! \n\n**Estou aqui para ajudar com:**\n📋 Análise de editais\n💰 Precificação estratégica\n📄 Documentação obrigatória\n⚖️ Questões jurídicas\n🎯 Benefícios ME/EPP\n\nQual sua dúvida sobre licitações?'
      ],
      category: 'greeting'
    })

    this.botResponses.set('help', {
      patterns: [
        /\b(ajuda|help|socorro|auxilio|orientação)\b/i,
        /\b(não\s+sei|como\s+fazer|me\s+ajude)\b/i,
        /\b(o\s+que\s+posso|que\s+você\s+faz)\b/i
      ],
      responses: [
        '🆘 **Central de Ajuda LicitaFácil Pro**\n\n**📚 Principais tópicos:**\n\n**1. 📋 EDITAIS**\n• Como analisar editais\n• Identificar oportunidades ME/EPP\n• Detectar vícios licitatórios\n\n**2. 💰 PRECIFICAÇÃO**\n• Cálculo de custos\n• Estratégias competitivas\n• Empate ficto ME/EPP\n\n**3. 📄 DOCUMENTAÇÃO**\n• Certidões obrigatórias\n• Habilitação jurídica\n• Qualificação técnica\n\n**4. ⚖️ ASPECTOS LEGAIS**\n• Recursos e impugnações\n• Prazos legais\n• Benefícios ME/EPP\n\n**Digite o número ou o nome do tópico que deseja saber mais!**'
      ],
      category: 'help'
    })

    this.botResponses.set('documents', {
      patterns: [
        /\b(document[oa]s?|certid[õã]es?|habilitação|regularidade)\b/i,
        /\b(cnd|cndt|fgts|inss|receita|municipal|estadual)\b/i,
        /\b(o\s+que\s+preciso|quais\s+documentos)\b/i
      ],
      responses: [
        '📄 **DOCUMENTAÇÃO COMPLETA PARA LICITAÇÕES ME/EPP**\n\n**🏛️ HABILITAÇÃO JURÍDICA:**\n• CNPJ atualizado\n• Contrato Social consolidado\n• Atas de eleição da diretoria\n• Declaração ME/EPP\n\n**💰 REGULARIDADE FISCAL:**\n• CND Federal (Receita Federal)\n• CND Estadual (ICMS)\n• CND Municipal (ISS/IPTU)\n• FGTS (Caixa Econômica)\n• CNDT (Trabalhista)\n\n**🔧 QUALIFICAÇÃO TÉCNICA:**\n• Atestados de capacidade técnica\n• Registro no órgão competente\n• Certificações ISO (quando exigidas)\n\n**💼 QUALIFICAÇÃO ECONÔMICA:**\n• Balanço patrimonial\n• Capital social mínimo\n• Certidão falimentar\n\n**✅ VANTAGEM ME/EPP:** Documentação apresentada apenas pelo vencedor!\n\nPrecisa de orientação sobre algum documento específico?'
      ],
      category: 'documents'
    })

    this.botResponses.set('deadlines', {
      patterns: [
        /\b(prazo|quando|até\s+quando|data|vencimento|limite)\b/i,
        /\b(recurso|impugnação|proposta|abertura)\b/i,
        /\b(quantos\s+dias|tempo\s+para)\b/i
      ],
      responses: [
        '⏰ **PRAZOS LEGAIS EM LICITAÇÕES**\n\n**🚨 ANTES DA ABERTURA:**\n• **Impugnação:** Até 3 dias úteis antes da abertura\n• **Pedidos de Esclarecimento:** Até 3 dias úteis antes da abertura\n• **Proposta:** Até data/hora exata da sessão de abertura\n\n**📋 DURANTE O PROCESSO:**\n• **Recursos (Pregão):** 3 dias úteis após resultado\n• **Recursos (Concorrência):** 5 dias úteis após resultado\n• **Documentação ME/EPP:** Após resultado (se vencedor)\n\n**⚡ EMPATE FICTO ME/EPP:**\n• **Manifestação:** 2 dias úteis após resultado\n• **Nova proposta:** Prazo definido no edital\n\n**🎯 DICAS IMPORTANTES:**\n• Prazos contam apenas dias ÚTEIS\n• Horário de Brasília sempre\n• Protocolos eletrônicos até 23h59\n\n**Qual prazo específico você quer saber?**'
      ],
      category: 'deadlines'
    })

    this.botResponses.set('pricing', {
      patterns: [
        /\b(preço|valor|custo|precificação|proposta\s+comercial|orçamento)\b/i,
        /\b(quanto\s+cobrar|como\s+calcular|margem|lucro)\b/i,
        /\b(competitivo|barato|caro)\b/i
      ],
      responses: [
        '💰 **PRECIFICAÇÃO ESTRATÉGICA PARA LICITAÇÕES**\n\n**🎯 ESTRATÉGIA ME/EPP:**\n• **Empate Ficto:** Pode ofertar até 10% acima do menor preço\n• **Vantagem Competitiva:** Use isso a seu favor!\n\n**📊 CÁLCULO DE CUSTOS:**\n• **Custos Diretos:** Material + Mão de obra\n• **Custos Indiretos:** Administração (15-25%)\n• **Impostos:** PIS, COFINS, CSLL, IRPJ\n• **Margem de Lucro:** 8-15% (dependendo da complexidade)\n\n**🔍 ANÁLISE HISTÓRICA:**\n• Use nossa IA para consultar preços históricos\n• Analise licitações similares\n• Verifique média de mercado\n\n**⚠️ CUIDADOS:**\n• Não seja o mais barato sempre\n• Considere qualidade vs preço\n• Mantenha sustentabilidade financeira\n\n**🤖 DICA:** Nossa ferramenta de precificação inteligente pode calcular automaticamente!\n\n**Quer fazer uma análise de preços para uma licitação específica?**',
        '💡 **PRECIFICAÇÃO INTELIGENTE - DICAS AVANÇADAS**\n\n**🎲 ESTRATÉGIAS COMPETITIVAS:**\n• **Análise de Concorrentes:** Estude participações anteriores\n• **Sazonalidade:** Considere época do ano\n• **Urgência do Órgão:** Prazos apertados = preços maiores\n\n**📈 VANTAGEM ME/EPP:**\n• **10% de Margem Extra:** Direito ao empate ficto\n• **Menos Burocracia:** Documentação posterior\n• **Preferência:** Em caso de empate técnico\n\n**🧮 FÓRMULA SUGERIDA:**\n```\nPREÇO = (Custos Diretos × 1.25) + Impostos + Margem\nMargem ME/EPP = Pode ser até 18% (8% base + 10% empate)\n```\n\n**Precisa de ajuda com cálculos específicos?**'
      ],
      category: 'pricing'
    })

    this.botResponses.set('legal', {
      patterns: [
        /\b(lei|legal|jurídico|recurso|impugnação|direito)\b/i,
        /\b(lc\s*123|14\.?133|8\.?666|10\.?520)\b/i,
        /\b(tcu|tribunal\s+de\s+contas|ministério\s+público)\b/i
      ],
      responses: [
        '⚖️ **ASPECTOS JURÍDICOS - LICITAÇÕES 2024**\n\n**📜 PRINCIPAIS LEIS:**\n• **Lei 14.133/2021:** Nova Lei de Licitações\n• **LC 123/2006:** Estatuto da ME/EPP\n• **Lei 10.520/2002:** Lei do Pregão\n• **Lei 8.666/93:** Lei anterior (ainda aplicável)\n\n**🏆 BENEFÍCIOS ME/EPP (LC 123/2006):**\n• **Art. 44:** Licitações exclusivas (até R$ 880k)\n• **Art. 48:** Empate ficto (até 10% acima)\n• **Art. 43:** Documentação simplificada\n• **Art. 47:** Habilitação posterior\n\n**⚡ RECURSOS DISPONÍVEIS:**\n• **Impugnação:** Questionar vícios do edital\n• **Recurso Administrativo:** Contra resultado\n• **Representação:** TCU/TCE para irregularidades\n\n**🎯 NOSSA IA JURÍDICA:**\n• Análise automática de vícios\n• Precedentes do TCU\n• Minutas de impugnação prontas\n• Estratégias de defesa personalizadas\n\n**Precisa de análise jurídica específica? Nossa IA especializada pode ajudar!**',
        '📋 **RECURSOS E DEFESAS - GUIA PRÁTICO**\n\n**🚨 QUANDO IMPUGNAR:**\n• Exigências restritivas à concorrência\n• Especificações que direcionem marca\n• Prazos inexequíveis ou abusivos\n• Desrespeito aos benefícios ME/EPP\n\n**⏱️ PRAZOS PARA AÇÃO:**\n• **Impugnação:** 3 dias úteis antes da abertura\n• **Recurso:** 3 dias úteis após resultado\n• **Representação:** Sem prazo específico\n\n**📝 DOCUMENTOS NECESSÁRIOS:**\n• Fundamentação legal detalhada\n• Jurisprudência favorável (TCU/TCE)\n• Provas da irregularidade\n• Pedido específico de correção\n\n**🤖 NOSSA AJUDA:**\n• IA analisa automaticamente vícios\n• Gera minutas profissionais\n• Cita precedentes aplicáveis\n• Calcula probabilidade de sucesso\n\n**Quer que eu analise um edital específico para vícios?**'
      ],
      category: 'legal',
      requiresHuman: true
    })

    this.botResponses.set('mepp_benefits', {
      patterns: [
        /\b(me\/epp|micro\s+empresa|pequena\s+empresa|empate\s+ficto)\b/i,
        /\b(benefício|vantagem|direito|preferência)\b/i,
        /\b(10\s*%|dez\s+por\s+cento|margem\s+adicional)\b/i
      ],
      responses: [
        '🎯 **BENEFÍCIOS EXCLUSIVOS ME/EPP - LC 123/2006**\n\n**💎 PRINCIPAIS VANTAGENS:**\n\n**1. 🥇 EMPATE FICTO (Art. 44, §2º)**\n• Direito de cobrir proposta até 10% acima da sua\n• Manifestação em até 2 dias úteis\n• Pode vencer mesmo não sendo o menor preço!\n\n**2. 📄 DOCUMENTAÇÃO POSTERIOR (Art. 43)**\n• Não precisa entregar habilitação com proposta\n• Só o vencedor apresenta documentos\n• Reduz custos e riscos\n\n**3. 🎪 LICITAÇÕES EXCLUSIVAS (Art. 48)**\n• Obras até R$ 330.000\n• Serviços até R$ 330.000\n• Compras até R$ 880.000\n• SEM concorrência com grandes empresas!\n\n**4. 🏆 PREFERÊNCIA DE CONTRATAÇÃO**\n• Em caso de empate técnico e comercial\n• Prioridade para empresas locais\n• Critério de desempate favorável\n\n**5. 📊 SUBCONTRATAÇÃO OBRIGATÓRIA**\n• 25% mínimo para ME/EPP em obras\n• 30% mínimo em serviços de engenharia\n• Oportunidade mesmo em grandes contratos\n\n**✅ COMO USAR:** Sempre declare seu porte e monitore oportunidades exclusivas!\n\n**Quer que eu identifique oportunidades ME/EPP específicas para seu ramo?**'
      ],
      category: 'mepp_benefits'
    })

    this.botResponses.set('goodbye', {
      patterns: [
        /\b(tchau|adeus|obrigad[oa]|valeu|até\s+logo|bye|flw)\b/i,
        /\b(já\s+vou|preciso\s+ir|até\s+mais|finalizando)\b/i
      ],
      responses: [
        '👋 **Foi um prazer ajudar!** \n\n🎯 **Lembre-se dos seus diferenciais:**\n• Nossa IA jurídica está sempre aqui 24/7\n• Análise automática de editais em segundos\n• Detecção de vícios e oportunidades ME/EPP\n• Precificação inteligente baseada em histórico\n\n📱 **Próximos passos:**\n• Continue explorando o LicitaFácil Pro\n• Configure alertas para suas categorias\n• Use nossa automação de propostas\n\n🏆 **Sucesso nas suas licitações!** Estamos torcendo por você!\n\n*Sempre que precisar, estarei aqui! 🤖*',
        '😊 **Obrigado por usar nosso suporte!** \n\n⭐ **Você tem acesso a:**\n• Monitoramento 24/7 de oportunidades\n• IA jurídica especializada em licitações\n• Sistema de workflow automatizado\n• Precificação competitiva inteligente\n\n🚀 **Continue aproveitando todas as funcionalidades do LicitaFácil Pro!**\n\nAté mais e boa sorte nas suas participações! 🎯'
      ],
      category: 'goodbye'
    })

    this.botResponses.set('technical', {
      patterns: [
        /\b(certificado\s+digital|token|problema\s+técnico|erro|não\s+funciona)\b/i,
        /\b(comprasnet|bec|licitações-e|navegador|java)\b/i,
        /\b(login|senha|acesso|sistema\s+fora)\b/i
      ],
      responses: [
        '💻 **SUPORTE TÉCNICO - LICITAÇÕES ELETRÔNICAS**\n\n**🔐 CERTIFICADO DIGITAL:**\n• **A1:** Arquivo no computador\n• **A3:** Token/cartão\n• **Validade:** Máximo 3 anos\n• **Instalação:** Sempre como administrador\n\n**🌐 PRINCIPAIS PLATAFORMAS:**\n• **ComprasNet (Federal):** Chrome recomendado\n• **BEC-SP:** Internet Explorer/Edge\n• **Licitações-e (BB):** Java atualizado\n• **TCE-SP:** Chrome/Firefox\n\n**⚠️ PROBLEMAS COMUNS:**\n• **Java desatualizado:** Baixe versão mais recente\n• **Certificado não detectado:** Reinstale drivers\n• **Bloqueador pop-up:** Desabilite para o site\n• **Cache corrompido:** Limpe cookies/cache\n\n**🔧 CHECKLIST RÁPIDO:**\n1. Certificado dentro da validade?\n2. Java/navegador atualizados?\n3. Pop-ups liberados?\n4. Certificado instalado corretamente?\n\n**Ainda com problemas técnicos? Vou conectá-lo com nosso suporte especializado!**'
      ],
      category: 'technical',
      requiresHuman: true
    })
  }

  private startQueueProcessor() {
    // Processar fila a cada 30 segundos
    setInterval(() => {
      this.processQueue()
    }, 30000)

    // Limpar conexões inativas a cada 5 minutos
    setInterval(() => {
      this.cleanupConnections()
    }, 5 * 60 * 1000)
  }

  private async processQueue() {
    if (this.chatQueue.size === 0) return

    const queuedChats = Array.from(this.chatQueue.entries())
      .sort(([, a], [, b]) => {
        // Ordem: Prioridade alta > Tempo de espera > Prioridade média > Prioridade baixa
        const priorityDiff = b.priority - a.priority
        if (priorityDiff !== 0) return priorityDiff
        return b.waitTime - a.waitTime
      })

    for (const [chatId, queueItem] of queuedChats.slice(0, 10)) { // Processar até 10 por vez
      const availableAgent = await this.findAvailableAgent(queueItem.session)
      
      if (availableAgent) {
        await this.assignAgentToChat(chatId, availableAgent.id)
        this.chatQueue.delete(chatId)
      } else {
        // Incrementar tempo de espera
        queueItem.waitTime += 30
        
        // Notificar sobre tempo de espera prolongado
        if (queueItem.waitTime % 300 === 0) { // A cada 5 minutos
          await this.notifyLongWait(chatId, queueItem)
        }
      }
    }
  }

  private async findAvailableAgent(session: ChatSession): Promise<ChatAgent | null> {
    const availableAgents = Array.from(this.agents.values())
      .filter(agent => 
        agent.status === 'online' && 
        agent.currentChats < agent.maxConcurrentChats &&
        (session.department ? agent.departments.includes(session.department) : true)
      )
      .sort((a, b) => a.currentChats - b.currentChats) // Menor carga primeiro

    return availableAgents[0] || null
  }

  private async assignAgentToChat(chatId: string, agentId: string) {
    const session = this.activeSessions.get(chatId)
    const agent = this.agents.get(agentId)
    
    if (!session || !agent) return

    session.agentId = agentId
    session.agentName = agent.name
    session.status = 'active'
    
    agent.currentChats++
    if (agent.currentChats >= agent.maxConcurrentChats) {
      agent.status = 'busy'
    }

    // Atualizar no banco
    await this.updateSessionInDB(session)

    // Notificar entrada do agente
    const systemMessage: ChatMessage = {
      id: randomUUID(),
      chatId,
      senderId: 'system',
      senderName: 'Sistema',
      senderRole: 'system',
      content: `🎉 **${agent.name}** entrou no chat! Especialista em licitações pronto para ajudar.`,
      type: 'system',
      timestamp: new Date()
    }

    await this.saveMessage(systemMessage)
    session.messages.push(systemMessage)

    this.broadcastToChat(chatId, {
      type: 'agent_assigned',
      agent: { id: agentId, name: agent.name },
      message: systemMessage
    })

    this.emit('agent_assigned', { chatId, agentId })
  }

  private async notifyLongWait(chatId: string, queueItem: any) {
    const waitMinutes = Math.floor(queueItem.waitTime / 60)
    const position = this.getQueuePosition(chatId)
    const estimatedWait = this.calculateEstimatedWait()

    const systemMessage: ChatMessage = {
      id: randomUUID(),
      chatId,
      senderId: 'system',
      senderName: 'Sistema',
      senderRole: 'system',
      content: `⏰ **Atualização da Fila**\n\nVocê está aguardando há ${waitMinutes} minutos.\n**Posição:** ${position}\n**Tempo estimado:** ${Math.ceil(estimatedWait / 60)} minutos\n\nObrigado pela paciência! Um especialista estará com você em breve.`,
      type: 'system',
      timestamp: new Date()
    }

    await this.saveMessage(systemMessage)
    this.broadcastToChat(chatId, {
      type: 'queue_update',
      position,
      waitTime: queueItem.waitTime,
      estimatedWait,
      message: systemMessage
    })
  }

  private getQueuePosition(chatId: string): number {
    const sortedQueue = Array.from(this.chatQueue.entries())
      .sort(([, a], [, b]) => b.priority - a.priority || b.waitTime - a.waitTime)
    
    return sortedQueue.findIndex(([id]) => id === chatId) + 1
  }

  private calculateEstimatedWait(): number {
    const queueLength = this.chatQueue.size
    const availableAgents = Array.from(this.agents.values())
      .filter(agent => agent.status === 'online' || (agent.status === 'busy' && agent.currentChats < agent.maxConcurrentChats))
      .length

    if (availableAgents === 0) return 10 * 60 // 10 minutos default

    const avgChatDuration = 8 * 60 // 8 minutos média por chat
    return Math.ceil(queueLength / Math.max(availableAgents, 1)) * avgChatDuration
  }

  private cleanupConnections() {
    this.connections.forEach((ws, connectionId) => {
      if (ws.readyState === WebSocket.CLOSED) {
        this.connections.delete(connectionId)
      }
    })
  }

  // Sistema de Bot Inteligente com Fallback para IA
  async processBotResponse(message: ChatMessage): Promise<ChatMessage | null> {
    const content = message.content.toLowerCase().trim()
    
    // Procurar por padrões conhecidos
    for (const [category, botResponse] of this.botResponses) {
      for (const pattern of botResponse.patterns) {
        if (pattern.test(content)) {
          const randomResponse = botResponse.responses[Math.floor(Math.random() * botResponse.responses.length)]
          
          const response: ChatMessage = {
            id: randomUUID(),
            chatId: message.chatId,
            senderId: 'licitabot',
            senderName: '🤖 LicitaBot',
            senderRole: 'bot',
            content: randomResponse,
            type: 'text',
            timestamp: new Date(),
            metadata: { 
              category: botResponse.category,
              requiresHuman: botResponse.requiresHuman || false
            }
          }

          // Se requer agente humano, adicionar à fila
          if (botResponse.requiresHuman) {
            setTimeout(() => {
              this.addToQueue(message.chatId)
            }, 2000)
          }

          return response
        }
      }
    }

    // Se não encontrou padrão, tentar IA jurídica contextual
    return await this.generateAIResponse(message)
  }

  private async generateAIResponse(message: ChatMessage): Promise<ChatMessage | null> {
    try {
      // Integração com sistema de IA jurídica
      const aiResponse = await this.getContextualAIResponse(message.content, message.chatId)
      
      if (aiResponse) {
        return {
          id: randomUUID(),
          chatId: message.chatId,
          senderId: 'ai-legal',
          senderName: '🧠 IA Jurídica',
          senderRole: 'system',
          content: `**🤖 Resposta da IA Especializada:**\n\n${aiResponse}\n\n---\n*💡 Para análises mais detalhadas ou casos complexos, posso conectá-lo com um especialista humano!*`,
          type: 'text',
          timestamp: new Date(),
          metadata: { 
            source: 'ai_legal',
            confidence: 0.85
          }
        }
      }
    } catch (error) {
      console.error('Erro ao gerar resposta da IA:', error)
    }

    // Fallback: Adicionar à fila para atendimento humano
    setTimeout(() => {
      this.addToQueue(message.chatId)
    }, 1000)

    return {
      id: randomUUID(),
      chatId: message.chatId,
      senderId: 'system',
      senderName: 'Sistema',
      senderRole: 'system',
      content: '🤔 Sua pergunta é muito específica! Vou conectá-lo com um especialista humano que poderá dar uma orientação mais detalhada.\n\n⏰ Aguarde um momento que alguém da nossa equipe estará com você em breve.',
      type: 'text',
      timestamp: new Date()
    }
  }

  private async getContextualAIResponse(query: string, chatId: string): Promise<string | null> {
    const lowerQuery = query.toLowerCase()

    // Respostas contextuais baseadas em palavras-chave
    if (lowerQuery.includes('me/epp') || lowerQuery.includes('micro') || lowerQuery.includes('pequena')) {
      return `**📊 ANÁLISE ME/EPP PERSONALIZADA:**

**Seus direitos como ${lowerQuery.includes('micro') ? 'Microempresa' : 'Empresa de Pequeno Porte'}:**

• **🎯 Empate Ficto:** Direito de cobrir propostas até 10% acima da sua
• **📄 Documentação Simplificada:** Entrega apenas se for o vencedor
• **🏆 Preferência:** Critério de desempate sempre favorável
• **💰 Licitações Exclusivas:** Participação sem grandes empresas

**Estratégia recomendada:**
1. Monitore oportunidades exclusivas para ME/EPP
2. Use margem adicional de 8-10% na precificação
3. Mantenha documentação sempre atualizada
4. Acompanhe prazos de manifestação do empate ficto

**Posso analisar oportunidades específicas para seu perfil empresarial!**`
    }

    if (lowerQuery.includes('prazo') || lowerQuery.includes('recurso') || lowerQuery.includes('impugnar')) {
      return `**⏰ GESTÃO ESTRATÉGICA DE PRAZOS:**

**Prazos críticos que não pode perder:**

**🚨 PRÉ-LICITAÇÃO:**
• **Impugnação:** 3 dias úteis antes da abertura
• **Esclarecimentos:** 3 dias úteis antes da abertura

**⚖️ PÓS-RESULTADO:**
• **Recurso Pregão:** 3 dias úteis
• **Recurso Concorrência:** 5 dias úteis
• **Empate Ficto ME/EPP:** 2 dias úteis para manifestação

**💡 DICA ESTRATÉGICA:**
Configure nossos alertas automáticos para nunca perder um prazo. O sistema monitora automaticamente e notifica você com antecedência!

**Precisa de análise específica de algum edital?**`
    }

    if (lowerQuery.includes('preço') || lowerQuery.includes('valor') || lowerQuery.includes('orçar')) {
      return `**💰 ESTRATÉGIA DE PRECIFICAÇÃO INTELIGENTE:**

**Fórmula otimizada para ME/EPP:**

\`\`\`
Custos Diretos: Material + Mão de obra
+ Custos Indiretos: 20-25% dos diretos
+ Impostos: Conforme regime tributário
+ Margem Base: 10-15%
+ Margem Estratégica ME/EPP: +8-10%
= PREÇO COMPETITIVO
\`\`\`

**🎯 Vantagem Competitiva:**
• Como ME/EPP, pode ofertar 10% acima e ainda ganhar
• Use isso para garantir margem saudável
• Analise histórico de preços da nossa base de dados

**Nossa IA de precificação pode calcular automaticamente baseado em:**
• Histórico de licitações similares
• Índices oficiais (SINAPI, SICRO)
• Análise de concorrência
• Sazonalidade do mercado

**Quer fazer um cálculo para uma licitação específica?**`
    }

    return null
  }

  // Método principal para adicionar sessão à fila
  private async addToQueue(chatId: string) {
    const session = this.activeSessions.get(chatId)
    if (!session || this.chatQueue.has(chatId)) return

    const priorityMap = { high: 3, medium: 2, low: 1 }
    
    this.chatQueue.set(chatId, {
      session,
      waitTime: 0,
      priority: priorityMap[session.priority] || 2
    })

    const position = this.getQueuePosition(chatId)
    const estimatedWait = this.calculateEstimatedWait()

    // Mensagem informativa sobre a fila
    const queueMessage: ChatMessage = {
      id: randomUUID(),
      chatId,
      senderId: 'system',
      senderName: 'Sistema',
      senderRole: 'system',
      content: `📋 **Adicionado à Fila de Atendimento**\n\n**Posição:** ${position}\n**Tempo estimado:** ${Math.ceil(estimatedWait / 60)} minutos\n**Prioridade:** ${session.priority.toUpperCase()}\n\n⏰ Enquanto aguarda, continue explorando nossas funcionalidades de análise automática!`,
      type: 'system',
      timestamp: new Date()
    }

    await this.saveMessage(queueMessage)
    session.messages.push(queueMessage)

    this.broadcastToChat(chatId, {
      type: 'added_to_queue',
      position,
      estimatedWait,
      priority: session.priority,
      message: queueMessage
    })
  }

  // Métodos de banco de dados
  async setupDatabase() {
    try {
      // Criar tabelas se não existirem
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
          rating TINYINT,
          tags JSON,
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
        CREATE TABLE IF NOT EXISTS chat_agents (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          status VARCHAR(20) DEFAULT 'offline',
          departments JSON,
          skills JSON,
          max_concurrent_chats INT DEFAULT 3,
          current_chats INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    } catch (error) {
      console.error('Erro ao configurar banco de dados do chat:', error)
    }
  }

  private async saveMessage(message: ChatMessage) {
    try {
      await db.$executeRaw`
        INSERT INTO chat_messages (id, chat_id, sender_id, sender_name, sender_role, content, type, timestamp, metadata)
        VALUES (${message.id}, ${message.chatId}, ${message.senderId}, ${message.senderName}, ${message.senderRole}, ${message.content}, ${message.type}, ${message.timestamp}, ${JSON.stringify(message.metadata || {})})
      `
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error)
    }
  }

  private async updateSessionInDB(session: ChatSession) {
    try {
      await db.$executeRaw`
        UPDATE chat_sessions 
        SET agent_id = ${session.agentId || null}, 
            agent_name = ${session.agentName || null}, 
            status = ${session.status},
            last_activity = CURRENT_TIMESTAMP
        WHERE id = ${session.id}
      `
    } catch (error) {
      console.error('Erro ao atualizar sessão:', error)
    }
  }

  private broadcastToChat(chatId: string, data: any) {
    // Broadcast para todas as conexões ativas (filtrar por chatId seria ideal)
    this.connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          ...data,
          chatId,
          timestamp: new Date().toISOString()
        }))
      }
    })
  }

  // API Pública para gerenciamento de agentes
  async registerAgent(agentData: {
    id: string
    name: string
    email?: string
    departments: string[]
    skills: string[]
    maxConcurrentChats?: number
  }) {
    const agent: ChatAgent = {
      id: agentData.id,
      name: agentData.name,
      status: 'online',
      departments: agentData.departments,
      maxConcurrentChats: agentData.maxConcurrentChats || 3,
      currentChats: 0,
      skills: agentData.skills
    }

    this.agents.set(agentData.id, agent)

    // Salvar no banco
    try {
      await db.$executeRaw`
        INSERT INTO chat_agents (id, name, email, departments, skills, max_concurrent_chats)
        VALUES (${agent.id}, ${agent.name}, ${agentData.email || null}, ${JSON.stringify(agent.departments)}, ${JSON.stringify(agent.skills)}, ${agent.maxConcurrentChats})
        ON DUPLICATE KEY UPDATE 
          name = VALUES(name),
          departments = VALUES(departments),
          skills = VALUES(skills),
          max_concurrent_chats = VALUES(max_concurrent_chats),
          last_activity = CURRENT_TIMESTAMP
      `
    } catch (error) {
      console.error('Erro ao registrar agente:', error)
    }

    this.emit('agent_registered', agent)
    console.log(`Agente registrado: ${agent.name} (${agent.departments.join(', ')})`)
  }

  async updateAgentStatus(agentId: string, status: ChatAgent['status']) {
    const agent = this.agents.get(agentId)
    if (!agent) return

    agent.status = status
    
    try {
      await db.$executeRaw`
        UPDATE chat_agents 
        SET status = ${status}, last_activity = CURRENT_TIMESTAMP
        WHERE id = ${agentId}
      `
    } catch (error) {
      console.error('Erro ao atualizar status do agente:', error)
    }

    this.emit('agent_status_changed', { agentId, status })
  }

  // Analytics avançadas
  async getChatAnalytics(startDate?: Date, endDate?: Date) {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const end = endDate || new Date()

      const analytics = await Promise.all([
        // Total de chats
        db.$queryRaw`SELECT COUNT(*) as total FROM chat_sessions WHERE created_at >= ${start} AND created_at <= ${end}`,
        
        // Chats resolvidos
        db.$queryRaw`SELECT COUNT(*) as resolved FROM chat_sessions WHERE status = 'closed' AND created_at >= ${start} AND created_at <= ${end}`,
        
        // Tempo médio de primeira resposta
        db.$queryRaw`
          SELECT AVG(TIMESTAMPDIFF(SECOND, cs.created_at, 
            (SELECT MIN(cm.timestamp) FROM chat_messages cm 
             WHERE cm.chat_id = cs.id AND cm.sender_role IN ('agent', 'bot'))
          )) as avg_first_response
          FROM chat_sessions cs 
          WHERE cs.created_at >= ${start} AND cs.created_at <= ${end}
        `,
        
        // Satisfação média
        db.$queryRaw`SELECT AVG(rating) as avg_rating FROM chat_sessions WHERE rating IS NOT NULL AND created_at >= ${start} AND created_at <= ${end}`,
        
        // Taxa de resolução por bots
        db.$queryRaw`
          SELECT 
            COUNT(CASE WHEN cs.agent_id IS NULL THEN 1 END) as bot_resolved,
            COUNT(*) as total_chats
          FROM chat_sessions cs 
          WHERE cs.status = 'closed' AND cs.created_at >= ${start} AND cs.created_at <= ${end}
        `,
        
        // Categorias mais frequentes
        db.$queryRaw`
          SELECT JSON_EXTRACT(metadata, '$.category') as category, COUNT(*) as count
          FROM chat_messages 
          WHERE sender_role = 'bot' 
            AND timestamp >= ${start} 
            AND timestamp <= ${end}
            AND JSON_EXTRACT(metadata, '$.category') IS NOT NULL
          GROUP BY JSON_EXTRACT(metadata, '$.category')
          ORDER BY count DESC
          LIMIT 5
        `
      ])

      const [total, resolved, firstResponse, rating, botStats, categories] = analytics

      return {
        period: { start, end },
        totalChats: (total as any)[0]?.total || 0,
        resolvedChats: (resolved as any)[0]?.resolved || 0,
        resolutionRate: ((resolved as any)[0]?.resolved || 0) / Math.max((total as any)[0]?.total || 1, 1) * 100,
        avgFirstResponseTime: (firstResponse as any)[0]?.avg_first_response || 0,
        customerSatisfaction: (rating as any)[0]?.avg_rating || 0,
        botResolutionRate: ((botStats as any)[0]?.bot_resolved || 0) / Math.max((botStats as any)[0]?.total_chats || 1, 1) * 100,
        topCategories: categories || [],
        queueStats: {
          currentQueue: this.chatQueue.size,
          averageWaitTime: this.calculateEstimatedWait(),
          onlineAgents: Array.from(this.agents.values()).filter(a => a.status === 'online').length
        }
      }
    } catch (error) {
      console.error('Erro ao gerar analytics do chat:', error)
      return null
    }
  }

  // Métodos públicos para controle
  async getQueueStats() {
    return {
      totalInQueue: this.chatQueue.size,
      averageWaitTime: this.calculateEstimatedWait(),
      onlineAgents: Array.from(this.agents.values()).filter(a => a.status === 'online').length,
      busyAgents: Array.from(this.agents.values()).filter(a => a.status === 'busy').length,
      queueByPriority: {
        high: Array.from(this.chatQueue.values()).filter(q => q.priority === 3).length,
        medium: Array.from(this.chatQueue.values()).filter(q => q.priority === 2).length,
        low: Array.from(this.chatQueue.values()).filter(q => q.priority === 1).length
      }
    }
  }

  async getActiveSessions(): Promise<ChatSession[]> {
    return Array.from(this.activeSessions.values())
  }

  // Inicialização do WebSocket (integração com servidor)
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
          await this.handleWebSocketMessage(connectionId, userId, role as ParticipantRole, message)
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error)
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Erro ao processar mensagem'
          }))
        }
      })

      ws.on('close', () => {
        this.connections.delete(connectionId)
      })

      ws.send(JSON.stringify({
        type: 'connected',
        connectionId,
        timestamp: new Date().toISOString()
      }))
    })

    console.log('🚀 WebSocket server avançado inicializado para chat com IA')
  }

  private async handleWebSocketMessage(connectionId: string, userId: string, role: ParticipantRole, message: any) {
    const ws = this.connections.get(connectionId)
    if (!ws) return

    switch (message.type) {
      case 'start_chat':
        await this.startChatSession(userId, message.data, ws)
        break
      case 'send_message':
        await this.handleChatMessage(userId, role, message.data, ws)
        break
      case 'join_chat':
        await this.joinChatAsAgent(userId, role, message.chatId, ws)
        break
      case 'close_chat':
        await this.closeChatSession(userId, message.chatId)
        break
      case 'get_queue_stats':
        const stats = await this.getQueueStats()
        ws.send(JSON.stringify({ type: 'queue_stats', data: stats }))
        break
      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Tipo de mensagem não reconhecido'
        }))
    }
  }

  private async startChatSession(userId: string, data: any, ws: WebSocket) {
    try {
      // Buscar usuário no banco
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
        messages: [],
        tags: data.tags || []
      }

      // Salvar no banco
      await db.$executeRaw`
        INSERT INTO chat_sessions (id, user_id, user_name, user_email, status, subject, department, priority, tags)
        VALUES (${chatId}, ${userId}, ${user.name}, ${user.email}, 'waiting', ${session.subject}, ${session.department}, ${session.priority}, ${JSON.stringify(session.tags || [])})
      `

      this.activeSessions.set(chatId, session)

      // Mensagem de boas-vindas
      const welcomeMessage: ChatMessage = {
        id: randomUUID(),
        chatId,
        senderId: 'system',
        senderName: 'LicitaFácil Pro',
        senderRole: 'system',
        content: `🎉 **Bem-vindo, ${user.name}!**\n\nSou o **LicitaBot**, seu assistente especializado em licitações públicas!\n\n💡 **Posso ajudar com:**\n• Análise de editais e oportunidades\n• Documentação e prazos\n• Benefícios ME/EPP\n• Estratégias de precificação\n• Questões jurídicas\n\n**Digite sua pergunta ou dúvida que vou orientá-lo!** 🚀`,
        type: 'text',
        timestamp: new Date()
      }

      await this.saveMessage(welcomeMessage)
      session.messages.push(welcomeMessage)

      ws.send(JSON.stringify({
        type: 'chat_started',
        chatId,
        session,
        message: welcomeMessage
      }))

      this.emit('chat_started', session)

    } catch (error) {
      console.error('Erro ao iniciar chat:', error)
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Erro ao iniciar chat'
      }))
    }
  }

  private async handleChatMessage(userId: string, role: ParticipantRole, data: any, ws: WebSocket) {
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

      // Buscar dados do remetente
      const sender = await db.user.findUnique({ where: { id: userId } })
      if (!sender) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Usuário não encontrado'
        }))
        return
      }

      // Criar mensagem do usuário
      const userMessage: ChatMessage = {
        id: randomUUID(),
        chatId,
        senderId: userId,
        senderName: sender.name,
        senderRole: role,
        content,
        type,
        timestamp: new Date()
      }

      await this.saveMessage(userMessage)
      session.messages.push(userMessage)
      session.lastActivity = new Date()

      // Broadcast mensagem do usuário
      this.broadcastToChat(chatId, {
        type: 'new_message',
        message: userMessage
      })

      // Se não há agente atribuído, tentar resposta do bot
      if (role === 'user' && !session.agentId) {
        const botResponse = await this.processBotResponse(userMessage)
        
        if (botResponse) {
          await this.saveMessage(botResponse)
          session.messages.push(botResponse)
          
          // Broadcast resposta do bot
          this.broadcastToChat(chatId, {
            type: 'new_message',
            message: botResponse
          })
        }
      }

      this.emit('message_sent', userMessage)

    } catch (error) {
      console.error('Erro ao processar mensagem:', error)
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Erro ao enviar mensagem'
      }))
    }
  }

  private async joinChatAsAgent(userId: string, role: ParticipantRole, chatId: string, ws: WebSocket) {
    if (role !== 'agent') return

    const session = this.activeSessions.get(chatId)
    if (!session) return

    const agent = this.agents.get(userId)
    if (!agent) return

    await this.assignAgentToChat(chatId, userId)
    
    ws.send(JSON.stringify({
      type: 'chat_joined',
      chatId,
      session,
      messages: session.messages
    }))
  }

  private async closeChatSession(userId: string, chatId: string) {
    const session = this.activeSessions.get(chatId)
    if (!session) return

    session.status = 'closed'
    session.closedAt = new Date()

    await db.$executeRaw`
      UPDATE chat_sessions 
      SET status = 'closed', closed_at = CURRENT_TIMESTAMP
      WHERE id = ${chatId}
    `

    // Liberar agente se houver
    if (session.agentId) {
      const agent = this.agents.get(session.agentId)
      if (agent) {
        agent.currentChats = Math.max(0, agent.currentChats - 1)
        if (agent.currentChats < agent.maxConcurrentChats) {
          agent.status = 'online'
        }
      }
    }

    this.broadcastToChat(chatId, {
      type: 'chat_closed',
      chatId,
      closedBy: userId
    })

    this.activeSessions.delete(chatId)
    this.chatQueue.delete(chatId)
    
    this.emit('chat_closed', { chatId, userId })
  }
}

// Instância singleton
export const advancedChatService = AdvancedChatService.getInstance()