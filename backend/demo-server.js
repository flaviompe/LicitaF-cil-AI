const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Carregar dados demo
const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/demo-users.json'), 'utf8'));
const opportunities = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/demo-opportunities.json'), 'utf8'));
const queries = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/demo-queries.json'), 'utf8'));

// Sistema de categorização e roteamento inteligente aprimorado
const categoryClassifier = {
  juridico: {
    keywords: ['prazo', 'recurso', 'lei', 'artigo', 'decreto', 'penalidade', 'sanção', 'suspenso', 'impugnação', 'habilitação', 'documentos', 'certidão', 'cnd', 'jurídico', 'advogado', 'legal', 'inexigibilidade', 'dispensa', 'licitação', 'contrato', 'me', 'epp', 'mei', 'microempresa', 'empate', 'ficto', 'devido', 'habilitação', 'inabilitação', 'conformidade', 'edital', 'clausula'],
    priority: 1,
    fallbackScore: 0.7
  },
  tecnico: {
    keywords: ['cadastro', 'plataforma', 'sistema', 'proposta', 'envio', 'upload', 'site', 'portal', 'comprasnet', 'sicaf', 'cnpj', 'senha', 'login', 'acesso', 'certificado', 'digital', 'erro', 'bug', 'instalação', 'configuração', 'navegador'],
    priority: 2,
    fallbackScore: 0.6
  },
  financeiro: {
    keywords: ['pagamento', 'nota', 'fiscal', 'faturamento', 'imposto', 'tributo', 'icms', 'pis', 'cofins', 'desconto', 'valor', 'preço', 'cotação', 'orçamento', 'custo', 'margem', 'lucro', 'bdi', 'reajuste', 'índice'],
    priority: 3,
    fallbackScore: 0.6
  },
  operacional: {
    keywords: ['etapa', 'cronograma', 'prazo', 'fase', 'procedimento', 'quando', 'como', 'onde', 'processo', 'andamento', 'status', 'situação', 'acompanhar', 'fluxo', 'execução', 'entrega'],
    priority: 4,
    fallbackScore: 0.5
  },
  estrategico: {
    keywords: ['vencer', 'ganhar', 'estratégia', 'dica', 'performance', 'competir', 'melhorar', 'resultado', 'sucesso', 'experiência', 'histórico', 'networking', 'relacionamento', 'diferencial'],
    priority: 5,
    fallbackScore: 0.5
  }
};

// Módulos especializados - simulação para demo
const modules = {
  juridico: {
    processQuery: function(queryText, context = {}) {
      // Não chamar generateLegalResponse para evitar loop infinito
      return processDirectLegalQuery(queryText, context);
    }
  },
  tecnico: {
    processQuery: function(queryText, context = {}) {
      const query = queryText.toLowerCase();
      
      // Respostas específicas para problemas técnicos comuns
      if (query.includes('erro') || query.includes('bug') || query.includes('problema')) {
        return {
          response: "🔧 **Resolução de Problemas Técnicos**\n\nVamos resolver isso! Para problemas técnicos:\n\n**📋 Checklist Rápido:**\n• Limpe cache do navegador (Ctrl+F5)\n• Verifique se certificado digital está válido\n• Teste em navegador diferente (Chrome/Edge)\n• Desative bloqueador de pop-ups\n\n**🆘 Se persistir, me informe:**\n• Qual navegador está usando?\n• Mensagem de erro exata\n• Em qual etapa trava?\n\n💡 **Dica**: 90% dos problemas se resolvem atualizando o navegador e verificando certificados!",
          confidence: 0.95,
          module: 'tecnico',
          category: 'troubleshooting'
        };
      }
      
      if (query.includes('certificado') || query.includes('token')) {
        return {
          response: "🔐 **Certificado Digital - Guia Completo**\n\n**📱 Instalação:**\n• Baixe apenas do site oficial (Serpro, AC Certisign, etc.)\n• Execute como administrador\n• Reinicie navegador após instalar\n\n**⚡ Resolução de Problemas:**\n• Certificado não aparece? Verifique se está no navegador correto\n• Expirado? Renove com 30 dias de antecedência\n• Erro \"certificado inválido\"? Sincronize data/hora do computador\n\n**🎯 Plataformas que aceitam:**\n• ComprasNet - A1 e A3\n• BEC-SP - A1 e A3  \n• Licitações-e - A1 e A3\n\n💡 **Dica Pro**: Sempre tenha backup do certificado em pen drive!",
          confidence: 0.98,
          module: 'tecnico',
          category: 'certificacao'
        };
      }
      
      if (query.includes('comprasnet') || query.includes('portal')) {
        return {
          response: "🌐 **ComprasNet - Guia de Uso**\n\n**🚀 Acesso Rápido:**\n• URL: www.comprasnet.gov.br\n• Login: CNPJ + senha\n• Certificado: Obrigatório para propostas\n\n**📋 Passo a passo para participar:**\n1. Faça cadastro no SICAF\n2. Consulte oportunidades em \"Pregões\"\n3. Baixe edital e anexos\n4. Envie proposta até prazo limite\n5. Acompanhe sessão pública online\n\n**⚠️ Atenção:**\n• Propostas só até o horário limite\n• Use sempre certificado válido\n• Mantenha dados SICAF atualizados\n\n💡 **Dica**: Teste seu acesso ANTES do dia da sessão!",
          confidence: 0.97,
          module: 'tecnico',
          category: 'plataforma'
        };
      }
      
      // Resposta padrão mais específica
      return {
        response: `💻 **Suporte Técnico Personalizado**\n\nAnalisando: "${queryText}"\n\n🔧 **Áreas de especialidade:**\n• **Plataformas governamentais** - ComprasNet, BEC, Licitações-e\n• **Certificação digital** - instalação, renovação, problemas\n• **Navegadores** - configuração, compatibilidade\n• **Propostas eletrônicas** - envio, formatos, erros\n• **SICAF** - cadastro, atualização, regularidade\n\n**💡 Para ajuda específica, me diga:**\n• Qual plataforma está usando?\n• Qual erro ou dificuldade encontrou?\n• Em que etapa do processo está?\n\n🚀 **Resposta garantida em menos de 2 minutos!**`,
        confidence: 0.85,
        module: 'tecnico',
        category: 'suporte'
      };
    }
  },
  financeiro: {
    processQuery: function(queryText, context = {}) {
      const query = queryText.toLowerCase();
      
      if (query.includes('pagamento') || query.includes('receber') || query.includes('prazo')) {
        return {
          response: "💰 **Prazos de Pagamento - Guia Completo**\n\n**📅 Prazos Legais:**\n• **Até R$ 17.600**: 5 dias úteis (Lei 14.133/2021)\n• **Acima R$ 17.600**: 30 dias corridos máximo\n• **Pequenas compras**: Até 5 dias úteis\n\n**⚡ Como acelerar recebimento:**\n• Entregue nota fiscal completa e correta\n• Anexe todos os documentos exigidos\n• Confirme entrega por email/protocolo\n• Monitore processo no sistema\n\n**🚨 Se atrasar:**\n• Direito a juros de 0,5% ao mês\n• Correção monetária pelo IPCA\n• Cobrança administrativa\n\n💡 **Dica**: Configure alertas para acompanhar pagamentos!",
          confidence: 0.96,
          module: 'financeiro',
          category: 'pagamento'
        };
      }
      
      if (query.includes('preço') || query.includes('valor') || query.includes('orçamento')) {
        return {
          response: "📊 **Formação de Preços Estratégica**\n\n**🎯 Metodologia Vencedora:**\n• Custo direto + indireto + impostos + margem\n• BDI entre 15-25% (conforme complexidade)\n• Pesquise preços de referência (SINAPI, SICRO)\n• Analise histórico do órgão\n\n**💡 Estratégias de competitividade:**\n• ME/EPP: Use margem de empate de até 10%\n• Volume: Negocie desconto progressivo\n• Prazo: Ofereça condições diferenciadas\n• Qualidade: Destaque diferenciais técnicos\n\n**📈 Ferramentas essenciais:**\n• Planilha de custos detalhada\n• Índices oficiais atualizados\n• Análise da concorrência\n• Simulação de cenários\n\n🏆 **Meta**: Ser competitivo mantendo margem saudável de 8-15%!",
          confidence: 0.94,
          module: 'financeiro',
          category: 'precificacao'
        };
      }
      
      return {
        response: `💰 **Consultoria Financeira Personalizada**\n\nAnalisando: "${queryText}"\n\n📊 **Especialidades financeiras:**\n• **Gestão de custos** - planilhas, BDI, margem\n• **Fluxo de caixa** - recebimentos, pagamentos, capital de giro\n• **Impostos** - SIMPLES, Lucro Real, benefícios ME/EPP\n• **Precificação** - estratégias para vencer com margem\n• **Contratos** - reajustes, aditivos, glosas\n\n**💡 Para análise personalizada:**\n• Qual seu faturamento médio mensal?\n• Margem atual dos seus contratos?\n• Principal desafio financeiro?\n\n📈 **Objetivo**: Aumentar lucratividade em 20-30%!`,
        confidence: 0.85,
        module: 'financeiro',
        category: 'consultoria'
      };
    }
  },
  operacional: {
    processQuery: function(queryText, context = {}) {
      const query = queryText.toLowerCase();
      
      if (query.includes('cronograma') || query.includes('prazo') || query.includes('etapa')) {
        return {
          response: "📅 **Gestão de Cronogramas - Método Eficaz**\n\n**⏰ Linha do Tempo Típica:**\n• **Publicação**: Acompanhe diariamente\n• **Esclarecimentos**: Até 3 dias antes da abertura\n• **Proposta**: Envie com 24h de antecedência\n• **Habilitação**: Documentos sempre atualizados\n• **Execução**: Cronograma físico-financeiro\n\n**🎯 Sistema de Controle:**\n• Planilha com alertas automáticos\n• Calendário compartilhado da equipe\n• Backup de documentos na nuvem\n• Checklist de cada fase\n\n**📋 Métricas importantes:**\n• Taxa de participação: +80%\n• Aprovação de propostas: +60%\n• Pontualidade nas entregas: 100%\n\n💡 **Segredo**: Antecipação é a chave do sucesso!",
          confidence: 0.95,
          module: 'operacional',
          category: 'cronograma'
        };
      }
      
      return {
        response: `⚙️ **Operações Otimizadas**\n\nFoco na sua necessidade: "${queryText}"\n\n📋 **Processos que posso otimizar:**\n• **Fluxo de propostas** - da oportunidade à entrega\n• **Gestão documental** - organização, controle, backup\n• **Acompanhamento** - status, prazos, alertas\n• **Equipe** - divisão de tarefas, responsabilidades\n• **Qualidade** - padronização, checklists\n\n**💡 Para estruturar seu processo:**\n• Quantas licitações monitora mensalmente?\n• Qual sua taxa de sucesso atual?\n• Onde sente mais dificuldade operacional?\n\n🚀 **Meta**: Aumentar eficiência em 50% com menos esforço!`,
        confidence: 0.85,
        module: 'operacional',
        category: 'gestao'
      };
    }
  },
  estrategico: {
    processQuery: function(queryText, context = {}) {
      const query = queryText.toLowerCase();
      
      if (query.includes('vencer') || query.includes('ganhar') || query.includes('primeira')) {
        return {
          response: "🏆 **Estratégia para Vencer - Guia Definitivo**\n\n**🎯 Os 7 Pilares do Sucesso:**\n1. **Escolha certa**: Foque no seu nicho de expertise\n2. **Preço competitivo**: Use margem de empate ME/EPP\n3. **Proposta técnica**: Destaque diferenciais únicos\n4. **Documentação**: 100% conforme edital\n5. **Relacionamento**: Networking ético e profissional\n6. **Timing**: Participe no momento certo da empresa\n7. **Persistência**: Cada \"não\" aproxima do \"sim\"\n\n**📊 Estatísticas de sucesso:**\n• Empresas focadas vencem 3x mais\n• Preço corresponde a 70% da decisão\n• Relacionamento influencia 25% dos casos\n\n**💡 Primeira licitação:**\n• Comece com valores menores (até R$ 80 mil)\n• Escolha modalidade que domina\n• Tenha capital de giro para 60 dias\n\n🎯 **Próximo passo**: Defina seu nicho e metas!",
          confidence: 0.98,
          module: 'estrategico',
          category: 'sucesso'
        };
      }
      
      return {
        response: `🎯 **Estratégia Personalizada**\n\nAnalisando seu objetivo: "${queryText}"\n\n🏆 **Áreas estratégicas:**\n• **Posicionamento** - nicho, diferenciação, proposta de valor\n• **Competitividade** - análise concorrencial, vantagens\n• **Crescimento** - expansão, novos mercados, parcerias\n• **Performance** - métricas, melhoria contínua\n• **Networking** - relacionamentos estratégicos éticos\n\n**💡 Para estratégia sob medida:**\n• Há quanto tempo atua com licitações?\n• Qual seu principal objetivo (crescer, estabilizar, diversificar)?\n• Que tipo de oportunidade mais te interessa?\n\n🚀 **Resultado**: Estratégia clara para alcançar seus objetivos!`,
        confidence: 0.85,
        module: 'estrategico',
        category: 'estrategia'
      };
    }
  }
};

// Base de conhecimento jurídico
const legalKnowledgeBase = {
  prazos: {
    keywords: ['prazo', 'deadline', 'tempo', 'recurso', 'impugnação', 'esclarecimento'],
    responses: [
      {
        keywords: ['recurso', 'pregão'],
        response: "📋 **PRAZOS PARA RECURSOS NO PREGÃO ELETRÔNICO:**\n\n🕐 **3 dias úteis** para interposição de recurso após a sessão pública (art. 44, Lei 10.520/2002)\n\n📅 **Contagem**: A partir da intimação do ato ou lavratura da ata\n\n⚖️ **Base Legal**: Lei 10.520/2002, art. 44 c/c Decreto 10.024/2019\n\n💡 **Dica importante**: No pregão eletrônico, o recurso deve ser manifestado imediatamente após a sessão, e as razões apresentadas em até 3 dias úteis.",
        confidence: 0.98,
        references: [
          { law: "Lei 10.520/2002", article: "Art. 44", relevance: 0.95 },
          { law: "Decreto 10.024/2019", article: "Art. 40", relevance: 0.90 }
        ]
      },
      {
        keywords: ['impugnação', 'edital'],
        response: "📋 **PRAZOS PARA IMPUGNAÇÃO DE EDITAL:**\n\n🕐 **Até 3 dias úteis** antes da data fixada para abertura das propostas (art. 78, Lei 14.133/2021)\n\n📧 **Como fazer**: Petição dirigida à autoridade competente, por escrito\n\n⚖️ **Base Legal**: Lei 14.133/2021, art. 78\n\n⚠️ **Atenção**: A impugnação não suspende os prazos previstos no edital, salvo decisão em contrário da administração.",
        confidence: 0.97,
        references: [
          { law: "Lei 14.133/2021", article: "Art. 78", relevance: 0.98 }
        ]
      },
      {
        keywords: ['esclarecimento', 'dúvida'],
        response: "📋 **PRAZOS PARA PEDIDOS DE ESCLARECIMENTO:**\n\n🕐 **Até 3 dias úteis** antes da data fixada para abertura das propostas (art. 78, Lei 14.133/2021)\n\n📧 **Resposta**: A administração deve responder em até 2 dias úteis\n\n⚖️ **Base Legal**: Lei 14.133/2021, art. 78, §1º\n\n💡 **Importante**: As respostas serão divulgadas a todos os interessados.",
        confidence: 0.96,
        references: [
          { law: "Lei 14.133/2021", article: "Art. 78, §1º", relevance: 0.95 }
        ]
      }
    ]
  },
  
  mei_microempresa: {
    keywords: ['mei', 'microempresa', 'me', 'epp', 'pequeno porte', 'micro'],
    responses: [
      {
        keywords: ['participar', 'licitação', 'valor'],
        response: "📋 **MEI/ME/EPP EM LICITAÇÕES:**\n\n✅ **PODE participar**: Não há limitação de valor para participação de MEI em licitações\n\n🎯 **Benefícios garantidos:**\n• **Cota de 25%** - Reserva de até 25% do objeto para ME/EPP (art. 48, LC 123/2006)\n• **Empate ficto** - Preferência quando proposta for até 10% superior à melhor\n• **Regularização posterior** - 5 dias úteis após habilitação\n• **Subcontratação** - 30% obrigatório para grandes empresas\n\n⚖️ **Base Legal**: LC 123/2006, arts. 44 a 49",
        confidence: 0.95,
        references: [
          { law: "LC 123/2006", article: "Arts. 44-49", relevance: 0.98 },
          { law: "Lei 14.133/2021", article: "Art. 26", relevance: 0.90 }
        ]
      },
      {
        keywords: ['empate', 'ficto', 'desempate'],
        response: "📋 **EMPATE FICTO PARA ME/EPP:**\n\n🥇 **Como funciona**: ME/EPP tem preferência quando sua proposta for até **10% superior** à proposta de menor preço\n\n⚡ **Procedimento:**\n1. ME/EPP é convocada para apresentar nova proposta\n2. Prazo de **5 minutos** no pregão eletrônico\n3. Nova proposta deve ser **inferior** à de menor preço\n\n⚖️ **Base Legal**: LC 123/2006, art. 45\n\n💡 **Importante**: Só vale se a ME/EPP estiver entre as 3 melhores propostas.",
        confidence: 0.97,
        references: [
          { law: "LC 123/2006", article: "Art. 45", relevance: 0.98 }
        ]
      }
    ]
  },

  documentos: {
    keywords: ['documento', 'habilitação', 'certidão', 'cnd', 'exigido', 'obrigatório'],
    responses: [
      {
        keywords: ['habilitação', 'obrigatório', 'necessário'],
        response: "📋 **DOCUMENTOS OBRIGATÓRIOS PARA HABILITAÇÃO:**\n\n📄 **1. HABILITAÇÃO JURÍDICA:**\n• Ato constitutivo (contrato social, estatuto)\n• CNPJ ativo\n• Procuração (se representado)\n\n💰 **2. REGULARIDADE FISCAL:**\n• CND Federal (Receita Federal)\n• CND Estadual e Municipal\n• CND FGTS\n• CND Trabalhista (TST)\n\n💵 **3. QUALIFICAÇÃO ECONÔMICO-FINANCEIRA:**\n• Balanço patrimonial do último exercício\n• CND de falência e concordata\n\n🔧 **4. QUALIFICAÇÃO TÉCNICA:**\n• Atestados de capacidade técnica\n• Registro profissional (quando exigido)\n\n⚖️ **Base Legal**: Lei 14.133/2021, arts. 62-67",
        confidence: 0.96,
        references: [
          { law: "Lei 14.133/2021", article: "Arts. 62-67", relevance: 0.95 }
        ]
      }
    ]
  },

  inexigibilidade: {
    keywords: ['inexigibilidade', 'inexigível', 'competição', 'impossível'],
    responses: [
      {
        keywords: ['quando', 'casos', 'situações'],
        response: "📋 **INEXIGIBILIDADE DE LICITAÇÃO:**\n\n❌ **Quando NÃO é possível competir:**\n\n🎯 **Art. 74, Lei 14.133/2021:**\n• **Fornecedor exclusivo** - Único no mercado\n• **Serviços técnicos especializados** - Natureza singular\n• **Artista consagrado** - Notória especialização\n\n🔍 **Requisitos essenciais:**\n✓ **Inviabilidade de competição**\n✓ **Singularidade do objeto**\n✓ **Notória especialização**\n\n⚠️ **Cuidado**: Inexigibilidade ≠ Dispensa\n\n⚖️ **Base Legal**: Lei 14.133/2021, art. 74",
        confidence: 0.94,
        references: [
          { law: "Lei 14.133/2021", article: "Art. 74", relevance: 0.98 }
        ]
      }
    ]
  },

  suspenso: {
    keywords: ['suspenso', 'suspensão', 'sanção', 'penalidade', 'impedido'],
    responses: [
      {
        keywords: ['participar', 'nova', 'licitação'],
        response: "📋 **EMPRESA SUSPENSA - PARTICIPAÇÃO EM LICITAÇÕES:**\n\n❌ **Durante a suspensão**: PROIBIDA a participação em qualquer licitação do órgão que aplicou a penalidade\n\n⏰ **Prazo**: Até 2 anos (art. 156, Lei 14.133/2021)\n\n🌐 **Âmbito**: Apenas no órgão sancionador (não se estende a outros órgãos)\n\n✅ **Após o prazo**: Empresa pode voltar a participar normalmente\n\n🔍 **Verificação**: Consultar SICAF ou sistema do órgão\n\n⚖️ **Base Legal**: Lei 14.133/2021, arts. 155-156",
        confidence: 0.93,
        references: [
          { law: "Lei 14.133/2021", article: "Arts. 155-156", relevance: 0.95 }
        ]
      }
    ]
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'LicitaFácil Pro Demo Server' });
});

// Auth endpoints
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  
  if (user) {
    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        token: 'demo-jwt-token-' + user.id
      }
    });
  } else {
    res.status(401).json({ success: false, message: 'Credenciais inválidas' });
  }
});

// Sistema de logs detalhado
const conversationLogs = [];

function logConversation(userMessage, response, moduleOrigin, moduleDestination, userId = 'demo-user') {
  const logEntry = {
    timestamp: new Date().toISOString(),
    userId: userId,
    userMessage: userMessage,
    moduleOrigin: moduleOrigin || 'chat',
    moduleDestination: moduleDestination,
    response: response.response || response,
    confidence: response.confidence || 0,
    category: response.category || 'unknown'
  };
  
  conversationLogs.push(logEntry);
  console.log(`📝 [${logEntry.timestamp}] ${userId}: "${userMessage}" -> ${moduleDestination} (${response.confidence || 'N/A'})`);
  
  // Manter apenas os últimos 100 logs em memória
  if (conversationLogs.length > 100) {
    conversationLogs.shift();
  }
}

// Função de encaminhamento inteligente aprimorada - NUNCA retorna erro genérico
function encaminharParaModulo(mensagemUsuario, userId = 'demo-user') {
  const query = mensagemUsuario.toLowerCase();
  
  // Detectar categoria automaticamente com melhor algoritmo
  let bestCategory = 'juridico'; // padrão sempre útil
  let bestScore = 0;
  let fallbackUsed = false;
  
  for (const [category, config] of Object.entries(categoryClassifier)) {
    let score = 0;
    const keywordMatches = config.keywords.filter(keyword => query.includes(keyword));
    
    // Algoritmo aprimorado de pontuação
    score = keywordMatches.length * 15; // Aumentar peso dos matches
    score += (6 - config.priority) * 3; // Maior peso para prioridade
    
    // Bonificação para matches exatos e contextuais
    keywordMatches.forEach(match => {
      if (query.includes(match + ' ') || query.includes(' ' + match) || query.startsWith(match) || query.endsWith(match)) {
        score += 8; // Aumentar bonificação
      }
      // Bonificação extra para palavras-chave críticas
      if (['prazo', 'lei', 'recurso', 'documento', 'licitação'].includes(match)) {
        score += 10;
      }
    });
    
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }
  
  // Se pontuação muito baixa, usar fallback inteligente baseado no contexto
  if (bestScore < 5) {
    bestCategory = inferirCategoriaSemantica(query);
    fallbackUsed = true;
    console.log(`🔄 Fallback semântico ativado: ${bestCategory}`);
  }
  
  console.log(`🎯 Categoria final: ${bestCategory} (score: ${bestScore}${fallbackUsed ? ' + fallback' : ''})`);
  
  // Chamar o módulo apropriado
  const module = modules[bestCategory];
  let result = module.processQuery(mensagemUsuario, { 
    userId, 
    originalCategory: bestCategory,
    fallbackUsed,
    score: bestScore 
  });
  
  // Garantir que sempre temos uma resposta útil
  if (!result || !result.response || result.response.length < 10) {
    result = gerarRespostaProativaPersonalizada(mensagemUsuario, bestCategory);
  }
  
  // Formatar resposta sempre útil e proativa
  let finalResponse = result.response;
  
  // Se foi encaminhado, explicar de forma transparente e útil
  if (bestCategory !== 'juridico') {
    const moduleNames = {
      tecnico: 'Suporte Técnico',
      financeiro: 'Consultoria Financeira', 
      operacional: 'Suporte Operacional',
      estrategico: 'Consultoria Estratégica'
    };
    
    finalResponse = `🔀 **Identifiquei que sua pergunta se relaciona com ${moduleNames[bestCategory]}. Aqui está a orientação:**\n\n${finalResponse}`;
  }
  
  // Se usou fallback, ser ainda mais proativo
  if (fallbackUsed) {
    finalResponse += `\n\n💡 **Não encontrou exatamente o que procurava?** Digite de forma mais específica ou use comandos como:\n• \`/juridico [sua pergunta]\` - Para questões legais\n• \`/tecnico [sua pergunta]\` - Para questões técnicas\n• \`/financeiro [sua pergunta]\` - Para questões financeiras`;
  }
  
  const response = {
    response: finalResponse,
    confidence: Math.max(result.confidence, categoryClassifier[bestCategory].fallbackScore),
    module: bestCategory,
    category: result.category || 'geral',
    redirected: bestCategory !== 'juridico',
    originalQuery: mensagemUsuario,
    fallbackUsed,
    intelligentRouting: true
  };
  
  // Log da conversa
  logConversation(mensagemUsuario, response, 'chat', bestCategory, userId);
  
  return response;
}

// Função para inferir categoria semântica quando keywords não funcionam
function inferirCategoriaSemantica(query) {
  // Análise semântica simples baseada em contexto
  if (query.includes('como') || query.includes('onde') || query.includes('quando')) {
    if (query.includes('site') || query.includes('portal') || query.includes('sistema')) {
      return 'tecnico';
    }
    if (query.includes('processo') || query.includes('etapa') || query.includes('funciona')) {
      return 'operacional';
    }
    return 'juridico'; // Perguntas gerais de "como" sobre licitações são jurídicas
  }
  
  if (query.includes('posso') || query.includes('pode') || query.includes('permitido') || query.includes('direito')) {
    return 'juridico';
  }
  
  if (query.includes('custa') || query.includes('valor') || query.includes('dinheiro') || query.includes('pago')) {
    return 'financeiro';
  }
  
  if (query.includes('ganhar') || query.includes('vencer') || query.includes('melhor') || query.includes('estratégia')) {
    return 'estrategico';
  }
  
  // Fallback inteligente baseado em comprimento e complexidade
  if (query.length < 20) {
    return 'juridico'; // Perguntas curtas geralmente são conceituais
  }
  
  if (query.length > 100) {
    return 'estrategico'; // Perguntas longas geralmente são estratégicas
  }
  
  return 'juridico'; // Padrão mais seguro
}

// Função para gerar resposta proativa personalizada
function gerarRespostaProativaPersonalizada(mensagemUsuario, categoria) {
  const respostasProativas = {
    juridico: {
      response: `⚖️ **Orientação Jurídica Personalizada**\n\nEntendi sua consulta sobre: "${mensagemUsuario}"\n\n✅ **Posso ajudar com:**\n• Prazos e procedimentos legais\n• Documentação obrigatória\n• Direitos e benefícios ME/EPP/MEI\n• Recursos e impugnações\n• Conformidade legal\n\n💡 **Para resposta mais específica**, reformule perguntando:\n• "Qual o prazo para...?"\n• "Quais documentos para...?"\n• "ME pode participar de...?"\n• "Como impugnar...?"`,
      confidence: 0.8,
      category: 'orientacao'
    },
    tecnico: {
      response: `💻 **Suporte Técnico Personalizado**\n\nVi que você precisa de ajuda técnica: "${mensagemUsuario}"\n\n🔧 **Posso resolver:**\n• Problemas de acesso e cadastro\n• Envio de propostas e documentos\n• Certificados digitais\n• Navegação em portais\n• Erros e bugs\n\n💡 **Para suporte direcionado**, me diga:\n• Qual plataforma está usando?\n• Qual erro aparece?\n• Em que etapa está travado?`,
      confidence: 0.8,
      category: 'suporte'
    },
    financeiro: {
      response: `💰 **Consultoria Financeira Personalizada**\n\nIdentifiquei que você tem dúvida financeira: "${mensagemUsuario}"\n\n📊 **Posso orientar sobre:**\n• Formação de preços competitivos\n• Gestão de custos e margens\n• Impostos e benefícios fiscais\n• Pagamentos e faturamento\n• Fluxo de caixa\n\n💡 **Para análise específica**, compartilhe:\n• Tipo de serviço/produto?\n• Valor estimado do contrato?\n• Sua margem atual?`,
      confidence: 0.8,
      category: 'consultoria'
    },
    operacional: {
      response: `⚙️ **Gestão Operacional Personalizada**\n\nVejo que precisa de ajuda operacional: "${mensagemUsuario}"\n\n📋 **Posso organizar:**\n• Fluxos e cronogramas\n• Gestão de processos\n• Acompanhamento de status\n• Documentação e controles\n• Execução de contratos\n\n💡 **Para planejamento eficaz**, me conte:\n• Qual processo quer otimizar?\n• Quantas licitações acompanha?\n• Onde sente mais dificuldade?`,
      confidence: 0.8,
      category: 'gestao'
    },
    estrategico: {
      response: `🎯 **Consultoria Estratégica Personalizada**\n\nPercebo que busca orientação estratégica: "${mensagemUsuario}"\n\n🏆 **Posso desenvolver:**\n• Estratégias de competitividade\n• Análise de oportunidades\n• Networking e relacionamentos\n• Posicionamento de mercado\n• Crescimento sustentável\n\n💡 **Para estratégia personalizada**, me conte:\n• Há quanto tempo atua no mercado?\n• Qual seu principal desafio?\n• Que tipo de oportunidade busca?`,
      confidence: 0.8,
      category: 'estrategia'
    }
  };
  
  return respostasProativas[categoria] || respostasProativas.juridico;
}

// Função para processamento direto de consultas jurídicas (sem roteamento)
function processDirectLegalQuery(queryText, context = {}) {
  const query = queryText.toLowerCase();
  
  // Remover comandos se existirem
  const cleanQuery = query.replace(/^\/\w+\s*/, '');
  
  // Buscar na base de conhecimento jurídica
  for (const [category, data] of Object.entries(legalKnowledgeBase)) {
    // Verificar se a query contém palavras-chave da categoria
    const hasKeyword = data.keywords.some(keyword => cleanQuery.includes(keyword));
    
    if (hasKeyword) {
      // Buscar resposta específica
      for (const responseItem of data.responses) {
        const hasSpecificKeyword = responseItem.keywords.some(keyword => 
          cleanQuery.includes(keyword)
        );
        
        if (hasSpecificKeyword) {
          return {
            response: responseItem.response,
            confidence: responseItem.confidence,
            references: responseItem.references,
            category: category,
            module: 'juridico'
          };
        }
      }
    }
  }
  
  // Fallback para respostas jurídicas genéricas
  return {
    response: "⚖️ **Assistente Jurídico - LicitaFácil Pro**\n\nPara uma resposta mais específica, reformule sua pergunta incluindo:\n\n**📋 Exemplos de consultas:**\n• \"Qual o prazo para recurso no pregão?\"\n• \"Quais documentos ME precisa apresentar?\"\n• \"Como impugnar um edital?\"\n• \"Qual a diferença entre pregão e concorrência?\"\n\n💡 **Dica**: Seja específico sobre prazos, procedimentos ou documentos que precisa saber!",
    confidence: 0.7,
    category: 'juridico',
    module: 'juridico'
  };
}

// Função para analisar consulta e gerar resposta - SEMPRE ÚTIL
function generateLegalResponse(queryText) {
  // Esta função não deve mais ser usada - usar encaminharParaModulo
  console.warn('⚠️ generateLegalResponse chamada - usar encaminharParaModulo');
  return processDirectLegalQuery(queryText);
}

// Gerar perguntas relacionadas baseadas na categoria
function generateFollowUpQuestions(category, queryText) {
  const followUpMap = {
    prazos: [
      "Quer saber sobre prazos de outras modalidades?",
      "Precisa de orientação sobre como calcular dias úteis?",
      "Gostaria de saber sobre prazos para ME/EPP?"
    ],
    mei_microempresa: [
      "Quer saber mais sobre outros benefícios para ME/EPP?",
      "Precisa de orientação sobre como comprovar o porte da empresa?",
      "Gostaria de saber sobre subcontratação obrigatória?"
    ],
    documentos: [
      "Precisa de orientação sobre onde obter essas certidões?",
      "Quer saber sobre prazos de validade dos documentos?",
      "Gostaria de conhecer os benefícios de regularização para ME/EPP?"
    ],
    inexigibilidade: [
      "Quer saber sobre a diferença entre inexigibilidade e dispensa?",
      "Precisa de orientação sobre como justificar a inexigibilidade?",
      "Gostaria de conhecer outros casos de contratação direta?"
    ],
    suspenso: [
      "Quer saber sobre outras sanções em licitações?",
      "Precisa de orientação sobre como recorrer de penalidades?",
      "Gostaria de saber como consultar sanções aplicadas?"
    ],
    generic: [
      "Gostaria de fazer uma pergunta mais específica?",
      "Precisa de orientação sobre algum procedimento?",
      "Quer saber sobre benefícios para ME/EPP?"
    ]
  };
  
  return followUpMap[category] || followUpMap.generic;
}

// Legal AI endpoints - Sistema inteligente de roteamento
app.post('/legal-ai/query', (req, res) => {
  const { queryText, userId = 'demo-user' } = req.body;
  
  console.log(`📝 Consulta recebida: "${queryText}"`);
  
  // Simular processamento (1-3 segundos)
  const processingTime = Math.random() * 2000 + 1000;
  
  setTimeout(() => {
    // Usar novo sistema de encaminhamento inteligente
    const result = encaminharParaModulo(queryText, userId);
    
    const response = {
      success: true,
      data: {
        id: 'query-' + Date.now(),
        queryText,
        responseText: result.response,
        confidenceScore: result.confidence,
        module: result.module,
        redirected: result.redirected,
        legalReferences: generateLegalReferences(result),
        followUpQuestions: generateFollowUpQuestions(result.category, queryText),
        category: result.category,
        processingTime: Math.round(processingTime),
        conversationalTone: true,
        naturalLanguage: true
      }
    };
    
    console.log(`✅ Resposta gerada via ${result.module} (${Math.round(processingTime)}ms): ${result.response.substring(0, 100)}...`);
    
    res.json(response);
  }, processingTime);
});

// Função para gerar referências baseadas no módulo
function generateLegalReferences(result) {
  const moduleReferences = {
    juridico: [
      { law: "Lei 14.133/2021", article: "Nova Lei de Licitações", relevance: 0.95 },
      { law: "Lei 10.520/2002", article: "Lei do Pregão", relevance: 0.90 }
    ],
    tecnico: [
      { law: "Decreto 10.024/2019", article: "Pregão Eletrônico", relevance: 0.85 },
      { law: "IN SEGES 05/2017", article: "Contratação de TI", relevance: 0.80 }
    ],
    financeiro: [
      { law: "Lei 14.133/2021", article: "Arts. 126-130", relevance: 0.90 },
      { law: "LC 123/2006", article: "Benefícios ME/EPP", relevance: 0.85 }
    ],
    operacional: [
      { law: "Lei 14.133/2021", article: "Procedimentos", relevance: 0.85 },
      { law: "Decreto 10.024/2019", article: "Fluxos operacionais", relevance: 0.80 }
    ],
    estrategico: [
      { law: "Lei 14.133/2021", article: "Princípios", relevance: 0.75 },
      { law: "LC 123/2006", article: "Oportunidades ME/EPP", relevance: 0.80 }
    ]
  };
  
  return (moduleReferences[result.module] || moduleReferences.juridico).map(ref => ({
    documentNumber: ref.law,
    title: ref.law,
    article: ref.article,
    relevance: ref.relevance,
    excerpt: `Referência: ${ref.law}, ${ref.article}`
  }));
}

// Commands endpoints
app.post('/legal-ai/commands/:command', (req, res) => {
  const { command } = req.params;
  const { args } = req.body;
  
  const fullQuery = `/${command} ${args}`;
  console.log(`🤖 Comando recebido: ${fullQuery}`);
  
  // Processar como consulta normal
  const result = encaminharParaModulo(fullQuery);
  
  res.json({
    success: true,
    data: {
      id: 'command-' + Date.now(),
      command,
      args,
      queryText: fullQuery,
      responseText: result.response,
      confidenceScore: result.confidence,
      legalReferences: result.references,
      followUpQuestions: generateFollowUpQuestions(result.category, fullQuery),
      timestamp: new Date().toISOString()
    }
  });
});

// Opportunities endpoints
app.get('/opportunities', (req, res) => {
  res.json({
    success: true,
    data: opportunities,
    total: opportunities.length
  });
});

// Queries history - Agora com logs detalhados
app.get('/legal-ai/queries', (req, res) => {
  res.json({
    success: true,
    data: queries,
    conversationLogs: conversationLogs.slice(-20) // Últimas 20 conversas
  });
});

// Endpoint para logs de auditoria
app.get('/legal-ai/logs', (req, res) => {
  const { userId, module, startDate, endDate } = req.query;
  
  let filteredLogs = [...conversationLogs];
  
  if (userId) {
    filteredLogs = filteredLogs.filter(log => log.userId === userId);
  }
  
  if (module) {
    filteredLogs = filteredLogs.filter(log => log.moduleDestination === module);
  }
  
  if (startDate) {
    filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= new Date(startDate));
  }
  
  if (endDate) {
    filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= new Date(endDate));
  }
  
  res.json({
    success: true,
    data: filteredLogs,
    total: filteredLogs.length,
    modules: {
      juridico: filteredLogs.filter(l => l.moduleDestination === 'juridico').length,
      tecnico: filteredLogs.filter(l => l.moduleDestination === 'tecnico').length,
      financeiro: filteredLogs.filter(l => l.moduleDestination === 'financeiro').length,
      operacional: filteredLogs.filter(l => l.moduleDestination === 'operacional').length,
      estrategico: filteredLogs.filter(l => l.moduleDestination === 'estrategico').length
    }
  });
});

// Statistics
app.get('/legal-ai/statistics', (req, res) => {
  res.json({
    success: true,
    data: {
      total: 1247,
      accuracy: 94.3,
      avgResponseTime: 2.1,
      userSatisfaction: 4.7,
      totalOpportunities: 3892,
      conversionRate: 23.4
    }
  });
});

// Health check for legal AI
app.get('/legal-ai/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      pendingQueries: 0,
      pendingAnalyses: 0,
      timestamp: new Date().toISOString()
    }
  });
});

// Catch all
app.get('*', (req, res) => {
  res.json({ 
    message: 'LicitaFácil Pro Demo API - IA Jurídica Avançada',
    endpoint: req.path,
    method: req.method,
    docs: 'http://localhost:3001/docs',
    examples: [
      'POST /legal-ai/query - {"queryText": "qual o prazo para recurso no pregão?"}',
      'POST /legal-ai/query - {"queryText": "MEI pode participar de licitação de R$ 100mil?"}',
      'POST /legal-ai/query - {"queryText": "documentos obrigatórios para habilitação"}'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 LicitaFácil Pro Demo Server (IA Avançada) rodando em http://localhost:${PORT}`);
  console.log(`📚 Teste: curl http://localhost:${PORT}/health`);
  console.log(`⚖️ IA Jurídica: curl -X POST http://localhost:${PORT}/legal-ai/query -H "Content-Type: application/json" -d '{"queryText":"qual o prazo para recurso no pregão eletrônico?"}'`);
  console.log(`🤖 Base de conhecimento carregada com ${Object.keys(legalKnowledgeBase).length} categorias`);
});