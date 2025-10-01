# 🖥️ Configuração Local (Sem Docker)

## Pré-requisitos

- **Node.js** 18+
- **MongoDB** instalado e rodando
- **Redis** instalado e rodando
- **MinIO** instalado localmente OU usar servidor MinIO externo
- **Python 3.9+** (para Mistral)
- **(Opcional) GPU NVIDIA** com CUDA para Mistral

---

## 📦 Passo 1: Instalar Dependências do Sistema

### Ubuntu/Debian
```bash
# MongoDB
sudo apt-get install -y mongodb

# Redis
sudo apt-get install -y redis-server

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Python
sudo apt-get install -y python3 python3-pip python3-venv
```

### macOS (Homebrew)
```bash
brew install mongodb-community
brew install redis
brew install node
brew install python@3.11
```

---

## 🗄️ Passo 2: Configurar MongoDB

```bash
# Iniciar MongoDB
sudo systemctl start mongodb  # Linux
# ou
brew services start mongodb-community  # macOS

# Criar usuário admin
mongosh
```

No MongoDB shell:
```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "parecer_admin_2024",
  roles: ["root"]
})

use parecer_db
db.createUser({
  user: "parecer_user",
  pwd: "parecer_pass_2024",
  roles: ["readWrite"]
})
exit
```

---

## 🔴 Passo 3: Configurar Redis

```bash
# Iniciar Redis
sudo systemctl start redis  # Linux
# ou
brew services start redis  # macOS

# Testar
redis-cli ping
# Deve retornar: PONG
```

---

## 📦 Passo 4: Configurar MinIO

### Opção A: MinIO Local

```bash
# Baixar MinIO
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio

# Criar diretório de dados
mkdir -p ~/minio-data

# Iniciar MinIO
MINIO_ROOT_USER=minio_admin MINIO_ROOT_PASSWORD=minio_admin_2024 \
  ./minio server ~/minio-data --console-address ":9001"
```

Mantenha rodando em um terminal separado.

### Opção B: Usar MinIO em Docker (mais fácil)

```bash
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minio_admin \
  -e MINIO_ROOT_PASSWORD=minio_admin_2024 \
  -v ~/minio-data:/data \
  minio/minio server /data --console-address ":9001"
```

---

## 🤖 Passo 5: Configurar Mistral OCR

### Opção A: Usar vLLM (Recomendado)

```bash
# Criar ambiente virtual Python
python3 -m venv mistral-env
source mistral-env/bin/activate

# Instalar vLLM
pip install vllm openai

# Criar script para iniciar
cat > start_mistral.sh << 'EOF'
#!/bin/bash
source mistral-env/bin/activate

export HUGGING_FACE_TOKEN="seu_token_aqui"

python -m vllm.entrypoints.openai.api_server \
  --model mistralai/Pixtral-12B-2409 \
  --dtype auto \
  --max-model-len 16384 \
  --port 8000
EOF

chmod +x start_mistral.sh

# Iniciar (em terminal separado)
./start_mistral.sh
```

### Opção B: Usar Ollama (Mais Simples, mas sem Pixtral)

```bash
# Instalar Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Baixar modelo com visão
ollama pull llava:13b

# Iniciar servidor
ollama serve
```

⚠️ **Nota**: Ollama é mais fácil, mas precisará ajustar o código para usar modelos diferentes.

### Opção C: Usar API Externa (Mistral AI Cloud)

Edite `.env` e use a API oficial:
```env
MISTRAL_API_URL=https://api.mistral.ai/v1
MISTRAL_API_KEY=sua_chave_api
```

Ajuste `backend/src/services/ocrService.js` para usar a API oficial.

---

## ⚙️ Passo 6: Configurar Backend

```bash
cd backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cat > .env << 'EOF'
# Servidor
NODE_ENV=development
PORT=3001

# MongoDB
MONGODB_URI=mongodb://admin:parecer_admin_2024@localhost:27017/parecer_db?authSource=admin

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minio_admin
MINIO_SECRET_KEY=minio_admin_2024
MINIO_USE_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Mistral
MISTRAL_API_URL=http://localhost:8000/v1
# Se usar API externa:
# MISTRAL_API_KEY=sua_chave

# JWT
JWT_SECRET=seu_jwt_secret_super_seguro_aqui_min_32_caracteres

# Workers
ENABLE_WORKERS=true
EOF

# Iniciar servidor
npm run dev
```

O backend estará rodando em `http://localhost:3001`

---

## 🎨 Passo 7: Configurar Frontend

```bash
cd ../frontend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF

# Iniciar servidor
npm run dev
```

O frontend estará rodando em `http://localhost:3000`

---

## 🧪 Passo 8: Testar o Sistema

### 1. Verificar serviços

```bash
# MongoDB
mongosh --eval "db.version()"

# Redis
redis-cli ping

# MinIO
curl http://localhost:9000/minio/health/live

# Backend
curl http://localhost:3001/health

# Mistral (se local)
curl http://localhost:8000/v1/models
```

### 2. Criar usuário teste

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@parecer.com",
    "password": "test123",
    "role": "admin"
  }'
```

### 3. Acessar frontend

Abra `http://localhost:3000` e faça login com as credenciais criadas.

---

## 🔄 Scripts de Inicialização Rápida

### Linux/macOS

```bash
cat > start_all.sh << 'EOF'
#!/bin/bash

echo "🚀 Iniciando Sistema Parecer..."

# Verificar MongoDB
if ! pgrep -x mongod > /dev/null; then
    echo "📦 Iniciando MongoDB..."
    sudo systemctl start mongodb
fi

# Verificar Redis
if ! pgrep -x redis-server > /dev/null; then
    echo "🔴 Iniciando Redis..."
    sudo systemctl start redis
fi

# Verificar MinIO
if ! docker ps | grep -q minio; then
    echo "📦 Iniciando MinIO..."
    docker start minio || docker run -d \
      --name minio \
      -p 9000:9000 \
      -p 9001:9001 \
      -e MINIO_ROOT_USER=minio_admin \
      -e MINIO_ROOT_PASSWORD=minio_admin_2024 \
      -v ~/minio-data:/data \
      minio/minio server /data --console-address ":9001"
fi

# Backend
echo "🔧 Iniciando Backend..."
cd backend
npm run dev &
BACKEND_PID=$!

# Aguardar backend iniciar
sleep 5

# Frontend
echo "🎨 Iniciando Frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Sistema iniciado!"
echo "📊 Frontend: http://localhost:3000"
echo "🔌 Backend: http://localhost:3001"
echo "💾 MinIO Console: http://localhost:9001"
echo ""
echo "Para parar: kill $BACKEND_PID $FRONTEND_PID"
EOF

chmod +x start_all.sh
```

Execute: `./start_all.sh`

---

## 🛑 Parar Todos os Serviços

```bash
# Parar processos Node
pkill -f "node.*parecer"

# Parar MongoDB (opcional)
sudo systemctl stop mongodb

# Parar Redis (opcional)
sudo systemctl stop redis

# Parar MinIO
docker stop minio
```

---

## 📊 Estrutura de Processos Rodando

Você terá os seguintes processos:

1. **MongoDB** - porta 27017
2. **Redis** - porta 6379
3. **MinIO** - portas 9000 e 9001
4. **Mistral** (opcional) - porta 8000
5. **Backend** - porta 3001
6. **Frontend** - porta 3000

---

## ⚠️ Problemas Comuns

### Erro: "Cannot find module"
```bash
cd backend && npm install
cd ../frontend && npm install
```

### Erro: "Connection refused" MongoDB
```bash
sudo systemctl status mongodb
sudo systemctl start mongodb
```

### Erro: "ECONNREFUSED Redis"
```bash
redis-cli ping
sudo systemctl start redis
```

### Erro: MinIO buckets não criados
```bash
# Acessar console MinIO: http://localhost:9001
# Criar manualmente: documents, processed, thumbnails
```

### Mistral muito lento
- Use GPU se disponível
- Ou use API externa (Mistral AI, OpenAI)
- Ou use modelo menor localmente

---

## 🚀 Modo Produção Local

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd ../frontend
npm run build
npm start
```

---

## 💡 Dicas

1. **Use tmux/screen** para gerenciar múltiplos terminais
2. **Configure systemd services** para auto-iniciar
3. **Use PM2** para gerenciar processos Node:
   ```bash
   npm install -g pm2
   pm2 start backend/src/index.js --name parecer-backend
   pm2 start "npm run dev" --name parecer-frontend
   ```

4. **Logs centralizados**:
   ```bash
   pm2 logs
   ```

---

**Pronto! Sistema rodando 100% local! 🎉**
