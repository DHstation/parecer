# 🔑 Configuração da API Mistral

## ✅ Alterações Implementadas

O sistema agora suporta **usar a API oficial do Mistral** em vez de rodar localmente!

### Benefícios:
- ✅ Não precisa de GPU
- ✅ Não precisa baixar 20GB de modelo
- ✅ Mais rápido e confiável
- ✅ Suporta OCR com Pixtral
- ✅ Análise inteligente de documentos

## 📝 Como Configurar

### 1. Criar conta na Mistral AI

Acesse: **https://console.mistral.ai/**

1. Crie uma conta (gratuita para começar)
2. Acesse o dashboard

### 2. Gerar API Key

1. No dashboard, vá em **"API Keys"**
2. Clique em **"Create new key"**
3. Dê um nome (ex: "parecer-system")
4. **Copie** a chave (começa com algo como `BRk...`)

### 3. Configurar no `.env`

Edite o arquivo `backend/.env`:

```bash
# Mistral AI
MISTRAL_API_KEY=sua_chave_aqui
MISTRAL_API_URL=https://api.mistral.ai/v1
```

### 4. Reiniciar o backend

```bash
cd ~/parecer/backend
npm run dev
```

Você verá a mensagem:
```
✓ Using Mistral Official API for AI analysis
✓ Using Mistral Official API
```

## 💰 Preços (aproximados)

A Mistral tem planos pay-as-you-go:

| Modelo | Uso | Preço estimado |
|--------|-----|----------------|
| **Pixtral** (OCR) | $0.25/1M tokens | ~$0.01 por documento |
| **Mistral Large** (Análise) | $0.40/1M tokens | ~$0.005 por análise |

**Custo estimado**: ~**$0.015 por documento completo** (OCR + análise)

👉 **Para 100 documentos**: ~$1.50

## 🆓 Alternativa: Sistema funciona sem API!

Se não quiser usar a API Mistral:

1. **Mantenha `MISTRAL_API_KEY` vazio**
2. O sistema vai usar:
   - ✅ Extração nativa de texto de PDFs (funciona muito bem!)
   - ✅ Análises básicas automáticas
   - ✅ Busca semântica com TF-IDF

**Ou seja: o sistema funciona completamente sem a API!**

## 🔍 O que cada componente faz

### Com API Mistral:
1. **OCR (Pixtral)**
   - Extrai texto de PDFs escaneados
   - Extrai texto de imagens
   - Identifica estruturas complexas

2. **Análise de Documentos (Mistral Large)**
   - Classifica tipo de documento
   - Extrai partes, datas, valores
   - Gera resumos executivos
   - Cria questionários automaticamente

### Sem API Mistral:
1. **Extração de PDF**
   - Usa `pdf-parse` para texto nativo
   - Funciona para PDFs com texto selecionável
   - Rápido e gratuito

2. **Análise Básica**
   - Resumos simples (primeiros 500 caracteres)
   - Busca por palavras-chave
   - Questionários padrão

## 🎯 Recomendação

**Para desenvolvimento/testes**: Não use API (economize dinheiro)

**Para produção**: Use API Mistral para melhores resultados

## 📊 Modelos Utilizados

Quando usando API oficial:

| Serviço | Modelo | Motivo |
|---------|--------|--------|
| OCR | `pixtral-12b-2409` | Único modelo com visão |
| Análise | `mistral-large-latest` | Melhor para estruturação JSON |
| RAG | TF-IDF local | Gratuito e rápido |

## 🔧 Troubleshooting

### Erro: "Invalid API Key"
- Verifique se copiou a chave completa
- Não adicione espaços antes/depois
- Formato: `MISTRAL_API_KEY=sk_...` (sem aspas)

### Erro: "Rate limit exceeded"
- Aguarde 1 minuto
- Reduza volume de processamento
- Considere upgrade do plano

### Erro: "Model not found"
- Verifique se seu plano tem acesso ao Pixtral
- Alguns modelos requerem plano pago

## 📖 Documentação Oficial

- API Docs: https://docs.mistral.ai/
- Pricing: https://mistral.ai/technology/#pricing
- Modelos: https://docs.mistral.ai/getting-started/models/

## ✅ Checklist de Configuração

- [ ] Criar conta na Mistral AI
- [ ] Gerar API Key
- [ ] Adicionar `MISTRAL_API_KEY` no `.env`
- [ ] Reiniciar backend
- [ ] Ver mensagem "✓ Using Mistral Official API"
- [ ] Testar upload de documento
- [ ] Verificar OCR funciona

---

**Pronto! Sistema configurado para usar Mistral AI! 🚀**
