import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LegalAIService } from './legal-ai.service';
import { LegalAnalysisService } from './services/legal-analysis.service';
import { LegalKnowledgeService } from './services/legal-knowledge.service';
import { LegalUpdaterService } from './services/legal-updater.service';
import { QueryType, QueryPriority } from './entities/legal-query.entity';
import { AnalysisType } from './entities/legal-analysis.entity';
import { UpdateSource } from './entities/legal-update.entity';

@ApiTags('Legal AI')
@Controller('legal-ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LegalAIController {
  constructor(
    private readonly legalAIService: LegalAIService,
    private readonly legalAnalysisService: LegalAnalysisService,
    private readonly legalKnowledgeService: LegalKnowledgeService,
    private readonly legalUpdaterService: LegalUpdaterService,
  ) {}

  // Legal Query Endpoints
  @Post('query')
  @ApiOperation({ summary: 'Submit a legal query to the AI lawyer' })
  @ApiResponse({ status: 201, description: 'Query submitted successfully' })
  async submitQuery(
    @Request() req,
    @Body() body: {
      queryText: string;
      type?: QueryType;
      priority?: QueryPriority;
      context?: {
        opportunityId?: string;
        editalUrl?: string;
        companySize?: string;
        sector?: string;
      };
    }
  ) {
    try {
      const query = await this.legalAIService.processLegalQuery(
        req.user.id,
        body.queryText,
        {
          type: body.type,
          priority: body.priority,
          ...body.context,
        }
      );

      return {
        success: true,
        data: query,
        message: 'Consulta jurídica enviada com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao processar consulta jurídica',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('commands/advogado')
  @ApiOperation({ summary: 'Process /advogado command' })
  @ApiResponse({ status: 201, description: 'Command processed successfully' })
  async processAdvogadoCommand(
    @Request() req,
    @Body() body: { command: string; args: string }
  ) {
    try {
      const query = await this.legalAIService.processAdvogadoCommand(
        req.user.id,
        body.command,
        body.args
      );

      return {
        success: true,
        data: query,
        message: 'Comando /advogado processado com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao processar comando',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('commands/juridico')
  @ApiOperation({ summary: 'Process /juridico command' })
  @ApiResponse({ status: 201, description: 'Command processed successfully' })
  async processJuridicoCommand(
    @Request() req,
    @Body() body: { command: string; args: string }
  ) {
    try {
      const query = await this.legalAIService.processJuridicoCommand(
        req.user.id,
        body.command,
        body.args
      );

      return {
        success: true,
        data: query,
        message: 'Comando /juridico processado com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao processar comando',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('commands/ia_licitacao')
  @ApiOperation({ summary: 'Process /ia_licitacao command' })
  @ApiResponse({ status: 201, description: 'Command processed successfully' })
  async processIaLicitacaoCommand(
    @Request() req,
    @Body() body: { command: string; args: string }
  ) {
    try {
      const query = await this.legalAIService.processIaLicitacaoCommand(
        req.user.id,
        body.command,
        body.args
      );

      return {
        success: true,
        data: query,
        message: 'Comando /ia_licitacao processado com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao processar comando',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('queries')
  @ApiOperation({ summary: 'Get user legal queries' })
  @ApiResponse({ status: 200, description: 'Queries retrieved successfully' })
  async getUserQueries(
    @Request() req,
    @Query('limit') limit: number = 20
  ) {
    try {
      const queries = await this.legalAIService.getQueriesByUser(req.user.id, limit);

      return {
        success: true,
        data: queries,
        message: 'Consultas recuperadas com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao recuperar consultas',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('queries/:id')
  @ApiOperation({ summary: 'Get specific legal query' })
  @ApiResponse({ status: 200, description: 'Query retrieved successfully' })
  async getQuery(@Param('id') id: string) {
    try {
      const query = await this.legalAIService.getQueryById(id);

      if (!query) {
        throw new HttpException(
          {
            success: false,
            message: 'Consulta não encontrada',
          },
          HttpStatus.NOT_FOUND
        );
      }

      return {
        success: true,
        data: query,
        message: 'Consulta recuperada com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao recuperar consulta',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('queries/:id/feedback')
  @ApiOperation({ summary: 'Provide feedback on a legal query' })
  @ApiResponse({ status: 200, description: 'Feedback submitted successfully' })
  async submitFeedback(
    @Param('id') id: string,
    @Body() body: { rating: number; comment?: string }
  ) {
    try {
      const query = await this.legalAIService.setQueryFeedback(
        id,
        body.rating,
        body.comment
      );

      if (!query) {
        throw new HttpException(
          {
            success: false,
            message: 'Consulta não encontrada',
          },
          HttpStatus.NOT_FOUND
        );
      }

      return {
        success: true,
        data: query,
        message: 'Feedback enviado com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao enviar feedback',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Legal Analysis Endpoints
  @Post('analysis/edital-compliance')
  @ApiOperation({ summary: 'Perform edital compliance analysis' })
  @ApiResponse({ status: 201, description: 'Analysis started successfully' })
  async analyzeEditalCompliance(
    @Request() req,
    @Body() body: {
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
  ) {
    try {
      const analysis = await this.legalAnalysisService.performEditalCompliance(
        req.user.id,
        body
      );

      return {
        success: true,
        data: analysis,
        message: 'Análise de conformidade iniciada com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao iniciar análise',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('analysis/risk-assessment')
  @ApiOperation({ summary: 'Perform risk assessment analysis' })
  @ApiResponse({ status: 201, description: 'Analysis started successfully' })
  async analyzeRisks(
    @Request() req,
    @Body() body: {
      editalText?: string;
      opportunityId?: string;
      companyProfile?: any;
      proposalData?: any;
    }
  ) {
    try {
      const analysis = await this.legalAnalysisService.performRiskAssessment(
        req.user.id,
        body
      );

      return {
        success: true,
        data: analysis,
        message: 'Análise de riscos iniciada com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao iniciar análise',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('analysis/document-validation')
  @ApiOperation({ summary: 'Perform document validation analysis' })
  @ApiResponse({ status: 201, description: 'Analysis started successfully' })
  async validateDocument(
    @Request() req,
    @Body() body: {
      documentType: string;
      documentContent: string;
      context?: string;
    }
  ) {
    try {
      const analysis = await this.legalAnalysisService.performDocumentValidation(
        req.user.id,
        body
      );

      return {
        success: true,
        data: analysis,
        message: 'Validação de documento iniciada com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao iniciar validação',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('analysis/deadline-analysis')
  @ApiOperation({ summary: 'Perform deadline analysis' })
  @ApiResponse({ status: 201, description: 'Analysis started successfully' })
  async analyzeDeadlines(
    @Request() req,
    @Body() body: {
      editalText: string;
      currentDate?: Date;
      companyProfile?: any;
    }
  ) {
    try {
      const analysis = await this.legalAnalysisService.performDeadlineAnalysis(
        req.user.id,
        body
      );

      return {
        success: true,
        data: analysis,
        message: 'Análise de prazos iniciada com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao iniciar análise',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('analysis')
  @ApiOperation({ summary: 'Get user legal analyses' })
  @ApiResponse({ status: 200, description: 'Analyses retrieved successfully' })
  async getUserAnalyses(
    @Request() req,
    @Query('limit') limit: number = 20
  ) {
    try {
      const analyses = await this.legalAnalysisService.getAnalysesByUser(req.user.id, limit);

      return {
        success: true,
        data: analyses,
        message: 'Análises recuperadas com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao recuperar análises',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('analysis/:id')
  @ApiOperation({ summary: 'Get specific legal analysis' })
  @ApiResponse({ status: 200, description: 'Analysis retrieved successfully' })
  async getAnalysis(@Param('id') id: string) {
    try {
      const analysis = await this.legalAnalysisService.getAnalysisById(id);

      if (!analysis) {
        throw new HttpException(
          {
            success: false,
            message: 'Análise não encontrada',
          },
          HttpStatus.NOT_FOUND
        );
      }

      return {
        success: true,
        data: analysis,
        message: 'Análise recuperada com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao recuperar análise',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('analysis/:id/archive')
  @ApiOperation({ summary: 'Archive a legal analysis' })
  @ApiResponse({ status: 200, description: 'Analysis archived successfully' })
  async archiveAnalysis(@Param('id') id: string) {
    try {
      const analysis = await this.legalAnalysisService.archiveAnalysis(id);

      if (!analysis) {
        throw new HttpException(
          {
            success: false,
            message: 'Análise não encontrada',
          },
          HttpStatus.NOT_FOUND
        );
      }

      return {
        success: true,
        data: analysis,
        message: 'Análise arquivada com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao arquivar análise',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Legal Knowledge Endpoints
  @Get('knowledge/search')
  @ApiOperation({ summary: 'Search legal documents' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  async searchLegalDocuments(
    @Query('query') query: string,
    @Query('type') type?: string,
    @Query('tags') tags?: string,
    @Query('limit') limit: number = 10
  ) {
    try {
      const documents = await this.legalKnowledgeService.searchDocuments(
        query,
        {
          type: type as any,
          tags: tags ? tags.split(',') : undefined,
          limit,
        }
      );

      return {
        success: true,
        data: documents,
        message: 'Documentos encontrados com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao buscar documentos',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('knowledge/documents/:id')
  @ApiOperation({ summary: 'Get specific legal document' })
  @ApiResponse({ status: 200, description: 'Document retrieved successfully' })
  async getLegalDocument(@Param('id') id: string) {
    try {
      const document = await this.legalKnowledgeService.getDocumentById(id);

      if (!document) {
        throw new HttpException(
          {
            success: false,
            message: 'Documento não encontrado',
          },
          HttpStatus.NOT_FOUND
        );
      }

      return {
        success: true,
        data: document,
        message: 'Documento recuperado com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao recuperar documento',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('knowledge/statistics')
  @ApiOperation({ summary: 'Get legal knowledge statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getKnowledgeStatistics() {
    try {
      const statistics = await this.legalKnowledgeService.getDocumentStatistics();

      return {
        success: true,
        data: statistics,
        message: 'Estatísticas recuperadas com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao recuperar estatísticas',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Legal Updates Endpoints
  @Post('updates/manual-check')
  @ApiOperation({ summary: 'Trigger manual update check' })
  @ApiResponse({ status: 201, description: 'Update check started successfully' })
  async triggerManualUpdate(@Body() body: { source: UpdateSource }) {
    try {
      const update = await this.legalUpdaterService.manualUpdateCheck(body.source);

      return {
        success: true,
        data: update,
        message: 'Verificação manual de atualizações iniciada com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao iniciar verificação',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('updates/history')
  @ApiOperation({ summary: 'Get update history' })
  @ApiResponse({ status: 200, description: 'Update history retrieved successfully' })
  async getUpdateHistory(@Query('limit') limit: number = 50) {
    try {
      const updates = await this.legalUpdaterService.getUpdateHistory(limit);

      return {
        success: true,
        data: updates,
        message: 'Histórico de atualizações recuperado com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao recuperar histórico',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('updates/statistics')
  @ApiOperation({ summary: 'Get update statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getUpdateStatistics() {
    try {
      const statistics = await this.legalUpdaterService.getUpdateStatistics();

      return {
        success: true,
        data: statistics,
        message: 'Estatísticas de atualizações recuperadas com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao recuperar estatísticas',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // General Statistics
  @Get('statistics')
  @ApiOperation({ summary: 'Get general legal AI statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getGeneralStatistics() {
    try {
      const [queryStats, analysisStats] = await Promise.all([
        this.legalAIService.getQueryStatistics(),
        this.legalAnalysisService.getAnalysisStatistics(),
      ]);

      return {
        success: true,
        data: {
          queries: queryStats,
          analyses: analysisStats,
        },
        message: 'Estatísticas gerais recuperadas com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao recuperar estatísticas',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Health Check
  @Get('health')
  @ApiOperation({ summary: 'Health check for legal AI system' })
  @ApiResponse({ status: 200, description: 'System is healthy' })
  async healthCheck() {
    try {
      const [pendingQueries, pendingAnalyses] = await Promise.all([
        this.legalAIService.getPendingQueries(),
        this.legalAnalysisService.getPendingAnalyses(),
      ]);

      return {
        success: true,
        data: {
          status: 'healthy',
          pendingQueries: pendingQueries.length,
          pendingAnalyses: pendingAnalyses.length,
          timestamp: new Date().toISOString(),
        },
        message: 'Sistema de IA jurídica operacional',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro na verificação de saúde do sistema',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}