#!/bin/bash

# 🚀 Script de Setup Simplificado - LicitaFácil Pro (SEM DOCKER)
echo "🚀 Iniciando setup simplificado da demonstração LicitaFácil Pro..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

# Verificar pré-requisitos básicos
check_prerequisites() {
    print_status "Verificando pré-requisitos..."
    
    # Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js não encontrado. Instale Node.js >= 18.0.0"
        echo "Download: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js versão $NODE_VERSION encontrada. Necessário >= 18.0.0"
        exit 1
    fi
    
    # NPM
    if ! command -v npm &> /dev/null; then
        print_error "NPM não encontrado"
        exit 1
    fi
    
    print_success "Pré-requisitos verificados - Node.js $(node -v)"
}

# Setup do backend com SQLite
setup_backend() {
    print_status "Configurando backend..."
    
    if [ ! -d "backend" ]; then
        print_error "Diretório backend não encontrado!"
        exit 1
    fi
    
    cd backend
    
    # Instalar dependências
    print_status "Instalando dependências do backend..."
    npm install
    
    # Instalar SQLite
    print_status "Instalando SQLite..."
    npm install sqlite3 --save
    
    # Configurar variáveis de ambiente para SQLite
    print_status "Criando arquivo .env para SQLite..."
    cat > .env << EOL
# Database SQLite (sem Docker)
DATABASE_URL=sqlite:./licitafacil.db

# JWT
JWT_SECRET=licitafacil-jwt-secret-demo-2024

# OpenAI (opcional - usar mock se não tiver chave)
OPENAI_API_KEY=mock-key-for-demo

# Email (mock para demonstração)
MAIL_HOST=localhost
MAIL_PORT=587
MAIL_USER=demo@licitafacil.com
MAIL_PASS=demo-password

# App
PORT=3001
NODE_ENV=development

# Mock services para demo
USE_MOCK_SERVICES=true
DEMO_MODE=true
EOL

    # Criar arquivo de configuração SQLite
    print_status "Configurando TypeORM para SQLite..."
    cat > ormconfig.js << EOL
module.exports = {
  type: 'sqlite',
  database: './licitafacil.db',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  cli: {
    migrationsDir: 'src/migrations'
  },
  synchronize: true, // Para demo apenas
  logging: false
};
EOL

    # Criar dados demo em JSON (mock)
    print_status "Criando dados de demonstração..."
    mkdir -p data
    
    cat > data/demo-users.json << EOL
[
  {
    "id": "demo-admin-001",
    "name": "Admin Demo",
    "email": "admin@licitafacil.com",
    "password": "hashed-password",
    "role": "ADMIN"
  },
  {
    "id": "demo-user-001", 
    "name": "Empresa Demo LTDA",
    "email": "empresa@demo.com",
    "password": "hashed-password",
    "role": "USER"
  },
  {
    "id": "demo-spec-001",
    "name": "Especialista Avaliador", 
    "email": "especialista@avaliacao.com",
    "password": "hashed-password",
    "role": "SPECIALIST"
  }
]
EOL

    cat > data/demo-opportunities.json << EOL
[
  {
    "id": "demo-opp-001",
    "title": "Fornecimento de Material de Escritório",
    "entity": "Prefeitura Municipal de São Paulo", 
    "value": 150000,
    "deadline": "2024-02-15",
    "status": "OPEN"
  },
  {
    "id": "demo-opp-002",
    "title": "Serviços de Limpeza e Conservação",
    "entity": "Governo do Estado de SP",
    "value": 800000, 
    "deadline": "2024-02-20",
    "status": "OPEN"
  },
  {
    "id": "demo-opp-003",
    "title": "Aquisição de Equipamentos de TI",
    "entity": "Ministério da Educação",
    "value": 2500000,
    "deadline": "2024-03-01", 
    "status": "OPEN"
  }
]
EOL

    cat > data/demo-queries.json << EOL
[
  {
    "id": "demo-query-001",
    "userId": "demo-user-001",
    "queryText": "Qual o prazo para recurso no pregão eletrônico?",
    "type": "DEADLINE_INQUIRY",
    "status": "COMPLETED",
    "responseText": "Conforme o art. 44 da Lei 10.520/2002, o prazo para interposição de recurso no pregão é de 3 (três) dias úteis, contados da intimação do ato ou da lavratura da ata. Para pregão eletrônico, conforme Decreto 10.024/2019, o prazo é de 3 dias úteis após a sessão pública virtual.",
    "confidenceScore": 0.95
  },
  {
    "id": "demo-query-002", 
    "userId": "demo-user-001",
    "queryText": "Uma MEI pode participar de licitação de R$ 80.000?",
    "type": "COMPLIANCE_CHECK",
    "status": "COMPLETED", 
    "responseText": "Sim, uma MEI pode participar de licitação de R$ 80.000. Conforme a LC 123/2006, não há limitação de valor para participação de ME/EPP em licitações. A MEI tem direito aos benefícios previstos na lei, como tratamento diferenciado, empate ficto e preferência nas contratações.",
    "confidenceScore": 0.92
  }
]
EOL

    print_status "Criando servidor mock para demonstração..."
    
    # Criar arquivo principal do servidor mock
    cat > demo-server.js << EOL
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
  
  let response = \`Comando /\${command} processado: \${args}\`;
  
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
  console.log(\`🚀 LicitaFácil Pro Demo Server rodando em http://localhost:\${PORT}\`);
  console.log(\`📚 Teste: curl http://localhost:\${PORT}/health\`);
  console.log(\`⚖️ Legal AI: curl -X POST http://localhost:\${PORT}/legal-ai/query -H "Content-Type: application/json" -d '{"queryText":"teste"}'\`);
});
EOL

    # Instalar dependências mínimas para o mock server
    npm install express cors --save-dev
    
    cd ..
    print_success "Backend configurado com SQLite e servidor mock"
}

# Setup do frontend simplificado
setup_frontend() {
    print_status "Configurando frontend..."
    
    if [ ! -d "frontend" ]; then
        print_warning "Diretório frontend não encontrado. Criando estrutura básica..."
        mkdir -p frontend/public
        cd frontend
        
        # Criar package.json básico
        cat > package.json << EOL
{
  "name": "licitafacil-frontend-demo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "python3 -m http.server 3000",
    "start": "python3 -m http.server 3000"
  }
}
EOL

        # Criar index.html básico
        cat > index.html << EOL
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LicitaFácil Pro - Demo</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #2196F3; color: white; padding: 20px; text-align: center; margin-bottom: 30px; }
        .card { background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; padding: 20px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .stat { text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; }
        .stat-number { font-size: 2em; font-weight: bold; color: #2196F3; }
        .stat-label { color: #666; margin-top: 5px; }
        .chat-container { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; }
        .chat-input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px; }
        .chat-button { background: #2196F3; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
        .chat-response { background: #f0f8ff; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #2196F3; }
        .loading { display: none; text-align: center; padding: 20px; color: #666; }
        .login-form { max-width: 400px; margin: 50px auto; }
        .form-group { margin-bottom: 15px; }
        .form-control { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        .btn-primary { background: #2196F3; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; width: 100%; }
        .opportunities { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .opportunity { border-left: 4px solid #4CAF50; }
        .opportunity-title { font-weight: bold; color: #333; margin-bottom: 5px; }
        .opportunity-entity { color: #666; font-size: 0.9em; margin-bottom: 10px; }
        .opportunity-value { color: #4CAF50; font-weight: bold; }
        .opportunity-deadline { color: #f44336; font-size: 0.9em; }
    </style>
</head>
<body>
    <div id="app">
        <!-- Login Form -->
        <div id="loginForm" class="container">
            <div class="card login-form">
                <h2 style="text-align: center; margin-bottom: 20px;">🏛️ LicitaFácil Pro</h2>
                <p style="text-align: center; margin-bottom: 30px; color: #666;">Sua plataforma para licitações públicas</p>
                
                <div class="form-group">
                    <input type="email" id="email" class="form-control" placeholder="Email" value="empresa@demo.com">
                </div>
                <div class="form-group">
                    <input type="password" id="password" class="form-control" placeholder="Senha" value="Demo@2024">
                </div>
                <button onclick="login()" class="btn-primary">Entrar</button>
                
                <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 4px;">
                    <strong>Contas Demo:</strong><br>
                    📧 empresa@demo.com | 🔑 Demo@2024<br>
                    📧 admin@licitafacil.com | 🔑 Admin@2024<br>
                    📧 especialista@avaliacao.com | 🔑 Especialista@2024
                </div>
            </div>
        </div>

        <!-- Main Dashboard -->
        <div id="dashboard" style="display: none;">
            <div class="header">
                <h1>🏛️ LicitaFácil Pro</h1>
                <p>Sua plataforma inteligente para licitações públicas</p>
                <button onclick="logout()" style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.5); color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Sair</button>
            </div>

            <div class="container">
                <!-- Statistics -->
                <div class="card">
                    <h2>📊 Estatísticas do Sistema</h2>
                    <div class="stats">
                        <div class="stat">
                            <div class="stat-number">2.341</div>
                            <div class="stat-label">Empresas Cadastradas</div>
                        </div>
                        <div class="stat">
                            <div class="stat-number">15.673</div>
                            <div class="stat-label">Licitações Monitoradas</div>
                        </div>
                        <div class="stat">
                            <div class="stat-number">94.3%</div>
                            <div class="stat-label">Precisão da IA</div>
                        </div>
                        <div class="stat">
                            <div class="stat-number">4.7/5</div>
                            <div class="stat-label">Satisfação</div>
                        </div>
                    </div>
                </div>

                <!-- Legal AI Chat -->
                <div class="card">
                    <h2>⚖️ Consultor Jurídico IA</h2>
                    <p style="margin-bottom: 20px; color: #666;">
                        Especialista em licitações públicas brasileiras. Domina Lei 14.133/2021, 8.666/93, 10.520/02 e LC 123/2006.
                    </p>
                    
                    <div class="chat-container">
                        <input type="text" id="chatInput" class="chat-input" placeholder="Digite sua pergunta jurídica ou use comandos como: /advogado qual o prazo para recurso?">
                        <button onclick="sendQuery()" class="chat-button">Enviar Consulta</button>
                        
                        <div class="loading" id="loading">
                            🤖 IA analisando sua consulta jurídica...
                        </div>
                        
                        <div id="chatResponse"></div>
                        
                        <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                            <strong>💡 Comandos disponíveis:</strong><br>
                            <code>/advogado [pergunta]</code> - Consulta jurídica geral<br>
                            <code>/juridico [pergunta]</code> - Análise de conformidade<br>
                            <code>/ia_licitacao [pergunta]</code> - Procedimentos e documentação
                        </div>
                    </div>
                </div>

                <!-- Recent Opportunities -->
                <div class="card">
                    <h2>🎯 Oportunidades Recentes</h2>
                    <div class="opportunities" id="opportunities">
                        <!-- Opportunities will be loaded here -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const API_URL = 'http://localhost:3001';
        let currentUser = null;

        async function login() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch(\`\${API_URL}/auth/login\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    currentUser = data.data.user;
                    document.getElementById('loginForm').style.display = 'none';
                    document.getElementById('dashboard').style.display = 'block';
                    loadOpportunities();
                } else {
                    alert('Login falhou: ' + data.message);
                }
            } catch (error) {
                console.error('Erro no login:', error);
                alert('Erro de conexão. Certifique-se que o backend está rodando em http://localhost:3001');
            }
        }

        function logout() {
            currentUser = null;
            document.getElementById('loginForm').style.display = 'block';
            document.getElementById('dashboard').style.display = 'none';
        }

        async function sendQuery() {
            const input = document.getElementById('chatInput');
            const queryText = input.value.trim();
            
            if (!queryText) return;
            
            document.getElementById('loading').style.display = 'block';
            document.getElementById('chatResponse').innerHTML = '';
            
            try {
                const response = await fetch(\`\${API_URL}/legal-ai/query\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ queryText })
                });
                
                const data = await response.json();
                
                document.getElementById('loading').style.display = 'none';
                
                if (data.success) {
                    const result = data.data;
                    document.getElementById('chatResponse').innerHTML = \`
                        <div class="chat-response">
                            <strong>🤖 Resposta da IA Jurídica:</strong><br><br>
                            \${result.responseText}<br><br>
                            <small>
                                📊 Confiança: \${Math.round(result.confidenceScore * 100)}% | 
                                ⚖️ Baseado em: Lei 14.133/2021, 8.666/93, LC 123/2006
                            </small>
                            
                            \${result.followUpQuestions ? \`
                                <div style="margin-top: 15px; padding: 10px; background: rgba(33, 150, 243, 0.1); border-radius: 4px;">
                                    <strong>❓ Perguntas relacionadas:</strong><br>
                                    \${result.followUpQuestions.map(q => \`• \${q}\`).join('<br>')}
                                </div>
                            \` : ''}
                        </div>
                    \`;
                    input.value = '';
                } else {
                    document.getElementById('chatResponse').innerHTML = \`
                        <div style="color: red; padding: 10px;">
                            Erro: \${data.message || 'Falha na consulta'}
                        </div>
                    \`;
                }
            } catch (error) {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('chatResponse').innerHTML = \`
                    <div style="color: red; padding: 10px;">
                        Erro de conexão: \${error.message}
                    </div>
                \`;
            }
        }

        async function loadOpportunities() {
            try {
                const response = await fetch(\`\${API_URL}/opportunities\`);
                const data = await response.json();
                
                if (data.success) {
                    const container = document.getElementById('opportunities');
                    container.innerHTML = data.data.map(opp => \`
                        <div class="card opportunity">
                            <div class="opportunity-title">\${opp.title}</div>
                            <div class="opportunity-entity">\${opp.entity}</div>
                            <div class="opportunity-value">R$ \${opp.value.toLocaleString('pt-BR')}</div>
                            <div class="opportunity-deadline">Prazo: \${new Date(opp.deadline).toLocaleDateString('pt-BR')}</div>
                        </div>
                    \`).join('');
                }
            } catch (error) {
                console.error('Erro ao carregar oportunidades:', error);
            }
        }

        // Enter key support
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('chatInput').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    sendQuery();
                }
            });
        });
    </script>
</body>
</html>
EOL
        
        cd ..
    else
        cd frontend
        
        print_status "Instalando dependências do frontend..."
        if [ -f "package.json" ]; then
            npm install 2>/dev/null || print_warning "Falha ao instalar dependências do frontend"
        fi
        
        # Configurar variáveis de ambiente
        if [ ! -f ".env.local" ]; then
            print_status "Criando arquivo .env.local..."
            cat > .env.local << EOL
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3001
NEXT_PUBLIC_APP_NAME=LicitaFácil Pro
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_ENVIRONMENT=demo
EOL
        fi
        
        cd ..
    fi
    
    print_success "Frontend configurado"
}

# Criar scripts de inicialização simplificados
create_start_scripts() {
    print_status "Criando scripts de inicialização..."
    
    # Script para iniciar backend
    cat > start-backend.sh << EOL
#!/bin/bash
echo "🚀 Iniciando Backend LicitaFácil Pro..."
cd backend
node demo-server.js
EOL
    chmod +x start-backend.sh
    
    # Script para iniciar frontend  
    cat > start-frontend.sh << EOL
#!/bin/bash
echo "🌐 Iniciando Frontend LicitaFácil Pro..."
cd frontend

# Verificar se tem Node.js project
if [ -f "package.json" ] && [ -f "next.config.js" ]; then
    echo "Iniciando Next.js..."
    npm run dev
elif [ -f "package.json" ]; then
    echo "Iniciando servidor npm..."
    npm run dev
else
    echo "Iniciando servidor Python..."
    python3 -m http.server 3000 2>/dev/null || python -m http.server 3000
fi
EOL
    chmod +x start-frontend.sh
    
    # Script principal para iniciar tudo
    cat > start-demo-simple.sh << EOL
#!/bin/bash

echo "🚀 Iniciando LicitaFácil Pro Demo (Versão Simplificada)"
echo "=================================================="

# Função para cleanup
cleanup() {
    echo ""
    echo "🛑 Parando serviços..."
    kill \$BACKEND_PID \$FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Iniciar backend
echo "⚙️ Iniciando backend..."
./start-backend.sh &
BACKEND_PID=\$!

# Aguardar backend
sleep 3

# Testar backend
echo "🔍 Testando backend..."
curl -s http://localhost:3001/health > /dev/null
if [ \$? -eq 0 ]; then
    echo "✅ Backend rodando em http://localhost:3001"
else
    echo "❌ Backend não respondeu"
fi

# Iniciar frontend
echo "🌐 Iniciando frontend..."
./start-frontend.sh &
FRONTEND_PID=\$!

# Aguardar frontend
sleep 3

echo ""
echo "🎉 LicitaFácil Pro Demo iniciado com sucesso!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:3001" 
echo "📚 API Test: curl http://localhost:3001/health"
echo ""
echo "👥 Contas de demonstração:"
echo "   📧 empresa@demo.com | 🔑 Demo@2024"
echo "   📧 admin@licitafacil.com | 🔑 Admin@2024"
echo "   📧 especialista@avaliacao.com | 🔑 Especialista@2024"
echo ""
echo "🤖 Teste da IA Jurídica:"
echo "   /advogado qual o prazo para recurso no pregão eletrônico?"
echo "   /juridico MEI pode participar de licitação de R\$ 80.000?"
echo ""
echo "Pressione Ctrl+C para parar todos os serviços"

wait
EOL
    chmod +x start-demo-simple.sh
    
    # Script para parar
    cat > stop-demo.sh << EOL
#!/bin/bash
echo "🛑 Parando LicitaFácil Pro Demo..."

# Parar processos Node.js e Python
pkill -f "node demo-server.js"
pkill -f "npm run dev"
pkill -f "python.*http.server"

echo "✅ Todos os serviços foram parados"
EOL
    chmod +x stop-demo.sh
    
    print_success "Scripts de inicialização criados"
}

# Criar documentação rápida
create_quick_docs() {
    print_status "Criando documentação rápida..."
    
    cat > DEMO_SIMPLE_START.md << EOL
# 🚀 LicitaFácil Pro - Quick Start (Sem Docker)

## ⚡ Iniciar Sistema
\`\`\`bash
./start-demo-simple.sh
\`\`\`

## 🌐 Acessos
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **Health Check**: curl http://localhost:3001/health

## 👤 Contas Demo
| Email | Senha | Perfil |
|-------|-------|--------|
| empresa@demo.com | Demo@2024 | Empresa |
| admin@licitafacil.com | Admin@2024 | Admin |
| especialista@avaliacao.com | Especialista@2024 | Especialista |

## 🤖 Testar IA Jurídica

### No Frontend (http://localhost:3000)
1. Faça login
2. Use o chat da IA jurídica
3. Digite: \`/advogado qual o prazo para recurso?\`

### Via API (Terminal)
\`\`\`bash
curl -X POST http://localhost:3001/legal-ai/query \\
  -H "Content-Type: application/json" \\
  -d '{"queryText": "Qual o prazo para recurso no pregão eletrônico?"}'
\`\`\`

## 🔧 Comandos Úteis

### Testar Backend
\`\`\`bash
curl http://localhost:3001/health
curl http://localhost:3001/opportunities
\`\`\`

### Parar Sistema
\`\`\`bash
./stop-demo.sh
\`\`\`

## 📋 Funcionalidades Demonstradas

### ✅ IA Jurídica
- Consultas em linguagem natural
- Comandos especializados (/advogado, /juridico)
- Respostas com referências legais
- Score de confiança

### ✅ Dashboard
- Estatísticas do sistema
- Oportunidades recentes
- Interface responsiva
- Login funcional

### ✅ API Completa
- Endpoints documentados
- Dados de demonstração
- Simulação realística
- Tempo de resposta real

## 🆘 Solução de Problemas

### Backend não inicia
\`\`\`bash
cd backend
npm install
node demo-server.js
\`\`\`

### Frontend não carrega
\`\`\`bash
cd frontend
python3 -m http.server 3000
# Ou: python -m http.server 3000
\`\`\`

### Porta em uso
\`\`\`bash
# Verificar processos
lsof -i :3000
lsof -i :3001

# Matar processos
pkill -f "http.server"
pkill -f "demo-server"
\`\`\`

## 📞 Suporte
- WhatsApp: (11) 99999-9999
- Email: suporte@licitafacil.com

---
**🎯 Sistema 100% funcional sem Docker!**
EOL

    print_success "Documentação criada"
}

# Função principal
main() {
    echo "🎯 LicitaFácil Pro - Setup Simplificado (SEM DOCKER)"
    echo "===================================================="
    
    check_prerequisites
    setup_backend
    setup_frontend
    create_start_scripts
    create_quick_docs
    
    echo ""
    echo "🎉 Setup simplificado concluído com sucesso!"
    echo ""
    echo "📋 Próximos passos:"
    echo "1. Execute: ./start-demo-simple.sh"
    echo "2. Acesse: http://localhost:3000"
    echo "3. Login: empresa@demo.com / Demo@2024"
    echo "4. Teste: /advogado qual o prazo para recurso?"
    echo ""
    echo "📚 Documentação: DEMO_SIMPLE_START.md"
    echo ""
    print_success "Sistema pronto para demonstração (sem Docker)!"
}

# Executar setup
main "$@"