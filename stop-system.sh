#!/bin/bash

echo "🛑 Parando LicitaFácil Pro Demo..."

# Parar usando PIDs salvos
if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    kill $BACKEND_PID 2>/dev/null
    rm .backend.pid
fi

if [ -f .frontend.pid ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    kill $FRONTEND_PID 2>/dev/null
    rm .frontend.pid
fi

# Parar por nome do processo
pkill -f "demo-server.js" 2>/dev/null
pkill -f "python.*http.server.*3000" 2>/dev/null
pkill -f "python.*SimpleHTTPServer.*3000" 2>/dev/null

# Forçar parada se necessário
sleep 2
if lsof -i :3001 &>/dev/null; then
    echo "🔨 Forçando parada do backend..."
    lsof -ti :3001 | xargs kill -9 2>/dev/null
fi

if lsof -i :3000 &>/dev/null; then
    echo "🔨 Forçando parada do frontend..."
    lsof -ti :3000 | xargs kill -9 2>/dev/null
fi

echo "✅ Todos os serviços foram parados"
echo "🧹 Logs disponíveis em: backend.log, frontend.log"