#!/bin/bash

# LicitaFácil Pro - Script de Setup
# Este script automatiza a instalação e configuração inicial do projeto

set -e

echo "🚀 Bem-vindo ao LicitaFácil Pro!"
echo "Este script irá configurar o ambiente de desenvolvimento."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Verificar se Node.js está instalado
check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js não está instalado!"
        print_message "Por favor, instale Node.js 18.x ou superior:"
        print_message "https://nodejs.org/en/download/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        print_error "Node.js versão $NODE_VERSION encontrada, mas é necessária versão $REQUIRED_VERSION ou superior"
        exit 1
    fi
    
    print_message "Node.js $NODE_VERSION ✓"
}

# Verificar se PostgreSQL está instalado
check_postgresql() {
    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL não encontrado!"
        print_message "Você pode instalar PostgreSQL ou usar um serviço em nuvem como:"
        print_message "- Railway.app"
        print_message "- Supabase"
        print_message "- AWS RDS"
        print_message "- Heroku Postgres"
        echo ""
        read -p "Continuar sem PostgreSQL local? (y/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_message "PostgreSQL encontrado ✓"
    fi
}

# Instalar dependências
install_dependencies() {
    print_step "Instalando dependências..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    print_message "Dependências instaladas ✓"
}

# Configurar variáveis de ambiente
setup_environment() {
    print_step "Configurando variáveis de ambiente..."
    
    if [ ! -f ".env.local" ]; then
        cp .env.example .env.local
        print_message "Arquivo .env.local criado a partir do .env.example"
        print_warning "IMPORTANTE: Edite o arquivo .env.local com suas configurações reais!"
    else
        print_message "Arquivo .env.local já existe"
    fi
}

# Configurar banco de dados
setup_database() {
    print_step "Configurando banco de dados..."
    
    if [ -f ".env.local" ]; then
        # Verificar se DATABASE_URL está configurada
        if grep -q "DATABASE_URL=" .env.local; then
            print_message "Gerando cliente Prisma..."
            npx prisma generate
            
            print_message "Executando migrações..."
            npx prisma migrate dev --name init
            
            print_message "Banco de dados configurado ✓"
        else
            print_warning "DATABASE_URL não configurada em .env.local"
            print_message "Configure a URL do banco de dados antes de executar as migrações"
        fi
    fi
}

# Configurar Git hooks (opcional)
setup_git_hooks() {
    print_step "Configurando Git hooks..."
    
    if [ -d ".git" ]; then
        # Husky para pre-commit hooks
        if command -v npx &> /dev/null; then
            npx husky install 2>/dev/null || true
            print_message "Git hooks configurados ✓"
        fi
    else
        print_warning "Não é um repositório Git, pulando configuração de hooks"
    fi
}

# Verificar configuração
verify_setup() {
    print_step "Verificando configuração..."
    
    # Verificar se o projeto pode ser buildado
    if npm run build &> /dev/null; then
        print_message "Build de teste executado com sucesso ✓"
    else
        print_warning "Build de teste falhou - verifique as configurações"
    fi
}

# Mensagem final
show_final_message() {
    echo ""
    echo "🎉 Setup concluído com sucesso!"
    echo ""
    echo "Próximos passos:"
    echo "1. Edite o arquivo .env.local com suas configurações"
    echo "2. Configure sua base de dados PostgreSQL"
    echo "3. Execute: npm run dev"
    echo "4. Acesse: http://localhost:3000"
    echo ""
    echo "Documentação completa: README.md"
    echo "Suporte: suporte@licitafacil.com.br"
    echo ""
    echo "Desenvolvido com ❤️ para democratizar licitações públicas no Brasil"
}

# Executar setup
main() {
    print_step "Iniciando setup do LicitaFácil Pro..."
    
    check_nodejs
    check_postgresql
    install_dependencies
    setup_environment
    setup_database
    setup_git_hooks
    verify_setup
    show_final_message
}

# Executar se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi