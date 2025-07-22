// Sistema de integração com ERP, CRM e Contabilidade
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ERPIntegration {
  id: string;
  companyId: string;
  type: 'SAP' | 'TOTVS' | 'SANKHYA' | 'SENIOR' | 'OMIE' | 'CONTMATIC' | 'ALTERDATA' | 'CUSTOM';
  name: string;
  apiUrl: string;
  credentials: EncryptedCredentials;
  isActive: boolean;
  lastSync: Date;
  syncConfig: SyncConfiguration;
}

export interface EncryptedCredentials {
  username?: string;
  password?: string; // Criptografado
  apiKey?: string;   // Criptografado
  token?: string;    // Criptografado
  additionalFields?: Record<string, string>;
}

export interface SyncConfiguration {
  autoSync: boolean;
  syncInterval: number; // em minutos
  syncEntities: SyncEntity[];
  businessRules: BusinessRule[];
}

export interface SyncEntity {
  name: 'CUSTOMERS' | 'SUPPLIERS' | 'PRODUCTS' | 'INVOICES' | 'CONTRACTS' | 'FINANCIAL';
  direction: 'IMPORT' | 'EXPORT' | 'BIDIRECTIONAL';
  mapping: FieldMapping[];
  filters?: Record<string, any>;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: 'UPPERCASE' | 'LOWERCASE' | 'DATE_FORMAT' | 'CURRENCY' | 'CUSTOM';
  customTransform?: string; // Função JavaScript personalizada
}

export interface BusinessRule {
  name: string;
  condition: string;
  action: 'SYNC' | 'SKIP' | 'ALERT' | 'TRANSFORM';
  parameters?: Record<string, any>;
}

export interface SyncResult {
  success: boolean;
  entitiesSynced: number;
  errors: SyncError[];
  warnings: string[];
  timestamp: Date;
  duration: number; // em milliseconds
}

export interface SyncError {
  entity: string;
  entityId?: string;
  error: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class ERPIntegrationManager {
  
  async setupIntegration(integrationData: Omit<ERPIntegration, 'id' | 'lastSync'>): Promise<ERPIntegration> {
    try {
      // Criptografar credenciais
      const encryptedCredentials = await this.encryptCredentials(integrationData.credentials);
      
      // Testar conexão
      const connectionTest = await this.testConnection(integrationData.type, integrationData.apiUrl, encryptedCredentials);
      
      if (!connectionTest.success) {
        throw new Error(`Falha na conexão: ${connectionTest.error}`);
      }

      const integration = await prisma.erpIntegration.create({
        data: {
          ...integrationData,
          credentials: encryptedCredentials,
          lastSync: new Date()
        }
      });

      return integration as ERPIntegration;
    } catch (error) {
      console.error('Erro ao configurar integração ERP:', error);
      throw new Error('Falha na configuração da integração');
    }
  }

  async syncData(integrationId: string, entities?: string[]): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      entitiesSynced: 0,
      errors: [],
      warnings: [],
      timestamp: new Date(),
      duration: 0
    };

    try {
      const integration = await prisma.erpIntegration.findUnique({
        where: { id: integrationId }
      }) as ERPIntegration;

      if (!integration || !integration.isActive) {
        throw new Error('Integração não encontrada ou inativa');
      }

      const entitiesToSync = entities || integration.syncConfig.syncEntities.map(e => e.name);
      
      for (const entityName of entitiesToSync) {
        try {
          const entityConfig = integration.syncConfig.syncEntities.find(e => e.name === entityName);
          if (!entityConfig) continue;

          await this.syncEntity(integration, entityConfig, result);
          result.entitiesSynced++;
          
        } catch (error) {
          result.errors.push({
            entity: entityName,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            severity: 'HIGH'
          });
          result.success = false;
        }
      }

      // Atualizar timestamp da última sincronização
      await prisma.erpIntegration.update({
        where: { id: integrationId },
        data: { lastSync: new Date() }
      });

    } catch (error) {
      result.success = false;
      result.errors.push({
        entity: 'SYSTEM',
        error: error instanceof Error ? error.message : 'Erro de sistema',
        severity: 'HIGH'
      });
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async syncEntity(integration: ERPIntegration, entityConfig: SyncEntity, result: SyncResult): Promise<void> {
    switch (entityConfig.name) {
      case 'CUSTOMERS':
        await this.syncCustomers(integration, entityConfig, result);
        break;
      case 'SUPPLIERS':
        await this.syncSuppliers(integration, entityConfig, result);
        break;
      case 'PRODUCTS':
        await this.syncProducts(integration, entityConfig, result);
        break;
      case 'INVOICES':
        await this.syncInvoices(integration, entityConfig, result);
        break;
      case 'CONTRACTS':
        await this.syncContracts(integration, entityConfig, result);
        break;
      case 'FINANCIAL':
        await this.syncFinancial(integration, entityConfig, result);
        break;
    }
  }

  private async syncCustomers(integration: ERPIntegration, config: SyncEntity, result: SyncResult): Promise<void> {
    try {
      const erpData = await this.fetchERPData(integration, 'customers', config.filters);
      
      for (const customer of erpData) {
        const mappedData = this.applyFieldMapping(customer, config.mapping);
        
        // Aplicar regras de negócio
        const shouldSync = await this.evaluateBusinessRules(mappedData, integration.syncConfig.businessRules);
        
        if (shouldSync) {
          await this.upsertCustomer(mappedData);
        }
      }
    } catch (error) {
      throw new Error(`Erro na sincronização de clientes: ${error}`);
    }
  }

  private async syncSuppliers(integration: ERPIntegration, config: SyncEntity, result: SyncResult): Promise<void> {
    // Sincronização de fornecedores - lógica similar aos clientes
    const erpData = await this.fetchERPData(integration, 'suppliers', config.filters);
    
    for (const supplier of erpData) {
      const mappedData = this.applyFieldMapping(supplier, config.mapping);
      await this.upsertSupplier(mappedData);
    }
  }

  private async syncProducts(integration: ERPIntegration, config: SyncEntity, result: SyncResult): Promise<void> {
    // Sincronização de produtos/serviços
    const erpData = await this.fetchERPData(integration, 'products', config.filters);
    
    for (const product of erpData) {
      const mappedData = this.applyFieldMapping(product, config.mapping);
      await this.upsertProduct(mappedData);
    }
  }

  private async syncInvoices(integration: ERPIntegration, config: SyncEntity, result: SyncResult): Promise<void> {
    // Sincronização de notas fiscais
    if (config.direction === 'EXPORT' || config.direction === 'BIDIRECTIONAL') {
      // Exportar contratos vencidos como NF para ERP
      const contractsToInvoice = await this.getContractsToInvoice();
      
      for (const contract of contractsToInvoice) {
        const invoiceData = this.convertContractToInvoice(contract);
        await this.sendToERP(integration, 'invoices', invoiceData);
      }
    }
  }

  private async syncContracts(integration: ERPIntegration, config: SyncEntity, result: SyncResult): Promise<void> {
    // Sincronização de contratos
    if (config.direction === 'EXPORT' || config.direction === 'BIDIRECTIONAL') {
      const activeContracts = await this.getActiveContracts();
      
      for (const contract of activeContracts) {
        const mappedData = this.applyFieldMapping(contract, config.mapping);
        await this.sendToERP(integration, 'contracts', mappedData);
      }
    }
  }

  private async syncFinancial(integration: ERPIntegration, config: SyncEntity, result: SyncResult): Promise<void> {
    // Sincronização financeira
    const payments = await this.getContractPayments();
    const receivables = await this.getAccountsReceivable();
    
    for (const payment of payments) {
      const mappedData = this.applyFieldMapping(payment, config.mapping);
      await this.sendToERP(integration, 'financial/payments', mappedData);
    }
  }

  private async fetchERPData(integration: ERPIntegration, endpoint: string, filters?: any): Promise<any[]> {
    try {
      const credentials = await this.decryptCredentials(integration.credentials);
      
      const response = await axios.get(`${integration.apiUrl}/${endpoint}`, {
        params: filters,
        headers: await this.buildAuthHeaders(integration.type, credentials),
        timeout: 30000
      });

      return response.data.data || response.data || [];
    } catch (error) {
      throw new Error(`Erro ao buscar dados do ERP: ${error}`);
    }
  }

  private async sendToERP(integration: ERPIntegration, endpoint: string, data: any): Promise<void> {
    try {
      const credentials = await this.decryptCredentials(integration.credentials);
      
      await axios.post(`${integration.apiUrl}/${endpoint}`, data, {
        headers: await this.buildAuthHeaders(integration.type, credentials),
        timeout: 30000
      });
    } catch (error) {
      throw new Error(`Erro ao enviar dados para ERP: ${error}`);
    }
  }

  private applyFieldMapping(data: any, mappings: FieldMapping[]): any {
    const result: any = {};
    
    for (const mapping of mappings) {
      let value = this.getNestedValue(data, mapping.sourceField);
      
      // Aplicar transformações
      if (mapping.transformation && value !== null && value !== undefined) {
        value = this.applyTransformation(value, mapping.transformation, mapping.customTransform);
      }
      
      this.setNestedValue(result, mapping.targetField, value);
    }
    
    return result;
  }

  private applyTransformation(value: any, transformation: string, customTransform?: string): any {
    switch (transformation) {
      case 'UPPERCASE':
        return String(value).toUpperCase();
      case 'LOWERCASE':
        return String(value).toLowerCase();
      case 'DATE_FORMAT':
        return new Date(value).toISOString();
      case 'CURRENCY':
        return parseFloat(String(value).replace(/[^\d.,]/g, '').replace(',', '.'));
      case 'CUSTOM':
        if (customTransform) {
          try {
            const func = new Function('value', customTransform);
            return func(value);
          } catch (error) {
            console.warn('Erro na transformação customizada:', error);
            return value;
          }
        }
        return value;
      default:
        return value;
    }
  }

  private async evaluateBusinessRules(data: any, rules: BusinessRule[]): Promise<boolean> {
    for (const rule of rules) {
      try {
        const condition = new Function('data', `return ${rule.condition}`);
        const result = condition(data);
        
        if (result && rule.action === 'SKIP') {
          return false;
        }
      } catch (error) {
        console.warn(`Erro ao avaliar regra de negócio ${rule.name}:`, error);
      }
    }
    
    return true;
  }

  private async buildAuthHeaders(type: string, credentials: any): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    switch (type) {
      case 'SAP':
        headers['Authorization'] = `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`;
        break;
      case 'TOTVS':
        headers['Authorization'] = `Bearer ${credentials.token}`;
        break;
      case 'OMIE':
        headers['Authorization'] = `Bearer ${credentials.apiKey}`;
        break;
      default:
        if (credentials.apiKey) {
          headers['Authorization'] = `Bearer ${credentials.apiKey}`;
        }
    }

    return headers;
  }

  private async testConnection(type: string, apiUrl: string, credentials: any): Promise<{success: boolean, error?: string}> {
    try {
      const headers = await this.buildAuthHeaders(type, credentials);
      const response = await axios.get(`${apiUrl}/health`, { headers, timeout: 10000 });
      
      return { success: response.status === 200 };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro na conexão' 
      };
    }
  }

  private async encryptCredentials(credentials: EncryptedCredentials): Promise<EncryptedCredentials> {
    // Implementação simplificada - em produção usaria crypto real
    return {
      ...credentials,
      password: credentials.password ? Buffer.from(credentials.password).toString('base64') : undefined,
      apiKey: credentials.apiKey ? Buffer.from(credentials.apiKey).toString('base64') : undefined,
      token: credentials.token ? Buffer.from(credentials.token).toString('base64') : undefined
    };
  }

  private async decryptCredentials(credentials: EncryptedCredentials): Promise<any> {
    // Implementação simplificada - em produção usaria crypto real
    return {
      ...credentials,
      password: credentials.password ? Buffer.from(credentials.password, 'base64').toString() : undefined,
      apiKey: credentials.apiKey ? Buffer.from(credentials.apiKey, 'base64').toString() : undefined,
      token: credentials.token ? Buffer.from(credentials.token, 'base64').toString() : undefined
    };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  // Métodos auxiliares para buscar dados do sistema
  private async upsertCustomer(data: any): Promise<void> {
    // Implementar upsert de cliente
  }

  private async upsertSupplier(data: any): Promise<void> {
    // Implementar upsert de fornecedor
  }

  private async upsertProduct(data: any): Promise<void> {
    // Implementar upsert de produto
  }

  private async getContractsToInvoice(): Promise<any[]> {
    return prisma.contract.findMany({
      where: {
        status: 'ACTIVE',
        nextInvoiceDate: {
          lte: new Date()
        }
      }
    });
  }

  private async getActiveContracts(): Promise<any[]> {
    return prisma.contract.findMany({
      where: { status: 'ACTIVE' }
    });
  }

  private async getContractPayments(): Promise<any[]> {
    return prisma.contractPayment.findMany({
      where: {
        status: 'PENDING'
      }
    });
  }

  private async getAccountsReceivable(): Promise<any[]> {
    return prisma.accountReceivable.findMany({
      where: {
        status: 'PENDING'
      }
    });
  }

  private convertContractToInvoice(contract: any): any {
    return {
      contractId: contract.id,
      amount: contract.monthlyValue,
      dueDate: contract.nextInvoiceDate,
      description: `Faturamento contrato ${contract.number}`,
      items: contract.items || []
    };
  }

  // Webhook handler para receber dados dos ERPs
  async handleWebhook(integrationId: string, event: string, data: any): Promise<void> {
    const integration = await prisma.erpIntegration.findUnique({
      where: { id: integrationId }
    });

    if (!integration) return;

    switch (event) {
      case 'customer.created':
      case 'customer.updated':
        await this.handleCustomerUpdate(data);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(data);
        break;
      // Outros eventos...
    }
  }

  private async handleCustomerUpdate(data: any): Promise<void> {
    // Processar atualização de cliente vinda do ERP
  }

  private async handleInvoicePaid(data: any): Promise<void> {
    // Processar pagamento de fatura
  }
}

// Instância singleton
export const erpIntegrationManager = new ERPIntegrationManager();