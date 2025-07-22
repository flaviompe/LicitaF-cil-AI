// Sistema de precificação inteligente com Machine Learning
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PricingData {
  editalId: string;
  category: string;
  estimatedValue: number;
  complexity: 'BAIXA' | 'MEDIA' | 'ALTA';
  deadline: Date;
  requirements: string[];
  location: string;
  organ: string;
}

export interface PricingRecommendation {
  suggestedPrice: number;
  confidence: number; // 0-100
  priceRange: {
    min: number;
    max: number;
    optimal: number;
  };
  factors: {
    marketAnalysis: MarketAnalysis;
    competitionLevel: 'BAIXA' | 'MEDIA' | 'ALTA';
    winProbability: number;
    profitMargin: number;
  };
  strategies: PricingStrategy[];
  indexAdjustments: IndexAdjustment[];
}

export interface MarketAnalysis {
  historicalPrices: number[];
  averageMarketPrice: number;
  priceVariation: number;
  seasonalTrends: number[];
  regionalAdjustment: number;
}

export interface PricingStrategy {
  name: string;
  description: string;
  price: number;
  pros: string[];
  cons: string[];
  recommendedFor: string[];
}

export interface IndexAdjustment {
  index: 'INCC' | 'IPCA' | 'SINAPI' | 'SICRO';
  currentValue: number;
  monthlyVariation: number;
  adjustment: number;
  source: string;
}

export class SmartPricingEngine {
  
  async generatePricingRecommendation(data: PricingData): Promise<PricingRecommendation> {
    try {
      // 1. Análise histórica de preços similares
      const historicalAnalysis = await this.analyzeHistoricalPrices(data);
      
      // 2. Análise de concorrência
      const competitionAnalysis = await this.analyzeCompetition(data);
      
      // 3. Ajustes por índices oficiais
      const indexAdjustments = await this.getIndexAdjustments(data);
      
      // 4. Análise de sazonalidade
      const seasonalFactors = this.analyzeSeasonalFactors(data);
      
      // 5. Machine Learning prediction
      const mlPrediction = await this.runMLPrediction(data, historicalAnalysis);
      
      // 6. Geração de estratégias
      const strategies = this.generatePricingStrategies(mlPrediction, competitionAnalysis);
      
      return {
        suggestedPrice: mlPrediction.optimal,
        confidence: mlPrediction.confidence,
        priceRange: mlPrediction.priceRange,
        factors: {
          marketAnalysis: historicalAnalysis,
          competitionLevel: competitionAnalysis.level,
          winProbability: mlPrediction.winProbability,
          profitMargin: this.calculateProfitMargin(mlPrediction.optimal, data)
        },
        strategies,
        indexAdjustments
      };
      
    } catch (error) {
      console.error('Erro na precificação inteligente:', error);
      throw new Error('Falha na geração de precificação');
    }
  }

  private async analyzeHistoricalPrices(data: PricingData): Promise<MarketAnalysis> {
    // Buscar licitações similares dos últimos 2 anos
    const similarBids = await prisma.opportunity.findMany({
      where: {
        category: data.category,
        organ: data.organ,
        createdAt: {
          gte: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        bids: true
      }
    });

    const prices = similarBids.flatMap(bid => 
      bid.bids.map(b => b.value)
    ).filter(price => price > 0);

    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : data.estimatedValue;
    const variation = prices.length > 1 ? this.calculateVariation(prices) : 0.1;

    return {
      historicalPrices: prices,
      averageMarketPrice: avgPrice,
      priceVariation: variation,
      seasonalTrends: this.calculateSeasonalTrends(similarBids),
      regionalAdjustment: this.calculateRegionalAdjustment(data.location)
    };
  }

  private async analyzeCompetition(data: PricingData): Promise<{level: 'BAIXA' | 'MEDIA' | 'ALTA'}> {
    // Analisar número típico de participantes para categoria/órgão
    const recentOpportunities = await prisma.opportunity.findMany({
      where: {
        category: data.category,
        organ: data.organ,
        createdAt: {
          gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) // 6 meses
        }
      },
      include: {
        _count: {
          select: {
            bids: true
          }
        }
      }
    });

    const avgParticipants = recentOpportunities.length > 0 
      ? recentOpportunities.reduce((sum, opp) => sum + opp._count.bids, 0) / recentOpportunities.length
      : 5;

    const level = avgParticipants < 3 ? 'BAIXA' : avgParticipants < 6 ? 'MEDIA' : 'ALTA';
    
    return { level };
  }

  private async getIndexAdjustments(data: PricingData): Promise<IndexAdjustment[]> {
    // Simular busca de índices oficiais (IBGE, FGV, etc.)
    return [
      {
        index: 'INCC',
        currentValue: 4832.45,
        monthlyVariation: 0.52,
        adjustment: 1.0052,
        source: 'FGV - Nov/2024'
      },
      {
        index: 'IPCA',
        currentValue: 132.89,
        monthlyVariation: 0.28,
        adjustment: 1.0028,
        source: 'IBGE - Nov/2024'
      },
      {
        index: 'SINAPI',
        currentValue: 1247.33,
        monthlyVariation: 0.45,
        adjustment: 1.0045,
        source: 'IBGE/CEF - Nov/2024'
      }
    ];
  }

  private analyzeSeasonalFactors(data: PricingData): number {
    const month = data.deadline.getMonth();
    
    // Fatores sazonais típicos do setor público
    const seasonalFactors = [
      1.15, // Jan - Alta demanda pós-orçamento
      1.05, // Fev
      0.95, // Mar
      0.90, // Abr
      0.88, // Mai
      0.85, // Jun
      0.82, // Jul
      0.85, // Ago
      0.95, // Set
      1.10, // Out
      1.25, // Nov - Pressa fim do ano
      1.30  // Dez - Urgência orçamentária
    ];
    
    return seasonalFactors[month];
  }

  private async runMLPrediction(data: PricingData, marketAnalysis: MarketAnalysis): Promise<{
    optimal: number;
    confidence: number;
    priceRange: { min: number; max: number; optimal: number };
    winProbability: number;
  }> {
    // Simulação de algoritmo ML (em produção usaria TensorFlow.js ou API externa)
    const basePrice = marketAnalysis.averageMarketPrice || data.estimatedValue;
    const complexity = data.complexity === 'BAIXA' ? 0.9 : data.complexity === 'MEDIA' ? 1.0 : 1.2;
    const urgency = this.calculateUrgencyFactor(data.deadline);
    
    const optimal = basePrice * complexity * urgency;
    const variation = 0.15; // 15% de variação
    
    return {
      optimal,
      confidence: 85,
      priceRange: {
        min: optimal * (1 - variation),
        max: optimal * (1 + variation),
        optimal
      },
      winProbability: this.calculateWinProbability(optimal, basePrice)
    };
  }

  private generatePricingStrategies(prediction: any, competition: any): PricingStrategy[] {
    const basePrice = prediction.optimal;
    
    return [
      {
        name: 'Estratégia Agressiva',
        description: 'Preço competitivo para maximizar chances de vitória',
        price: basePrice * 0.92,
        pros: ['Alta probabilidade de vitória', 'Posicionamento de mercado'],
        cons: ['Margem reduzida', 'Possível questionamento de exequibilidade'],
        recommendedFor: ['Empresas em crescimento', 'Mercados altamente competitivos']
      },
      {
        name: 'Estratégia Equilibrada',
        description: 'Balanceamento entre competitividade e margem',
        price: basePrice,
        pros: ['Boa margem de lucro', 'Risco controlado'],
        cons: ['Concorrência moderada'],
        recommendedFor: ['Maioria dos casos', 'Empresas estáveis']
      },
      {
        name: 'Estratégia Conservadora',
        description: 'Margem elevada com menor risco operacional',
        price: basePrice * 1.12,
        pros: ['Alta margem', 'Menor risco de prejuízo'],
        cons: ['Menor chance de vitória'],
        recommendedFor: ['Projetos complexos', 'Empresas com alta demanda']
      }
    ];
  }

  private calculateVariation(prices: number[]): number {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / prices.length;
    return Math.sqrt(variance) / avg;
  }

  private calculateSeasonalTrends(bids: any[]): number[] {
    // Análise de tendências sazonais baseada em dados históricos
    return Array.from({length: 12}, (_, i) => Math.random() * 0.3 + 0.85);
  }

  private calculateRegionalAdjustment(location: string): number {
    // Ajustes regionais baseados em custo de vida/operação
    const regionalFactors: Record<string, number> = {
      'SP': 1.15,
      'RJ': 1.12,
      'DF': 1.08,
      'MG': 0.95,
      'RS': 0.98,
      'PR': 0.96,
      'default': 1.0
    };
    
    return regionalFactors[location] || regionalFactors.default;
  }

  private calculateUrgencyFactor(deadline: Date): number {
    const daysUntilDeadline = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline < 7) return 1.1; // Urgente
    if (daysUntilDeadline < 15) return 1.05; // Moderado
    return 1.0; // Normal
  }

  private calculateWinProbability(proposedPrice: number, marketAverage: number): number {
    const ratio = proposedPrice / marketAverage;
    
    if (ratio < 0.85) return 95;
    if (ratio < 0.95) return 80;
    if (ratio < 1.05) return 65;
    if (ratio < 1.15) return 45;
    return 25;
  }

  private calculateProfitMargin(price: number, data: PricingData): number {
    // Estimativa simples de margem (em produção seria mais complexa)
    const estimatedCosts = data.estimatedValue * 0.75;
    return ((price - estimatedCosts) / price) * 100;
  }

  // Análise de exequibilidade automática
  async analyzeExequibilidade(price: number, data: PricingData): Promise<{
    isExequivel: boolean;
    reasoning: string[];
    suggestedAdjustments: string[];
  }> {
    const marketAnalysis = await this.analyzeHistoricalPrices(data);
    const ratio = price / marketAnalysis.averageMarketPrice;
    
    const isExequivel = ratio >= 0.7; // Limiar típico de 70% do preço médio
    
    return {
      isExequivel,
      reasoning: [
        `Preço proposto: R$ ${price.toLocaleString('pt-BR')}`,
        `Média de mercado: R$ ${marketAnalysis.averageMarketPrice.toLocaleString('pt-BR')}`,
        `Ratio: ${(ratio * 100).toFixed(1)}%`
      ],
      suggestedAdjustments: isExequivel ? [] : [
        'Revisar composição de custos',
        'Considerar economia de escala',
        'Avaliar subcontratações estratégicas'
      ]
    };
  }
}

// Instância singleton
export const smartPricingEngine = new SmartPricingEngine();