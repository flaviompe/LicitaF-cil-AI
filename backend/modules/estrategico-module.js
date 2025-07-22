// Módulo Estratégico - Especializado em estratégias para vencer licitações
module.exports = {
  processQuery: function(queryText, context = {}) {
    const query = queryText.toLowerCase();
    
    const estrategicoDB = {
      vencer: {
        keywords: ['vencer', 'ganhar', 'estratégia', 'como'],
        responses: [
          {
            keywords: ['primeira', 'vez', 'começar', 'iniciante'],
            response: "🎯 **ESTRATÉGIAS PARA VENCER SUA PRIMEIRA LICITAÇÃO**\n\n🔍 **Escolha estratégica:**\n• **Comece pequeno**: Licitações de menor valor\n• **Sua especialidade**: Área de conhecimento\n• **Órgãos locais**: Prefeitura, câmara municipal\n• **Concorrência baixa**: Editais com poucos interessados\n\n💪 **Preparação essencial:**\n• **Estude o órgão**: Histórico de compras\n• **Analise editais**: Entenda exigências\n• **Forme preço justo**: Nem muito alto, nem no prejuízo\n• **Documentação**: Tudo em ordem e atualizado\n\n🎪 **Durante a sessão:**\n• **Esteja presente**: Online ou presencial\n• **Seja ágil**: Respostas rápidas\n• **Tenha backup**: Documentos extras\n\n**Exemplo prático**: Empresa de limpeza pode começar com contrato de R$ 10.000/mês em escola municipal - menor concorrência.\n\n⚡ **Dica de ouro**: Visite o órgão antes - entenda suas necessidades reais!\n\n🔎 **Saiba mais**: Participe de capacitações do Sebrae sobre licitações",
            confidence: 0.96
          },
          {
            keywords: ['melhorar', 'performance', 'resultado'],
            response: "📊 **MELHORANDO SUA PERFORMANCE EM LICITAÇÕES**\n\n📈 **Análise de resultados:**\n• **Taxa de vitória**: Meta de 15-25%\n• **Margem média**: Analise seus preços\n• **Tempo de preparo**: Otimize processos\n• **Causas de desclassificação**: Corrija erros\n\n🎯 **Estratégias avançadas:**\n• **Parcerias**: Consórcios para grandes contratos\n• **Especialização**: Foque em nichos específicos\n• **Relacionamento**: Networking ético\n• **Inovação**: Propostas diferenciadas\n\n💡 **Inteligência competitiva:**\n• **Estude concorrentes**: Preços e estratégias\n• **Histórico do órgão**: Padrões de compra\n• **Sazonalidade**: Épocas de mais licitações\n• **Tendências**: Novas demandas do setor público\n\n**Exemplo prático**: Se sua taxa de vitória está em 5%, analise: preços altos? documentação? qualificação técnica?\n\n⚡ **Dica importante**: Foque na qualidade, não na quantidade de participações!\n\n🔎 **Saiba mais**: Use ferramentas de BI para análise de mercado público",
            confidence: 0.94
          }
        ]
      },
      
      competitividade: {
        keywords: ['competir', 'concorrência', 'diferencial'],
        responses: [
          {
            keywords: ['diferencial', 'destacar', 'vantagem'],
            response: "⭐ **CRIANDO DIFERENCIAIS COMPETITIVOS**\n\n🏆 **Vantagens sustentáveis:**\n• **Qualidade superior**: Certificações, normas\n• **Prazo menor**: Entrega mais rápida\n• **Garantia estendida**: Além do mínimo exigido\n• **Sustentabilidade**: Processos eco-friendly\n• **Tecnologia**: Soluções inovadoras\n\n💼 **Propostas que se destacam:**\n• **Detalhamento técnico**: Mostre expertise\n• **Metodologia clara**: Como vai executar\n• **Equipe qualificada**: Currículos e certificações\n• **Cases de sucesso**: Trabalhos anteriores\n• **Valor agregado**: Serviços extras sem custo\n\n🎨 **Apresentação profissional:**\n• **Design atrativo**: Layout limpo e moderno\n• **Organização lógica**: Fácil de avaliar\n• **Imagens e gráficos**: Visualização clara\n• **Linguagem técnica**: Mas acessível\n\n**Exemplo prático**: Empresa de TI pode destacar suporte 24h, certificações internacionais e metodologia ágil.\n\n⚡ **Dica valiosa**: O menor preço nem sempre ganha - qualidade conta!\n\n🔎 **Saiba mais**: Invista em certificações reconhecidas no seu setor",
            confidence: 0.93
          }
        ]
      },
      
      networking: {
        keywords: ['relacionamento', 'networking', 'contato'],
        responses: [
          {
            keywords: ['construir', 'fazer', 'manter'],
            response: "🤝 **NETWORKING ÉTICO NO SETOR PÚBLICO**\n\n✅ **Práticas permitidas:**\n• **Eventos técnicos**: Seminários, congressos\n• **Visitas institucionais**: Apresentação da empresa\n• **Esclarecimentos**: Dúvidas sobre editais\n• **Relacionamento pós-contrato**: Execução profissional\n\n🚫 **Práticas proibidas:**\n• **Favorecimento**: Informações privilegiadas\n• **Presentes**: Qualquer tipo de vantagem\n• **Pressão**: Influenciar decisões\n• **Promessas**: Benefícios futuros\n\n🎯 **Networking inteligente:**\n• **Seja técnico**: Foque na competência\n• **Agregue valor**: Compartilhe conhecimento\n• **Seja consistente**: Presença regular\n• **Mantenha ética**: Transparência total\n\n**Exemplo prático**: Participe de workshops sobre sustentabilidade promovidos pelo órgão - demonstra interesse genuíno.\n\n⚖️ **Base Legal**: Lei 14.133/2021 - Princípios éticos\n\n🔎 **Saiba mais**: Consulte o código de ética do órgão antes de qualquer aproximação",
            confidence: 0.91
          }
        ]
      }
    };
    
    // Buscar resposta específica
    for (const [category, data] of Object.entries(estrategicoDB)) {
      const hasKeyword = data.keywords.some(keyword => query.includes(keyword));
      
      if (hasKeyword) {
        for (const responseItem of data.responses) {
          const hasSpecificKeyword = responseItem.keywords.some(keyword => 
            query.includes(keyword)
          );
          
          if (hasSpecificKeyword) {
            return {
              response: responseItem.response,
              confidence: responseItem.confidence,
              module: 'estrategico',
              category: category
            };
          }
        }
        
        if (data.responses.length > 0) {
          return {
            response: data.responses[0].response,
            confidence: data.responses[0].confidence,
            module: 'estrategico',
            category: category
          };
        }
      }
    }
    
    return {
      response: "🎯 **CONSULTORIA ESTRATÉGICA**\n\nEstou aqui para ajudar você a vencer mais licitações! Posso orientar sobre:\n\n• **Estratégias** - como vencer, onde focar\n• **Competitividade** - diferenciais, vantagens\n• **Performance** - análise de resultados\n• **Networking** - relacionamento ético\n\n**Exemplo de pergunta**: \"Como vencer minha primeira licitação?\"\n\n🔎 **Saiba mais**: Conte-me sobre sua empresa e objetivos para estratégias personalizadas",
      confidence: 0.70,
      module: 'estrategico',
      category: 'generic'
    };
  }
};