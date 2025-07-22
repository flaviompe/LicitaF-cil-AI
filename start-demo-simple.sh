#!/bin/bash

echo "🚀 Iniciando LicitaFácil Pro Demo (Versão Simplificada)"
echo "=================================================="

# Função para cleanup
cleanup() {
    echo ""
    echo "🛑 Parando serviços..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Iniciar backend
echo "⚙️ Iniciando backend..."
./start-backend.sh &
BACKEND_PID=$!

# Aguardar backend
sleep 3

# Testar backend
echo "🔍 Testando backend..."
curl -s http://localhost:3001/health > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Backend rodando em http://localhost:3001"
else
    echo "❌ Backend não respondeu"
fi

# Iniciar frontend
echo "🌐 Iniciando frontend..."
./start-frontend.sh &
FRONTEND_PID=$!

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
echo "   /juridico MEI pode participar de licitação de R$ 80.000?"
echo ""
echo "Pressione Ctrl+C para parar todos os serviços"

wait
