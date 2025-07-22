// Sistema de cobertura abrangente de licitações públicas
import axios from 'axios';
import cheerio from 'cheerio';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

export interface MonitoringSource {
  id: string;
  name: string;
  type: 'FEDERAL' | 'ESTADUAL' | 'MUNICIPAL' | 'TRIBUNAL' | 'EMPRESA_PUBLICA';
  url: string;
  selectors: ScrapingSelectors;
  updateFrequency: string; // cron expression
  isActive: boolean;
  lastUpdate: Date;
  totalScraped: number;
  successRate: number;
  averageResponseTime: number;
  authentication?: AuthConfig;
  limits: {
    maxPages: number;
    requestDelay: number;
    dailyLimit: number;
  };
}

export interface ScrapingSelectors {
  container: string;
  title: string;
  entity: string;
  value?: string;
  deadline: string;
  status: string;
  link: string;
  category?: string;
  location?: string;
  publishDate?: string;
  description?: string;
}

export interface AuthConfig {
  type: 'NONE' | 'BASIC' | 'OAUTH' | 'SESSION' | 'API_KEY';
  credentials: {
    username?: string;
    password?: string;
    apiKey?: string;
    token?: string;
    sessionCookies?: Record<string, string>;
  };
  loginUrl?: string;
  loginSelectors?: {
    usernameField: string;
    passwordField: string;
    submitButton: string;
  };
}

export interface ScrapedOpportunity {
  sourceId: string;
  externalId: string;
  title: string;
  entity: string;
  value?: number;
  deadline: Date;
  status: 'OPEN' | 'CLOSED' | 'SUSPENDED' | 'CANCELLED';
  link: string;
  category?: string;
  location?: string;
  publishDate: Date;
  description?: string;
  rawData: Record<string, any>;
  hash: string; // Para detectar duplicatas
}

export interface MonitoringStats {
  totalSources: number;
  activeSources: number;
  totalOpportunities: number;
  newToday: number;
  bySource: Record<string, {
    count: number;
    lastUpdate: Date;
    successRate: number;
  }>;
  byState: Record<string, number>;
  byCategory: Record<string, number>;
  averageValue: number;
  upcomingDeadlines: number;
}

export class ComprehensiveMonitor extends EventEmitter {
  private sources: MonitoringSource[] = [];
  private isRunning = false;
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    super();
    this.initializeSources();
  }

  private async initializeSources(): Promise<void> {
    // Carregar fontes do banco ou configuração
    this.sources = await this.loadMonitoringSources();
    
    // Configurar jobs de monitoramento
    this.setupScheduledJobs();
  }

  private async loadMonitoringSources(): Promise<MonitoringSource[]> {
    // Fontes principais de licitações brasileiras
    return [
      {
        id: 'comprasnet',
        name: 'ComprasNet (Portal Nacional)',
        type: 'FEDERAL',
        url: 'https://www.comprasnet.gov.br/ConsultaLicitacoes/ConsLicitacao_Relacao.asp',
        selectors: {
          container: '.tex3',
          title: 'td:nth-child(2)',
          entity: 'td:nth-child(1)',
          deadline: 'td:nth-child(4)',
          status: 'td:nth-child(3)',
          link: 'td:nth-child(2) a',
          value: 'td:nth-child(5)'
        },
        updateFrequency: '*/30 * * * *', // A cada 30 minutos
        isActive: true,
        lastUpdate: new Date(),
        totalScraped: 0,
        successRate: 95,
        averageResponseTime: 2500,
        limits: {
          maxPages: 50,
          requestDelay: 2000,
          dailyLimit: 2000
        }
      },
      {
        id: 'bec_sp',
        name: 'BEC - Bolsa Eletrônica de Compras SP',
        type: 'ESTADUAL',
        url: 'https://www.bec.sp.gov.br/fornecedor_ui/aspx/Busca/BuscaLicitacao.aspx',
        selectors: {
          container: '.grid-row',
          title: '.col-objeto',
          entity: '.col-orgao',
          deadline: '.col-abertura',
          status: '.col-status',
          link: '.col-objeto a',
          value: '.col-valor'
        },
        updateFrequency: '0 */2 * * *', // A cada 2 horas
        isActive: true,
        lastUpdate: new Date(),
        totalScraped: 0,
        successRate: 88,
        averageResponseTime: 3200,
        limits: {
          maxPages: 20,
          requestDelay: 3000,
          dailyLimit: 1000
        }
      },
      {
        id: 'licitacoes_e',
        name: 'Licitações-e (Banco do Brasil)',
        type: 'FEDERAL',
        url: 'https://www.licitacoes-e.com.br/aop/consulta-licitacoes/index.html',
        selectors: {
          container: '.linha-licitacao',
          title: '.objeto',
          entity: '.orgao',
          deadline: '.data-abertura',
          status: '.situacao',
          link: '.numero a'
        },
        updateFrequency: '*/45 * * * *', // A cada 45 minutos
        isActive: true,
        lastUpdate: new Date(),
        totalScraped: 0,
        successRate: 92,
        averageResponseTime: 2800,
        limits: {
          maxPages: 30,
          requestDelay: 2500,
          dailyLimit: 1500
        }
      },
      {
        id: 'tcu_licitacoes',
        name: 'TCU - Licitações',
        type: 'TRIBUNAL',
        url: 'https://pesquisa.apps.tcu.gov.br/licitacao',
        selectors: {
          container: '.resultado-item',
          title: '.titulo-licitacao',
          entity: '.orgao-licitacao',
          deadline: '.prazo-licitacao',
          status: '.status-licitacao',
          link: '.link-licitacao'
        },
        updateFrequency: '0 */4 * * *', // A cada 4 horas
        isActive: true,
        lastUpdate: new Date(),
        totalScraped: 0,
        successRate: 85,
        averageResponseTime: 4000,
        limits: {
          maxPages: 10,
          requestDelay: 5000,
          dailyLimit: 500
        }
      }
      // Adicionar mais fontes conforme necessário
    ];
  }

  private setupScheduledJobs(): void {
    this.sources.forEach(source => {
      if (source.isActive) {
        const job = cron.schedule(source.updateFrequency, async () => {
          await this.scrapeSource(source);
        }, {
          scheduled: false, // Iniciar manualmente
          timezone: 'America/Sao_Paulo'
        });
        
        this.scheduledJobs.set(source.id, job);
      }
    });
  }

  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      console.log('Monitoramento já está rodando');
      return;
    }

    console.log('🚀 Iniciando monitoramento abrangente de licitações...');
    this.isRunning = true;

    // Iniciar todos os jobs agendados
    this.scheduledJobs.forEach((job, sourceId) => {
      console.log(`📅 Agendando monitoramento para ${sourceId}`);
      job.start();
    });

    // Executar uma varredura inicial
    await this.runInitialSweep();
    
    this.emit('monitoring:started');
  }

  async stopMonitoring(): Promise<void> {
    console.log('🛑 Parando monitoramento...');
    this.isRunning = false;

    this.scheduledJobs.forEach(job => job.stop());
    this.emit('monitoring:stopped');
  }

  private async runInitialSweep(): Promise<void> {
    console.log('🔍 Executando varredura inicial...');
    
    for (const source of this.sources) {
      if (source.isActive) {
        try {
          await this.scrapeSource(source);
          await this.delay(source.limits.requestDelay);
        } catch (error) {
          console.error(`Erro na varredura inicial de ${source.name}:`, error);
        }
      }
    }
  }

  private async scrapeSource(source: MonitoringSource): Promise<ScrapedOpportunity[]> {
    const startTime = Date.now();
    const opportunities: ScrapedOpportunity[] = [];

    try {
      console.log(`🕷️ Iniciando scraping de ${source.name}...`);

      // Verificar limite diário
      const dailyCount = await this.getDailyRequestCount(source.id);
      if (dailyCount >= source.limits.dailyLimit) {
        console.log(`⚠️ Limite diário atingido para ${source.name}`);
        return [];
      }

      // Autenticação se necessária
      const session = await this.authenticate(source);

      // Scraping com paginação
      for (let page = 1; page <= source.limits.maxPages; page++) {
        const pageOpportunities = await this.scrapePage(source, page, session);
        opportunities.push(...pageOpportunities);

        // Parar se não encontrou mais resultados
        if (pageOpportunities.length === 0) break;

        // Delay entre requisições
        await this.delay(source.limits.requestDelay);
      }

      // Processar e salvar oportunidades
      const newOpportunities = await this.processOpportunities(opportunities, source.id);
      
      // Atualizar estatísticas da fonte
      await this.updateSourceStats(source.id, {
        totalScraped: opportunities.length,
        responseTime: Date.now() - startTime,
        success: true
      });

      console.log(`✅ ${source.name}: ${newOpportunities.length} novas oportunidades encontradas`);
      
      this.emit('source:scraped', {
        sourceId: source.id,
        sourceName: source.name,
        totalFound: opportunities.length,
        newOpportunities: newOpportunities.length
      });

      return newOpportunities;

    } catch (error) {
      console.error(`❌ Erro no scraping de ${source.name}:`, error);
      
      await this.updateSourceStats(source.id, {
        totalScraped: 0,
        responseTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      this.emit('source:error', {
        sourceId: source.id,
        sourceName: source.name,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      return [];
    }
  }

  private async scrapePage(
    source: MonitoringSource, 
    page: number, 
    session?: any
  ): Promise<ScrapedOpportunity[]> {
    const opportunities: ScrapedOpportunity[] = [];

    try {
      const url = this.buildPageUrl(source.url, page);
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          ...session?.headers
        },
        cookies: session?.cookies
      });

      const $ = cheerio.load(response.data);
      
      $(source.selectors.container).each((index, element) => {
        try {
          const opportunity = this.extractOpportunityData($, element, source);
          if (this.isValidOpportunity(opportunity)) {
            opportunities.push(opportunity);
          }
        } catch (error) {
          console.warn(`Erro ao extrair oportunidade ${index}:`, error);
        }
      });

    } catch (error) {
      throw new Error(`Erro ao fazer scraping da página ${page}: ${error}`);
    }

    return opportunities;
  }

  private extractOpportunityData(
    $: cheerio.CheerioAPI, 
    element: cheerio.Element, 
    source: MonitoringSource
  ): ScrapedOpportunity {
    const $elem = $(element);
    
    const title = this.extractText($elem, source.selectors.title);
    const entity = this.extractText($elem, source.selectors.entity);
    const deadline = this.parseDate(this.extractText($elem, source.selectors.deadline));
    const status = this.normalizeStatus(this.extractText($elem, source.selectors.status));
    const link = this.extractLink($elem, source.selectors.link, source.url);
    
    const value = source.selectors.value ? 
      this.parseValue(this.extractText($elem, source.selectors.value)) : undefined;
    
    const category = source.selectors.category ? 
      this.extractText($elem, source.selectors.category) : undefined;
    
    const location = source.selectors.location ? 
      this.extractText($elem, source.selectors.location) : undefined;
    
    const publishDate = source.selectors.publishDate ? 
      this.parseDate(this.extractText($elem, source.selectors.publishDate)) : new Date();

    const description = source.selectors.description ? 
      this.extractText($elem, source.selectors.description) : undefined;

    // Gerar hash único para detectar duplicatas
    const hash = this.generateHash(`${title}-${entity}-${deadline.getTime()}`);

    return {
      sourceId: source.id,
      externalId: this.extractExternalId(link, source.id),
      title,
      entity,
      value,
      deadline,
      status,
      link,
      category,
      location,
      publishDate,
      description,
      rawData: {
        html: $elem.html(),
        extractedAt: new Date(),
        sourceUrl: source.url
      },
      hash
    };
  }

  private extractText($elem: cheerio.Cheerio<cheerio.Element>, selector: string): string {
    return $elem.find(selector).first().text().trim() || $elem.filter(selector).text().trim();
  }

  private extractLink($elem: cheerio.Cheerio<cheerio.Element>, selector: string, baseUrl: string): string {
    const href = $elem.find(selector).first().attr('href') || $elem.filter(selector).attr('href') || '';
    
    if (href.startsWith('http')) {
      return href;
    } else if (href.startsWith('/')) {
      const base = new URL(baseUrl);
      return `${base.protocol}//${base.host}${href}`;
    } else if (href) {
      return `${baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
    }
    
    return '';
  }

  private parseDate(dateStr: string): Date {
    // Implementar parsing robusto de datas brasileiras
    const cleanDate = dateStr.replace(/[^\d\/\-\.]/g, '');
    
    // Tentar formatos comuns brasileiros
    const patterns = [
      /(\d{2})\/(\d{2})\/(\d{4})/,  // DD/MM/YYYY
      /(\d{2})-(\d{2})-(\d{4})/,   // DD-MM-YYYY
      /(\d{2})\.(\d{2})\.(\d{4})/  // DD.MM.YYYY
    ];

    for (const pattern of patterns) {
      const match = cleanDate.match(pattern);
      if (match) {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]) - 1; // JavaScript months are 0-based
        const year = parseInt(match[3]);
        return new Date(year, month, day);
      }
    }

    // Fallback para data atual + 30 dias se não conseguir parsear
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 30);
    return fallback;
  }

  private parseValue(valueStr: string): number | undefined {
    if (!valueStr) return undefined;
    
    // Remover caracteres não numéricos exceto vírgula e ponto
    const cleaned = valueStr.replace(/[^\d,\.]/g, '');
    
    // Converter para formato numérico brasileiro
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    
    const value = parseFloat(normalized);
    return isNaN(value) ? undefined : value;
  }

  private normalizeStatus(statusStr: string): 'OPEN' | 'CLOSED' | 'SUSPENDED' | 'CANCELLED' {
    const status = statusStr.toLowerCase();
    
    if (status.includes('aberto') || status.includes('em andamento') || status.includes('ativo')) {
      return 'OPEN';
    } else if (status.includes('suspenso') || status.includes('suspen')) {
      return 'SUSPENDED';
    } else if (status.includes('cancelado') || status.includes('cancel')) {
      return 'CANCELLED';
    } else {
      return 'CLOSED';
    }
  }

  private extractExternalId(link: string, sourceId: string): string {
    // Extrair ID único do link ou gerar baseado no source
    const urlParams = new URL(link).searchParams;
    return urlParams.get('id') || urlParams.get('numero') || `${sourceId}_${Date.now()}`;
  }

  private generateHash(data: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(data).digest('hex');
  }

  private isValidOpportunity(opportunity: ScrapedOpportunity): boolean {
    return !!(
      opportunity.title &&
      opportunity.entity &&
      opportunity.deadline &&
      opportunity.link &&
      opportunity.deadline > new Date()
    );
  }

  private async processOpportunities(
    opportunities: ScrapedOpportunity[], 
    sourceId: string
  ): Promise<ScrapedOpportunity[]> {
    const newOpportunities: ScrapedOpportunity[] = [];

    for (const opportunity of opportunities) {
      try {
        // Verificar se já existe
        const existing = await prisma.opportunity.findFirst({
          where: {
            OR: [
              { hash: opportunity.hash },
              { 
                title: opportunity.title,
                entity: opportunity.entity,
                sourceId: sourceId
              }
            ]
          }
        });

        if (!existing) {
          // Salvar nova oportunidade
          await prisma.opportunity.create({
            data: {
              ...opportunity,
              sourceId,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });

          newOpportunities.push(opportunity);
          
          // Emitir evento para notificações
          this.emit('opportunity:found', opportunity);
        }

      } catch (error) {
        console.error('Erro ao processar oportunidade:', error);
      }
    }

    return newOpportunities;
  }

  private buildPageUrl(baseUrl: string, page: number): string {
    const url = new URL(baseUrl);
    url.searchParams.set('page', page.toString());
    return url.toString();
  }

  private async authenticate(source: MonitoringSource): Promise<any> {
    if (!source.authentication || source.authentication.type === 'NONE') {
      return null;
    }

    // Implementar diferentes tipos de autenticação conforme necessário
    switch (source.authentication.type) {
      case 'SESSION':
        return this.createSession(source);
      case 'API_KEY':
        return {
          headers: {
            'Authorization': `Bearer ${source.authentication.credentials.apiKey}`
          }
        };
      default:
        return null;
    }
  }

  private async createSession(source: MonitoringSource): Promise<any> {
    // Implementar criação de sessão para sites que requerem login
    return null;
  }

  private async updateSourceStats(sourceId: string, stats: {
    totalScraped: number;
    responseTime: number;
    success: boolean;
    error?: string;
  }): Promise<void> {
    try {
      await prisma.monitoringSource.update({
        where: { id: sourceId },
        data: {
          lastUpdate: new Date(),
          totalScraped: { increment: stats.totalScraped },
          averageResponseTime: stats.responseTime,
          successRate: stats.success ? { increment: 1 } : undefined,
          lastError: stats.error || null
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar estatísticas da fonte:', error);
    }
  }

  private async getDailyRequestCount(sourceId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await prisma.requestLog.count({
      where: {
        sourceId,
        timestamp: { gte: today }
      }
    });

    return count;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Métodos públicos para estatísticas e controle

  async getMonitoringStats(): Promise<MonitoringStats> {
    const [
      totalSources,
      activeSources,
      totalOpportunities,
      newToday,
      bySourceData,
      byStateData,
      byCategoryData
    ] = await Promise.all([
      prisma.monitoringSource.count(),
      prisma.monitoringSource.count({ where: { isActive: true } }),
      prisma.opportunity.count(),
      this.getNewTodayCount(),
      this.getBySourceStats(),
      this.getByStateStats(),
      this.getByCategoryStats()
    ]);

    return {
      totalSources,
      activeSources,
      totalOpportunities,
      newToday,
      bySource: bySourceData,
      byState: byStateData,
      byCategory: byCategoryData,
      averageValue: await this.getAverageValue(),
      upcomingDeadlines: await this.getUpcomingDeadlinesCount()
    };
  }

  private async getNewTodayCount(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return prisma.opportunity.count({
      where: {
        createdAt: { gte: today }
      }
    });
  }

  private async getBySourceStats(): Promise<Record<string, any>> {
    // Implementar estatísticas por fonte
    return {};
  }

  private async getByStateStats(): Promise<Record<string, number>> {
    // Implementar estatísticas por estado
    return {};
  }

  private async getByCategoryStats(): Promise<Record<string, number>> {
    // Implementar estatísticas por categoria
    return {};
  }

  private async getAverageValue(): Promise<number> {
    const result = await prisma.opportunity.aggregate({
      _avg: { value: true },
      where: { value: { not: null } }
    });

    return result._avg.value || 0;
  }

  private async getUpcomingDeadlinesCount(): Promise<number> {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    return prisma.opportunity.count({
      where: {
        deadline: {
          gte: new Date(),
          lte: nextWeek
        },
        status: 'OPEN'
      }
    });
  }

  async addCustomSource(sourceData: Omit<MonitoringSource, 'id' | 'lastUpdate' | 'totalScraped' | 'successRate' | 'averageResponseTime'>): Promise<MonitoringSource> {
    const source: MonitoringSource = {
      ...sourceData,
      id: `custom_${Date.now()}`,
      lastUpdate: new Date(),
      totalScraped: 0,
      successRate: 0,
      averageResponseTime: 0
    };

    this.sources.push(source);
    
    // Configurar job agendado
    if (source.isActive) {
      const job = cron.schedule(source.updateFrequency, async () => {
        await this.scrapeSource(source);
      }, { scheduled: false });
      
      this.scheduledJobs.set(source.id, job);
      
      if (this.isRunning) {
        job.start();
      }
    }

    return source;
  }

  async testSource(sourceId: string): Promise<{success: boolean, opportunitiesFound: number, error?: string}> {
    const source = this.sources.find(s => s.id === sourceId);
    if (!source) {
      return { success: false, opportunitiesFound: 0, error: 'Fonte não encontrada' };
    }

    try {
      const opportunities = await this.scrapeSource(source);
      return { 
        success: true, 
        opportunitiesFound: opportunities.length 
      };
    } catch (error) {
      return { 
        success: false, 
        opportunitiesFound: 0, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  }
}

// Instância singleton
export const comprehensiveMonitor = new ComprehensiveMonitor();