// Módulo Financeiro - Especializado em aspectos financeiros e tributários
module.exports = {
  processQuery: function(queryText, context = {}) {
    const query = queryText.toLowerCase();
    
    const financeiroDB = {
      pagamentos: {
        keywords: ['pagamento', 'receber', 'quando', 'prazo'],
        responses: [
          {
            keywords: ['quanto', 'tempo', 'demora'],
            response: "💰 **PRAZOS DE PAGAMENTO EM CONTRATOS PÚBLICOS**\n\n⏰ **Prazos legais:**\n• **Padrão**: 30 dias após entrega/execução\n• **Pequenos valores**: Pode ser menor\n• **ME/EPP**: Prazo reduzido quando possível\n\n📅 **Contagem do prazo:**\n1. Entrega do produto/serviço\n2. Emissão da nota fiscal\n3. Atesto pela administração\n4. Início da contagem (30 dias)\n\n💡 **Atrasos no pagamento:**\n• Juros de mora automáticos\n• Correção monetária\n• Possibilidade de suspender execução\n\n**Exemplo prático**: Entregou em 15/01, emitiu NF no mesmo dia, órgão atestou em 20/01 - pagamento deve ocorrer até 19/02.\n\n⚖️ **Base Legal**: Lei 14.133/2021, art. 126\n\n🔎 **Saiba mais**: Consulte a cláusula de pagamento no seu contrato específico",
            confidence: 0.96
          }
        ]
      },
      
      impostos: {
        keywords: ['imposto', 'tributo', 'icms', 'iss', 'pis', 'cofins'],
        responses: [
          {
            keywords: ['retenção', 'desconto', 'retido'],
            response: "📊 **RETENÇÕES TRIBUTÁRIAS EM CONTRATOS PÚBLICOS**\n\n💸 **Principais retenções:**\n• **IRRF**: 1,5% a 4,8% (dependendo do serviço)\n• **CSLL**: 1% (pessoas jurídicas)\n• **PIS/COFINS**: 3,65% (alguns serviços)\n• **ISS**: 2% a 5% (serviços)\n• **INSS**: 11% (serviços com mão de obra)\n\n📋 **ME/EPP - Benefícios:**\n• **Simples Nacional**: Sem retenção na fonte\n• **Comprovação**: Apresentar declaração\n• **Alíquota reduzida**: Conforme faturamento\n\n**Exemplo prático**: Contrato de R$ 10.000 para ME no Simples Nacional - sem retenção. Empresa normal teria retenção de aproximadamente R$ 800.\n\n⚖️ **Base Legal**: IN RFB 1.234/2012, LC 123/2006\n\n🔎 **Saiba mais**: Consulte seu contador sobre enquadramento tributário adequado",
            confidence: 0.94
          }
        ]
      },
      
      custos: {
        keywords: ['custo', 'preço', 'orçamento', 'margem', 'lucro'],
        responses: [
          {
            keywords: ['calcular', 'formar', 'como'],
            response: "📈 **FORMAÇÃO DE PREÇOS PARA LICITAÇÕES**\n\n🧮 **Estrutura básica de custos:**\n• **Custos diretos**: Materiais, mão de obra\n• **Custos indiretos**: Aluguel, energia, internet\n• **Tributos**: Impostos sobre faturamento\n• **Margem de lucro**: 8% a 15% (mercado)\n• **BDI**: Benefícios e Despesas Indiretas\n\n💡 **Dicas para competitividade:**\n• Negocie melhores preços com fornecedores\n• Otimize logística e processos\n• Considere economia de escala\n• Analise histórico de preços do órgão\n\n**Exemplo prático**: Serviço de R$ 80/hora + 30% custos indiretos + 20% tributos + 10% lucro = R$ 124,80/hora final.\n\n⚡ **Dica importante**: Nunca forme preço abaixo do custo total - risco de prejuízo!\n\n🔎 **Saiba mais**: Use planilhas de composição de custos disponíveis no Portal de Compras",
            confidence: 0.93
          }
        ]
      }
    };
    
    // Buscar resposta específica
    for (const [category, data] of Object.entries(financeiroDB)) {
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
              module: 'financeiro',
              category: category
            };
          }
        }
        
        if (data.responses.length > 0) {
          return {
            response: data.responses[0].response,
            confidence: data.responses[0].confidence,
            module: 'financeiro',
            category: category
          };
        }
      }
    }
    
    return {
      response: "💰 **CONSULTORIA FINANCEIRA**\n\nEstou aqui para ajudar com questões financeiras! Posso orientar sobre:\n\n• **Pagamentos** - prazos, atrasos, juros\n• **Impostos** - retenções, tributos, benefícios ME/EPP\n• **Custos** - formação de preços, margens, competitividade\n• **Faturamento** - notas fiscais, documentação\n\n**Exemplo de pergunta**: \"Quando vou receber o pagamento do contrato?\"\n\n🔎 **Saiba mais**: Detalhe sua situação financeira específica para orientação personalizada",
      confidence: 0.70,
      module: 'financeiro',
      category: 'generic'
    };
  }
};