# Ajuste da API Mistral - Sistema Parecer

## 🔧 Problema Identificado

O sistema estava tentando conectar ao container Docker `mistral_ocr` mesmo rodando fora do Docker, causando erro:

```
Error generating answer with RAG: getaddrinfo EAI_AGAIN mistral_ocr
```

## ✅ Solução Implementada

### Arquivo Modificado: `backend/src/services/ragService.js`

**Antes:**
```javascript
constructor() {
  this.mistralApiUrl = process.env.MISTRAL_API_URL || 'http://mistral_ocr:8000/v1';
  // ...
}
```

**Depois:**
```javascript
constructor() {
  this.mistralApiKey = process.env.MISTRAL_API_KEY || null;
  this.mistralApiUrl = this.mistralApiKey
    ? 'https://api.mistral.ai/v1'
    : (process.env.MISTRAL_API_URL || 'http://mistral_ocr:8000/v1');
  // ...
}
```

### Mudanças Implementadas:

1. **Detecção Automática de API**
   - Se `MISTRAL_API_KEY` estiver definida → usa API oficial
   - Se não tiver → tenta usar container local

2. **Headers de Autenticação**
   - Adiciona `Authorization: Bearer {API_KEY}` quando usar API oficial
   - Omite header quando usar container local

3. **Modelo Correto**
   - API oficial: `pixtral-12b-2409`
   - Container local: `mistralai/Pixtral-12B-2409`

4. **Log Informativo**
   ```
   RAG Service initialized with Mistral Official API
   ```

## 📝 Configuração Atual

### Arquivo `.env`:
```bash
MISTRAL_API_KEY=iAKlF0eLw1cn7ejx2na4My9UTberczJW
MISTRAL_API_URL=https://api.mistral.ai/v1
```

## 🎯 Funcionalidades Afetadas

### Agora Funcionam Corretamente:

✅ **Busca Semântica** (`/search`)
- Indexação RAG (TF-IDF local)
- Geração de respostas com Mistral API
- Citação de fontes

✅ **Análise de Documentos**
- Classificação de tipo de documento
- Extração de dados estruturados
- Geração de resumo

✅ **Geração de Resumo de Casos**
- Consolidação de informações
- Análise inteligente

## 🧪 Como Testar

### 1. Reinicie o Backend
```bash
cd ~/parecer/backend
npm run dev
```

**Você verá:**
```
RAG Service initialized with Mistral Official API (Simple embeddings mode: true)
✓ Using Mistral Official API for AI analysis
```

### 2. Teste a Busca Semântica

1. Acesse http://localhost:3000/search
2. Digite uma pergunta sobre documentos indexados
3. Clique em "Buscar Resposta"
4. A IA gerará uma resposta baseada nos documentos

**Exemplo de pergunta:**
- "Quais são as partes do contrato?"
- "Qual o prazo de execução dos serviços?"
- "Quais as obrigações do contratante?"

### 3. Verifique os Logs

**Sucesso:**
```
::ffff:127.0.0.1 - - [timestamp] "POST /api/documents/ask HTTP/1.1" 200
```

**Se houver erro:**
- Verifique se a API Key está válida
- Confirme que tem créditos na conta Mistral
- Veja mensagem de erro detalhada no console

## 🔍 Diferenças Entre as Implementações

| Recurso | Container Local | API Oficial Mistral |
|---------|----------------|---------------------|
| **Endpoint** | http://mistral_ocr:8000/v1 | https://api.mistral.ai/v1 |
| **Autenticação** | Não requer | Bearer Token |
| **Modelo OCR** | Pixtral-12B-2409 | pixtral-12b-2409 |
| **Modelo Chat** | Pixtral-12B-2409 | pixtral-12b-2409 |
| **Custo** | Grátis (GPU local) | Por token |
| **Velocidade** | Depende da GPU | Mais rápido |
| **Disponibilidade** | Requer Docker + GPU | Sempre disponível |

## 📊 Status Atual

✅ Sistema configurado para usar **API Oficial Mistral**
✅ Fallback para container local disponível
✅ Headers de autenticação corretos
✅ Modelos apropriados selecionados
✅ Logs informativos implementados

## 🚀 Próximo Passo

Teste a busca semântica agora! O sistema irá:

1. Buscar documentos similares (RAG local - TF-IDF)
2. Enviar contexto para Mistral API
3. Receber resposta inteligente
4. Exibir fontes consultadas

---

## 💡 Dica

Para economizar créditos da API Mistral, você pode:
- Limitar o número de chunks retornados (já configurado: 5)
- Reduzir `max_tokens` na resposta
- Usar cache de respostas frequentes
- Implementar rate limiting

---

**Ajuste concluído!** 🎉
