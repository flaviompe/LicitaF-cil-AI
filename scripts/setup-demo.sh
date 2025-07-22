#!/bin/bash

# 🚀 Script de Setup para Demonstração - LicitaFácil Pro
echo "🚀 Iniciando setup da demonstração LicitaFácil Pro..."

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

# Verificar pré-requisitos
check_prerequisites() {
    print_status "Verificando pré-requisitos..."
    
    # Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js não encontrado. Instale Node.js >= 18.0.0"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js versão $NODE_VERSION encontrada. Necessário >= 18.0.0"
        exit 1
    fi
    
    # Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker não encontrado. Instale Docker para executar banco de dados"
        exit 1
    fi
    
    # NPM
    if ! command -v npm &> /dev/null; then
        print_error "NPM não encontrado"
        exit 1
    fi
    
    print_success "Pré-requisitos verificados"
}

# Setup do banco de dados
setup_database() {
    print_status "Configurando banco de dados..."
    
    # Criar network do Docker se não existir
    docker network create licitafacil-network 2>/dev/null || true
    
    # PostgreSQL
    print_status "Iniciando PostgreSQL..."
    docker run -d \
        --name licitafacil-postgres \
        --network licitafacil-network \
        -e POSTGRES_DB=licitafacil \
        -e POSTGRES_USER=licitafacil \
        -e POSTGRES_PASSWORD=licitafacil123 \
        -p 5432:5432 \
        postgres:15-alpine \
        2>/dev/null || docker start licitafacil-postgres
    
    # Redis
    print_status "Iniciando Redis..."
    docker run -d \
        --name licitafacil-redis \
        --network licitafacil-network \
        -p 6379:6379 \
        redis:7-alpine \
        2>/dev/null || docker start licitafacil-redis
    
    # Aguardar inicialização
    print_status "Aguardando inicialização do banco de dados..."
    sleep 10
    
    print_success "Banco de dados configurado"
}

# Setup do backend
setup_backend() {
    print_status "Configurando backend..."
    
    cd backend
    
    # Instalar dependências
    print_status "Instalando dependências do backend..."
    npm install --silent
    
    # Configurar variáveis de ambiente
    if [ ! -f .env ]; then
        print_status "Criando arquivo .env..."
        cat > .env << EOL
# Database
DATABASE_URL=postgresql://licitafacil:licitafacil123@localhost:5432/licitafacil

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=licitafacil-jwt-secret-demo-2024

# OpenAI (configurar com sua chave)
OPENAI_API_KEY=sk-your-openai-key-here

# Email (para demonstração)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=demo@licitafacil.com
MAIL_PASS=demo-password

# AWS (para demonstração)
AWS_ACCESS_KEY_ID=demo-key
AWS_SECRET_ACCESS_KEY=demo-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=licitafacil-demo

# Stripe (para demonstração)
STRIPE_SECRET_KEY=sk_test_demo
STRIPE_WEBHOOK_SECRET=whsec_demo

# App
PORT=3001
NODE_ENV=development
EOL
    fi
    
    # Executar migrações
    print_status "Executando migrações do banco de dados..."
    npm run typeorm migration:run 2>/dev/null || true
    
    # Seed de dados de demonstração
    print_status "Carregando dados de demonstração..."
    npm run seed:demo 2>/dev/null || true
    
    cd ..
    print_success "Backend configurado"
}

# Setup do frontend
setup_frontend() {
    print_status "Configurando frontend..."
    
    cd frontend
    
    # Instalar dependências
    print_status "Instalando dependências do frontend..."
    npm install --silent
    
    # Configurar variáveis de ambiente
    if [ ! -f .env.local ]; then
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
    print_success "Frontend configurado"
}

# Criar dados de demonstração
create_demo_data() {
    print_status "Criando dados de demonstração..."
    
    # Script SQL para dados demo
    cat > demo_data.sql << EOL
-- Usuários de demonstração
INSERT INTO users (id, name, email, password, role, created_at, updated_at) VALUES
('demo-admin-001', 'Admin Demo', 'admin@licitafacil.com', '\$2b\$10\$demo-hash', 'ADMIN', NOW(), NOW()),
('demo-user-001', 'Empresa Demo LTDA', 'empresa@demo.com', '\$2b\$10\$demo-hash', 'USER', NOW(), NOW()),
('demo-spec-001', 'Especialista Avaliador', 'especialista@avaliacao.com', '\$2b\$10\$demo-hash', 'SPECIALIST', NOW(), NOW());

-- Empresas de demonstração
INSERT INTO companies (id, user_id, name, cnpj, size, sector, created_at, updated_at) VALUES
('demo-comp-001', 'demo-user-001', 'Empresa Demo LTDA', '12.345.678/0001-90', 'ME', 'Tecnologia', NOW(), NOW());

-- Oportunidades de demonstração
INSERT INTO opportunities (id, title, entity, value, deadline, status, created_at, updated_at) VALUES
('demo-opp-001', 'Fornecimento de Material de Escritório', 'Prefeitura Municipal de São Paulo', 150000, '2024-02-15', 'OPEN', NOW(), NOW()),
('demo-opp-002', 'Serviços de Limpeza e Conservação', 'Governo do Estado de SP', 800000, '2024-02-20', 'OPEN', NOW(), NOW()),
('demo-opp-003', 'Aquisição de Equipamentos de TI', 'Ministério da Educação', 2500000, '2024-03-01', 'OPEN', NOW(), NOW());

-- Consultas jurídicas de exemplo
INSERT INTO legal_queries (id, user_id, query_text, type, status, response_text, confidence_score, created_at, updated_at) VALUES
('demo-query-001', 'demo-user-001', 'Qual o prazo para recurso no pregão eletrônico?', 'DEADLINE_INQUIRY', 'COMPLETED', 'Conforme o art. 44 da Lei 10.520/2002, o prazo para interposição de recurso no pregão é de 3 (três) dias úteis...', 0.95, NOW(), NOW()),
('demo-query-002', 'demo-user-001', 'Uma MEI pode participar de licitação de R\$ 80.000?', 'COMPLIANCE_CHECK', 'COMPLETED', 'Sim, uma MEI pode participar. Conforme a LC 123/2006, não há limitação de valor para participação...', 0.92, NOW(), NOW());
EOL

    # Executar no PostgreSQL
    docker exec -i licitafacil-postgres psql -U licitafacil -d licitafacil < demo_data.sql 2>/dev/null || true
    rm demo_data.sql
    
    print_success "Dados de demonstração criados"
}

# Criar script de inicialização
create_start_script() {
    print_status "Criando scripts de inicialização..."
    
    # Script para iniciar todos os serviços
    cat > start-demo.sh << EOL
#!/bin/bash

echo "🚀 Iniciando LicitaFácil Pro Demo..."

# Iniciar banco de dados
echo "📊 Iniciando banco de dados..."
docker start licitafacil-postgres licitafacil-redis

# Aguardar inicialização
sleep 5

# Iniciar backend
echo "⚙️ Iniciando backend..."
cd backend
npm run start:dev &
BACKEND_PID=\$!
cd ..

# Aguardar backend
sleep 10

# Iniciar frontend
echo "🌐 Iniciando frontend..."
cd frontend
npm run dev &
FRONTEND_PID=\$!
cd ..

echo "✅ Sistema iniciado!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:3001"
echo "📚 API Docs: http://localhost:3001/api/docs"
echo ""
echo "👥 Contas de demonstração:"
echo "   Admin: admin@licitafacil.com / Admin@2024"
echo "   Empresa: empresa@demo.com / Demo@2024"
echo "   Especialista: especialista@avaliacao.com / Especialista@2024"
echo ""
echo "Pressione Ctrl+C para parar todos os serviços"

# Função para cleanup
cleanup() {
    echo "🛑 Parando serviços..."
    kill \$BACKEND_PID \$FRONTEND_PID 2>/dev/null
    docker stop licitafacil-postgres licitafacil-redis
    exit 0
}

trap cleanup SIGINT SIGTERM
wait
EOL

    chmod +x start-demo.sh
    
    # Script para parar serviços
    cat > stop-demo.sh << EOL
#!/bin/bash

echo "🛑 Parando LicitaFácil Pro Demo..."

# Parar processos Node.js
pkill -f "npm run start:dev"
pkill -f "npm run dev"

# Parar containers Docker
docker stop licitafacil-postgres licitafacil-redis

echo "✅ Todos os serviços foram parados"
EOL

    chmod +x stop-demo.sh
    
    print_success "Scripts de inicialização criados"
}

# Criar documentação rápida
create_quick_docs() {
    print_status "Criando documentação rápida..."
    
    cat > DEMO_QUICK_START.md << EOL
# 🚀 LicitaFácil Pro - Quick Start Demo

## Iniciar Sistema
\`\`\`bash
./start-demo.sh
\`\`\`

## Acessos
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **API Docs**: http://localhost:3001/api/docs

## Contas Demo
| Perfil | Email | Senha |
|--------|-------|-------|
| Admin | admin@licitafacil.com | Admin@2024 |
| Empresa | empresa@demo.com | Demo@2024 |
| Especialista | especialista@avaliacao.com | Especialista@2024 |

## Testes Rápidos

### 1. Consulta Jurídica
\`\`\`
/advogado qual o prazo para recurso no pregão eletrônico?
\`\`\`

### 2. Análise de Conformidade
\`\`\`
/juridico validar se MEI pode participar de licitação de R\$ 80.000
\`\`\`

### 3. Documentação
\`\`\`
/ia_licitacao listar documentos obrigatórios para habilitação
\`\`\`

## Parar Sistema
\`\`\`bash
./stop-demo.sh
\`\`\`

## Suporte
- WhatsApp: (11) 99999-9999
- Email: suporte@licitafacil.com
EOL

    print_success "Documentação criada"
}

# Verificar se tudo está funcionando
verify_setup() {
    print_status "Verificando configuração..."
    
    # Verificar se banco está rodando
    if ! docker ps | grep licitafacil-postgres > /dev/null; then
        print_warning "PostgreSQL não está rodando"
    fi
    
    if ! docker ps | grep licitafacil-redis > /dev/null; then
        print_warning "Redis não está rodando"
    fi
    
    # Verificar arquivos de configuração
    if [ ! -f backend/.env ]; then
        print_warning "Arquivo backend/.env não encontrado"
    fi
    
    if [ ! -f frontend/.env.local ]; then
        print_warning "Arquivo frontend/.env.local não encontrado"
    fi
    
    print_success "Verificação concluída"
}

# Função principal
main() {
    echo "🎯 LicitaFácil Pro - Setup de Demonstração"
    echo "=========================================="
    
    check_prerequisites
    setup_database
    setup_backend
    setup_frontend
    create_demo_data
    create_start_script
    create_quick_docs
    verify_setup
    
    echo ""
    echo "🎉 Setup de demonstração concluído com sucesso!"
    echo ""
    echo "📋 Próximos passos:"
    echo "1. Execute: ./start-demo.sh"
    echo "2. Acesse: http://localhost:3000"
    echo "3. Login: empresa@demo.com / Demo@2024"
    echo "4. Teste: /advogado qual o prazo para recurso?"
    echo ""
    echo "📚 Documentação completa: GUIA_DEMONSTRACAO.md"
    echo "⚡ Quick start: DEMO_QUICK_START.md"
    echo ""
    print_success "Sistema pronto para demonstração!"
}

# Executar setup
main "$@"