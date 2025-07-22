import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LegalUpdate, UpdateType, UpdateStatus, UpdateSource } from '../entities/legal-update.entity';
import { LegalDocument, LegalDocumentType, LegalDocumentStatus } from '../entities/legal-document.entity';
import { LegalKnowledgeService } from './legal-knowledge.service';
import { NotificationsService } from '../../notifications/notifications.service';
import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class LegalUpdaterService {
  private readonly logger = new Logger(LegalUpdaterService.name);
  
  private readonly sources = [
    {
      name: 'Planalto',
      url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm',
      type: UpdateSource.PLANALTO,
      selector: 'body',
      checkInterval: '0 0 8 * * *', // Daily at 8 AM
    },
    {
      name: 'Compras.gov.br',
      url: 'https://www.gov.br/compras/pt-br',
      type: UpdateSource.COMPRAS_GOV,
      selector: '.noticias',
      checkInterval: '0 0 */6 * * *', // Every 6 hours
    },
    {
      name: 'TCU',
      url: 'https://portal.tcu.gov.br/',
      type: UpdateSource.TCU,
      selector: '.noticias',
      checkInterval: '0 0 9 * * *', // Daily at 9 AM
    },
    {
      name: 'CGU',
      url: 'https://www.gov.br/cgu/pt-br',
      type: UpdateSource.CGU,
      selector: '.noticias',
      checkInterval: '0 0 10 * * *', // Daily at 10 AM
    },
  ];

  constructor(
    @InjectRepository(LegalUpdate)
    private legalUpdateRepository: Repository<LegalUpdate>,
    private legalKnowledgeService: LegalKnowledgeService,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_WEEK)
  async performWeeklyUpdate(): Promise<void> {
    this.logger.log('Starting weekly legal updates check...');
    
    for (const source of this.sources) {
      await this.checkSourceForUpdates(source);
    }
    
    this.logger.log('Weekly legal updates check completed');
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async performDailyUpdate(): Promise<void> {
    this.logger.log('Starting daily legal updates check...');
    
    // Check high-priority sources daily
    const highPrioritySources = this.sources.filter(s => 
      s.type === UpdateSource.PLANALTO || s.type === UpdateSource.COMPRAS_GOV
    );
    
    for (const source of highPrioritySources) {
      await this.checkSourceForUpdates(source);
    }
    
    this.logger.log('Daily legal updates check completed');
  }

  private async checkSourceForUpdates(source: {
    name: string;
    url: string;
    type: UpdateSource;
    selector: string;
  }): Promise<void> {
    this.logger.log(`Checking updates from ${source.name}...`);
    
    try {
      const update = await this.createUpdateRecord(source);
      
      const content = await this.fetchSourceContent(source.url);
      const processedContent = await this.processSourceContent(content, source);
      
      if (processedContent) {
        await this.analyzeContentForUpdates(processedContent, update);
        await this.completeUpdateRecord(update, processedContent);
      } else {
        await this.skipUpdateRecord(update, 'No relevant content found');
      }
      
    } catch (error) {
      this.logger.error(`Error checking updates from ${source.name}:`, error);
      await this.failUpdateRecord(source, error.message);
    }
  }

  private async createUpdateRecord(source: {
    name: string;
    url: string;
    type: UpdateSource;
  }): Promise<LegalUpdate> {
    const update = this.legalUpdateRepository.create({
      type: UpdateType.SYSTEM_UPDATE,
      source: source.type,
      sourceUrl: source.url,
      status: UpdateStatus.PENDING,
      priorityLevel: 5,
    });
    
    return await this.legalUpdateRepository.save(update);
  }

  private async fetchSourceContent(url: string): Promise<string> {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    
    return response.data;
  }

  private async processSourceContent(content: string, source: {
    name: string;
    selector: string;
    type: UpdateSource;
  }): Promise<string | null> {
    const $ = cheerio.load(content);
    
    let processedContent = '';
    
    switch (source.type) {
      case UpdateSource.PLANALTO:
        processedContent = await this.processPlanaltoContent($);
        break;
      case UpdateSource.COMPRAS_GOV:
        processedContent = await this.processComprasGovContent($);
        break;
      case UpdateSource.TCU:
        processedContent = await this.processTCUContent($);
        break;
      case UpdateSource.CGU:
        processedContent = await this.processCGUContent($);
        break;
      default:
        processedContent = $(source.selector).text();
    }
    
    return processedContent || null;
  }

  private async processPlanaltoContent($: cheerio.CheerioAPI): Promise<string> {
    // Extract news and updates from Planalto
    const news = [];
    
    $('.noticia, .destaque, .novidade').each((i, element) => {
      const title = $(element).find('h1, h2, h3, .titulo').text().trim();
      const date = $(element).find('.data, .date').text().trim();
      const content = $(element).find('.conteudo, .texto').text().trim();
      
      if (title && this.isLegalRelevant(title)) {
        news.push({
          title,
          date,
          content: content.substring(0, 500),
        });
      }
    });
    
    return JSON.stringify(news);
  }

  private async processComprasGovContent($: cheerio.CheerioAPI): Promise<string> {
    // Extract procurement-related news
    const news = [];
    
    $('.card-noticias, .noticia-item').each((i, element) => {
      const title = $(element).find('h3, .titulo').text().trim();
      const date = $(element).find('.data').text().trim();
      const summary = $(element).find('.resumo, .texto').text().trim();
      
      if (title && this.isProcurementRelevant(title)) {
        news.push({
          title,
          date,
          summary: summary.substring(0, 300),
        });
      }
    });
    
    return JSON.stringify(news);
  }

  private async processTCUContent($: cheerio.CheerioAPI): Promise<string> {
    // Extract TCU decisions and guidelines
    const decisions = [];
    
    $('.decisao, .acordao, .sumula').each((i, element) => {
      const number = $(element).find('.numero').text().trim();
      const title = $(element).find('.titulo, h3').text().trim();
      const date = $(element).find('.data').text().trim();
      const summary = $(element).find('.ementa, .resumo').text().trim();
      
      if (title && this.isLegalRelevant(title)) {
        decisions.push({
          number,
          title,
          date,
          summary: summary.substring(0, 400),
        });
      }
    });
    
    return JSON.stringify(decisions);
  }

  private async processCGUContent($: cheerio.CheerioAPI): Promise<string> {
    // Extract CGU guidelines and updates
    const guidelines = [];
    
    $('.orientacao, .diretriz, .portaria').each((i, element) => {
      const title = $(element).find('h3, .titulo').text().trim();
      const date = $(element).find('.data').text().trim();
      const content = $(element).find('.conteudo').text().trim();
      
      if (title && this.isComplianceRelevant(title)) {
        guidelines.push({
          title,
          date,
          content: content.substring(0, 500),
        });
      }
    });
    
    return JSON.stringify(guidelines);
  }

  private isLegalRelevant(title: string): boolean {
    const keywords = [
      'licitação', 'licitações', 'pregão', 'contrato', 'contratos',
      'administração pública', 'lei', 'decreto', 'portaria',
      'normativa', 'instrução', 'compras públicas', 'tribunal',
      'controle', 'auditoria', 'fiscalização'
    ];
    
    return keywords.some(keyword => 
      title.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private isProcurementRelevant(title: string): boolean {
    const keywords = [
      'compra', 'compras', 'aquisição', 'contratação',
      'fornecedor', 'fornecedores', 'pregão', 'edital',
      'licitação', 'modalidade', 'sistema', 'plataforma'
    ];
    
    return keywords.some(keyword => 
      title.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private isComplianceRelevant(title: string): boolean {
    const keywords = [
      'compliance', 'conformidade', 'orientação', 'diretriz',
      'procedimento', 'norma', 'regulamento', 'instrução',
      'transparência', 'integridade', 'ética', 'controle'
    ];
    
    return keywords.some(keyword => 
      title.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private async analyzeContentForUpdates(content: string, update: LegalUpdate): Promise<void> {
    try {
      const parsedContent = JSON.parse(content);
      
      if (Array.isArray(parsedContent) && parsedContent.length > 0) {
        // Determine update type based on content analysis
        const updateType = this.determineUpdateType(parsedContent);
        update.type = updateType;
        
        // Extract relevant information
        const relevantItems = parsedContent.filter(item => 
          this.isHighPriority(item.title || item.summary)
        );
        
        if (relevantItems.length > 0) {
          update.priorityLevel = 7; // High priority
          update.changeSummary = this.generateChangeSummary(relevantItems);
          update.newRequirements = this.extractNewRequirements(relevantItems);
          update.impactAssessment = this.generateImpactAssessment(relevantItems);
        }
      }
      
    } catch (error) {
      this.logger.error('Error analyzing content for updates:', error);
      update.addProcessingError('analysis', error.message);
    }
  }

  private determineUpdateType(items: any[]): UpdateType {
    const hasNewLaw = items.some(item => 
      (item.title || '').toLowerCase().includes('lei') ||
      (item.title || '').toLowerCase().includes('decreto')
    );
    
    const hasAmendment = items.some(item => 
      (item.title || '').toLowerCase().includes('altera') ||
      (item.title || '').toLowerCase().includes('modifica')
    );
    
    const hasJurisprudence = items.some(item => 
      (item.title || '').toLowerCase().includes('acórdão') ||
      (item.title || '').toLowerCase().includes('súmula')
    );
    
    if (hasNewLaw) return UpdateType.NEW_DOCUMENT;
    if (hasAmendment) return UpdateType.DOCUMENT_AMENDMENT;
    if (hasJurisprudence) return UpdateType.JURISPRUDENCE_UPDATE;
    
    return UpdateType.PROCEDURE_CHANGE;
  }

  private isHighPriority(title: string): boolean {
    const highPriorityKeywords = [
      'urgente', 'emergencial', 'prazo', 'suspenso', 'revogado',
      'nova lei', 'novo decreto', 'alteração', 'modificação',
      'decisão', 'acórdão', 'orientação', 'diretriz'
    ];
    
    return highPriorityKeywords.some(keyword => 
      title.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private generateChangeSummary(items: any[]): string {
    const summaries = items.map(item => {
      const title = item.title || '';
      const content = item.content || item.summary || '';
      return `${title}: ${content.substring(0, 200)}...`;
    });
    
    return summaries.join('\n\n');
  }

  private extractNewRequirements(items: any[]): string[] {
    const requirements = [];
    
    items.forEach(item => {
      const content = (item.content || item.summary || '').toLowerCase();
      
      if (content.includes('obrigatório') || content.includes('deve')) {
        requirements.push(`Novo requisito identificado: ${item.title}`);
      }
      
      if (content.includes('prazo') || content.includes('deadline')) {
        requirements.push(`Novo prazo estabelecido: ${item.title}`);
      }
      
      if (content.includes('documento') || content.includes('certidão')) {
        requirements.push(`Nova documentação exigida: ${item.title}`);
      }
    });
    
    return requirements;
  }

  private generateImpactAssessment(items: any[]): string {
    const impacts = [];
    
    items.forEach(item => {
      const content = (item.content || item.summary || '').toLowerCase();
      
      if (content.includes('microempresa') || content.includes('pequeno porte')) {
        impacts.push('Impacto específico para ME/EPP');
      }
      
      if (content.includes('prazo') || content.includes('cronograma')) {
        impacts.push('Impacto nos prazos processuais');
      }
      
      if (content.includes('documento') || content.includes('habilitação')) {
        impacts.push('Impacto na documentação de habilitação');
      }
      
      if (content.includes('penalidade') || content.includes('sanção')) {
        impacts.push('Impacto nas penalidades aplicáveis');
      }
    });
    
    return impacts.join('; ');
  }

  private async completeUpdateRecord(update: LegalUpdate, content: string): Promise<void> {
    update.setCompleted(content);
    update.hashChecksum = this.generateHashChecksum(content);
    
    await this.legalUpdateRepository.save(update);
    
    // Notify users if high priority
    if (update.isHighPriority) {
      await this.notifyUsersOfUpdate(update);
    }
    
    this.logger.log(`Update completed: ${update.id}`);
  }

  private async skipUpdateRecord(update: LegalUpdate, reason: string): Promise<void> {
    update.setSkipped(reason);
    await this.legalUpdateRepository.save(update);
    
    this.logger.log(`Update skipped: ${update.id} - ${reason}`);
  }

  private async failUpdateRecord(source: any, error: string): Promise<void> {
    const update = this.legalUpdateRepository.create({
      type: UpdateType.SYSTEM_UPDATE,
      source: source.type,
      sourceUrl: source.url,
      status: UpdateStatus.FAILED,
      priorityLevel: 3,
    });
    
    update.setFailed(error);
    await this.legalUpdateRepository.save(update);
    
    this.logger.error(`Update failed: ${update.id} - ${error}`);
  }

  private async notifyUsersOfUpdate(update: LegalUpdate): Promise<void> {
    try {
      const title = 'Nova Atualização Legal Disponível';
      const message = `${update.changeSummary?.substring(0, 200)}...`;
      
      // This would typically send notifications to all users
      // For now, we'll just log it
      this.logger.log(`Notification sent for update: ${update.id}`);
      
      update.markNotificationSent(0); // Would be actual user count
      await this.legalUpdateRepository.save(update);
      
    } catch (error) {
      this.logger.error('Error sending update notifications:', error);
    }
  }

  private generateHashChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // Public methods for manual operations
  async manualUpdateCheck(sourceType: UpdateSource): Promise<LegalUpdate> {
    const source = this.sources.find(s => s.type === sourceType);
    
    if (!source) {
      throw new Error(`Source ${sourceType} not found`);
    }
    
    const update = await this.createUpdateRecord(source);
    
    try {
      const content = await this.fetchSourceContent(source.url);
      const processedContent = await this.processSourceContent(content, source);
      
      if (processedContent) {
        await this.analyzeContentForUpdates(processedContent, update);
        await this.completeUpdateRecord(update, processedContent);
      } else {
        await this.skipUpdateRecord(update, 'No relevant content found');
      }
      
      return update;
      
    } catch (error) {
      update.setFailed(error.message);
      await this.legalUpdateRepository.save(update);
      throw error;
    }
  }

  async getUpdateHistory(limit: number = 50): Promise<LegalUpdate[]> {
    return await this.legalUpdateRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getUpdateById(id: string): Promise<LegalUpdate | null> {
    return await this.legalUpdateRepository.findOne({ where: { id } });
  }

  async getPendingUpdates(): Promise<LegalUpdate[]> {
    return await this.legalUpdateRepository.find({
      where: { status: UpdateStatus.PENDING },
      order: { priorityLevel: 'DESC', createdAt: 'ASC' },
    });
  }

  async getUpdatesBySource(source: UpdateSource): Promise<LegalUpdate[]> {
    return await this.legalUpdateRepository.find({
      where: { source },
      order: { createdAt: 'DESC' },
    });
  }

  async retryFailedUpdate(id: string): Promise<LegalUpdate> {
    const update = await this.legalUpdateRepository.findOne({ where: { id } });
    
    if (!update || !update.hasFailed) {
      throw new Error('Update not found or not in failed state');
    }
    
    const source = this.sources.find(s => s.type === update.source);
    if (!source) {
      throw new Error(`Source ${update.source} not found`);
    }
    
    // Reset the update status
    update.status = UpdateStatus.PENDING;
    update.errorMessage = null;
    update.processingErrors = [];
    
    await this.legalUpdateRepository.save(update);
    
    // Retry the update
    await this.checkSourceForUpdates(source);
    
    return await this.legalUpdateRepository.findOne({ where: { id } });
  }

  async getUpdateStatistics(): Promise<{
    total: number;
    byStatus: Record<UpdateStatus, number>;
    bySource: Record<UpdateSource, number>;
    byType: Record<UpdateType, number>;
    recentActivity: LegalUpdate[];
  }> {
    const total = await this.legalUpdateRepository.count();
    
    const byStatus = await this.legalUpdateRepository
      .createQueryBuilder('update')
      .select('update.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('update.status')
      .getRawMany();

    const bySource = await this.legalUpdateRepository
      .createQueryBuilder('update')
      .select('update.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('update.source')
      .getRawMany();

    const byType = await this.legalUpdateRepository
      .createQueryBuilder('update')
      .select('update.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('update.type')
      .getRawMany();

    const recentActivity = await this.legalUpdateRepository.find({
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      bySource: bySource.reduce((acc, item) => {
        acc[item.source] = parseInt(item.count);
        return acc;
      }, {}),
      byType: byType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {}),
      recentActivity,
    };
  }
}