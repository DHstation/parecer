# ✅ Sistema Parecer - Configuração Completa

## 🎉 O que foi feito

### 1. ✅ Correção do erro ESM
- Removidas dependências problemáticas (`@xenova/transformers`, `langchain`)
- Implementado sistema RAG leve com TF-IDF
- Sistema mais rápido e sem erros

### 2. ✅ Suporte para API Mistral
- Sistema agora aceita chave API do Mistral
- **Não precisa rodar Mistral localmente!**
- Funciona com: https://console.mistral.ai/

### 3. ✅ Arquivos `.env` criados
- `backend/.env` - Configurado
- `frontend/.env.local` - Configurado
- `.env.example` - Atualizado

## 🚀 Como Iniciar

### Opção A: SEM Mistral API (Gratuito)

```bash
# 1. Editar backend/.env
# Deixar MISTRAL_API_KEY comentado ou com valor placeholder

# 2. Iniciar MongoDB e Redis
sudo systemctl start mongodb
sudo systemctl start redis

# 3. Iniciar MinIO (Docker)
docker run -d --name parecer-minio \
  -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minio_admin \
  -e MINIO_ROOT_PASSWORD=minio_admin_2024 \
  -v ~/minio-data:/data \
  minio/minio server /data --console-address ":9001"

# 4. Iniciar Backend
cd ~/parecer/backend
npm run dev

# 5. Iniciar Frontend (outro terminal)
cd ~/parecer/frontend
npm run dev
```

**O sistema funcionará com:**
- ✅ Extração de texto nativo de PDFs
- ✅ Busca semântica TF-IDF
- ✅ Análises básicas

### Opção B: COM Mistral API (Melhor qualidade)

```bash
# 1. Obter API Key
# Acesse: https://console.mistral.ai/
# Crie conta e gere uma API Key

# 2. Editar backend/.env
nano ~/parecer/backend/.env

# Adicione:
MISTRAL_API_KEY=sua_chave_aqui

# 3. Seguir passos 2-5 da Opção A
```

**Com API Mistral você terá:**
- ✅ OCR de imagens e PDFs escaneados
- ✅ Classificação automática de documentos
- ✅ Extração estruturada de dados
- ✅ Geração de questionários inteligentes
- ✅ Resumos executivos

## 📁 Estrutura de Arquivos

```
parecer/
├── backend/
│   ├── .env                    ✅ Configurado
│   ├── package.json            ✅ Atualizado (sem deps pesadas)
│   └── src/
│       ├── services/
│       │   ├── ocrService.js   ✅ Suporta API Mistral
│       │   ├── aiService.js    ✅ Suporta API Mistral
│       │   └── ragService.js   ✅ Usa TF-IDF (leve)
│       └── ...
│
├── frontend/
│   ├── .env.local              ✅ Configurado
│   └── ...
│
├── .env.example                ✅ Atualizado
├── README.md                   📖 Documentação completa
├── QUICK_START.md              🚀 Guia rápido
├── LOCAL_SETUP.md              🖥️ Setup local detalhado
├── MISTRAL_API_SETUP.md        🔑 Como configurar Mistral
└── INSTALL_FIX.md              🔧 Correção do erro ESM
```

## 🎯 Próximos Passos

### 1. Testar o sistema

```bash
# Verificar se backend iniciou
curl http://localhost:3001/health

# Deve retornar:
# {"status":"ok","timestamp":"...","uptime":...}
```

### 2. Criar primeiro usuário

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "email": "admin@parecer.com",
    "password": "admin123",
    "role": "admin"
  }'
```

### 3. Acessar frontend

Abra: **http://localhost:3000**

Login:
- Email: `admin@parecer.com`
- Senha: `admin123`

## 🔍 Logs e Debugging

### Ver logs do backend
```bash
# Se rodando com npm run dev
# Os logs aparecem no terminal
```

### Verificar serviços
```bash
# MongoDB
sudo systemctl status mongodb

# Redis
redis-cli ping  # Deve retornar PONG

# MinIO
curl http://localhost:9000/minio/health/live
```

## ⚠️ Problemas Comuns

### Backend não inicia - MongoDB
```bash
# Verificar se está rodando
sudo systemctl start mongodb

# Testar conexão
mongosh --eval "db.version()"
```

### Backend não inicia - Redis
```bash
# Iniciar Redis
sudo systemctl start redis

# Testar
redis-cli ping
```

### Erro ao fazer upload
- Verificar se MinIO está rodando
- Testar: http://localhost:9001 (Console MinIO)
- Login: minio_admin / minio_admin_2024

## 📊 Funcionalidades Disponíveis

### Sem API Mistral:
- ✅ Upload de PDFs
- ✅ Extração de texto nativo
- ✅ Organização por casos
- ✅ Busca semântica básica (TF-IDF)
- ✅ Dashboard

### Com API Mistral:
- ✅ Tudo acima +
- ✅ OCR de imagens/scans
- ✅ Classificação automática
- ✅ Extração de dados estruturados
- ✅ Questionários inteligentes
- ✅ Resumos executivos

## 💡 Dicas

1. **Para testes**: Use sem API Mistral (economize)
2. **Para produção**: Configure API Mistral (melhores resultados)
3. **PDFs com texto**: Funcionam perfeitamente sem API
4. **PDFs escaneados**: Precisam de API Mistral (OCR)

## 📚 Documentação

- [README.md](README.md) - Visão geral e arquitetura
- [QUICK_START.md](QUICK_START.md) - Guia rápido de uso
- [LOCAL_SETUP.md](LOCAL_SETUP.md) - Setup local detalhado
- [MISTRAL_API_SETUP.md](MISTRAL_API_SETUP.md) - Configurar Mistral
- [INSTALL_FIX.md](INSTALL_FIX.md) - Soluções de problemas

## ✅ Status dos Serviços

| Serviço | Status | Porta | Obrigatório |
|---------|--------|-------|-------------|
| MongoDB | ✅ Configurado | 27017 | Sim |
| Redis | ✅ Configurado | 6379 | Sim |
| MinIO | ✅ Configurado | 9000/9001 | Sim |
| Mistral | ⚠️ Opcional | API | Não |
| Backend | ✅ Pronto | 3001 | Sim |
| Frontend | ✅ Pronto | 3000 | Sim |

---

## 🎉 Sistema Completo e Funcional!

**Desenvolvido com:**
- Node.js + Express
- MongoDB
- MinIO
- Redis + Bull
- Next.js + React
- Mistral AI (opcional)

**Pronto para processar documentos jurídicos! 🚀**