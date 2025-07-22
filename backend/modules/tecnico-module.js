// Módulo Técnico - Especializado em plataformas e sistemas
module.exports = {
  processQuery: function(queryText, context = {}) {
    const query = queryText.toLowerCase();
    
    const tecnicoDB = {
      plataformas: {
        keywords: ['plataforma', 'site', 'portal', 'comprasnet', 'sicaf'],
        responses: [
          {
            keywords: ['cadastro', 'registro'],
            response: "💻 **CADASTRO EM PLATAFORMAS DE LICITAÇÃO**\n\nPara participar de licitações públicas, você precisa se cadastrar nas principais plataformas:\n\n🌐 **Principais Plataformas:**\n• **ComprasNet** - Governo Federal\n• **BEC** - São Paulo\n• **Licitações-e** - Banco do Brasil\n• **SICAF** - Sistema de Cadastramento\n\n📋 **Documentos necessários:**\n• CNPJ ativo\n• Certidões regulares\n• Contrato social\n• Certificado digital\n\n**Exemplo prático**: Para se cadastrar no ComprasNet, acesse www.comprasnet.gov.br, clique em \"Fornecedor\" e siga o passo a passo.\n\n⚡ **Dica importante**: Mantenha sempre suas certidões atualizadas para evitar inabilitação.\n\n🔎 **Saiba mais**: Cada órgão pode ter sua própria plataforma - consulte o edital",
            confidence: 0.95
          }
        ]
      },
      
      propostas: {
        keywords: ['proposta', 'envio', 'upload', 'arquivo'],
        responses: [
          {
            keywords: ['enviar', 'submeter', 'mandar'],
            response: "📤 **ENVIANDO PROPOSTAS NAS PLATAFORMAS**\n\n⏰ **Prazos importantes:**\n• Envie com antecedência mínima de 2 horas\n• Confirme o recebimento na plataforma\n• Guarde o protocolo de envio\n\n📁 **Formato dos arquivos:**\n• PDF assinado digitalmente\n• Tamanho máximo: geralmente 5MB\n• Nome claro: \"Proposta_NomeEmpresa_Pregao123\"\n\n🔧 **Problemas comuns:**\n• **Erro de certificado**: Verifique validade\n• **Arquivo muito grande**: Comprima o PDF\n• **Timeout**: Tente em horário de menor movimento\n\n**Exemplo prático**: Se o prazo final é 14h, envie até 12h para ter margem de segurança.\n\n⚡ **Dica importante**: Sempre teste o sistema antes do prazo final.\n\n🔎 **Saiba mais**: Consulte o manual da plataforma específica no site do órgão",
            confidence: 0.94
          }
        ]
      },
      
      certificado: {
        keywords: ['certificado', 'digital', 'token', 'senha'],
        responses: [
          {
            keywords: ['problema', 'erro', 'não', 'funciona'],
            response: "🔐 **PROBLEMAS COM CERTIFICADO DIGITAL**\n\n🚨 **Problemas mais comuns:**\n• **Certificado expirado**: Renove na Autoridade Certificadora\n• **Driver não instalado**: Baixe no site do fabricante\n• **Senha incorreta**: Verifique caps lock e caracteres\n• **Token não reconhecido**: Teste em outro computador\n\n🔧 **Soluções rápidas:**\n1. Reinicie o navegador\n2. Limpe cache e cookies\n3. Use modo compatibilidade\n4. Teste em navegador diferente\n\n**Exemplo prático**: Se aparecer \"Certificado não encontrado\", desconecte e reconecte o token, depois atualize a página.\n\n⚡ **Dica importante**: Tenha sempre um certificado reserva válido.\n\n🔎 **Saiba mais**: Entre em contato com o suporte técnico da AC que emitiu seu certificado",
            confidence: 0.93
          }
        ]
      }
    };
    
    // Buscar resposta específica
    for (const [category, data] of Object.entries(tecnicoDB)) {
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
              module: 'tecnico',
              category: category
            };
          }
        }
        
        if (data.responses.length > 0) {
          return {
            response: data.responses[0].response,
            confidence: data.responses[0].confidence,
            module: 'tecnico',
            category: category
          };
        }
      }
    }
    
    return {
      response: "💻 **SUPORTE TÉCNICO**\n\nEstou aqui para ajudar com questões técnicas! Posso orientar sobre:\n\n• **Plataformas** - cadastro, acesso, navegação\n• **Propostas** - envio, formatos, prazos\n• **Certificados** - instalação, problemas, renovação\n• **Sistemas** - erros, bugs, compatibilidade\n\n**Exemplo de pergunta**: \"Como envio minha proposta no ComprasNet?\"\n\n🔎 **Saiba mais**: Descreva seu problema técnico específico para obter ajuda direcionada",
      confidence: 0.70,
      module: 'tecnico',
      category: 'generic'
    };
  }
};