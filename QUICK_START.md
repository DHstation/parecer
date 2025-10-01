# 🚀 Guia Rápido - Sistema Parecer

## Início Rápido em 5 Passos

### 1️⃣ Configure as Variáveis de Ambiente

```bash
cp .env.example .env
nano .env  # ou use seu editor favorito
```

**IMPORTANTE**: Adicione seu token do Hugging Face:
```env
HUGGING_FACE_TOKEN=hf_seu_token_aqui
```

📌 Obtenha em: https://huggingface.co/settings/tokens

### 2️⃣ Inicie os Containers

```bash
docker-compose up -d
```

Aguarde alguns minutos para o Mistral baixar o modelo (primeira vez ~20GB).

### 3️⃣ Verifique se os Serviços Estão Rodando

```bash
docker-compose ps
```

Todos devem estar "Up". Para ver logs:
```bash
docker-compose logs -f
```

### 4️⃣ Crie o Primeiro Usuário

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Seu Nome",
    "email": "seu@email.com",
    "password": "senha123",
    "role": "admin"
  }'
```

### 5️⃣ Acesse o Sistema

Abra no navegador: **http://localhost:3000**

Login com as credenciais criadas no passo 4.

---

## 📖 Fluxo de Uso

### 1. Criar um Caso

1. Acesse **Dashboard**
2. Clique em **"Casos"**
3. Clique em **"Novo Caso"**
4. Preencha:
   - Título do caso
   - Número do processo (opcional)
   - Área jurídica
   - Cliente

### 2. Upload de Documentos

1. Dentro do caso, clique em **"Upload Documentos"**
2. Arraste ou selecione PDFs/imagens
3. Aguarde o processamento (OCR + Análise)
4. Status mudará de `pending` → `processing` → `completed`

### 3. Visualizar Análise

1. Clique no documento processado
2. Veja:
   - **Texto extraído** (OCR)
   - **Tipo de documento** classificado
   - **Dados extraídos**: partes, datas, valores
   - **Resumo** e pontos-chave

### 4. Busca Semântica (RAG)

1. Na página de documentos, use a **barra de busca**
2. Digite uma pergunta natural, ex:
   - "Quem são as partes do processo?"
   - "Qual o valor da causa?"
   - "Quais são os prazos importantes?"
3. O sistema busca semanticamente e responde com contexto

### 5. Gerar Questionário

1. No caso, clique em **"Gerar Questionário"**
2. Selecione os documentos base
3. O sistema gera perguntas automaticamente:
   - Categorizadas por tópico
   - Priorizadas por importância
   - Com contexto dos documentos
4. Responda as perguntas diretamente no sistema

### 6. Resumo Consolidado

1. No caso, clique em **"Gerar Resumo"**
2. O sistema analisa todos os documentos e cria:
   - Resumo executivo
   - Timeline de eventos
   - Pontos críticos
   - Riscos e oportunidades

---

## 🎯 Funcionalidades Principais

### 📄 Processamento de Documentos
- Upload múltiplo (até 10 arquivos simultâneos)
- OCR com Mistral (suporta PDF e imagens)
- Extração automática de texto nativo de PDFs
- Validação de qualidade do OCR

### 🧠 Análise Inteligente
- Classificação automática do tipo de documento
- Extração estruturada de dados:
  - Partes (autor, réu, terceiros)
  - Advogados e OAB
  - Números de processo
  - Datas importantes
  - Valores monetários
  - Pedidos e fundamentos legais

### 🔍 Busca Semântica (RAG)
- Indexação automática de documentos
- Busca por significado, não apenas palavras
- Respostas contextualizadas com citação de fontes
- Conecta informações entre múltiplos documentos

### ❓ Questionários Inteligentes
- Geração automática baseada no conteúdo
- Categorização:
  - Fatos
  - Provas
  - Base legal
  - Procedimentos
  - Riscos
  - Estratégia
- Priorização (low/medium/high/critical)
- Tracking de progresso

### 📊 Dashboard
- Estatísticas em tempo real
- Casos recentes
- Status de processamento
- Métricas de produtividade

---

## 🔧 Comandos Úteis

### Ver logs de um serviço específico
```bash
docker-compose logs -f backend
docker-compose logs -f mistral_ocr
docker-compose logs -f frontend
```

### Reiniciar um serviço
```bash
docker-compose restart backend
```

### Parar todos os serviços
```bash
docker-compose down
```

### Parar e limpar volumes (CUIDADO: apaga dados)
```bash
docker-compose down -v
```

### Acessar o console do MongoDB
```bash
docker-compose exec mongodb mongosh -u admin -p parecer_admin_2024 --authenticationDatabase admin
```

### Acessar o MinIO Console
http://localhost:9001
- Usuário: `minio_admin`
- Senha: `minio_admin_2024`

---

## 📊 Monitoramento

### Status da API
```bash
curl http://localhost:3001/health
```

### Verificar fila de processamento
Através dos logs do Redis:
```bash
docker-compose exec redis redis-cli
> KEYS *
> LLEN bull:ocr-processing:wait
```

---

## 🆘 Problemas Comuns

### ❌ Mistral não inicia (sem GPU)

**Solução**: Edite `docker-compose.yml`, remova a seção `deploy` do `mistral_ocr` e adicione `--device cpu` no command.

### ❌ Porta já em uso

**Solução**: Mude as portas no `docker-compose.yml`:
```yaml
ports:
  - "3002:3001"  # Mude 3001 para 3002, por exemplo
```

### ❌ OCR muito lento

**Solução**:
1. Use GPU se disponível
2. Reduza o tamanho dos PDFs antes do upload
3. Use documentos com texto nativo (sem scan)

### ❌ MongoDB não conecta

**Solução**:
```bash
docker-compose restart mongodb
docker-compose logs mongodb
```

---

## 🎓 Exemplos de Uso da API

### Upload de documento
```bash
curl -X POST http://localhost:3001/api/documents/upload \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "documents=@documento.pdf" \
  -F "caseId=ID_DO_CASO"
```

### Busca semântica
```bash
curl -X GET "http://localhost:3001/api/documents/search?query=qual+o+valor+da+causa" \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Fazer pergunta (RAG)
```bash
curl -X POST http://localhost:3001/api/documents/ask \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Quais são as partes do processo?",
    "caseId": "ID_DO_CASO"
  }'
```

### Gerar questionário
```bash
curl -X POST http://localhost:3001/api/questionnaires/generate \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "caseId": "ID_DO_CASO",
    "documentIds": ["DOC_ID_1", "DOC_ID_2"],
    "type": "initial_analysis"
  }'
```

---

## 💡 Dicas de Performance

1. **Use PDFs com texto nativo** quando possível (OCR é mais lento)
2. **Limite o tamanho dos documentos** a 50MB por arquivo
3. **Processe em lote** durante horários de menor uso
4. **Configure workers separados** em produção para melhor escalabilidade

---

## 📞 Suporte

- Documentação completa: `README.md`
- Issues: Relate problemas no repositório
- Logs: Sempre verifique os logs antes de reportar problemas

---

**Pronto! Agora você pode começar a usar o Sistema Parecer! 🎉**
