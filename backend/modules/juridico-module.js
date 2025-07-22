// Módulo Jurídico - Especializado em legislação de licitações
module.exports = {
  processQuery: function(queryText, context = {}) {
    const query = queryText.toLowerCase();
    
    // Base de conhecimento jurídico específica
    const juridicoDB = {
      prazos: {
        keywords: ['prazo', 'tempo', 'recurso', 'impugnação', 'esclarecimento'],
        responses: [
          {
            keywords: ['recurso', 'pregão'],
            response: "📋 **PRAZOS PARA RECURSOS NO PREGÃO ELETRÔNICO**\n\n🕐 **3 dias úteis** para interposição de recurso após a sessão pública (art. 44, Lei 10.520/2002)\n\n📅 **Contagem**: A partir da intimação do ato ou lavratura da ata\n\n⚖️ **Base Legal**: Lei 10.520/2002, art. 44 c/c Decreto 10.024/2019\n\n💡 **Dica importante**: No pregão eletrônico, o recurso deve ser manifestado imediatamente após a sessão, e as razões apresentadas em até 3 dias úteis.\n\n🔎 **Saiba mais**: Consulte o Decreto 10.024/2019 para procedimentos detalhados do pregão eletrônico.",
            confidence: 0.98
          },
          {
            keywords: ['impugnação', 'edital'],
            response: "📋 **PRAZOS PARA IMPUGNAÇÃO DE EDITAL**\n\n🕐 **Até 3 dias úteis** antes da data fixada para abertura das propostas (art. 78, Lei 14.133/2021)\n\n📧 **Como fazer**: Petição dirigida à autoridade competente, por escrito\n\n⚖️ **Base Legal**: Lei 14.133/2021, art. 78\n\n⚠️ **Atenção**: A impugnação não suspende os prazos previstos no edital, salvo decisão em contrário da administração.\n\n🔎 **Saiba mais**: Art. 78 da Lei 14.133/2021 - Nova Lei de Licitações",
            confidence: 0.97
          }
        ]
      },
      
      mei_beneficios: {
        keywords: ['mei', 'microempresa', 'me', 'epp', 'pequeno', 'micro'],
        responses: [
          {
            keywords: ['participar', 'valor', 'limite'],
            response: "📋 **MEI/ME/EPP EM LICITAÇÕES**\n\n✅ **MEI PODE participar** de qualquer valor de licitação - não há limitação!\n\n🎯 **Benefícios garantidos para ME/EPP:**\n• **Cota de 25%** - Reserva obrigatória do objeto\n• **Empate ficto** - Preferência até 10% superior\n• **Regularização posterior** - 5 dias úteis\n• **Subcontratação** - 30% obrigatório para grandes empresas\n\n**Exemplo prático**: Uma MEI pode participar e vencer uma licitação de R$ 500.000, desde que tenha capacidade técnica e operacional.\n\n⚖️ **Base Legal**: LC 123/2006, arts. 44 a 49\n\n🔎 **Saiba mais**: Lei Complementar 123/2006 - Estatuto da Microempresa",
            confidence: 0.95
          }
        ]
      },
      
      documentos: {
        keywords: ['documento', 'habilitação', 'certidão', 'cnd'],
        responses: [
          {
            keywords: ['obrigatório', 'necessário', 'exigido'],
            response: "📋 **DOCUMENTOS OBRIGATÓRIOS PARA HABILITAÇÃO**\n\n📄 **1. HABILITAÇÃO JURÍDICA:**\n• Ato constitutivo atualizado\n• CNPJ ativo e regular\n• Procuração (se representado)\n\n💰 **2. REGULARIDADE FISCAL:**\n• CND Federal (Receita Federal)\n• CND Estadual e Municipal\n• CND FGTS e Trabalhista (TST)\n\n💵 **3. QUALIFICAÇÃO ECONÔMICO-FINANCEIRA:**\n• Balanço patrimonial do último exercício\n• CND de falência e concordata\n\n🔧 **4. QUALIFICAÇÃO TÉCNICA:**\n• Atestados de capacidade técnica\n• Registro profissional (quando exigido)\n\n**Exemplo prático**: Para uma licitação de serviços de TI, além dos documentos básicos, será exigido atestado de capacidade técnica comprovando experiência anterior.\n\n⚖️ **Base Legal**: Lei 14.133/2021, arts. 62-67\n\n🔎 **Saiba mais**: Consulte o Portal de Compras do Governo para modelos de documentos",
            confidence: 0.96
          }
        ]
      }
    };
    
    // Buscar resposta específica
    for (const [category, data] of Object.entries(juridicoDB)) {
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
              module: 'juridico',
              category: category
            };
          }
        }
        
        // Retorna primeira resposta da categoria se não encontrou específica
        if (data.responses.length > 0) {
          return {
            response: data.responses[0].response,
            confidence: data.responses[0].confidence,
            module: 'juridico',
            category: category
          };
        }
      }
    }
    
    // Resposta genérica jurídica
    return {
      response: "⚖️ **CONSULTA JURÍDICA**\n\nRecebemos sua questão legal. Para respostas mais precisas, tente perguntas específicas sobre:\n\n• **Prazos** - recursos, impugnações, esclarecimentos\n• **ME/EPP** - benefícios, empate ficto, cotas\n• **Documentação** - habilitação, certidões obrigatórias\n• **Procedimentos** - modalidades, fases da licitação\n\n**Exemplo de pergunta**: \"Qual o prazo para recurso no pregão eletrônico?\"\n\n🔎 **Saiba mais**: Digite sua dúvida de forma mais específica para obter orientação detalhada",
      confidence: 0.70,
      module: 'juridico',
      category: 'generic'
    };
  }
};