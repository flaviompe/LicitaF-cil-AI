# 🚀 LicitaFácil Pro - Quick Start (Sem Docker)

## ⚡ Iniciar Sistema
```bash
./start-demo-simple.sh
```

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
3. Digite: `/advogado qual o prazo para recurso?`

### Via API (Terminal)
```bash
curl -X POST http://localhost:3001/legal-ai/query \
  -H "Content-Type: application/json" \
  -d '{"queryText": "Qual o prazo para recurso no pregão eletrônico?"}'
```

## 🔧 Comandos Úteis

### Testar Backend
```bash
curl http://localhost:3001/health
curl http://localhost:3001/opportunities
```

### Parar Sistema
```bash
./stop-demo.sh
```

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
```bash
cd backend
npm install
node demo-server.js
```

### Frontend não carrega
```bash
cd frontend
python3 -m http.server 3000
# Ou: python -m http.server 3000
```

### Porta em uso
```bash
# Verificar processos
lsof -i :3000
lsof -i :3001

# Matar processos
pkill -f "http.server"
pkill -f "demo-server"
```

## 📞 Suporte
- WhatsApp: (11) 99999-9999
- Email: suporte@licitafacil.com

---
**🎯 Sistema 100% funcional sem Docker!**
