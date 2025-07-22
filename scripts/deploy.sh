#!/bin/bash

# LicitaFácil Pro - Script de Deploy
# Este script automatiza o processo de deploy para produção

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Verificar se está na branch main
check_branch() {
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [ "$CURRENT_BRANCH" != "main" ]; then
        print_error "Deploy deve ser feito a partir da branch 'main'"
        print_message "Branch atual: $CURRENT_BRANCH"
        exit 1
    fi
    print_message "Branch verificada: $CURRENT_BRANCH ✓"
}

# Verificar se não há alterações pendentes
check_working_directory() {
    if [ -n "$(git status --porcelain)" ]; then
        print_error "Existem alterações não commitadas!"
        print_message "Faça commit de todas as alterações antes do deploy"
        git status
        exit 1
    fi
    print_message "Diretório de trabalho limpo ✓"
}

# Executar testes
run_tests() {
    print_step "Executando testes..."
    
    if npm run test > /dev/null 2>&1; then
        print_message "Testes executados com sucesso ✓"
    else
        print_error "Testes falharam!"
        print_message "Corrija os testes antes de fazer deploy"
        exit 1
    fi
}

# Executar lint
run_lint() {
    print_step "Executando lint..."
    
    if npm run lint > /dev/null 2>&1; then
        print_message "Lint executado com sucesso ✓"
    else
        print_error "Lint falhou!"
        print_message "Corrija os problemas de lint antes de fazer deploy"
        exit 1
    fi
}

# Executar build
run_build() {
    print_step "Executando build..."
    
    if npm run build > /dev/null 2>&1; then
        print_message "Build executado com sucesso ✓"
    else
        print_error "Build falhou!"
        print_message "Corrija os problemas de build antes de fazer deploy"
        exit 1
    fi
}

# Verificar variáveis de ambiente para produção
check_production_env() {
    print_step "Verificando variáveis de ambiente..."
    
    REQUIRED_VARS=(
        "DATABASE_URL"
        "NEXTAUTH_URL"
        "NEXTAUTH_SECRET"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "Variável de ambiente $var não está definida"
            exit 1
        fi
    done
    
    print_message "Variáveis de ambiente verificadas ✓"
}

# Deploy para Vercel
deploy_vercel() {
    print_step "Fazendo deploy para Vercel..."
    
    if command -v vercel &> /dev/null; then
        vercel --prod
        print_message "Deploy para Vercel concluído ✓"
    else
        print_error "Vercel CLI não encontrado!"
        print_message "Instale com: npm i -g vercel"
        exit 1
    fi
}

# Deploy para Railway
deploy_railway() {
    print_step "Fazendo deploy para Railway..."
    
    if command -v railway &> /dev/null; then
        railway up
        print_message "Deploy para Railway concluído ✓"
    else
        print_error "Railway CLI não encontrado!"
        print_message "Instale com: npm i -g @railway/cli"
        exit 1
    fi
}

# Deploy usando Docker
deploy_docker() {
    print_step "Fazendo deploy usando Docker..."
    
    if command -v docker &> /dev/null; then
        docker build -t licitafacil-pro .
        docker tag licitafacil-pro licitafacil-pro:latest
        print_message "Imagem Docker criada ✓"
        
        # Push para registry (personalizar conforme necessário)
        # docker push licitafacil-pro:latest
    else
        print_error "Docker não encontrado!"
        print_message "Instale Docker para usar esta opção"
        exit 1
    fi
}

# Executar migrações em produção
run_production_migrations() {
    print_step "Executando migrações em produção..."
    
    if npx prisma migrate deploy; then
        print_message "Migrações executadas com sucesso ✓"
    else
        print_error "Falha ao executar migrações!"
        exit 1
    fi
}

# Verificar saúde da aplicação
health_check() {
    print_step "Verificando saúde da aplicação..."
    
    if [ -n "$HEALTH_CHECK_URL" ]; then
        sleep 30 # Aguardar deploy
        
        if curl -f "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            print_message "Aplicação está saudável ✓"
        else
            print_error "Aplicação não está respondendo!"
            exit 1
        fi
    else
        print_warning "HEALTH_CHECK_URL não definida, pulando verificação"
    fi
}

# Criar tag de release
create_release_tag() {
    print_step "Criando tag de release..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    TAG="release_$TIMESTAMP"
    
    git tag -a "$TAG" -m "Release $TAG"
    git push origin "$TAG"
    
    print_message "Tag criada: $TAG ✓"
}

# Notificar equipe
notify_team() {
    print_step "Notificando equipe..."
    
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 LicitaFácil Pro foi deployado com sucesso!\"}" \
            "$SLACK_WEBHOOK"
        print_message "Notificação enviada para Slack ✓"
    fi
    
    if [ -n "$DISCORD_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"content\":\"🚀 LicitaFácil Pro foi deployado com sucesso!\"}" \
            "$DISCORD_WEBHOOK"
        print_message "Notificação enviada para Discord ✓"
    fi
}

# Função principal
main() {
    echo "🚀 Iniciando deploy do LicitaFácil Pro..."
    echo ""
    
    DEPLOY_TARGET=${1:-"vercel"}
    
    print_message "Alvo do deploy: $DEPLOY_TARGET"
    echo ""
    
    # Verificações pré-deploy
    check_branch
    check_working_directory
    run_tests
    run_lint
    run_build
    
    # Deploy específico
    case $DEPLOY_TARGET in
        "vercel")
            deploy_vercel
            ;;
        "railway")
            deploy_railway
            ;;
        "docker")
            deploy_docker
            ;;
        *)
            print_error "Alvo de deploy inválido: $DEPLOY_TARGET"
            print_message "Opções disponíveis: vercel, railway, docker"
            exit 1
            ;;
    esac
    
    # Pós-deploy
    health_check
    create_release_tag
    notify_team
    
    echo ""
    echo "🎉 Deploy concluído com sucesso!"
    echo "Aplicação disponível em: $NEXTAUTH_URL"
    echo ""
}

# Executar se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi