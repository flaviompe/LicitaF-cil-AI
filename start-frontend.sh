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
