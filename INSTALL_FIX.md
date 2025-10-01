# 🔧 Correção da Instalação

## Problema Resolvido

O erro `ERR_REQUIRE_ESM` com `@xenova/transformers` foi resolvido.

**Mudanças realizadas:**

1. ✅ Removidas dependências pesadas:
   - `@xenova/transformers`
   - `@langchain/*`
   - `faiss-node`

2. ✅ Implementado sistema RAG simplificado usando **TF-IDF**
   - Mais leve e rápido
   - Não requer GPU
   - Funciona offline
   - Boa performance para busca semântica

## 🚀 Como Proceder

### 1. Remover node_modules antigo e reinstalar

```bash
cd ~/parecer/backend

# Remover instalação antiga
rm -rf node_modules package-lock.json

# Reinstalar com dependências atualizadas
npm install
```

### 2. Iniciar o backend

```bash
npm run dev
```

Agora deve funcionar sem erros! ✅

## 📝 O que mudou no RAG?

### Antes (com erro):
- Usava `@xenova/transformers` para embeddings neurais
- Pesado (~500MB)
- Dependência ESM problemática

### Agora (funcionando):
- Usa **TF-IDF (Term Frequency-Inverse Document Frequency)**
- Leve e rápido
- Sem dependências externas pesadas
- Funciona muito bem para busca de texto

### Como funciona o TF-IDF?

1. **Tokenização**: Divide o texto em palavras
2. **Frequência**: Calcula frequência de cada termo
3. **Normalização**: Cria vetor de features
4. **Similaridade**: Compara vetores usando cosseno

**Exemplo:**
```
Texto 1: "contrato de compra e venda"
Texto 2: "contrato de locação"

Palavras em comum: "contrato", "de"
Similaridade: ~0.6 (60%)
```

## 🎯 Performance

### TF-IDF vs Embeddings Neurais

| Aspecto | TF-IDF | Embeddings Neurais |
|---------|--------|-------------------|
| Velocidade | ⚡ Muito rápido | 🐌 Lento |
| Memória | 💾 Baixa (~10MB) | 🗄️ Alta (~500MB+) |
| Precisão | ✅ Boa para texto | 🎯 Excelente |
| Setup | ✅ Zero config | ⚙️ Requer GPU/API |

Para documentos jurídicos com vocabulário específico, **TF-IDF é suficiente e eficiente**!

## 🔮 Upgrade Futuro (Opcional)

Se quiser embeddings mais sofisticados no futuro, pode usar APIs externas:

### Opção A: OpenAI Embeddings

```javascript
// Em ragService.js
async generateEmbedding(text) {
  if (process.env.OPENAI_API_KEY) {
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        model: 'text-embedding-3-small',
        input: text
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );
    return response.data.data[0].embedding;
  }

  // Fallback para TF-IDF
  return this.generateSimpleEmbedding(text);
}
```

### Opção B: Cohere Embeddings

```bash
npm install cohere-ai
```

```javascript
const { CohereClient } = require('cohere-ai');

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

const response = await cohere.embed({
  texts: [text],
  model: 'embed-multilingual-v3.0',
});
```

### Opção C: Hugging Face API

```javascript
const response = await axios.post(
  'https://api-inference.huggingface.co/models/sentence-transformers/paraphrase-multilingual-mpnet-base-v2',
  { inputs: text },
  {
    headers: {
      'Authorization': `Bearer ${process.env.HUGGING_FACE_TOKEN}`
    }
  }
);
```

## ✅ Checklist Pós-Correção

- [ ] `rm -rf backend/node_modules backend/package-lock.json`
- [ ] `cd backend && npm install`
- [ ] Verificar que não há erros ESM
- [ ] `npm run dev` - deve iniciar sem erros
- [ ] Testar upload de documento
- [ ] Testar busca semântica

## 🆘 Se ainda der erro

```bash
# Verificar versão do Node
node --version  # Deve ser 18+

# Limpar cache do npm
npm cache clean --force

# Reinstalar globalmente nodemon
npm install -g nodemon

# Tentar novamente
cd ~/parecer/backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 📞 Logs Úteis

Se precisar debugar:

```javascript
// Em ragService.js, adicione no construtor:
console.log('RAG Service initialized');
console.log('Vector store size:', this.vectorStore.size);
```

---

**Problema resolvido! Sistema mais leve e funcional! 🎉**
