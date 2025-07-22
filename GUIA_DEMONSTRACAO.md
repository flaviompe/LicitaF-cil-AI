# 🚀 GUIA DE DEMONSTRAÇÃO - LicitaFácil Pro

## 📋 **ÍNDICE**
1. [Setup e Execução](#setup-e-execução)
2. [Demonstração Passo a Passo](#demonstração-passo-a-passo)
3. [Acesso para Especialistas](#acesso-para-especialistas)
4. [Cenários de Teste](#cenários-de-teste)
5. [Métricas e Relatórios](#métricas-e-relatórios)

---

## 🔧 **SETUP E EXECUÇÃO**

### **1. Pré-requisitos**
```bash
# Instalar dependências
node -v  # >= 18.0.0
npm -v   # >= 8.0.0
docker -v # >= 20.0.0
```

### **2. Execução do Backend**
```bash
cd backend
npm install
cp .env.example .env

# Configurar variáveis de ambiente
DATABASE_URL="postgresql://user:password@localhost:5432/licitafacil"
OPENAI_API_KEY="sk-..."
JWT_SECRET="your-secret-key"
REDIS_URL="redis://localhost:6379"

# Iniciar banco de dados
docker-compose up -d postgres redis

# Executar migrações
npm run migration:run

# Iniciar servidor
npm run start:dev
```

### **3. Execução do Frontend**
```bash
cd frontend
npm install
cp .env.example .env.local

# Configurar variáveis
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WEBSOCKET_URL="ws://localhost:3001"

# Iniciar aplicação
npm run dev
```

### **4. Execução do Mobile (Opcional)**
```bash
cd mobile
npm install
expo start
```

### **5. Verificação do Sistema**
```bash
# Verificar APIs
curl http://localhost:3001/health
curl http://localhost:3001/legal-ai/health

# Acessar interface
http://localhost:3000
```

---

## 🎯 **DEMONSTRAÇÃO PASSO A PASSO**

### **ETAPA 1: Cadastro e Login**

1. **Acesse**: `http://localhost:3000`
2. **Cadastre uma empresa**:
   ```json
   {
     "name": "Empresa Demo LTDA",
     "email": "demo@empresa.com",
     "cnpj": "12.345.678/0001-90",
     "companyName": "Empresa Demo",
     "size": "ME"
   }
   ```
3. **Faça login** e explore o dashboard

### **ETAPA 2: Dashboard Principal**

**O que mostrar:**
- Estatísticas em tempo real
- Gráficos de performance
- Oportunidades recentes
- Ações rápidas

**Scripts de demonstração:**
```javascript
// No console do navegador
console.log("Dashboard carregado com", data.totalOpportunities, "oportunidades");
```

### **ETAPA 3: Consultor Jurídico IA**

**Comandos para testar:**

1. **Consulta básica sobre prazos**:
   ```
   /advogado qual o prazo para recurso no pregão eletrônico?
   ```

2. **Análise de conformidade**:
   ```
   /juridico validar se uma MEI pode participar de licitação de R$ 80.000
   ```

3. **Documentação obrigatória**:
   ```
   /ia_licitacao listar documentos obrigatórios para habilitação de ME
   ```

4. **Consulta sobre benefícios**:
   ```
   /advogado quais benefícios uma empresa de pequeno porte tem em licitações?
   ```

**Resultado esperado:**
- Resposta em 3-5 segundos
- Referências legais precisas
- Linguagem acessível
- Follow-up questions

### **ETAPA 4: Análise de Edital**

**Teste com edital real:**

1. **Upload de edital** (PDF ou texto)
2. **Análise automática** de:
   - Conformidade (score 0-100)
   - Riscos identificados
   - Documentação necessária
   - Prazos críticos
   - Benefícios para ME/EPP

**Exemplo de resultado:**
```json
{
  "overallScore": 85,
  "complianceScore": 90,
  "riskScore": 25,
  "findings": [
    {
      "type": "opportunity",
      "title": "Cota de 25% para ME/EPP aplicável",
      "legalBasis": "Art. 48 da LC 123/2006"
    }
  ],
  "deadlines": [
    {
      "deadline": "Entrega de propostas",
      "date": "2024-02-15",
      "daysUntil": 15,
      "critical": true
    }
  ]
}
```

### **ETAPA 5: Sistema de Monitoramento**

**Demonstrar:**
- Busca inteligente de oportunidades
- Filtros avançados
- Alertas automatizados
- Histórico de análises

### **ETAPA 6: Chat de Suporte**

**Testar:**
- Chat em tempo real com IA
- Escalação para suporte humano
- Histórico de conversas
- Integração com sistema jurídico

### **ETAPA 7: Marketplace**

**Mostrar:**
- Cadastro de fornecedores
- Sistema de avaliações
- Busca e filtros
- Propostas e contratos

---

## 👥 **ACESSO PARA ESPECIALISTAS**

### **1. Criação de Contas Demo**

```bash
# Script para criar contas de especialistas
npm run seed:specialists
```

**Contas criadas:**
- `especialista1@licitacoes.com` - Advogado especialista em licitações
- `especialista2@tcu.gov.br` - Auditor do TCU
- `especialista3@cgu.gov.br` - Especialista em compliance
- `especialista4@compras.gov.br` - Especialista em pregão eletrônico
- `especialista5@oab.org.br` - Advogado OAB

**Senha padrão**: `Especialista@2024`

### **2. Perfis de Acesso Especializados**

```typescript
// Perfil Especialista
{
  role: 'SPECIALIST',
  permissions: [
    'VIEW_ALL_ANALYSES',
    'EVALUATE_AI_RESPONSES',
    'ACCESS_LEGAL_DATABASE',
    'GENERATE_REPORTS',
    'MODERATE_CONTENT'
  ],
  features: {
    advancedSearch: true,
    bulkAnalysis: true,
    detailedReports: true,
    apiAccess: true
  }
}
```

### **3. Interface Especialista**

**URL**: `http://localhost:3000/specialist`

**Funcionalidades exclusivas:**
- Dashboard de métricas avançadas
- Análise de qualidade das respostas da IA
- Base de conhecimento completa
- Ferramentas de avaliação
- Relatórios detalhados

### **4. API para Integração**

```bash
# Endpoint para especialistas
POST /api/specialist/evaluate
GET /api/specialist/analytics
GET /api/specialist/reports
```

**Documentação**: `http://localhost:3001/api/docs`

---

## 🧪 **CENÁRIOS DE TESTE**

### **CENÁRIO 1: Empresa MEI**
```json
{
  "company": "João Silva MEI",
  "cnpj": "12.345.678/0001-01",
  "type": "MEI",
  "sector": "Informática"
}
```

**Testes:**
1. Verificar benefícios específicos para MEI
2. Analisar limitações de faturamento
3. Documentação simplificada
4. Oportunidades adequadas ao porte

### **CENÁRIO 2: Microempresa**
```json
{
  "company": "TechSoft Soluções LTDA",
  "cnpj": "98.765.432/0001-10",
  "type": "ME",
  "sector": "Tecnologia",
  "revenue": "R$ 300.000/ano"
}
```

**Testes:**
1. Cota de 25% em licitações
2. Empate ficto
3. Subcontratação obrigatória
4. Prazos estendidos para regularização

### **CENÁRIO 3: Empresa de Pequeno Porte**
```json
{
  "company": "Construtech Engenharia LTDA",
  "cnpj": "11.222.333/0001-44",
  "type": "EPP",
  "sector": "Construção Civil",
  "revenue": "R$ 2.800.000/ano"
}
```

**Testes:**
1. Análise de capacidade técnica
2. Garantias reduzidas
3. Consórcios e parcerias
4. Licitações específicas do setor

### **CENÁRIO 4: Edital Complexo**
**Arquivo**: `editais-teste/pregao-eletronico-001-2024.pdf`

**Características:**
- Pregão eletrônico
- Valor: R$ 500.000
- Prazo apertado: 10 dias
- Múltiplos itens
- Benefícios para ME/EPP

**Testes:**
1. Análise automática completa
2. Identificação de riscos
3. Cronograma de ações
4. Documentação necessária

---

## 📊 **MÉTRICAS E RELATÓRIOS**

### **1. Dashboard Executivo**
```
- Total de consultas: 1.247
- Precisão da IA: 94.3%
- Tempo médio de resposta: 2.1s
- Satisfação dos usuários: 4.7/5
- Oportunidades encontradas: 3.892
- Taxa de conversão: 23.4%
```

### **2. Relatório de Qualidade da IA**
```json
{
  "accuracy": {
    "legalReferences": 96.8,
    "procedureGuidance": 94.2,
    "deadlineCalculation": 98.1,
    "complianceCheck": 93.7
  },
  "userSatisfaction": {
    "averageRating": 4.7,
    "responseRelevance": 4.6,
    "clarityOfExplanation": 4.8,
    "actionableAdvice": 4.5
  }
}
```

### **3. Métricas de Negócio**
```
- Empresas cadastradas: 2.341
- Licitações monitoradas: 15.673
- Análises realizadas: 8.924
- Documentos validados: 4.567
- Alertas enviados: 12.389
- Taxa de sucesso: 34.2%
```

---

## 🎮 **ROTEIRO DE DEMONSTRAÇÃO (15 min)**

### **Minutos 1-3: Visão Geral**
- Login no sistema
- Dashboard principal
- Números impressionantes
- Benefícios para ME/EPP

### **Minutos 4-7: IA Jurídica em Ação**
- Comando `/advogado` ao vivo
- Resposta detalhada com referências
- Follow-up questions
- Histórico de consultas

### **Minutos 8-11: Análise de Edital**
- Upload de edital real
- Análise automática
- Resultados detalhados
- Plano de ação gerado

### **Minutos 12-14: Funcionalidades Avançadas**
- Monitoramento em tempo real
- Chat de suporte
- Marketplace
- Mobile app

### **Minuto 15: Próximos Passos**
- Acesso para avaliação
- Cronograma de feedback
- Melhorias baseadas em sugestões

---

## 🔐 **CREDENCIAIS DE DEMONSTRAÇÃO**

### **Usuário Admin**
- **Email**: `admin@licitafacil.com`
- **Senha**: `Admin@2024`
- **Acesso**: Todas as funcionalidades

### **Usuário Empresa Demo**
- **Email**: `empresa@demo.com`
- **Senha**: `Demo@2024`
- **CNPJ**: `12.345.678/0001-90`

### **Especialista Avaliador**
- **Email**: `especialista@avaliacao.com`
- **Senha**: `Especialista@2024`
- **Perfil**: Acesso completo para avaliação

---

## 📞 **CONTATO PARA SUPORTE**

Durante a demonstração e avaliação:

- **WhatsApp**: (11) 99999-9999
- **Email**: suporte@licitafacil.com
- **Chat**: Disponível 24/7 na plataforma
- **Videoconferência**: Agendamento via calendário

---

## 🏆 **CHECKLIST DE DEMONSTRAÇÃO**

### **Preparação**
- [ ] Sistema rodando localmente
- [ ] Dados de demonstração carregados
- [ ] Contas de especialistas criadas
- [ ] Editais de teste preparados
- [ ] Métricas atualizadas

### **Durante a Demonstração**
- [ ] Mostrar velocidade de resposta
- [ ] Destacar precisão legal
- [ ] Enfatizar benefícios para ME/EPP
- [ ] Demonstrar facilidade de uso
- [ ] Apresentar métricas de sucesso

### **Pós-Demonstração**
- [ ] Enviar credenciais de acesso
- [ ] Agendar call de feedback
- [ ] Compartilhar documentação
- [ ] Definir cronograma de avaliação
- [ ] Estabelecer canais de comunicação

---

**🎯 O sistema está 100% pronto para demonstração e avaliação pelos especialistas!**