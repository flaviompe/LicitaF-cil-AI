// Sistema de planos com pagamento USDT
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import crypto from 'crypto';
import QRCode from 'qrcode';

const prisma = new PrismaClient();

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  targetAudience: string[];
  price: {
    monthly: number;
    annual: number;
    currency: 'BRL' | 'USD';
  };
  usdtPrice: {
    monthly: number;
    annual: number;
    discount: number; // Desconto em % para pagamento USDT
  };
  features: PlanFeature[];
  limits: PlanLimits;
  isPopular: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  included: boolean;
  limit?: number;
  unit?: string;
}

export interface PlanLimits {
  maxUsers: number;
  maxOpportunities: number;
  maxBids: number;
  maxAPIRequests: number;
  maxStorage: number; // em GB
  maxContracts: number;
  supportLevel: 'BASIC' | 'PRIORITY' | 'PREMIUM';
  analysisCredits: number;
  customReports: boolean;
  whiteLabel: boolean;
}

export interface USDTPayment {
  id: string;
  subscriptionId: string;
  planId: string;
  userId: string;
  amount: number;
  currency: 'USDT-TRC20' | 'USDT-ERC20';
  walletAddress: string;
  paymentAddress: string;
  transactionHash?: string;
  status: 'PENDING' | 'CONFIRMING' | 'CONFIRMED' | 'EXPIRED' | 'FAILED';
  confirmations: number;
  requiredConfirmations: number;
  qrCode: string;
  expiresAt: Date;
  confirmedAt?: Date;
  createdAt: Date;
  metadata: {
    billingPeriod: 'MONTHLY' | 'ANNUAL';
    originalPrice: number;
    discountApplied: number;
    exchangeRate: number;
    blockchainNetwork: string;
  };
}

export interface WalletConfig {
  trc20Address: string;
  erc20Address: string;
  isEncrypted: boolean;
  lastUpdated: Date;
  updatedBy: string;
  backupExists: boolean;
}

export interface PaymentWebhook {
  id: string;
  paymentId: string;
  eventType: 'TRANSACTION_CREATED' | 'TRANSACTION_CONFIRMED' | 'TRANSACTION_FAILED';
  data: Record<string, any>;
  processed: boolean;
  attempts: number;
  lastAttempt?: Date;
  createdAt: Date;
}

export interface ExchangeRate {
  currency: string;
  rate: number;
  provider: string;
  timestamp: Date;
  isActive: boolean;
}

export class USDTPaymentSystem {
  private readonly TRON_API_URL = 'https://api.trongrid.io';
  private readonly ETHEREUM_API_URL = 'https://api.etherscan.io/api';
  private readonly CONFIRMATION_THRESHOLD = {
    TRC20: 19, // Confirmações TRON
    ERC20: 12  // Confirmações Ethereum
  };

  constructor() {
    this.initializeSystem();
  }

  private async initializeSystem(): Promise<void> {
    // Inicializar planos padrão se não existirem
    await this.createDefaultPlans();
    
    // Configurar monitoramento de pagamentos
    this.startPaymentMonitoring();
  }

  async createDefaultPlans(): Promise<void> {
    const defaultPlans: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Essencial',
        description: 'Ideal para microempresas e MEIs que estão começando no mundo das licitações',
        targetAudience: ['MEI', 'Microempresa', 'Profissional Liberal'],
        price: {
          monthly: 97,
          annual: 970, // ~2 meses grátis
          currency: 'BRL'
        },
        usdtPrice: {
          monthly: 18, // ~$18 USD
          annual: 180, // ~$180 USD
          discount: 5 // 5% desconto para USDT
        },
        features: [
          { id: 'f1', name: 'Monitoramento Básico', description: 'Até 50 oportunidades/mês', included: true, limit: 50 },
          { id: 'f2', name: 'Análise IA Básica', description: 'Análise jurídica simples', included: true, limit: 10 },
          { id: 'f3', name: 'Suporte Email', description: 'Resposta em até 24h', included: true },
          { id: 'f4', name: 'Dashboard Básico', description: 'Relatórios essenciais', included: true },
          { id: 'f5', name: 'Templates Básicos', description: 'Modelos de proposta', included: true, limit: 5 }
        ],
        limits: {
          maxUsers: 2,
          maxOpportunities: 50,
          maxBids: 10,
          maxAPIRequests: 1000,
          maxStorage: 1,
          maxContracts: 5,
          supportLevel: 'BASIC',
          analysisCredits: 10,
          customReports: false,
          whiteLabel: false
        },
        isPopular: false,
        isActive: true
      },
      {
        name: 'Profissional',
        description: 'Perfeito para pequenas e médias empresas que querem crescer no mercado público',
        targetAudience: ['Pequena Empresa', 'Média Empresa', 'Startup'],
        price: {
          monthly: 197,
          annual: 1970,
          currency: 'BRL'
        },
        usdtPrice: {
          monthly: 36, // ~$36 USD
          annual: 360, // ~$360 USD
          discount: 5
        },
        features: [
          { id: 'f1', name: 'Monitoramento Avançado', description: 'Até 200 oportunidades/mês', included: true, limit: 200 },
          { id: 'f2', name: 'Análise IA Completa', description: 'IA jurídica + precificação', included: true, limit: 50 },
          { id: 'f3', name: 'Suporte Prioritário', description: 'Chat + Email, resposta em 4h', included: true },
          { id: 'f4', name: 'Dashboard Completo', description: 'Analytics avançados', included: true },
          { id: 'f5', name: 'Templates Premium', description: 'Biblioteca completa', included: true, limit: 20 },
          { id: 'f6', name: 'Integração ERP', description: 'Conectores básicos', included: true },
          { id: 'f7', name: 'Academia Pro', description: 'Cursos e certificações', included: true },
          { id: 'f8', name: 'API Access', description: 'Integração personalizada', included: true }
        ],
        limits: {
          maxUsers: 10,
          maxOpportunities: 200,
          maxBids: 50,
          maxAPIRequests: 10000,
          maxStorage: 5,
          maxContracts: 25,
          supportLevel: 'PRIORITY',
          analysisCredits: 50,
          customReports: true,
          whiteLabel: false
        },
        isPopular: true,
        isActive: true
      },
      {
        name: 'Corporativo',
        description: 'Solução completa para grandes organizações e consultorias especializadas',
        targetAudience: ['Grande Empresa', 'Consultoria', 'Consórcio'],
        price: {
          monthly: 497,
          annual: 4970,
          currency: 'BRL'
        },
        usdtPrice: {
          monthly: 90, // ~$90 USD
          annual: 900, // ~$900 USD
          discount: 5
        },
        features: [
          { id: 'f1', name: 'Monitoramento Ilimitado', description: 'Sem limites de oportunidades', included: true },
          { id: 'f2', name: 'IA Empresarial', description: 'Análise completa + automação', included: true },
          { id: 'f3', name: 'Suporte Dedicado', description: 'Gerente de conta + WhatsApp', included: true },
          { id: 'f4', name: 'Dashboard Executivo', description: 'BI completo + relatórios customizados', included: true },
          { id: 'f5', name: 'White Label', description: 'Marca própria disponível', included: true },
          { id: 'f6', name: 'Integração Completa', description: 'ERP + CRM + Contabilidade', included: true },
          { id: 'f7', name: 'Academia Corporate', description: 'Treinamento personalizado', included: true },
          { id: 'f8', name: 'API Empresarial', description: 'Rate limits elevados', included: true },
          { id: 'f9', name: 'Consultoria Jurídica', description: '5h mensais incluídas', included: true, limit: 5, unit: 'horas' },
          { id: 'f10', name: 'Backup & Security', description: 'Backup diário + SSL dedicado', included: true }
        ],
        limits: {
          maxUsers: 50,
          maxOpportunities: -1, // Ilimitado
          maxBids: -1,
          maxAPIRequests: 100000,
          maxStorage: 50,
          maxContracts: -1,
          supportLevel: 'PREMIUM',
          analysisCredits: -1,
          customReports: true,
          whiteLabel: true
        },
        isPopular: false,
        isActive: true
      }
    ];

    for (const planData of defaultPlans) {
      const existingPlan = await prisma.subscriptionPlan.findFirst({
        where: { name: planData.name }
      });

      if (!existingPlan) {
        await prisma.subscriptionPlan.create({
          data: {
            ...planData,
            id: `plan_${planData.name.toLowerCase()}_${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
    }
  }

  async createUSDTPayment(data: {
    userId: string;
    planId: string;
    billingPeriod: 'MONTHLY' | 'ANNUAL';
    network: 'TRC20' | 'ERC20';
  }): Promise<USDTPayment> {
    try {
      // Buscar plano
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: data.planId }
      });

      if (!plan) {
        throw new Error('Plano não encontrado');
      }

      // Calcular valor
      const basePrice = data.billingPeriod === 'MONTHLY' 
        ? plan.usdtPrice.monthly 
        : plan.usdtPrice.annual;
      
      const discount = plan.usdtPrice.discount / 100;
      const finalAmount = basePrice * (1 - discount);

      // Obter taxa de câmbio atual
      const exchangeRate = await this.getCurrentExchangeRate();

      // Gerar endereço de pagamento
      const paymentAddress = await this.generatePaymentAddress(data.network);

      // Gerar QR Code
      const qrCodeData = `${paymentAddress}?amount=${finalAmount}`;
      const qrCode = await QRCode.toDataURL(qrCodeData);

      // Criar pagamento
      const payment: USDTPayment = {
        id: `payment_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        subscriptionId: '', // Será preenchido após criação da subscription
        planId: data.planId,
        userId: data.userId,
        amount: finalAmount,
        currency: data.network === 'TRC20' ? 'USDT-TRC20' : 'USDT-ERC20',
        walletAddress: await this.getWalletAddress(data.network),
        paymentAddress,
        status: 'PENDING',
        confirmations: 0,
        requiredConfirmations: this.CONFIRMATION_THRESHOLD[data.network],
        qrCode,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
        createdAt: new Date(),
        metadata: {
          billingPeriod: data.billingPeriod,
          originalPrice: basePrice,
          discountApplied: discount,
          exchangeRate: exchangeRate.rate,
          blockchainNetwork: data.network
        }
      };

      // Salvar no banco
      await prisma.usdtPayment.create({
        data: payment
      });

      // Iniciar monitoramento
      this.startTransactionMonitoring(payment.id);

      return payment;

    } catch (error) {
      throw new Error(`Erro ao criar pagamento USDT: ${error}`);
    }
  }

  private async generatePaymentAddress(network: 'TRC20' | 'ERC20'): Promise<string> {
    // Em produção, geraria um endereço único para cada transação
    // Por enquanto, retorna o endereço principal da carteira
    return await this.getWalletAddress(network);
  }

  private async getWalletAddress(network: 'TRC20' | 'ERC20'): Promise<string> {
    const config = await this.getWalletConfig();
    
    return network === 'TRC20' ? config.trc20Address : config.erc20Address;
  }

  async getWalletConfig(): Promise<WalletConfig> {
    let config = await prisma.walletConfig.findFirst();

    if (!config) {
      // Criar configuração padrão
      config = await prisma.walletConfig.create({
        data: {
          trc20Address: process.env.TRON_WALLET_ADDRESS || '',
          erc20Address: process.env.ETHEREUM_WALLET_ADDRESS || '',
          isEncrypted: false,
          lastUpdated: new Date(),
          updatedBy: 'system',
          backupExists: false
        }
      });
    }

    return config as WalletConfig;
  }

  async updateWalletConfig(updates: {
    trc20Address?: string;
    erc20Address?: string;
    updatedBy: string;
  }): Promise<WalletConfig> {
    const config = await prisma.walletConfig.upsert({
      where: { id: 'main' },
      update: {
        ...updates,
        lastUpdated: new Date()
      },
      create: {
        id: 'main',
        trc20Address: updates.trc20Address || '',
        erc20Address: updates.erc20Address || '',
        isEncrypted: false,
        lastUpdated: new Date(),
        updatedBy: updates.updatedBy,
        backupExists: false
      }
    });

    return config as WalletConfig;
  }

  private async getCurrentExchangeRate(): Promise<ExchangeRate> {
    try {
      // Buscar taxa mais recente (menos de 1 hora)
      const recentRate = await prisma.exchangeRate.findFirst({
        where: {
          currency: 'BRL_USD',
          isActive: true,
          timestamp: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // 1 hora
          }
        },
        orderBy: { timestamp: 'desc' }
      });

      if (recentRate) {
        return recentRate as ExchangeRate;
      }

      // Buscar nova taxa
      const rate = await this.fetchExchangeRate();
      
      // Salvar no banco
      await prisma.exchangeRate.create({
        data: {
          currency: 'BRL_USD',
          rate: rate.rate,
          provider: rate.provider,
          timestamp: new Date(),
          isActive: true
        }
      });

      return rate;

    } catch (error) {
      // Usar taxa padrão em caso de erro
      return {
        currency: 'BRL_USD',
        rate: 5.5, // Taxa padrão
        provider: 'fallback',
        timestamp: new Date(),
        isActive: true
      };
    }
  }

  private async fetchExchangeRate(): Promise<ExchangeRate> {
    try {
      // Usar API de câmbio (exemplo: ExchangeRate-API)
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      
      return {
        currency: 'BRL_USD',
        rate: data.rates.BRL,
        provider: 'exchangerate-api',
        timestamp: new Date(),
        isActive: true
      };
    } catch (error) {
      throw new Error('Erro ao buscar taxa de câmbio');
    }
  }

  private startTransactionMonitoring(paymentId: string): void {
    // Monitorar transação a cada 30 segundos por 30 minutos
    const interval = setInterval(async () => {
      try {
        const payment = await prisma.usdtPayment.findUnique({
          where: { id: paymentId }
        });

        if (!payment || payment.status !== 'PENDING') {
          clearInterval(interval);
          return;
        }

        // Verificar se expirou
        if (new Date() > payment.expiresAt) {
          await this.expirePayment(paymentId);
          clearInterval(interval);
          return;
        }

        // Verificar transação na blockchain
        await this.checkTransaction(payment as USDTPayment);

      } catch (error) {
        console.error('Erro no monitoramento de transação:', error);
      }
    }, 30000); // 30 segundos

    // Parar monitoramento após 30 minutos
    setTimeout(() => {
      clearInterval(interval);
    }, 30 * 60 * 1000);
  }

  private async checkTransaction(payment: USDTPayment): Promise<void> {
    try {
      let transaction = null;

      if (payment.currency === 'USDT-TRC20') {
        transaction = await this.checkTronTransaction(payment);
      } else {
        transaction = await this.checkEthereumTransaction(payment);
      }

      if (transaction) {
        await this.updatePaymentStatus(payment.id, {
          transactionHash: transaction.hash,
          confirmations: transaction.confirmations,
          status: transaction.confirmations >= payment.requiredConfirmations ? 'CONFIRMED' : 'CONFIRMING'
        });

        // Se confirmado, ativar assinatura
        if (transaction.confirmations >= payment.requiredConfirmations) {
          await this.activateSubscription(payment.id);
        }
      }

    } catch (error) {
      console.error('Erro ao verificar transação:', error);
    }
  }

  private async checkTronTransaction(payment: USDTPayment): Promise<any> {
    try {
      const response = await fetch(
        `${this.TRON_API_URL}/v1/accounts/${payment.paymentAddress}/transactions/trc20`
      );
      const data = await response.json();

      // Procurar transação USDT para o endereço
      const transaction = data.data?.find((tx: any) => 
        tx.to === payment.paymentAddress &&
        tx.value >= payment.amount * 1000000 && // USDT tem 6 decimais
        tx.token_info?.symbol === 'USDT'
      );

      if (transaction) {
        return {
          hash: transaction.transaction_id,
          confirmations: transaction.confirmed ? 20 : 0
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao verificar transação TRON:', error);
      return null;
    }
  }

  private async checkEthereumTransaction(payment: USDTPayment): Promise<any> {
    try {
      const apiKey = process.env.ETHERSCAN_API_KEY;
      const response = await fetch(
        `${this.ETHEREUM_API_URL}?module=account&action=tokentx&contractaddress=0xdac17f958d2ee523a2206206994597c13d831ec7&address=${payment.paymentAddress}&sort=desc&apikey=${apiKey}`
      );
      const data = await response.json();

      const transaction = data.result?.find((tx: any) => 
        tx.to.toLowerCase() === payment.paymentAddress.toLowerCase() &&
        parseInt(tx.value) >= payment.amount * 1000000 // USDT tem 6 decimais
      );

      if (transaction) {
        return {
          hash: transaction.hash,
          confirmations: parseInt(transaction.confirmations)
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao verificar transação Ethereum:', error);
      return null;
    }
  }

  private async updatePaymentStatus(paymentId: string, updates: {
    transactionHash?: string;
    confirmations?: number;
    status?: string;
  }): Promise<void> {
    await prisma.usdtPayment.update({
      where: { id: paymentId },
      data: {
        ...updates,
        confirmedAt: updates.status === 'CONFIRMED' ? new Date() : undefined
      }
    });
  }

  private async activateSubscription(paymentId: string): Promise<void> {
    const payment = await prisma.usdtPayment.findUnique({
      where: { id: paymentId },
      include: { plan: true }
    });

    if (!payment) return;

    // Criar ou renovar assinatura
    const subscription = await prisma.subscription.upsert({
      where: { userId: payment.userId },
      update: {
        planId: payment.planId,
        status: 'ACTIVE',
        renewedAt: new Date(),
        expiresAt: this.calculateExpirationDate(payment.metadata.billingPeriod)
      },
      create: {
        userId: payment.userId,
        planId: payment.planId,
        status: 'ACTIVE',
        startedAt: new Date(),
        expiresAt: this.calculateExpirationDate(payment.metadata.billingPeriod)
      }
    });

    // Atualizar payment com subscription ID
    await prisma.usdtPayment.update({
      where: { id: paymentId },
      data: { subscriptionId: subscription.id }
    });

    // Enviar notificação de ativação
    await this.sendActivationNotification(payment.userId, subscription);
  }

  private calculateExpirationDate(period: 'MONTHLY' | 'ANNUAL'): Date {
    const now = new Date();
    if (period === 'MONTHLY') {
      now.setMonth(now.getMonth() + 1);
    } else {
      now.setFullYear(now.getFullYear() + 1);
    }
    return now;
  }

  private async expirePayment(paymentId: string): Promise<void> {
    await prisma.usdtPayment.update({
      where: { id: paymentId },
      data: { status: 'EXPIRED' }
    });
  }

  private startPaymentMonitoring(): void {
    // Monitorar pagamentos pendentes a cada minuto
    setInterval(async () => {
      const pendingPayments = await prisma.usdtPayment.findMany({
        where: {
          status: { in: ['PENDING', 'CONFIRMING'] },
          expiresAt: { gt: new Date() }
        }
      });

      for (const payment of pendingPayments) {
        await this.checkTransaction(payment as USDTPayment);
      }
    }, 60000); // 1 minuto
  }

  private async sendActivationNotification(userId: string, subscription: any): Promise<void> {
    // Implementar notificação por email/SMS
    console.log(`Assinatura ativada para usuário ${userId}`);
  }

  // Métodos públicos para administração

  async getPlans(): Promise<SubscriptionPlan[]> {
    return prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: { monthly: 'asc' } }
    }) as Promise<SubscriptionPlan[]>;
  }

  async getPaymentHistory(userId: string): Promise<USDTPayment[]> {
    return prisma.usdtPayment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    }) as Promise<USDTPayment[]>;
  }

  async getPaymentStats(): Promise<{
    totalPayments: number;
    confirmedPayments: number;
    totalVolume: number;
    successRate: number;
    averageAmount: number;
  }> {
    const [total, confirmed, volume] = await Promise.all([
      prisma.usdtPayment.count(),
      prisma.usdtPayment.count({ where: { status: 'CONFIRMED' } }),
      prisma.usdtPayment.aggregate({
        _sum: { amount: true },
        where: { status: 'CONFIRMED' }
      })
    ]);

    return {
      totalPayments: total,
      confirmedPayments: confirmed,
      totalVolume: volume._sum.amount || 0,
      successRate: total > 0 ? (confirmed / total) * 100 : 0,
      averageAmount: confirmed > 0 ? (volume._sum.amount || 0) / confirmed : 0
    };
  }

  async cancelPayment(paymentId: string, reason: string): Promise<void> {
    await prisma.usdtPayment.update({
      where: { id: paymentId },
      data: { 
        status: 'FAILED',
        metadata: {
          ...{}, // metadata existente
          cancellationReason: reason,
          cancelledAt: new Date().toISOString()
        }
      }
    });
  }
}

// Instância singleton
export const usdtPaymentSystem = new USDTPaymentSystem();