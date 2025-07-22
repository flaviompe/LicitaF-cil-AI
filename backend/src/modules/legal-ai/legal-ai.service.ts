import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LegalQuery, QueryType, QueryStatus, QueryPriority } from './entities/legal-query.entity';
import { LegalKnowledgeService } from './services/legal-knowledge.service';
import { LegalAnalysisService } from './services/legal-analysis.service';
import { LegalUpdaterService } from './services/legal-updater.service';
import { OpenAIService } from '../ai/services/openai.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class LegalAIService {
  private readonly logger = new Logger(LegalAIService.name);

  constructor(
    @InjectRepository(LegalQuery)
    private legalQueryRepository: Repository<LegalQuery>,
    private legalKnowledgeService: LegalKnowledgeService,
    private legalAnalysisService: LegalAnalysisService,
    private legalUpdaterService: LegalUpdaterService,
    private openAIService: OpenAIService,
  ) {}

  async processLegalQuery(
    userId: string,
    queryText: string,
    context?: {
      type?: QueryType;
      priority?: QueryPriority;
      opportunityId?: string;
      editalUrl?: string;
      companySize?: string;
      sector?: string;
    }
  ): Promise<LegalQuery> {
    // Create query record
    const query = this.legalQueryRepository.create({
      userId,
      queryText,
      type: context?.type || this.inferQueryType(queryText),
      priority: context?.priority || this.inferQueryPriority(queryText),
      status: QueryStatus.PENDING,
      contextData: context ? {
        opportunityId: context.opportunityId,
        editalUrl: context.editalUrl,
        companySize: context.companySize,
        sector: context.sector,
      } : undefined,
    });

    await this.legalQueryRepository.save(query);

    // Process query asynchronously
    this.processQueryAsync(query);

    return query;
  }

  private async processQueryAsync(query: LegalQuery): Promise<void> {
    try {
      query.setProcessingStarted();
      await this.legalQueryRepository.save(query);

      // Find relevant legal documents
      const keywords = this.extractQueryKeywords(query.queryText);
      const relevantDocs = await this.legalKnowledgeService.findRelevantDocuments(
        keywords,
        { type: this.mapQueryTypeToContext(query.type) }
      );

      // Generate AI response
      const response = await this.generateLegalResponse(
        query.queryText,
        relevantDocs,
        query.contextData
      );

      // Build legal references
      const legalReferences = relevantDocs.map(doc => ({
        documentId: doc.id,
        documentNumber: doc.number,
        title: doc.title,
        relevance: doc.relevanceScore / 100,
        excerpt: doc.summary,
      }));

      // Calculate confidence score
      const confidenceScore = this.calculateResponseConfidence(response, relevantDocs);

      // Generate follow-up questions
      const followUpQuestions = this.generateFollowUpQuestions(query.queryText, query.type);

      // Check for warning flags
      const warningFlags = this.identifyWarningFlags(response, query.queryText);

      // Complete query
      query.setCompleted(response, confidenceScore);
      query.legalReferences = legalReferences;
      query.followUpQuestions = followUpQuestions;
      query.warningFlags = warningFlags;

      await this.legalQueryRepository.save(query);

    } catch (error) {
      this.logger.error('Error processing legal query:', error);
      query.setFailed(error.message);
      await this.legalQueryRepository.save(query);
    }
  }

  private inferQueryType(queryText: string): QueryType {
    const text = queryText.toLowerCase();

    if (text.includes('prazo') || text.includes('deadline') || text.includes('cronograma')) {
      return QueryType.DEADLINE_INQUIRY;
    }

    if (text.includes('documento') || text.includes('certidão') || text.includes('habilitação')) {
      return QueryType.DOCUMENT_ANALYSIS;
    }

    if (text.includes('risco') || text.includes('penalidade') || text.includes('sanção')) {
      return QueryType.RISK_ASSESSMENT;
    }

    if (text.includes('como') || text.includes('procedimento') || text.includes('passo')) {
      return QueryType.PROCEDURE_GUIDANCE;
    }

    if (text.includes('conformidade') || text.includes('legal') || text.includes('permitido')) {
      return QueryType.COMPLIANCE_CHECK;
    }

    if (text.includes('jurisprudência') || text.includes('tcu') || text.includes('acórdão')) {
      return QueryType.JURISPRUDENCE;
    }

    if (text.includes('significa') || text.includes('definição') || text.includes('conceito')) {
      return QueryType.INTERPRETATION;
    }

    return QueryType.GENERAL;
  }

  private inferQueryPriority(queryText: string): QueryPriority {
    const text = queryText.toLowerCase();

    if (text.includes('urgente') || text.includes('hoje') || text.includes('amanhã')) {
      return QueryPriority.URGENT;
    }

    if (text.includes('importante') || text.includes('crítico') || text.includes('prazo')) {
      return QueryPriority.HIGH;
    }

    if (text.includes('dúvida') || text.includes('esclarecimento')) {
      return QueryPriority.MEDIUM;
    }

    return QueryPriority.LOW;
  }

  private extractQueryKeywords(queryText: string): string[] {
    const text = queryText.toLowerCase();
    const keywords = [];

    // Common legal terms
    const legalTerms = [
      'licitação', 'pregão', 'tomada de preços', 'convite', 'concorrência',
      'contrato', 'proposta', 'habilitação', 'documentação', 'certidão',
      'microempresa', 'empresa pequeno porte', 'mei', 'cnpj', 'cpf',
      'prazo', 'cronograma', 'entrega', 'execução', 'pagamento',
      'recurso', 'impugnação', 'esclarecimento', 'sessão pública',
      'envelope', 'proposta técnica', 'proposta comercial', 'menor preço',
      'inexigibilidade', 'dispensa', 'sanção', 'penalidade', 'multa',
      'habilitação', 'inabilitação', 'desclassificação', 'adjudicação',
      'homologação', 'revogação', 'anulação', 'sustentabilidade',
    ];

    legalTerms.forEach(term => {
      if (text.includes(term)) {
        keywords.push(term);
      }
    });

    // Extract other relevant words
    const words = text.split(/\s+/).filter(word => word.length > 3);
    keywords.push(...words.slice(0, 5));

    return [...new Set(keywords)];
  }

  private mapQueryTypeToContext(type: QueryType): string {
    const mapping = {
      [QueryType.GENERAL]: 'general',
      [QueryType.DOCUMENT_ANALYSIS]: 'compliance',
      [QueryType.COMPLIANCE_CHECK]: 'compliance',
      [QueryType.RISK_ASSESSMENT]: 'risk',
      [QueryType.DEADLINE_INQUIRY]: 'deadline',
      [QueryType.PROCEDURE_GUIDANCE]: 'procedure',
      [QueryType.JURISPRUDENCE]: 'jurisprudence',
      [QueryType.INTERPRETATION]: 'general',
    };

    return mapping[type] || 'general';
  }

  private async generateLegalResponse(
    queryText: string,
    relevantDocs: any[],
    contextData?: any
  ): Promise<string> {
    const prompt = this.buildLegalPrompt(queryText, relevantDocs, contextData);

    const response = await this.openAIService.generateResponse(prompt, {
      model: 'gpt-4',
      temperature: 0.1,
      maxTokens: 1500,
    });

    return response;
  }

  private buildLegalPrompt(
    queryText: string,
    relevantDocs: any[],
    contextData?: any
  ): string {
    const lawsSummary = relevantDocs.map(doc => 
      `${doc.displayName}: ${doc.summary}\nArtigos relevantes: ${doc.keyPoints?.join(', ')}`
    ).join('\n\n');

    const contextInfo = contextData ? `
CONTEXTO:
- Empresa: ${contextData.companySize || 'Não informado'}
- Setor: ${contextData.sector || 'Não informado'}
- Oportunidade: ${contextData.opportunityId || 'Não informado'}
- Edital: ${contextData.editalUrl || 'Não informado'}
` : '';

    return `
Você é um consultor jurídico especializado em licitações públicas brasileiras, atuando como advogado virtual da plataforma LicitaFácil Pro.

PERGUNTA DO USUÁRIO:
${queryText}

LEGISLAÇÃO APLICÁVEL:
${lawsSummary}

${contextInfo}

INSTRUÇÕES:
1. Responda de forma clara e objetiva, usando linguagem acessível ao empresário do interior
2. Cite as bases legais específicas (exemplo: "conforme art. 62 da Lei 14.133/21")
3. Destaque benefícios específicos para ME/EPP quando aplicável
4. Inclua alertas sobre prazos críticos se relevante
5. Sugira próximos passos práticos quando apropriado
6. Mantenha tom profissional mas amigável
7. Limite a resposta a 3 parágrafos concisos

IMPORTANTE:
- Esta é uma consultoria automatizada, não substitui assessoria jurídica especializada
- Baseie-se estritamente na legislação brasileira vigente
- Priorize informações sobre a Lei 14.133/2021 (Nova Lei de Licitações)
- Destaque tratamento diferenciado para ME/EPP (LC 123/2006)

RESPOSTA:
`;
  }

  private calculateResponseConfidence(response: string, relevantDocs: any[]): number {
    let confidence = 0.7; // Base confidence

    // Higher confidence with more relevant documents
    if (relevantDocs.length >= 3) confidence += 0.1;
    if (relevantDocs.length >= 5) confidence += 0.1;

    // Higher confidence with specific legal citations
    if (response.includes('Lei') || response.includes('art.') || response.includes('§')) {
      confidence += 0.1;
    }

    // Lower confidence for complex queries
    if (response.includes('depende') || response.includes('pode variar')) {
      confidence -= 0.1;
    }

    return Math.max(0.5, Math.min(1.0, confidence));
  }

  private generateFollowUpQuestions(queryText: string, type: QueryType): string[] {
    const baseQuestions = [
      'Gostaria de mais detalhes sobre algum aspecto específico?',
      'Tem alguma dúvida sobre os prazos mencionados?',
      'Precisa de orientação sobre a documentação necessária?',
    ];

    const typeSpecificQuestions = {
      [QueryType.DEADLINE_INQUIRY]: [
        'Quer que eu calcule os prazos para sua empresa?',
        'Precisa de lembretes sobre esses prazos?',
        'Gostaria de saber sobre recursos em caso de atraso?',
      ],
      [QueryType.DOCUMENT_ANALYSIS]: [
        'Quer que eu analise seus documentos existentes?',
        'Precisa de orientação sobre como obter certidões?',
        'Gostaria de saber sobre documentos específicos para ME/EPP?',
      ],
      [QueryType.RISK_ASSESSMENT]: [
        'Quer uma análise de risco mais detalhada?',
        'Precisa de estratégias para mitigar riscos?',
        'Gostaria de saber sobre penalidades específicas?',
      ],
      [QueryType.PROCEDURE_GUIDANCE]: [
        'Precisa de um passo a passo detalhado?',
        'Quer que eu explique algum procedimento específico?',
        'Gostaria de exemplos práticos?',
      ],
    };

    const specific = typeSpecificQuestions[type] || [];
    return [...baseQuestions, ...specific].slice(0, 3);
  }

  private identifyWarningFlags(response: string, queryText: string): any[] {
    const warnings = [];
    const text = response.toLowerCase();

    // Deadline warnings
    if (text.includes('prazo') || text.includes('deadline')) {
      warnings.push({
        type: 'deadline',
        message: 'Atenção aos prazos legais mencionados',
        severity: 'high',
        actionRequired: 'Verificar cronograma e calendário',
      });
    }

    // Compliance warnings
    if (text.includes('obrigatório') || text.includes('exigido')) {
      warnings.push({
        type: 'compliance',
        message: 'Requisitos obrigatórios identificados',
        severity: 'medium',
        actionRequired: 'Verificar conformidade documental',
      });
    }

    // Risk warnings
    if (text.includes('penalidade') || text.includes('sanção') || text.includes('multa')) {
      warnings.push({
        type: 'risk',
        message: 'Possíveis penalidades identificadas',
        severity: 'high',
        actionRequired: 'Revisar procedimentos para evitar sanções',
      });
    }

    // Document warnings
    if (text.includes('certidão') || text.includes('documento')) {
      warnings.push({
        type: 'document',
        message: 'Documentação específica necessária',
        severity: 'medium',
        actionRequired: 'Verificar e providenciar documentos',
      });
    }

    return warnings;
  }

  // Chat command processors
  async processAdvogadoCommand(
    userId: string,
    command: string,
    args: string
  ): Promise<LegalQuery> {
    const queryText = `${command} ${args}`.trim();
    return await this.processLegalQuery(userId, queryText, {
      type: QueryType.GENERAL,
      priority: QueryPriority.MEDIUM,
    });
  }

  async processJuridicoCommand(
    userId: string,
    command: string,
    args: string
  ): Promise<LegalQuery> {
    let type = QueryType.GENERAL;
    let priority = QueryPriority.MEDIUM;

    if (args.includes('validar')) {
      type = QueryType.COMPLIANCE_CHECK;
      priority = QueryPriority.HIGH;
    } else if (args.includes('analisar')) {
      type = QueryType.DOCUMENT_ANALYSIS;
      priority = QueryPriority.HIGH;
    } else if (args.includes('risco')) {
      type = QueryType.RISK_ASSESSMENT;
      priority = QueryPriority.HIGH;
    }

    return await this.processLegalQuery(userId, args, { type, priority });
  }

  async processIaLicitacaoCommand(
    userId: string,
    command: string,
    args: string
  ): Promise<LegalQuery> {
    let type = QueryType.PROCEDURE_GUIDANCE;
    let priority = QueryPriority.MEDIUM;

    if (args.includes('documentos')) {
      type = QueryType.DOCUMENT_ANALYSIS;
    } else if (args.includes('prazo')) {
      type = QueryType.DEADLINE_INQUIRY;
      priority = QueryPriority.HIGH;
    } else if (args.includes('recurso')) {
      type = QueryType.PROCEDURE_GUIDANCE;
      priority = QueryPriority.HIGH;
    }

    return await this.processLegalQuery(userId, args, { type, priority });
  }

  // Public query methods
  async getQueryById(id: string): Promise<LegalQuery | null> {
    return await this.legalQueryRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async getQueriesByUser(userId: string, limit: number = 20): Promise<LegalQuery[]> {
    return await this.legalQueryRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getRecentQueries(limit: number = 50): Promise<LegalQuery[]> {
    return await this.legalQueryRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getQueriesByType(type: QueryType, limit: number = 20): Promise<LegalQuery[]> {
    return await this.legalQueryRepository.find({
      where: { type },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getPendingQueries(): Promise<LegalQuery[]> {
    return await this.legalQueryRepository.find({
      where: { status: QueryStatus.PENDING },
      order: { priority: 'DESC', createdAt: 'ASC' },
    });
  }

  async getHighPriorityQueries(): Promise<LegalQuery[]> {
    return await this.legalQueryRepository.find({
      where: { priority: QueryPriority.HIGH },
      order: { createdAt: 'DESC' },
    });
  }

  async getUrgentQueries(): Promise<LegalQuery[]> {
    return await this.legalQueryRepository.find({
      where: { priority: QueryPriority.URGENT },
      order: { createdAt: 'DESC' },
    });
  }

  async setQueryFeedback(
    queryId: string,
    rating: number,
    comment?: string
  ): Promise<LegalQuery | null> {
    const query = await this.legalQueryRepository.findOne({ where: { id: queryId } });
    
    if (!query) {
      return null;
    }
    
    query.setFeedback(rating, comment);
    return await this.legalQueryRepository.save(query);
  }

  async deleteQuery(id: string): Promise<boolean> {
    const result = await this.legalQueryRepository.delete(id);
    return result.affected > 0;
  }

  async getQueryStatistics(): Promise<{
    total: number;
    byType: Record<QueryType, number>;
    byStatus: Record<QueryStatus, number>;
    byPriority: Record<QueryPriority, number>;
    averageProcessingTime: number;
    averageConfidenceScore: number;
    averageRating: number;
  }> {
    const total = await this.legalQueryRepository.count();
    
    const byType = await this.legalQueryRepository
      .createQueryBuilder('query')
      .select('query.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('query.type')
      .getRawMany();

    const byStatus = await this.legalQueryRepository
      .createQueryBuilder('query')
      .select('query.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('query.status')
      .getRawMany();

    const byPriority = await this.legalQueryRepository
      .createQueryBuilder('query')
      .select('query.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('query.priority')
      .getRawMany();

    const averages = await this.legalQueryRepository
      .createQueryBuilder('query')
      .select('AVG(query.processingTime)', 'avgProcessingTime')
      .addSelect('AVG(query.confidenceScore)', 'avgConfidenceScore')
      .addSelect('AVG(query.feedbackRating)', 'avgRating')
      .getRawOne();

    return {
      total,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {}),
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priority] = parseInt(item.count);
        return acc;
      }, {}),
      averageProcessingTime: parseFloat(averages.avgProcessingTime) || 0,
      averageConfidenceScore: parseFloat(averages.avgConfidenceScore) || 0,
      averageRating: parseFloat(averages.avgRating) || 0,
    };
  }

  // Integration methods
  async getKnowledgeService(): Promise<LegalKnowledgeService> {
    return this.legalKnowledgeService;
  }

  async getAnalysisService(): Promise<LegalAnalysisService> {
    return this.legalAnalysisService;
  }

  async getUpdaterService(): Promise<LegalUpdaterService> {
    return this.legalUpdaterService;
  }
}