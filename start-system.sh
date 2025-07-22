#!/bin/bash

echo "🚀 Iniciando LicitaFácil Pro Demo"
echo "================================"

# Parar processos existentes
echo "🧹 Limpando processos anteriores..."
pkill -f "demo-server.js" 2>/dev/null
pkill -f "python.*http.server.*3000" 2>/dev/null
sleep 2

# Verificar se as portas estão livres
if lsof -i :3001 &>/dev/null; then
    echo "❌ Porta 3001 está em uso. Parando processo..."
    lsof -ti :3001 | xargs kill -9 2>/dev/null
    sleep 2
fi

if lsof -i :3000 &>/dev/null; then
    echo "❌ Porta 3000 está em uso. Parando processo..."
    lsof -ti :3000 | xargs kill -9 2>/dev/null
    sleep 2
fi

# Iniciar backend
echo "⚙️ Iniciando backend na porta 3001..."
cd backend
nohup node demo-server.js > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Aguardar backend inicializar
echo "⏳ Aguardando backend inicializar..."
for i in {1..10}; do
    if curl -s http://localhost:3001/health &>/dev/null; then
        echo "✅ Backend rodando em http://localhost:3001"
        break
    fi
    sleep 1
done

# Verificar se backend está funcionando
if ! curl -s http://localhost:3001/health &>/dev/null; then
    echo "❌ Backend não iniciou corretamente"
    echo "📋 Log do backend:"
    cat backend.log
    exit 1
fi

# Iniciar frontend
echo "🌐 Iniciando frontend na porta 3000..."
cd frontend
nohup python3 -m http.server 3000 > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Aguardar frontend inicializar
echo "⏳ Aguardando frontend inicializar..."
sleep 3

if lsof -i :3000 &>/dev/null; then
    echo "✅ Frontend rodando em http://localhost:3000"
else
    echo "❌ Frontend não iniciou. Tentando com Python 2..."
    cd frontend
    nohup python -m SimpleHTTPServer 3000 > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ..
    sleep 3
fi

# Verificar se tudo está funcionando
echo ""
echo "🔍 Verificando serviços..."

# Testar backend
BACKEND_STATUS=$(curl -s http://localhost:3001/health | jq -r '.status' 2>/dev/null || echo "error")
if [ "$BACKEND_STATUS" = "ok" ]; then
    echo "✅ Backend: OK"
else
    echo "❌ Backend: ERRO"
fi

# Testar frontend
if curl -s http://localhost:3000 | grep -q "LicitaFácil"; then
    echo "✅ Frontend: OK"
else
    echo "❌ Frontend: ERRO"
fi

echo ""
echo "🎉 Sistema LicitaFácil Pro Demo está rodando!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:3001"
echo "📚 API Test: curl http://localhost:3001/health"
echo ""
echo "👤 Contas Demo:"
echo "   📧 empresa@demo.com | 🔑 Demo@2024"
echo "   📧 admin@licitafacil.com | 🔑 Admin@2024"
echo "   📧 especialista@avaliacao.com | 🔑 Especialista@2024"
echo ""
echo "🤖 Teste da IA Jurídica:"
echo '   curl -X POST http://localhost:3001/legal-ai/query \'
echo '     -H "Content-Type: application/json" \'
echo '     -d '"'"'{"queryText":"Qual o prazo para recurso?"}'"'"
echo ""
echo "🛑 Para parar: ./stop-system.sh"
echo ""

# Salvar PIDs para poder parar depois
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

echo "✨ Abra http://localhost:3000 no seu navegador!"