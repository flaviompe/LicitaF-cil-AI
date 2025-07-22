#!/bin/bash

echo "🚀 Iniciando LicitaFácil Pro - Sistema Completo"

# Ir para diretório do projeto
cd "/home/flavio/LICITAÇÕES_PÚBLICAS_PARA_PEQUENOS_E_MÉDIOS_EMPRESÁRIOS"

# Parar processos existentes
echo "📋 Parando processos existentes..."
pkill -f "node.*demo-server" 2>/dev/null || true
pkill -f "python.*http.server" 2>/dev/null || true
sleep 2

# Iniciar backend
echo "🔧 Iniciando backend na porta 3001..."
cd backend
nohup node demo-server.js > ../backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../backend.pid
cd ..

# Aguardar backend inicializar
echo "⏳ Aguardando backend inicializar..."
sleep 5

# Verificar backend
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend funcionando na porta 3001"
else
    echo "❌ Backend falhou ao iniciar"
fi

# Iniciar frontend
echo "🎨 Iniciando frontend na porta 3000..."
nohup python3 -m http.server 3000 > frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > frontend.pid

# Aguardar frontend inicializar
sleep 3

# Verificar frontend
if curl -s http://localhost:3000/ > /dev/null; then
    echo "✅ Frontend funcionando na porta 3000"
else
    echo "❌ Frontend falhou ao iniciar"
fi

echo ""
echo "🎉 Sistema LicitaFácil Pro Iniciado!"
echo ""
echo "📱 URLs de Acesso:"
echo "   🎨 Dashboard: http://localhost:3000/dashboard.html"
echo "   🔧 API Backend: http://localhost:3001"
echo "   📊 Health Check: http://localhost:3001/health"
echo ""
echo "🔑 Login Demo:"
echo "   📧 Email: empresa@demo.com"
echo "   🔐 Senha: Demo@2024"
echo ""
echo "📋 PIDs dos Processos:"
echo "   Backend: $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "🛑 Para parar: pkill -f 'node.*demo-server' && pkill -f 'python.*http.server'"