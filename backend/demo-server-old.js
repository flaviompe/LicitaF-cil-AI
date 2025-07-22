const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Carregar dados demo
const users = JSON.parse(fs.readFileSync('./data/demo-users.json', 'utf8'));
const opportunities = JSON.parse(fs.readFileSync('./data/demo-opportunities.json', 'utf8'));
const queries = JSON.parse(fs.readFileSync('./data/demo-queries.json', 'utf8'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'LicitaFácil Pro Demo Server' });
});

// Auth endpoints
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  
  if (user) {
    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        token: 'demo-jwt-token-' + user.id
      }
    });
  } else {
    res.status(401).json({ success: false, message: 'Credenciais inválidas' });
  }
});

// Legal AI endpoints
app.post('/legal-ai/query', (req, res) => {
  const { queryText } = req.body;
  
  // Simular processamento
  setTimeout(() => {
    let response = "Esta é uma resposta simulada da IA jurídica. ";
    
    if (queryText.toLowerCase().includes('prazo')) {
      response = "Conforme a legislação brasileira, os prazos em licitações são: Pregão eletrônico - 3 dias úteis para recursos (art. 44, Lei 10.520/2002); Concorrência - 5 dias úteis (art. 109, Lei 14.133/2021). Para ME/EPP, há prazos estendidos para regularização fiscal conforme LC 123/2006.";
    } else if (queryText.toLowerCase().includes('mei') || queryText.toLowerCase().includes('microempresa')) {
      response = "MEI e ME/EPP têm tratamento diferenciado em licitações: cota de até 25% do objeto (art. 48, LC 123/2006), empate ficto até 10% superior, prazo de 5 dias úteis para regularização após habilitação, e subcontratação obrigatória de 30% para empresas de grande porte.";
    } else if (queryText.toLowerCase().includes('documento')) {
      response = "Documentos obrigatórios para habilitação: 1) Habilitação jurídica - ato constitutivo, CNPJ; 2) Regularidade fiscal - CND Federal, Estadual, Municipal, FGTS, Trabalhista; 3) Qualificação econômico-financeira - balanço, certidão negativa falência; 4) Qualificação técnica - atestados, registro profissional quando exigido.";
    }
    
    res.json({
      success: true,
      data: {
        id: 'query-' + Date.now(),
        queryText,
        responseText: response,
        confidenceScore: 0.94,
        legalReferences: [
          {
            documentNumber: "14.133/2021",
            title: "Lei Geral de Licitações",
            relevance: 0.95
          }
        ],
        followUpQuestions: [
          "Gostaria de mais detalhes sobre prazos específicos?",
          "Precisa de orientação sobre documentação?",
          "Quer saber sobre benefícios para ME/EPP?"
        ]
      }
    });
  }, 2000); // Simular 2 segundos de processamento
});

// Commands endpoints
app.post('/legal-ai/commands/:command', (req, res) => {
  const { command } = req.params;
  const { args } = req.body;
  
  let response = `Comando /${command} processado: ${args}`;
  
  res.json({
    success: true,
    data: {
      command,
      args,
      response,
      timestamp: new Date().toISOString()
    }
  });
});

// Opportunities endpoints
app.get('/opportunities', (req, res) => {
  res.json({
    success: true,
    data: opportunities,
    total: opportunities.length
  });
});

// Queries history
app.get('/legal-ai/queries', (req, res) => {
  res.json({
    success: true,
    data: queries
  });
});

// Statistics
app.get('/legal-ai/statistics', (req, res) => {
  res.json({
    success: true,
    data: {
      total: 1247,
      accuracy: 94.3,
      avgResponseTime: 2.1,
      userSatisfaction: 4.7,
      totalOpportunities: 3892,
      conversionRate: 23.4
    }
  });
});

// Health check for legal AI
app.get('/legal-ai/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      pendingQueries: 0,
      pendingAnalyses: 0,
      timestamp: new Date().toISOString()
    }
  });
});

// Catch all
app.get('*', (req, res) => {
  res.json({ 
    message: 'LicitaFácil Pro Demo API',
    endpoint: req.path,
    method: req.method,
    docs: 'http://localhost:3001/docs'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 LicitaFácil Pro Demo Server rodando em http://localhost:${PORT}`);
  console.log(`📚 Teste: curl http://localhost:${PORT}/health`);
  console.log(`⚖️ Legal AI: curl -X POST http://localhost:${PORT}/legal-ai/query -H "Content-Type: application/json" -d '{"queryText":"teste"}'`);
});
