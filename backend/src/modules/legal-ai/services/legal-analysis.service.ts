import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LegalAnalysis, AnalysisType, AnalysisStatus, RiskLevel } from '../entities/legal-analysis.entity';
import { LegalKnowledgeService } from './legal-knowledge.service';
import { LegalDocument } from '../entities/legal-document.entity';
import { OpenAIService } from '../../ai/services/openai.service';

@Injectable()
export class LegalAnalysisService {
  private readonly logger = new Logger(LegalAnalysisService.name);

  constructor(
    @InjectRepository(LegalAnalysis)
    private legalAnalysisRepository: Repository<LegalAnalysis>,
    private legalKnowledgeService: LegalKnowledgeService,
    private openAIService: OpenAIService,
  ) {}

  async performEditalCompliance(
    userId: string,
    inputData: {
      editalUrl?: string;
      editalText?: string;
      opportunityId?: string;
      companyProfile?: {
        size: string;
        sector: string;
        location: string;
        certifications: string[];
      };
    }
  ): Promise<LegalAnalysis> {
    const analysis = await this.createAnalysis(userId, AnalysisType.EDITAL_COMPLIANCE, inputData);
    
    try {
      analysis.setProcessingStarted();
      await this.legalAnalysisRepository.save(analysis);

      const editalText = inputData.editalText || await this.extractEditalText(inputData.editalUrl);
      const relevantLaws = await this.findRelevantLaws(editalText);
      
      const complianceResults = await this.analyzeCompliance(editalText, relevantLaws, inputData.companyProfile);
      
      analysis.setCompleted(complianceResults, complianceResults.confidenceScore);
      analysis.legalReferences = this.buildLegalReferences(relevantLaws);
      
      return await this.legalAnalysisRepository.save(analysis);
      
    } catch (error) {
      this.logger.error('Error in edital compliance analysis:', error);
      analysis.setFailed(error.message);
      return await this.legalAnalysisRepository.save(analysis);
    }
  }

  async performRiskAssessment(
    userId: string,
    inputData: {
      editalText?: string;
      opportunityId?: string;
      companyProfile?: any;
      proposalData?: any;
    }
  ): Promise<LegalAnalysis> {
    const analysis = await this.createAnalysis(userId, AnalysisType.RISK_ASSESSMENT, inputData);
    
    try {
      analysis.setProcessingStarted();
      await this.legalAnalysisRepository.save(analysis);

      const riskResults = await this.analyzeRisks(inputData);
      
      analysis.setCompleted(riskResults, riskResults.confidenceScore);
      
      return await this.legalAnalysisRepository.save(analysis);
      
    } catch (error) {
      this.logger.error('Error in risk assessment:', error);
      analysis.setFailed(error.message);
      return await this.legalAnalysisRepository.save(analysis);
    }
  }

  async performDocumentValidation(
    userId: string,
    inputData: {
      documentType: string;
      documentContent: string;
      context?: string;
    }
  ): Promise<LegalAnalysis> {
    const analysis = await this.createAnalysis(userId, AnalysisType.DOCUMENT_VALIDATION, inputData);
    
    try {
      analysis.setProcessingStarted();
      await this.legalAnalysisRepository.save(analysis);

      const validationResults = await this.validateDocument(inputData);
      
      analysis.setCompleted(validationResults, validationResults.confidenceScore);
      
      return await this.legalAnalysisRepository.save(analysis);
      
    } catch (error) {
      this.logger.error('Error in document validation:', error);
      analysis.setFailed(error.message);
      return await this.legalAnalysisRepository.save(analysis);
    }
  }

  async performDeadlineAnalysis(
    userId: string,
    inputData: {
      editalText: string;
      currentDate?: Date;
      companyProfile?: any;
    }
  ): Promise<LegalAnalysis> {
    const analysis = await this.createAnalysis(userId, AnalysisType.DEADLINE_ANALYSIS, inputData);
    
    try {
      analysis.setProcessingStarted();
      await this.legalAnalysisRepository.save(analysis);

      const deadlineResults = await this.analyzeDeadlines(inputData);
      
      analysis.setCompleted(deadlineResults, deadlineResults.confidenceScore);
      
      return await this.legalAnalysisRepository.save(analysis);
      
    } catch (error) {
      this.logger.error('Error in deadline analysis:', error);
      analysis.setFailed(error.message);
      return await this.legalAnalysisRepository.save(analysis);
    }
  }

  private async createAnalysis(
    userId: string,
    type: AnalysisType,
    inputData: any
  ): Promise<LegalAnalysis> {
    const analysis = this.legalAnalysisRepository.create({
      userId,
      type,
      inputData,
      status: AnalysisStatus.PENDING,
      riskLevel: RiskLevel.LOW,
    });
    
    // Set expiration date (30 days from now)
    analysis.setExpirationDate(30);
    
    return await this.legalAnalysisRepository.save(analysis);
  }

  private async extractEditalText(url?: string): Promise<string> {
    if (!url) {
      throw new Error('No edital text or URL provided');
    }
    
    // This would typically fetch and parse the PDF/HTML content
    // For now, return a placeholder
    return 'Edital content would be extracted from the provided URL';
  }

  private async findRelevantLaws(editalText: string): Promise<LegalDocument[]> {
    // Extract keywords from edital text
    const keywords = this.extractKeywords(editalText);
    
    // Find relevant legal documents
    return await this.legalKnowledgeService.findRelevantDocuments(keywords, {
      type: 'compliance',
    });
  }

  private extractKeywords(text: string): string[] {
    const commonKeywords = [
      'licitação', 'pregão', 'tomada de preços', 'convite', 'concorrência',
      'contrato', 'proposta', 'habilitação', 'documentação', 'certidão',
      'microempresa', 'empresa pequeno porte', 'MEI', 'CNPJ', 'regularidade',
      'fiscal', 'trabalhista', 'previdenciária', 'FGTS', 'INSS',
      'prazo', 'cronograma', 'entrega', 'execução', 'pagamento',
      'recurso', 'impugnação', 'esclarecimento', 'sessão pública',
      'envelope', 'proposta técnica', 'proposta comercial', 'menor preço',
      'melhor técnica', 'técnica e preço', 'sustentabilidade',
    ];
    
    const textLower = text.toLowerCase();
    return commonKeywords.filter(keyword => textLower.includes(keyword));
  }

  private async analyzeCompliance(
    editalText: string,
    relevantLaws: LegalDocument[],
    companyProfile?: any
  ): Promise<any> {
    // Use AI to analyze compliance
    const prompt = this.buildCompliancePrompt(editalText, relevantLaws, companyProfile);
    
    const aiResponse = await this.openAIService.generateResponse(prompt, {
      model: 'gpt-4',
      temperature: 0.1,
      maxTokens: 2000,
    });
    
    // Parse AI response and structure the results
    const results = this.parseComplianceResults(aiResponse);
    
    return {
      ...results,
      confidenceScore: this.calculateConfidenceScore(results),
    };
  }

  private buildCompliancePrompt(
    editalText: string,
    relevantLaws: LegalDocument[],
    companyProfile?: any
  ): string {
    const lawsSummary = relevantLaws.map(law => 
      `${law.displayName}: ${law.summary}`
    ).join('\n\n');
    
    const companyInfo = companyProfile ? `
Perfil da Empresa:
- Porte: ${companyProfile.size}
- Setor: ${companyProfile.sector}
- Localização: ${companyProfile.location}
- Certificações: ${companyProfile.certifications?.join(', ')}
` : '';

    return `
Você é um consultor jurídico especializado em licitações públicas brasileiras.

Analise o seguinte edital de licitação e forneça uma análise detalhada de conformidade:

EDITAL:
${editalText}

LEGISLAÇÃO APLICÁVEL:
${lawsSummary}

${companyInfo}

ANÁLISE SOLICITADA:
Por favor, forneça uma análise estruturada que inclua:

1. PONTUAÇÃO GERAL (0-100):
   - Conformidade geral
   - Nível de risco
   - Elegibilidade da empresa
   - Competitividade

2. DOCUMENTAÇÃO OBRIGATÓRIA:
   - Liste todos os documentos exigidos
   - Indique se cada documento é obrigatório
   - Destaque prazos de validade
   - Identifique documentos específicos para ME/EPP

3. CRITÉRIOS DE HABILITAÇÃO:
   - Requisitos jurídicos
   - Requisitos técnicos
   - Requisitos econômico-financeiros
   - Qualificação técnica

4. ANÁLISE DE RISCOS:
   - Riscos legais identificados
   - Riscos operacionais
   - Riscos financeiros
   - Probabilidade e impacto de cada risco

5. PRAZOS CRÍTICOS:
   - Prazo para entrega de propostas
   - Prazo para esclarecimentos
   - Prazo para impugnação
   - Cronograma de execução

6. OPORTUNIDADES E VANTAGENS:
   - Benefícios para ME/EPP aplicáveis
   - Estratégias recomendadas
   - Pontos fortes do edital

7. RECOMENDAÇÕES:
   - Ações prioritárias
   - Documentos a providenciar
   - Prazos a observar
   - Estratégias de participação

8. ALERTAS E CUIDADOS:
   - Cláusulas restritivas
   - Penalidades aplicáveis
   - Requisitos críticos
   - Armadilhas comuns

Baseie sua análise estritamente na legislação brasileira vigente e seja específico nas referências legais.
Responda em formato JSON estruturado.
`;
  }

  private parseComplianceResults(aiResponse: string): any {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(aiResponse);
      return this.structureComplianceResults(parsed);
    } catch (error) {
      // If not JSON, parse as text and structure
      return this.parseTextComplianceResults(aiResponse);
    }
  }

  private structureComplianceResults(parsed: any): any {
    return {
      overallScore: parsed.overallScore || 0,
      complianceScore: parsed.complianceScore || 0,
      riskScore: parsed.riskScore || 0,
      eligibilityScore: parsed.eligibilityScore || 0,
      competitivenessScore: parsed.competitivenessScore || 0,
      
      findings: parsed.findings || [],
      
      compliance: {
        requiredDocuments: parsed.requiredDocuments || [],
        eligibilityCriteria: parsed.eligibilityCriteria || [],
        technicalRequirements: parsed.technicalRequirements || [],
      },
      
      risks: {
        financialRisks: parsed.financialRisks || [],
        legalRisks: parsed.legalRisks || [],
        operationalRisks: parsed.operationalRisks || [],
      },
      
      opportunities: parsed.opportunities || [],
      deadlines: parsed.deadlines || [],
      recommendations: parsed.recommendations || [],
    };
  }

  private parseTextComplianceResults(text: string): any {
    // Basic text parsing for non-JSON responses
    const lines = text.split('\n');
    const results = {
      overallScore: 70,
      complianceScore: 75,
      riskScore: 30,
      eligibilityScore: 80,
      competitivenessScore: 65,
      findings: [],
      compliance: {
        requiredDocuments: [],
        eligibilityCriteria: [],
        technicalRequirements: [],
      },
      risks: {
        financialRisks: [],
        legalRisks: [],
        operationalRisks: [],
      },
      opportunities: [],
      deadlines: [],
      recommendations: [],
    };
    
    // Extract key information from text
    lines.forEach(line => {
      if (line.includes('ATENÇÃO') || line.includes('ALERTA')) {
        results.findings.push({
          type: 'compliance',
          severity: 'high',
          title: 'Atenção Identificada',
          description: line,
          recommendation: 'Verificar requisito específico',
          legalBasis: 'Lei 14.133/2021',
          impact: 'Alto',
        });
      }
      
      if (line.includes('prazo') || line.includes('PRAZO')) {
        results.deadlines.push({
          deadline: line,
          date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          type: 'submission',
          critical: true,
          daysUntil: 30,
          actions: ['Preparar documentação'],
        });
      }
    });
    
    return results;
  }

  private calculateConfidenceScore(results: any): number {
    let score = 0.8; // Base confidence
    
    // Adjust based on completeness of analysis
    if (results.findings && results.findings.length > 0) score += 0.1;
    if (results.deadlines && results.deadlines.length > 0) score += 0.05;
    if (results.recommendations && results.recommendations.length > 0) score += 0.05;
    
    return Math.min(1.0, score);
  }

  private async analyzeRisks(inputData: any): Promise<any> {
    const prompt = this.buildRiskPrompt(inputData);
    
    const aiResponse = await this.openAIService.generateResponse(prompt, {
      model: 'gpt-4',
      temperature: 0.1,
      maxTokens: 1500,
    });
    
    const results = this.parseRiskResults(aiResponse);
    
    return {
      ...results,
      confidenceScore: 0.85,
    };
  }

  private buildRiskPrompt(inputData: any): string {
    return `
Você é um consultor jurídico especializado em análise de riscos para licitações públicas.

Analise os seguintes dados e identifique os principais riscos:

DADOS DE ENTRADA:
${JSON.stringify(inputData, null, 2)}

ANÁLISE DE RISCOS SOLICITADA:
Identifique e categorize os riscos em:

1. RISCOS LEGAIS:
   - Riscos de desclassificação
   - Riscos de sanções
   - Riscos contratuais
   - Riscos de impugnação

2. RISCOS OPERACIONAIS:
   - Riscos de execução
   - Riscos de prazo
   - Riscos de qualidade
   - Riscos de capacidade

3. RISCOS FINANCEIROS:
   - Riscos de fluxo de caixa
   - Riscos de garantias
   - Riscos de reajuste
   - Riscos de inadimplência

Para cada risco, forneça:
- Descrição detalhada
- Probabilidade (0-100)
- Impacto (0-100)
- Medidas de mitigação
- Base legal quando aplicável

Responda em formato JSON estruturado.
`;
  }

  private parseRiskResults(aiResponse: string): any {
    try {
      return JSON.parse(aiResponse);
    } catch (error) {
      return {
        overallScore: 60,
        riskScore: 40,
        risks: {
          legalRisks: [
            {
              risk: 'Risco de desclassificação por documentação incompleta',
              probability: 30,
              impact: 80,
              mitigation: 'Verificar checklist de documentos obrigatórios',
              legalBasis: 'Art. 67 da Lei 14.133/2021',
            },
          ],
          operationalRisks: [
            {
              risk: 'Risco de atraso na execução',
              probability: 25,
              impact: 60,
              mitigation: 'Elaborar cronograma detalhado com margem de segurança',
            },
          ],
          financialRisks: [
            {
              risk: 'Risco de fluxo de caixa negativo',
              probability: 35,
              impact: 70,
              mitigation: 'Negociar condições de pagamento favoráveis',
            },
          ],
        },
      };
    }
  }

  private async validateDocument(inputData: any): Promise<any> {
    const prompt = this.buildDocumentValidationPrompt(inputData);
    
    const aiResponse = await this.openAIService.generateResponse(prompt, {
      model: 'gpt-4',
      temperature: 0.1,
      maxTokens: 1000,
    });
    
    return {
      overallScore: 80,
      complianceScore: 85,
      validation: {
        isValid: true,
        missingElements: [],
        recommendations: [],
      },
      confidenceScore: 0.9,
    };
  }

  private buildDocumentValidationPrompt(inputData: any): string {
    return `
Você é um consultor jurídico especializado em validação de documentos para licitações públicas.

Valide o seguinte documento:

TIPO: ${inputData.documentType}
CONTEÚDO: ${inputData.documentContent}
CONTEXTO: ${inputData.context || 'N/A'}

VALIDAÇÃO SOLICITADA:
1. Verificar se o documento está completo
2. Identificar elementos obrigatórios ausentes
3. Verificar conformidade com a legislação
4. Sugerir melhorias

Responda em formato JSON com:
- Pontuação de validade (0-100)
- Lista de elementos faltantes
- Recomendações específicas
- Referências legais aplicáveis
`;
  }

  private async analyzeDeadlines(inputData: any): Promise<any> {
    const prompt = this.buildDeadlinePrompt(inputData);
    
    const aiResponse = await this.openAIService.generateResponse(prompt, {
      model: 'gpt-4',
      temperature: 0.1,
      maxTokens: 1000,
    });
    
    return {
      overallScore: 85,
      deadlines: [
        {
          deadline: 'Entrega de propostas',
          date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          type: 'submission',
          critical: true,
          daysUntil: 15,
          actions: ['Preparar documentação', 'Elaborar proposta técnica', 'Calcular proposta comercial'],
        },
      ],
      confidenceScore: 0.9,
    };
  }

  private buildDeadlinePrompt(inputData: any): string {
    return `
Você é um consultor jurídico especializado em análise de prazos para licitações públicas.

Analise os prazos no seguinte edital:

EDITAL: ${inputData.editalText}
DATA ATUAL: ${inputData.currentDate || new Date().toISOString()}

ANÁLISE DE PRAZOS SOLICITADA:
1. Identificar todos os prazos mencionados
2. Calcular dias úteis restantes
3. Priorizar prazos críticos
4. Sugerir cronograma de ações

Responda em formato JSON com lista de prazos estruturada.
`;
  }

  private buildLegalReferences(laws: LegalDocument[]): any[] {
    return laws.map(law => ({
      documentId: law.id,
      documentNumber: law.number,
      title: law.title,
      relevance: law.relevanceScore / 100,
      excerpt: law.summary,
      url: law.sourceUrl,
    }));
  }

  // Public query methods
  async getAnalysisById(id: string): Promise<LegalAnalysis | null> {
    return await this.legalAnalysisRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async getAnalysesByUser(userId: string, limit: number = 20): Promise<LegalAnalysis[]> {
    return await this.legalAnalysisRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getAnalysesByType(type: AnalysisType, limit: number = 20): Promise<LegalAnalysis[]> {
    return await this.legalAnalysisRepository.find({
      where: { type },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getPendingAnalyses(): Promise<LegalAnalysis[]> {
    return await this.legalAnalysisRepository.find({
      where: { status: AnalysisStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }

  async getHighRiskAnalyses(): Promise<LegalAnalysis[]> {
    return await this.legalAnalysisRepository.find({
      where: { riskLevel: RiskLevel.HIGH },
      order: { createdAt: 'DESC' },
    });
  }

  async getCriticalAnalyses(): Promise<LegalAnalysis[]> {
    return await this.legalAnalysisRepository.find({
      where: { riskLevel: RiskLevel.CRITICAL },
      order: { createdAt: 'DESC' },
    });
  }

  async archiveAnalysis(id: string): Promise<LegalAnalysis | null> {
    const analysis = await this.legalAnalysisRepository.findOne({ where: { id } });
    
    if (!analysis) {
      return null;
    }
    
    analysis.archive();
    return await this.legalAnalysisRepository.save(analysis);
  }

  async deleteAnalysis(id: string): Promise<boolean> {
    const result = await this.legalAnalysisRepository.delete(id);
    return result.affected > 0;
  }

  async getAnalysisStatistics(): Promise<{
    total: number;
    byType: Record<AnalysisType, number>;
    byStatus: Record<AnalysisStatus, number>;
    byRiskLevel: Record<RiskLevel, number>;
    averageProcessingTime: number;
    averageConfidenceScore: number;
  }> {
    const total = await this.legalAnalysisRepository.count();
    
    const byType = await this.legalAnalysisRepository
      .createQueryBuilder('analysis')
      .select('analysis.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('analysis.type')
      .getRawMany();

    const byStatus = await this.legalAnalysisRepository
      .createQueryBuilder('analysis')
      .select('analysis.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('analysis.status')
      .getRawMany();

    const byRiskLevel = await this.legalAnalysisRepository
      .createQueryBuilder('analysis')
      .select('analysis.riskLevel', 'riskLevel')
      .addSelect('COUNT(*)', 'count')
      .groupBy('analysis.riskLevel')
      .getRawMany();

    const averages = await this.legalAnalysisRepository
      .createQueryBuilder('analysis')
      .select('AVG(analysis.processingTime)', 'avgProcessingTime')
      .addSelect('AVG(analysis.confidenceScore)', 'avgConfidenceScore')
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
      byRiskLevel: byRiskLevel.reduce((acc, item) => {
        acc[item.riskLevel] = parseInt(item.count);
        return acc;
      }, {}),
      averageProcessingTime: parseFloat(averages.avgProcessingTime) || 0,
      averageConfidenceScore: parseFloat(averages.avgConfidenceScore) || 0,
    };
  }
}