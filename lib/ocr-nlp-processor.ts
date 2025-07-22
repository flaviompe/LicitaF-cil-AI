// Sistema OCR/NLP para leitura e extração de documentos de editais
import Tesseract from 'tesseract.js';
import { PDFExtract } from 'pdf.js-extract';
import OpenAI from 'openai';
import { z } from 'zod';
import sharp from 'sharp';
import mammoth from 'mammoth';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface DocumentAnalysis {
  id: string;
  fileName: string;
  fileType: 'PDF' | 'IMAGE' | 'DOCX' | 'DOC';
  fileSize: number;
  pages: number;
  extractedText: string;
  confidence: number;
  processingTime: number;
  structuredData: ExtractedStructure;
  entities: NamedEntity[];
  metadata: DocumentMetadata;
  warnings: string[];
  timestamp: Date;
}

export interface ExtractedStructure {
  objeto: string;
  valorEstimado?: number;
  modalidade: string;
  orgao: string;
  prazoEntrega?: string;
  prazoProposta: Date;
  enderecoEntrega?: string;
  exigencias: {
    habilitacaoJuridica: string[];
    regularidadeFiscal: string[];
    qualificacaoTecnica: string[];
    qualificacaoEconomica: string[];
  };
  criteriosJulgamento: string;
  documentosObrigatorios: string[];
  anexos: string[];
  contatos: ContactInfo[];
  penalidades: string[];
  recursos: {
    prazo: string;
    procedimento: string;
  };
}

export interface NamedEntity {
  text: string;
  label: 'ORG' | 'MONEY' | 'DATE' | 'PERSON' | 'LOCATION' | 'LAW' | 'DEADLINE' | 'REQUIREMENT';
  confidence: number;
  startIndex: number;
  endIndex: number;
  context: string;
}

export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  role?: string;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  creationDate?: Date;
  modificationDate?: Date;
  keywords?: string[];
  language: string;
  encoding?: string;
  pageLayout?: string;
}

export interface ProcessingConfig {
  enableOCR: boolean;
  ocrLanguage: string;
  enableNER: boolean; // Named Entity Recognition
  enableStructuring: boolean;
  confidenceThreshold: number;
  maxFileSize: number; // em bytes
  allowedFormats: string[];
}

export class OCRNLPProcessor {
  private defaultConfig: ProcessingConfig = {
    enableOCR: true,
    ocrLanguage: 'por',
    enableNER: true,
    enableStructuring: true,
    confidenceThreshold: 0.7,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedFormats: ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'doc']
  };

  async processDocument(
    filePath: string, 
    config: Partial<ProcessingConfig> = {}
  ): Promise<DocumentAnalysis> {
    const startTime = Date.now();
    const finalConfig = { ...this.defaultConfig, ...config };
    
    try {
      // Validar arquivo
      await this.validateFile(filePath, finalConfig);
      
      const fileInfo = await this.getFileInfo(filePath);
      const fileType = this.determineFileType(filePath);
      
      // Extrair texto baseado no tipo de arquivo
      let extractedText = '';
      let confidence = 1.0;
      
      switch (fileType) {
        case 'PDF':
          ({ text: extractedText, confidence } = await this.extractFromPDF(filePath, finalConfig));
          break;
        case 'IMAGE':
          ({ text: extractedText, confidence } = await this.extractFromImage(filePath, finalConfig));
          break;
        case 'DOCX':
          extractedText = await this.extractFromDocx(filePath);
          break;
        default:
          throw new Error(`Tipo de arquivo não suportado: ${fileType}`);
      }

      // Limpar e normalizar texto
      extractedText = this.cleanExtractedText(extractedText);
      
      // Análises avançadas
      const [structuredData, entities, metadata] = await Promise.all([
        finalConfig.enableStructuring ? this.extractStructuredData(extractedText) : this.getEmptyStructure(),
        finalConfig.enableNER ? this.extractNamedEntities(extractedText) : [],
        this.extractMetadata(filePath, fileType)
      ]);

      const processingTime = Date.now() - startTime;
      
      const analysis: DocumentAnalysis = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fileName: fileInfo.name,
        fileType,
        fileSize: fileInfo.size,
        pages: await this.getPageCount(filePath, fileType),
        extractedText,
        confidence,
        processingTime,
        structuredData,
        entities,
        metadata,
        warnings: this.generateWarnings(confidence, extractedText.length),
        timestamp: new Date()
      };

      return analysis;
      
    } catch (error) {
      throw new Error(`Erro no processamento do documento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private async validateFile(filePath: string, config: ProcessingConfig): Promise<void> {
    const fs = require('fs').promises;
    
    try {
      const stats = await fs.stat(filePath);
      
      if (stats.size > config.maxFileSize) {
        throw new Error(`Arquivo muito grande. Máximo: ${config.maxFileSize / 1024 / 1024}MB`);
      }
      
      const extension = filePath.split('.').pop()?.toLowerCase();
      if (!extension || !config.allowedFormats.includes(extension)) {
        throw new Error(`Formato não suportado. Formatos aceitos: ${config.allowedFormats.join(', ')}`);
      }
      
    } catch (error) {
      if (error instanceof Error && error.code === 'ENOENT') {
        throw new Error('Arquivo não encontrado');
      }
      throw error;
    }
  }

  private async extractFromPDF(filePath: string, config: ProcessingConfig): Promise<{text: string, confidence: number}> {
    try {
      const pdfExtract = new PDFExtract();
      
      return new Promise((resolve, reject) => {
        pdfExtract.extract(filePath, {}, (err, data) => {
          if (err) {
            reject(new Error(`Erro na extração do PDF: ${err.message}`));
            return;
          }
          
          const text = data.pages
            .map(page => page.content.map(item => item.str).join(' '))
            .join('\n\n');
            
          const confidence = text.length > 100 ? 0.95 : 0.7; // PDF geralmente tem alta confiança
          
          resolve({ text, confidence });
        });
      });
      
    } catch (error) {
      throw new Error(`Falha na extração do PDF: ${error}`);
    }
  }

  private async extractFromImage(filePath: string, config: ProcessingConfig): Promise<{text: string, confidence: number}> {
    try {
      // Pré-processar imagem para melhor OCR
      const processedImagePath = await this.preprocessImage(filePath);
      
      const { data: { text, confidence } } = await Tesseract.recognize(
        processedImagePath,
        config.ocrLanguage,
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );
      
      // Limpar arquivo temporário
      if (processedImagePath !== filePath) {
        const fs = require('fs').promises;
        await fs.unlink(processedImagePath).catch(() => {}); // Ignorar erro se já foi removido
      }
      
      return { text, confidence: confidence / 100 }; // Tesseract retorna 0-100
      
    } catch (error) {
      throw new Error(`Erro no OCR da imagem: ${error}`);
    }
  }

  private async preprocessImage(filePath: string): Promise<string> {
    try {
      const outputPath = filePath.replace(/\.[^.]+$/, '_processed.png');
      
      await sharp(filePath)
        .grayscale() // Converter para escala de cinza
        .normalize() // Normalizar contraste
        .threshold(128) // Binarização
        .sharpen() // Aumentar nitidez
        .png({ quality: 95 })
        .toFile(outputPath);
        
      return outputPath;
      
    } catch (error) {
      console.warn('Erro no pré-processamento da imagem, usando original:', error);
      return filePath; // Usar imagem original se falhar
    }
  }

  private async extractFromDocx(filePath: string): Promise<string> {
    try {
      const { value: text } = await mammoth.extractRawText({ path: filePath });
      return text;
    } catch (error) {
      throw new Error(`Erro na extração do DOCX: ${error}`);
    }
  }

  private cleanExtractedText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalizar espaços
      .replace(/\n{3,}/g, '\n\n') // Limitar quebras de linha
      .replace(/[^\w\s\.,;:!?()-]/g, ' ') // Remover caracteres especiais
      .trim();
  }

  private async extractStructuredData(text: string): Promise<ExtractedStructure> {
    try {
      const prompt = `
        Analise o seguinte texto de edital de licitação e extraia as informações estruturadas em formato JSON:

        TEXTO DO EDITAL:
        ${text.substring(0, 8000)} // Limitar para não exceder tokens

        Extraia as seguintes informações:
        - objeto: descrição do objeto da licitação
        - valorEstimado: valor estimado em número (sem formatação)
        - modalidade: modalidade da licitação (pregão, concorrência, etc.)
        - orgao: órgão responsável
        - prazoEntrega: prazo de entrega/execução
        - prazoProposta: data limite para envio de propostas (formato ISO)
        - enderecoEntrega: endereço de entrega (se houver)
        - exigencias: objeto com arrays para cada tipo de habilitação
        - criteriosJulgamento: critério de julgamento
        - documentosObrigatorios: lista de documentos obrigatórios
        - anexos: lista de anexos do edital
        - contatos: informações de contato
        - penalidades: penalidades previstas
        - recursos: informações sobre recursos

        Retorne APENAS o JSON estruturado, sem explicações adicionais.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em análise de editais de licitação. Extraia informações de forma precisa e retorne apenas JSON válido."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      const jsonText = response.choices[0].message.content?.trim();
      if (!jsonText) {
        throw new Error('Resposta vazia da IA');
      }

      try {
        return JSON.parse(jsonText);
      } catch (parseError) {
        console.warn('Erro ao parsear JSON da IA, usando estrutura padrão');
        return this.getEmptyStructure();
      }

    } catch (error) {
      console.error('Erro na extração estruturada:', error);
      return this.getEmptyStructure();
    }
  }

  private async extractNamedEntities(text: string): Promise<NamedEntity[]> {
    try {
      // Usar IA para reconhecimento de entidades nomeadas
      const prompt = `
        Identifique e extraia as seguintes entidades do texto de licitação:
        
        TIPOS DE ENTIDADES:
        - ORG: Organizações/órgãos públicos
        - MONEY: Valores monetários
        - DATE: Datas e prazos
        - PERSON: Nomes de pessoas
        - LOCATION: Localizações/endereços
        - LAW: Referências legais (leis, decretos, etc.)
        - DEADLINE: Prazos específicos
        - REQUIREMENT: Exigências/requisitos

        TEXTO:
        ${text.substring(0, 4000)}

        Retorne um array JSON com objetos contendo:
        - text: texto da entidade
        - label: tipo da entidade
        - confidence: confiança (0-1)
        - context: contexto onde aparece

        Retorne APENAS o JSON.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em processamento de linguagem natural para documentos jurídicos."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1500
      });

      const jsonText = response.choices[0].message.content?.trim();
      if (!jsonText) return [];

      try {
        const entities = JSON.parse(jsonText);
        
        // Adicionar índices de posição
        return entities.map((entity: any) => ({
          ...entity,
          startIndex: text.indexOf(entity.text),
          endIndex: text.indexOf(entity.text) + entity.text.length
        })).filter((entity: NamedEntity) => entity.startIndex !== -1);
        
      } catch (parseError) {
        console.warn('Erro ao parsear entidades nomeadas');
        return [];
      }

    } catch (error) {
      console.error('Erro na extração de entidades:', error);
      return [];
    }
  }

  private async extractMetadata(filePath: string, fileType: string): Promise<DocumentMetadata> {
    const metadata: DocumentMetadata = {
      language: 'pt-BR'
    };

    try {
      const fs = require('fs').promises;
      const stats = await fs.stat(filePath);
      
      metadata.modificationDate = stats.mtime;
      
      // Tentar extrair título do conteúdo
      if (fileType === 'PDF') {
        // Implementar extração de metadados específica do PDF
        // Por enquanto, usar informações básicas
      }
      
    } catch (error) {
      console.warn('Erro ao extrair metadados:', error);
    }

    return metadata;
  }

  private async getFileInfo(filePath: string): Promise<{name: string, size: number}> {
    const fs = require('fs').promises;
    const path = require('path');
    
    const stats = await fs.stat(filePath);
    const name = path.basename(filePath);
    
    return { name, size: stats.size };
  }

  private determineFileType(filePath: string): 'PDF' | 'IMAGE' | 'DOCX' | 'DOC' {
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'PDF';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'tiff':
      case 'bmp':
        return 'IMAGE';
      case 'docx':
        return 'DOCX';
      case 'doc':
        return 'DOC';
      default:
        throw new Error(`Extensão não suportada: ${extension}`);
    }
  }

  private async getPageCount(filePath: string, fileType: string): Promise<number> {
    try {
      if (fileType === 'PDF') {
        const pdfExtract = new PDFExtract();
        return new Promise((resolve) => {
          pdfExtract.extract(filePath, {}, (err, data) => {
            resolve(err ? 1 : data.pages.length);
          });
        });
      }
      return 1; // Outros tipos têm 1 página
    } catch (error) {
      return 1;
    }
  }

  private getEmptyStructure(): ExtractedStructure {
    return {
      objeto: '',
      modalidade: '',
      orgao: '',
      prazoProposta: new Date(),
      exigencias: {
        habilitacaoJuridica: [],
        regularidadeFiscal: [],
        qualificacaoTecnica: [],
        qualificacaoEconomica: []
      },
      criteriosJulgamento: '',
      documentosObrigatorios: [],
      anexos: [],
      contatos: [],
      penalidades: [],
      recursos: {
        prazo: '',
        procedimento: ''
      }
    };
  }

  private generateWarnings(confidence: number, textLength: number): string[] {
    const warnings: string[] = [];
    
    if (confidence < 0.8) {
      warnings.push('Baixa confiança na extração de texto. Verifique manualmente.');
    }
    
    if (textLength < 500) {
      warnings.push('Texto extraído muito curto. Pode estar incompleto.');
    }
    
    if (textLength > 50000) {
      warnings.push('Documento muito longo. Algumas análises podem estar limitadas.');
    }
    
    return warnings;
  }

  // Método para processar múltiplos documentos em batch
  async processBatch(filePaths: string[], config?: Partial<ProcessingConfig>): Promise<DocumentAnalysis[]> {
    const results: DocumentAnalysis[] = [];
    const errors: string[] = [];
    
    for (const filePath of filePaths) {
      try {
        const analysis = await this.processDocument(filePath, config);
        results.push(analysis);
      } catch (error) {
        errors.push(`${filePath}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }
    
    if (errors.length > 0) {
      console.warn('Erros no processamento em batch:', errors);
    }
    
    return results;
  }

  // Método para buscar texto específico
  searchInDocument(analysis: DocumentAnalysis, searchTerms: string[]): Array<{term: string, matches: number, contexts: string[]}> {
    const results = searchTerms.map(term => {
      const regex = new RegExp(term, 'gi');
      const matches = analysis.extractedText.match(regex);
      const contexts: string[] = [];
      
      if (matches) {
        let match;
        while ((match = regex.exec(analysis.extractedText)) !== null) {
          const start = Math.max(0, match.index - 50);
          const end = Math.min(analysis.extractedText.length, match.index + term.length + 50);
          contexts.push(analysis.extractedText.substring(start, end));
        }
      }
      
      return {
        term,
        matches: matches?.length || 0,
        contexts
      };
    });
    
    return results;
  }

  // Método para validar extração com IA
  async validateExtraction(analysis: DocumentAnalysis): Promise<{isValid: boolean, issues: string[], score: number}> {
    try {
      const prompt = `
        Avalie a qualidade da extração de dados do seguinte edital:
        
        DADOS EXTRAÍDOS:
        - Objeto: ${analysis.structuredData.objeto}
        - Valor: ${analysis.structuredData.valorEstimado}
        - Modalidade: ${analysis.structuredData.modalidade}
        - Órgão: ${analysis.structuredData.orgao}
        
        TEXTO ORIGINAL (primeiros 1000 caracteres):
        ${analysis.extractedText.substring(0, 1000)}
        
        Analise se:
        1. Os dados extraídos correspondem ao texto
        2. Informações importantes estão faltando
        3. Há inconsistências ou erros
        
        Retorne JSON com:
        - isValid: boolean
        - issues: array de problemas encontrados
        - score: pontuação de 0-100
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Você é um auditor de qualidade de extração de dados de editais."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0].message.content || '{"isValid": false, "issues": ["Erro na validação"], "score": 0}');
      return result;
      
    } catch (error) {
      return {
        isValid: false,
        issues: ['Erro na validação automática'],
        score: 0
      };
    }
  }
}

// Instância singleton
export const ocrNLPProcessor = new OCRNLPProcessor();