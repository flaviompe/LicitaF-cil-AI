import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LegalDocument, LegalDocumentType, LegalDocumentStatus } from '../entities/legal-document.entity';
import * as crypto from 'crypto';

@Injectable()
export class LegalKnowledgeService {
  private readonly logger = new Logger(LegalKnowledgeService.name);

  constructor(
    @InjectRepository(LegalDocument)
    private legalDocumentRepository: Repository<LegalDocument>,
  ) {
    this.initializeKnowledgeBase();
  }

  private async initializeKnowledgeBase(): Promise<void> {
    this.logger.log('Initializing legal knowledge base...');
    
    // Check if knowledge base is already initialized
    const documentCount = await this.legalDocumentRepository.count();
    if (documentCount === 0) {
      await this.seedInitialDocuments();
    }
    
    this.logger.log(`Legal knowledge base initialized with ${documentCount} documents`);
  }

  private async seedInitialDocuments(): Promise<void> {
    const initialDocuments = [
      {
        number: '14.133/2021',
        title: 'Lei Geral de Licitações e Contratos Administrativos',
        shortTitle: 'Nova Lei de Licitações',
        type: LegalDocumentType.LAW,
        status: LegalDocumentStatus.ACTIVE,
        publicationDate: new Date('2021-04-01'),
        effectiveDate: new Date('2023-12-28'),
        issuingAuthority: 'Presidência da República',
        sourceUrl: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm',
        summary: 'Nova lei que moderniza o processo de licitações e contratos administrativos no Brasil, substituindo gradualmente a Lei 8.666/93.',
        keyPoints: [
          'Criação do Portal Nacional de Contratações Públicas',
          'Novos procedimentos para licitações',
          'Regime diferenciado de contratações',
          'Maior transparência e eficiência',
          'Uso obrigatório de meios eletrônicos',
        ],
        tags: ['licitação', 'contratos', 'administração pública', 'modernização'],
        fullText: `LEI Nº 14.133, DE 1º DE ABRIL DE 2021

Dispõe sobre licitações e contratos administrativos.

O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta e eu sanciono a seguinte Lei:

TÍTULO I
DISPOSIÇÕES GERAIS

CAPÍTULO I
DOS PRINCÍPIOS E DAS DEFINIÇÕES

Art. 1º Esta Lei estabelece normas gerais de licitação e contratação para as administrações públicas diretas, autárquicas e fundacionais da União, dos Estados, do Distrito Federal e dos Municípios.

Parágrafo único. Subordinam-se ao regime desta Lei, além dos órgãos da administração pública, os fundos especiais, as autarquias, as fundações públicas, as empresas públicas, as sociedades de economia mista e as demais entidades controladas direta ou indiretamente pela administração pública.

Art. 2º Aplicam-se às licitações e aos contratos regidos por esta Lei os princípios da legalidade, da impessoalidade, da moralidade, da publicidade, da eficiência, do interesse público, da probidade administrativa, da igualdade, do planejamento, da transparência, da eficácia, da segregação de funções, da motivação, da vinculação ao edital, do julgamento objetivo, da segurança jurídica, da razoabilidade, da competitividade, da proporcionalidade, da celeridade, da economicidade e do desenvolvimento nacional sustentável.

Art. 3º Para os fins desta Lei, considera-se:
I - licitação: processo de seleção de proposta mais vantajosa para a administração pública, observados os critérios de sustentabilidade e de desenvolvimento nacional;
II - contratação direta: hipótese em que é possível a celebração de contrato administrativo sem a realização de licitação;
III - contrato administrativo: ajuste firmado entre a administração pública e um particular, regulado predominantemente pelo direito público;
IV - administração pública: administração direta, autárquica e fundacional;
V - agente de contratação: servidor público designado para a condução do processo de licitação e para a gestão contratual;
VI - agente público: pessoa investida temporária ou permanentemente no exercício de função pública;
VII - Portal Nacional de Contratações Públicas (PNCP): sistema eletrônico destinado à divulgação centralizada e obrigatória de atos e informações relacionados às licitações e aos contratos públicos;
VIII - sistema eletrônico: conjunto de elementos físicos e lógicos necessários ao processamento eletrônico de dados;
IX - meio eletrônico: forma de armazenamento ou trafego de informações na qual os dados são gerados, enviados, comunicados, recebidos ou armazenados por meios eletrônicos, ópticos ou similares;
X - dispensa: situação que possibilita a contratação direta, sem licitação, nos casos previstos em lei;
XI - inexigibilidade: situação que impossibilita a competição entre particulares, ensejando a contratação direta;
XII - cadastro: sistema de informações sobre fornecedores interessados em contratar com a administração pública;
XIII - edital: documento que formaliza as condições essenciais do contrato e estabelece as regras do procedimento licitatório;
XIV - proposta: oferta apresentada por licitante na licitação;
XV - adjudicação: ato administrativo pelo qual se atribui ao licitante vencedor o objeto da licitação;
XVI - homologação: ato administrativo de verificação da efetiva regularidade dos atos praticados na licitação;
XVII - revogação: desfazimento do procedimento licitatório por razões de interesse público;
XVIII - anulação: desfazimento do procedimento licitatório por ilegalidade;
XIX - microempresa e empresa de pequeno porte: pessoas jurídicas que atendam aos requisitos da Lei Complementar nº 123, de 14 de dezembro de 2006;
XX - inovação: novidade ou aperfeiçoamento que resulte em maior eficiência, eficácia ou efetividade em processos, serviços ou produtos;
XXI - contratação integrada: regime de contratação no qual a contratada fica responsável pelos serviços de engenharia, pela elaboração do projeto e pela execução da obra ou serviço;
XXII - matriz de riscos: cláusula contratual que define a alocação de riscos entre a administração pública e o contratado;
XXIII - dados: informações que representam fatos, conceitos ou instruções de forma adequada à comunicação, interpretação ou processamento;
XXIV - tratamento de dados: operação realizada com dados, como coleta, produção, recepção, classificação, utilização, acesso, reprodução, transmissão, distribuição, processamento, arquivamento, armazenamento, eliminação, avaliação ou controle da informação, modificação, comunicação, transferência, difusão ou extração;
XXV - dados abertos: dados acessíveis ao público, representados em meio digital, estruturados em formato aberto, processáveis por máquina, referenciados na internet e disponibilizados sob licença aberta que permita sua livre utilização, consumo ou cruzamento;
XXVI - formato aberto: formato de dados não proprietário, cuja especificação esteja disponível publicamente e que permita acesso irrestrito;
XXVII - licença aberta: acordo de fornecimento de dados que concede à sociedade o direito de acessar, criar obras derivadas, e distribuir os dados, estando sujeita, no máximo, à exigência de creditar a autoria e compartilhar pela mesma licença;
XXVIII - governo aberto: modelo de gestão pública que busca fortalecer e consolidar a transparência, a participação social e a inovação, promovendo um governo mais aberto, efetivo e accountable;
XXIX - transparência ativa: disponibilização de informações à sociedade por iniciativa própria, independentemente de requerimentos;
XXX - transparência passiva: disponibilização de informações públicas em atendimento a demandas específicas da sociedade.

CAPÍTULO II
DOS ÓRGÃOS RESPONSÁVEIS

Art. 4º A política pública de licitações e contratos administrativos será implementada de forma harmônica, coordenada e integrada pelos órgãos centrais e setoriais do Sistema de Administração dos Recursos de Informação e Informática (SISP), do Sistema de Serviços Gerais (SISG) e do Sistema de Pessoal Civil da Administração Federal (SIPEC) e órgãos equivalentes dos Estados, do Distrito Federal e dos Municípios.

Art. 5º Para os fins do disposto nesta Lei, os órgãos e as entidades da administração pública cujos atos estejam sujeitos a esta Lei observarão as seguintes diretrizes:
I - padronização do objeto da licitação, dos instrumentos convocatórios e das minutas de contratos, observadas as normas de padronização específicas;
II - consolidação de demandas para a realização de licitação, sempre que vantajoso para a administração pública;
III - criação de sistema informatizado de acompanhamento de licitações e contratos;
IV - divulgação de informações de licitações e contratos em sítio eletrônico oficial centralizado;
V - adoção preferencial da modalidade pregão para aquisição de bens e contratação de serviços comuns;
VI - instituição de comissão de licitação de caráter permanente, facultada a contratação ou designação de servidor de outros órgãos ou entidades dos demais entes federativos ou do setor privado para compor ou auxiliar essa comissão;
VII - estabelecimento de sistema de planejamento da contratação pública integrado com o planejamento orçamentário;
VIII - fortalecimento do controle na fase interna da licitação e da execução contratual;
IX - restrição da participação de licitantes que tenham praticado atos ilícitos em licitações ou contratos administrativos;
X - uso, sempre que possível, de produtos e serviços padronizados que atendam aos requisitos de sustentabilidade;
XI - uso de meios eletrônicos, preferencialmente a internet, para realização de licitação.

CAPÍTULO III
DO PORTAL NACIONAL DE CONTRATAÇÕES PÚBLICAS

Art. 6º É criado o Portal Nacional de Contratações Públicas (PNCP), sítio eletrônico oficial destinado à:
I - divulgação centralizada e obrigatória dos atos exigidos por esta Lei;
II - realização facultativa de licitações pelos órgãos e entidades dos entes federativos;
III - disponibilização de sistema para elaboração de editais e contratos padronizados;
IV - divulgação de catálogo eletrônico de padronização de bens, serviços e obras;
V - aplicação de ata de registro de preços;
VI - divulgação de painel de preços de bens e serviços adquiridos pela administração pública;
VII - divulgação de informações estatísticas de licitações e contratos;
VIII - divulgação de informações de integridade sobre licitantes e contratados;
IX - divulgação de sanções aplicadas aos licitantes e contratados;
X - disponibilização de canal de comunicação com órgãos de controle, licitantes e com a sociedade;
XI - disponibilização de dados em formato aberto.

§ 1º O PNCP será gerido por comitê gestor interinstitucional, composto por representantes dos Poderes Executivo, Legislativo e Judiciário da União e por representantes dos Estados, do Distrito Federal e dos Municípios, conforme dispuser o regulamento.

§ 2º O regulamento do PNCP disporá sobre:
I - a estrutura de governança do comitê gestor referido no § 1º deste artigo;
II - os prazos, as funcionalidades, os procedimentos e as responsabilidades relativos ao portal;
III - as condições e os prazos para integração dos órgãos e entidades ao portal;
IV - os critérios de desenvolvimento, implementação, manutenção e atualização do portal;
V - as condições para uso das funcionalidades do portal;
VI - a aplicação de penalidades por descumprimento das obrigações estabelecidas;
VII - a governança e a gestão do portal;
VIII - as responsabilidades dos órgãos e entidades usuários do portal;
IX - os requisitos e procedimentos para integração com outros sistemas eletrônicos;
X - os procedimentos para tratamento de dados pessoais, observada a legislação específica.

Art. 7º A divulgação de atos no PNCP será realizada em espaço próprio e permanente, de livre acesso, não sendo admitida a cobrança de qualquer valor pela consulta ou pelo fornecimento de informações.

Parágrafo único. Os atos divulgados no PNCP permanecerão disponíveis para acesso gratuito durante o prazo de 5 (cinco) anos, ressalvadas as disposições legais específicas.

Art. 8º A partir de 1º de janeiro de 2023, a divulgação dos atos referidos no art. 6º desta Lei será realizada exclusivamente no PNCP, sem prejuízo da sua divulgação adicional em outros meios.

Parágrafo único. Para órgãos e entidades dos Municípios com população inferior a 20.000 (vinte mil) habitantes, o prazo de que trata o caput será de 1º de janeiro de 2024.

Art. 9º Até a entrada em operação do PNCP, os atos referidos no art. 6º desta Lei continuarão a ser divulgados na forma da legislação em vigor.`,
        searchKeywords: 'licitação contrato administração pública modernização transparência eficiência',
        relevanceScore: 100,
        metadata: {
          articles: 194,
          paragraphs: 800,
          applicableScopes: ['federal', 'estadual', 'municipal'],
          supersedes: ['8.666/93'],
          relatedLaws: ['8.666/93', '10.520/02', '12.462/11'],
        },
      },
      {
        number: '8.666/1993',
        title: 'Institui normas para licitações e contratos da Administração Pública',
        shortTitle: 'Lei de Licitações (antiga)',
        type: LegalDocumentType.LAW,
        status: LegalDocumentStatus.SUPERSEDED,
        publicationDate: new Date('1993-06-21'),
        effectiveDate: new Date('1993-06-21'),
        issuingAuthority: 'Presidência da República',
        sourceUrl: 'https://www.planalto.gov.br/ccivil_03/leis/l8666cons.htm',
        summary: 'Lei anterior que regulamentava licitações e contratos administrativos, sendo gradualmente substituída pela Lei 14.133/2021.',
        keyPoints: [
          'Modalidades de licitação',
          'Princípios básicos',
          'Procedimentos licitatórios',
          'Contratos administrativos',
          'Sanções e penalidades',
        ],
        tags: ['licitação', 'contratos', 'administração pública', 'legislação anterior'],
        fullText: 'LEI Nº 8.666, DE 21 DE JUNHO DE 1993...',
        searchKeywords: 'licitação contrato administração pública modalidades princípios',
        relevanceScore: 85,
        metadata: {
          articles: 126,
          paragraphs: 400,
          applicableScopes: ['federal', 'estadual', 'municipal'],
          supersededBy: ['14.133/21'],
          relatedLaws: ['10.520/02', '12.462/11'],
        },
      },
      {
        number: '10.520/2002',
        title: 'Institui, no âmbito da União, Estados, Distrito Federal e Municípios, modalidade de licitação denominada pregão',
        shortTitle: 'Lei do Pregão',
        type: LegalDocumentType.LAW,
        status: LegalDocumentStatus.ACTIVE,
        publicationDate: new Date('2002-07-17'),
        effectiveDate: new Date('2002-07-17'),
        issuingAuthority: 'Presidência da República',
        sourceUrl: 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10520.htm',
        summary: 'Lei que institui a modalidade de licitação denominada pregão para aquisição de bens e serviços comuns.',
        keyPoints: [
          'Modalidade pregão',
          'Bens e serviços comuns',
          'Inversão de fases',
          'Lances verbais',
          'Celeridade processual',
        ],
        tags: ['pregão', 'licitação', 'bens comuns', 'serviços comuns'],
        fullText: 'LEI Nº 10.520, DE 17 DE JULHO DE 2002...',
        searchKeywords: 'pregão licitação bens serviços comuns inversão fases',
        relevanceScore: 95,
        metadata: {
          articles: 9,
          paragraphs: 30,
          applicableScopes: ['federal', 'estadual', 'municipal'],
          relatedLaws: ['8.666/93', '14.133/21', '10.024/19'],
        },
      },
      {
        number: '123/2006',
        title: 'Institui o Estatuto Nacional da Microempresa e da Empresa de Pequeno Porte',
        shortTitle: 'Lei Complementar das ME/EPP',
        type: LegalDocumentType.LAW,
        status: LegalDocumentStatus.ACTIVE,
        publicationDate: new Date('2006-12-14'),
        effectiveDate: new Date('2006-12-14'),
        issuingAuthority: 'Presidência da República',
        sourceUrl: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm',
        summary: 'Lei Complementar que estabelece normas gerais relativas ao tratamento diferenciado e favorecido a ser dispensado às microempresas e empresas de pequeno porte.',
        keyPoints: [
          'Tratamento diferenciado',
          'Critérios de desempate',
          'Cota de até 25%',
          'Subcontratação',
          'Regularização fiscal facilitada',
        ],
        tags: ['microempresa', 'empresa pequeno porte', 'tratamento diferenciado', 'licitação'],
        fullText: 'LEI COMPLEMENTAR Nº 123, DE 14 DE DEZEMBRO DE 2006...',
        searchKeywords: 'microempresa empresa pequeno porte tratamento diferenciado cota subcontratação',
        relevanceScore: 90,
        metadata: {
          articles: 89,
          paragraphs: 200,
          applicableScopes: ['federal', 'estadual', 'municipal'],
          relatedLaws: ['8.666/93', '14.133/21', '10.520/02'],
        },
      },
      {
        number: '10.024/2019',
        title: 'Regulamenta a licitação, na modalidade pregão, na forma eletrônica',
        shortTitle: 'Decreto do Pregão Eletrônico',
        type: LegalDocumentType.DECREE,
        status: LegalDocumentStatus.ACTIVE,
        publicationDate: new Date('2019-09-20'),
        effectiveDate: new Date('2019-09-20'),
        issuingAuthority: 'Presidência da República',
        sourceUrl: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/decreto/d10024.htm',
        summary: 'Decreto que regulamenta a licitação na modalidade pregão na forma eletrônica.',
        keyPoints: [
          'Pregão eletrônico',
          'Procedimentos online',
          'Sessão pública virtual',
          'Recursos eletrônicos',
          'Habilitação documental',
        ],
        tags: ['pregão eletrônico', 'licitação eletrônica', 'procedimentos online'],
        fullText: 'DECRETO Nº 10.024, DE 20 DE SETEMBRO DE 2019...',
        searchKeywords: 'pregão eletrônico licitação online procedimentos virtuais',
        relevanceScore: 90,
        metadata: {
          articles: 40,
          paragraphs: 100,
          applicableScopes: ['federal'],
          relatedLaws: ['10.520/02', '8.666/93', '14.133/21'],
        },
      },
    ];

    for (const docData of initialDocuments) {
      const document = this.legalDocumentRepository.create({
        ...docData,
        hashChecksum: this.generateHashChecksum(docData.fullText),
      });
      
      await this.legalDocumentRepository.save(document);
    }

    this.logger.log(`Seeded ${initialDocuments.length} initial legal documents`);
  }

  async searchDocuments(query: string, filters?: {
    type?: LegalDocumentType;
    status?: LegalDocumentStatus;
    tags?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): Promise<LegalDocument[]> {
    const queryBuilder = this.legalDocumentRepository.createQueryBuilder('doc');

    // Text search
    if (query) {
      queryBuilder.where(
        '(doc.title ILIKE :query OR doc.searchKeywords ILIKE :query OR doc.fullText ILIKE :query)',
        { query: `%${query}%` }
      );
    }

    // Apply filters
    if (filters?.type) {
      queryBuilder.andWhere('doc.type = :type', { type: filters.type });
    }

    if (filters?.status) {
      queryBuilder.andWhere('doc.status = :status', { status: filters.status });
    }

    if (filters?.tags && filters.tags.length > 0) {
      queryBuilder.andWhere('doc.tags && :tags', { tags: filters.tags });
    }

    if (filters?.dateFrom) {
      queryBuilder.andWhere('doc.publicationDate >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters?.dateTo) {
      queryBuilder.andWhere('doc.publicationDate <= :dateTo', { dateTo: filters.dateTo });
    }

    // Order by relevance and date
    queryBuilder.orderBy('doc.relevanceScore', 'DESC')
                .addOrderBy('doc.publicationDate', 'DESC');

    // Limit results
    if (filters?.limit) {
      queryBuilder.limit(filters.limit);
    }

    const documents = await queryBuilder.getMany();

    // Update access count for returned documents
    if (documents.length > 0) {
      await this.updateAccessCount(documents.map(doc => doc.id));
    }

    return documents;
  }

  async findRelevantDocuments(
    keywords: string[],
    context?: {
      type?: 'compliance' | 'risk' | 'procedure' | 'deadline' | 'general';
      sector?: string;
      companySize?: string;
    }
  ): Promise<LegalDocument[]> {
    const queryBuilder = this.legalDocumentRepository.createQueryBuilder('doc');

    // Build search query based on keywords
    const searchTerms = keywords.map(keyword => `%${keyword}%`);
    const searchConditions = searchTerms.map((_, index) => 
      `(doc.title ILIKE :term${index} OR doc.searchKeywords ILIKE :term${index} OR doc.fullText ILIKE :term${index})`
    ).join(' OR ');

    queryBuilder.where(`(${searchConditions})`, 
      searchTerms.reduce((params, term, index) => {
        params[`term${index}`] = term;
        return params;
      }, {})
    );

    // Only active documents
    queryBuilder.andWhere('doc.status = :status', { status: LegalDocumentStatus.ACTIVE });

    // Context-based filtering
    if (context?.type) {
      const contextTags = this.getContextTags(context.type);
      if (contextTags.length > 0) {
        queryBuilder.andWhere('doc.tags && :contextTags', { contextTags });
      }
    }

    // Order by relevance
    queryBuilder.orderBy('doc.relevanceScore', 'DESC')
                .addOrderBy('doc.accessCount', 'DESC')
                .limit(10);

    const documents = await queryBuilder.getMany();

    // Update access count
    if (documents.length > 0) {
      await this.updateAccessCount(documents.map(doc => doc.id));
    }

    return documents;
  }

  async getDocumentById(id: string): Promise<LegalDocument | null> {
    const document = await this.legalDocumentRepository.findOne({ where: { id } });
    
    if (document) {
      document.incrementAccessCount();
      await this.legalDocumentRepository.save(document);
    }
    
    return document;
  }

  async getDocumentByNumber(number: string): Promise<LegalDocument | null> {
    const document = await this.legalDocumentRepository.findOne({ where: { number } });
    
    if (document) {
      document.incrementAccessCount();
      await this.legalDocumentRepository.save(document);
    }
    
    return document;
  }

  async addDocument(documentData: Partial<LegalDocument>): Promise<LegalDocument> {
    const document = this.legalDocumentRepository.create({
      ...documentData,
      hashChecksum: this.generateHashChecksum(documentData.fullText || ''),
    });
    
    return await this.legalDocumentRepository.save(document);
  }

  async updateDocument(id: string, updates: Partial<LegalDocument>): Promise<LegalDocument | null> {
    const document = await this.legalDocumentRepository.findOne({ where: { id } });
    
    if (!document) {
      return null;
    }

    Object.assign(document, updates);
    
    if (updates.fullText) {
      document.hashChecksum = this.generateHashChecksum(updates.fullText);
    }
    
    return await this.legalDocumentRepository.save(document);
  }

  async deleteDocument(id: string): Promise<boolean> {
    const result = await this.legalDocumentRepository.delete(id);
    return result.affected > 0;
  }

  async getDocumentsByType(type: LegalDocumentType): Promise<LegalDocument[]> {
    return await this.legalDocumentRepository.find({
      where: { type, status: LegalDocumentStatus.ACTIVE },
      order: { relevanceScore: 'DESC', publicationDate: 'DESC' },
    });
  }

  async getActiveDocuments(): Promise<LegalDocument[]> {
    return await this.legalDocumentRepository.find({
      where: { status: LegalDocumentStatus.ACTIVE },
      order: { relevanceScore: 'DESC', publicationDate: 'DESC' },
    });
  }

  async getDocumentsByTags(tags: string[]): Promise<LegalDocument[]> {
    return await this.legalDocumentRepository.find({
      where: { tags: () => 'tags && :tags', status: LegalDocumentStatus.ACTIVE },
      order: { relevanceScore: 'DESC' },
    });
  }

  async getRelatedDocuments(documentId: string): Promise<LegalDocument[]> {
    const document = await this.legalDocumentRepository.findOne({ where: { id: documentId } });
    
    if (!document || !document.relatedDocuments) {
      return [];
    }

    return await this.legalDocumentRepository.findByIds(document.relatedDocuments);
  }

  private generateHashChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private async updateAccessCount(documentIds: string[]): Promise<void> {
    await this.legalDocumentRepository
      .createQueryBuilder()
      .update(LegalDocument)
      .set({ 
        accessCount: () => 'access_count + 1',
        lastAccessed: new Date()
      })
      .where('id IN (:...ids)', { ids: documentIds })
      .execute();
  }

  private getContextTags(type: string): string[] {
    const contextMapping = {
      compliance: ['licitação', 'contratos', 'habilitação', 'documentos'],
      risk: ['sanções', 'penalidades', 'recursos', 'impugnação'],
      procedure: ['procedimentos', 'prazos', 'modalidades', 'fases'],
      deadline: ['prazos', 'cronograma', 'publicação', 'recursos'],
      general: ['licitação', 'contratos', 'administração pública'],
    };

    return contextMapping[type] || contextMapping.general;
  }

  async getDocumentStatistics(): Promise<{
    total: number;
    byType: Record<LegalDocumentType, number>;
    byStatus: Record<LegalDocumentStatus, number>;
    mostAccessed: LegalDocument[];
  }> {
    const total = await this.legalDocumentRepository.count();
    
    const byType = await this.legalDocumentRepository
      .createQueryBuilder('doc')
      .select('doc.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('doc.type')
      .getRawMany();

    const byStatus = await this.legalDocumentRepository
      .createQueryBuilder('doc')
      .select('doc.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('doc.status')
      .getRawMany();

    const mostAccessed = await this.legalDocumentRepository.find({
      order: { accessCount: 'DESC' },
      take: 10,
    });

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
      mostAccessed,
    };
  }
}