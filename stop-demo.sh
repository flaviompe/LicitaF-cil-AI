#!/bin/bash
echo "🛑 Parando LicitaFácil Pro Demo..."

# Parar processos Node.js e Python
pkill -f "node demo-server.js"
pkill -f "npm run dev"
pkill -f "python.*http.server"

echo "✅ Todos os serviços foram parados"
