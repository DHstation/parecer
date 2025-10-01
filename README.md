# Sistema Parecer

Sistema inteligente de análise de documentos jurídicos com processamento OCR, análise por IA e busca semântica (RAG).

## 🚀 Tecnologias

### Backend
- **Node.js** + Express
- **MongoDB** - Banco de dados
- **MinIO** - Armazenamento de arquivos
- **Mistral AI (Pixtral)** - OCR e análise de documentos
- **Redis** + Bull - Filas de processamento assíncrono
- **LangChain** + Transformers - Sistema RAG para busca semântica

### Frontend
- **Next.js** + React
- **TailwindCSS** - Estilização
- **React Query** - Gerenciamento de estado
- **Axios** - Requisições HTTP

## 📋 Funcionalidades

- ✅ Upload múltiplo de PDFs jurídicos
- ✅ Extração automática de texto (OCR) com Mistral
- ✅ Análise inteligente e extração de dados estruturados
- ✅ Classificação automática de tipos de documento
- ✅ Sistema RAG para busca semântica avançada
- ✅ Geração automática de questionários contextualizados
- ✅ Organização por casos
- ✅ Dashboard com estatísticas
- ✅ Processamento assíncrono com filas

## 🐳 Como Executar

### Pré-requisitos

- Docker e Docker Compose
- GPU NVIDIA (para Mistral) ou usar CPU (mais lento)
- Token do Hugging Face (para baixar modelo Mistral)

### 1. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione seu token do Hugging Face:
```
HUGGING_FACE_TOKEN=seu_token_aqui
```

Obtenha seu token em: https://huggingface.co/settings/tokens

### 2. Iniciar os serviços

```bash
docker-compose up -d
```

Isso irá iniciar:
- **MongoDB** - porta 27017
- **MinIO** - porta 9000 (API) e 9001 (Console)
- **Mistral OCR** - porta 8000
- **Redis** - porta 6379
- **Backend API** - porta 3001
- **Frontend** - porta 3000

### 3. Acessar o sistema

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **MinIO Console**: http://localhost:9001 (usuário: minio_admin, senha: minio_admin_2024)

### 4. Criar primeiro usuário

Faça uma requisição POST para criar o primeiro usuário:

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

## 📁 Estrutura do Projeto

```
parecer/
├── backend/
│   ├── src/
│   │   ├── config/         # Configurações (DB, MinIO, Redis)
│   │   ├── models/         # Schemas do MongoDB
│   │   ├── services/       # Lógica de negócio (OCR, RAG, IA)
│   │   ├── controllers/    # Controladores das rotas
│   │   ├── routes/         # Definição de rotas
│   │   ├── middleware/     # Autenticação, validação
│   │   ├── workers/        # Workers para processamento assíncrono
│   │   └── index.js        # Entrada da aplicação
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/          # Páginas Next.js
│   │   ├── services/       # Integração com API
│   │   └── styles/         # Estilos CSS
│   └── package.json
│
├── docker-compose.yml      # Orquestração dos containers
└── README.md
```

## 🔧 Desenvolvimento

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 📊 Modelos de Dados

### Document
- Informações do arquivo
- Status do OCR e análise
- Dados extraídos (partes, datas, valores)
- Embeddings para RAG

### Case
- Informações do caso
- Documentos relacionados
- Timeline de eventos
- Resumo consolidado

### Questionnaire
- Perguntas geradas automaticamente
- Categorização por tópicos
- Priorização
- Respostas e anotações

## 🔍 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Obter perfil

### Documentos
- `POST /api/documents/upload` - Upload de documentos
- `GET /api/documents` - Listar documentos
- `GET /api/documents/:id` - Detalhes do documento
- `GET /api/documents/search` - Busca semântica
- `POST /api/documents/ask` - Fazer pergunta (RAG)

### Casos
- `POST /api/cases` - Criar caso
- `GET /api/cases` - Listar casos
- `GET /api/cases/:id` - Detalhes do caso
- `POST /api/cases/:id/summary` - Gerar resumo

### Questionários
- `POST /api/questionnaires/generate` - Gerar questionário
- `GET /api/questionnaires` - Listar questionários
- `POST /api/questionnaires/:id/questions/:index/answer` - Responder pergunta

## 🤖 Sistema RAG

O sistema utiliza RAG (Retrieval-Augmented Generation) para:

1. **Indexação**: Documentos são divididos em chunks e convertidos em embeddings
2. **Busca**: Queries são transformadas em embeddings e comparadas por similaridade
3. **Geração**: Contexto relevante é usado para gerar respostas precisas

## 🔐 Segurança

- Autenticação JWT
- Senhas hasheadas com bcrypt
- CORS configurado
- Helmet para headers de segurança
- Validação de entrada

## 📈 Escalabilidade

- Processamento assíncrono com filas
- Workers separados para OCR, análise e indexação
- Cache com Redis
- Armazenamento distribuído com MinIO

## 🐛 Troubleshooting

### Erro ao iniciar Mistral (GPU não encontrada)

Se não tiver GPU NVIDIA, remova a seção `deploy.resources` do serviço `mistral_ocr` no `docker-compose.yml` e adicione `--device cpu` no command.

### MongoDB não conecta

Verifique se a porta 27017 não está sendo usada por outra aplicação.

### MinIO não cria buckets

Execute manualmente:
```bash
docker-compose exec backend node -e "require('./src/config/minio').initializeBuckets()"
```

## 📝 Licença

MIT

## 👥 Contribuindo

Contribuições são bem-vindas! Por favor, abra uma issue ou pull request.
