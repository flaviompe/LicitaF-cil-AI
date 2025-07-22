// Módulo Operacional - Especializado em processos e procedimentos
module.exports = {
  processQuery: function(queryText, context = {}) {
    const query = queryText.toLowerCase();
    
    const operacionalDB = {
      processo: {
        keywords: ['processo', 'andamento', 'fase', 'etapa', 'status'],
        responses: [
          {
            keywords: ['acompanhar', 'ver', 'saber'],
            response: "📋 **ACOMPANHAMENTO DE PROCESSOS LICITATÓRIOS**\n\n🔍 **Como acompanhar:**\n• **Portal do órgão**: Consulta por número\n• **ComprasNet**: Seção \"Acompanhar\"\n• **E-mail**: Cadastre-se para notificações\n• **Diário Oficial**: Publicações importantes\n\n📅 **Principais fases:**\n1. **Publicação** - Edital disponível\n2. **Esclarecimentos** - Período de dúvidas\n3. **Abertura** - Sessão pública\n4. **Habilitação** - Análise documental\n5. **Adjudicação** - Vencedor definido\n6. **Homologação** - Processo finalizado\n\n**Exemplo prático**: No ComprasNet, digite o número do pregão na busca e veja todas as informações e documentos.\n\n⚡ **Dica importante**: Acompanhe diariamente - prazos são rigorosos!\n\n🔎 **Saiba mais**: Configure alertas automáticos por e-mail nos portais",
            confidence: 0.95
          }
        ]
      },
      
      cronograma: {
        keywords: ['cronograma', 'quando', 'prazo', 'tempo'],
        responses: [
          {
            keywords: ['entregar', 'executar', 'cumprir'],
            response: "⏰ **CRONOGRAMAS DE EXECUÇÃO**\n\n📅 **Prazos típicos por modalidade:**\n• **Pregão**: 5-10 dias após assinatura\n• **Concorrência**: 15-30 dias\n• **Tomada de preços**: 10-20 dias\n• **Convite**: 5-15 dias\n\n🎯 **Gestão de cronograma:**\n• **Planejamento**: Divida em etapas menores\n• **Recursos**: Garanta disponibilidade\n• **Contingência**: Reserve 10% do prazo\n• **Comunicação**: Mantenha órgão informado\n\n⚠️ **Atrasos - consequências:**\n• Multa por atraso (0,1% a 0,5% ao dia)\n• Advertência oficial\n• Suspensão temporária\n• Rescisão contratual\n\n**Exemplo prático**: Contrato de 30 dias - planeje 27 dias de execução, 3 dias de margem.\n\n⚖️ **Base Legal**: Lei 14.133/2021, arts. 155-156\n\n🔎 **Saiba mais**: Solicite prorrogação antecipadamente se necessário",
            confidence: 0.94
          }
        ]
      },
      
      documentacao: {
        keywords: ['documentação', 'papéis', 'arquivo', 'organizar'],
        responses: [
          {
            keywords: ['organizar', 'manter', 'guardar'],
            response: "📁 **ORGANIZAÇÃO DOCUMENTAL**\n\n🗂️ **Documentos essenciais:**\n• **Edital completo** - Com todos os anexos\n• **Proposta enviada** - Backup digital\n• **Comprovantes** - Protocolos de envio\n• **Contratos** - Assinados e atualizados\n• **Correspondências** - E-mails e ofícios\n\n📋 **Sistema de arquivo:**\n• **Por processo**: Pasta para cada licitação\n• **Por ano**: Organização cronológica\n• **Digital + físico**: Backup duplo\n• **Nomes claros**: \"Pregao123_2024_Prefeitura\"\n\n🔐 **Prazo de guarda:**\n• **Contratos**: 5 anos após conclusão\n• **Licitações**: 5 anos após homologação\n• **Fiscais**: Conforme legislação tributária\n\n**Exemplo prático**: Crie pasta \"Licitações_2024\" com subpastas por órgão e processo.\n\n⚡ **Dica importante**: Digitalize tudo - facilita consultas e backups!\n\n🔎 **Saiba mais**: Use sistemas de gestão documental para empresas",
            confidence: 0.92
          }
        ]
      }
    };
    
    // Buscar resposta específica
    for (const [category, data] of Object.entries(operacionalDB)) {
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
              module: 'operacional',
              category: category
            };
          }
        }
        
        if (data.responses.length > 0) {
          return {
            response: data.responses[0].response,
            confidence: data.responses[0].confidence,
            module: 'operacional',
            category: category
          };
        }
      }
    }
    
    return {
      response: "⚙️ **SUPORTE OPERACIONAL**\n\nEstou aqui para ajudar com processos operacionais! Posso orientar sobre:\n\n• **Processos** - acompanhamento, fases, status\n• **Cronogramas** - prazos, execução, gestão de tempo\n• **Documentação** - organização, arquivo, controle\n• **Procedimentos** - passo a passo, rotinas\n\n**Exemplo de pergunta**: \"Como acompanho o andamento da licitação?\"\n\n🔎 **Saiba mais**: Descreva sua necessidade operacional específica para orientação detalhada",
      confidence: 0.70,
      module: 'operacional',
      category: 'generic'
    };
  }
};