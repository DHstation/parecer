const axios = require('axios');

class AIService {
  constructor() {
    this.mistralApiUrl = process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1';
    this.mistralApiKey = process.env.MISTRAL_API_KEY || null;
    this.useOfficialAPI = !!this.mistralApiKey;

    // Modelo a ser usado (oficial usa mistral-large, local usa Pixtral)
    this.model = this.useOfficialAPI ? 'mistral-large-latest' : 'mistralai/Pixtral-12B-2409';

    // Rate limiting para evitar exceder limites da API
    this.lastApiCall = 0;
    this.minDelayBetweenCalls = 6000; // 6 segundos entre chamadas (10 req/min = seguro)
    this.requestQueue = Promise.resolve();

    if (this.mistralApiKey) {
      console.log('✓ Using Mistral Official API for AI analysis');
      console.log(`⏱ Rate limiting enabled: ${this.minDelayBetweenCalls/1000}s between API calls`);
    } else {
      console.warn('⚠ Mistral API Key not configured - AI analysis will use fallback methods');
    }
  }

  /**
   * Aguardar delay necessário para rate limiting
   */
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;

    if (timeSinceLastCall < this.minDelayBetweenCalls) {
      const waitTime = this.minDelayBetweenCalls - timeSinceLastCall;
      console.log(`⏳ Rate limit: waiting ${(waitTime/1000).toFixed(1)}s before next API call`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastApiCall = Date.now();
  }

  /**
   * Enfileirar chamada à API com rate limiting
   */
  async queueApiCall(apiFunction) {
    // Adicionar à fila sequencial
    this.requestQueue = this.requestQueue.then(async () => {
      await this.waitForRateLimit();
      return apiFunction();
    });

    return this.requestQueue;
  }

  /**
   * Obter headers para requisições
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.mistralApiKey) {
      headers['Authorization'] = `Bearer ${this.mistralApiKey}`;
    }

    return headers;
  }

  /**
   * Análise fallback quando API não está disponível
   */
  getFallbackAnalysis(text) {
    return {
      documentType: 'outro',
      confidence: 0.3,
      summary: text.substring(0, 500) + '...',
      keyPoints: ['Análise automática indisponível'],
      partes: [],
      advogados: [],
      numeroProcesso: null,
      datas: [],
      valores: [],
      assunto: 'Não identificado',
      pedidos: [],
      fundamentosLegais: [],
    };
  }

  /**
   * Analisar documento e extrair informações estruturadas (COM RATE LIMITING)
   */
  async analyzeDocument(text, documentType) {
    try {
      if (!this.mistralApiKey) {
        return this.getFallbackAnalysis(text);
      }

      const prompt = this.buildAnalysisPrompt(text, documentType);

      // Enfileirar chamada com rate limiting
      const analysis = await this.queueApiCall(async () => {
        console.log('📊 Analyzing document...');

        const response = await axios.post(
          `${this.mistralApiUrl}/chat/completions`,
          {
            model: this.model,
            messages: [
              {
                role: 'system',
                content: `Você é um assistente jurídico especializado em análise de documentos.
                Extraia informações estruturadas e relevantes de documentos jurídicos.
                IMPORTANTE: Retorne APENAS o JSON válido, sem markdown, sem explicações, sem código de formatação.`,
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            max_tokens: 2048,
            temperature: 0.2,
            response_format: { type: 'json_object' },
          },
          {
            timeout: 90000,
            headers: this.getHeaders(),
          }
        );

        const content = response.data.choices[0].message.content;
        return this.parseJSONFromMarkdown(content);
      });

      return analysis;
    } catch (error) {
      console.error('Error analyzing document:', error.response?.data || error.message);
      return this.getFallbackAnalysis(text);
    }
  }

  /**
   * Construir prompt para análise baseado no tipo de documento
   */
  buildAnalysisPrompt(text, documentType) {
    const basePrompt = `Analise o seguinte documento jurídico e extraia APENAS as informações REAIS que estão no texto.

IMPORTANTE:
- Se uma informação NÃO estiver presente no documento, use null ou array vazio []
- NÃO use placeholders como "[valor]", "[data]", "[nome]"
- NÃO invente informações
- Extraia APENAS dados concretos que aparecem no texto

Documento:
${text.slice(0, 8000)}

Retorne JSON válido com esta estrutura (use null/[] para dados ausentes):
{
  "documentType": "tipo identificado",
  "confidence": 0.0-1.0,
  "summary": "resumo do que está escrito",
  "keyPoints": ["pontos principais REAIS do texto"],
  "partes": [{"tipo": "autor/reu", "nome": "nome real", "cpfCnpj": "cpf/cnpj real"}],
  "advogados": [{"nome": "nome real", "oab": "número real"}],
  "numeroProcesso": "número real ou null",
  "datas": [{"tipo": "descrição", "data": "YYYY-MM-DD real", "descricao": "contexto"}],
  "valores": [{"tipo": "descrição", "valor": numero_real}],
  "assunto": "assunto identificado ou null",
  "pedidos": ["pedidos REAIS do documento"],
  "fundamentosLegais": ["leis/artigos CITADOS no texto"]
}`;

    return basePrompt;
  }

  /**
   * Gerar questionário baseado no conteúdo do documento
   */
  async generateQuestionnaire(documents, caseContext = {}) {
    return this.queueApiCall(async () => {
      console.log('📝 Generating questionnaire...');

      try {
        if (!this.mistralApiKey) {
          return this.getFallbackQuestionnaire();
        }

        // Combinar texto dos documentos
        const combinedText = documents
          .map((doc) => `[${doc.documentType}] ${doc.ocrText}`)
          .join('\n\n---\n\n')
          .slice(0, 10000);

        const prompt = `Com base nos seguintes documentos jurídicos, gere um questionário completo para auxiliar na elaboração de um parecer:

Contexto do caso:
${JSON.stringify(caseContext, null, 2)}

Documentos:
${combinedText}

Gere um questionário em JSON com a seguinte estrutura:
{
  "title": "Título do questionário",
  "description": "Descrição",
  "questions": [
    {
      "question": "Pergunta específica",
      "category": "facts|evidence|legal_basis|procedure|risks|strategy",
      "priority": "low|medium|high|critical",
      "contextSource": "trecho relevante do documento"
    }
  ]
}

Foque em perguntas que:
- Esclareçam fatos importantes
- Identifiquem lacunas de informação
- Avaliem riscos e oportunidades
- Sugiram estratégias processuais
- Verifiquem conformidade procedimental

IMPORTANTE: Retorne APENAS o JSON válido, sem markdown, sem explicações adicionais.`;

        const response = await axios.post(
          `${this.mistralApiUrl}/chat/completions`,
          {
            model: this.model,
            messages: [
              {
                role: 'system',
                content: 'Você é um assistente jurídico especializado em elaboração de questionários para análise de processos.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            response_format: { type: 'json_object' },
            max_tokens: 3000,
            temperature: 0.4,
          },
          {
            timeout: 120000,
            headers: this.getHeaders(),
          }
        );

        const content = response.data.choices[0].message.content;
        const questionnaire = this.parseJSONFromMarkdown(content);
        return questionnaire;
      } catch (error) {
        console.error('Error generating questionnaire:', error.response?.data || error.message);
        return this.getFallbackQuestionnaire();
      }
    });
  }

  /**
   * Questionário fallback
   */
  getFallbackQuestionnaire() {
    return {
      title: 'Questionário Básico',
      description: 'Questionário gerado automaticamente',
      questions: [
        {
          question: 'Quais são as partes envolvidas no processo?',
          category: 'facts',
          priority: 'high',
          contextSource: '',
        },
        {
          question: 'Qual é o pedido principal?',
          category: 'facts',
          priority: 'critical',
          contextSource: '',
        },
        {
          question: 'Quais provas foram apresentadas?',
          category: 'evidence',
          priority: 'high',
          contextSource: '',
        },
      ],
    };
  }

  /**
   * Classificar tipo de documento (COM RATE LIMITING)
   */
  async classifyDocument(text) {
    try {
      if (!this.mistralApiKey) {
        return { type: 'outro', confidence: 0, reasoning: 'API not available' };
      }

      const preview = text.slice(0, 2000);

      // Enfileirar chamada com rate limiting
      const classification = await this.queueApiCall(async () => {
        console.log('🏷️  Classifying document...');

        const response = await axios.post(
          `${this.mistralApiUrl}/chat/completions`,
          {
            model: this.model,
            messages: [
              {
                role: 'system',
                content: 'Você é um especialista em documentos jurídicos. Classifique o tipo de documento. Retorne APENAS JSON válido, sem markdown.',
              },
              {
                role: 'user',
                content: `Classifique este documento jurídico:

${preview}

Retorne apenas este JSON (sem markdown, sem explicações):
{
  "type": "peticao_inicial|contestacao|sentenca|acordao|despacho|parecer|contrato|procuracao|documento_pessoal|outro",
  "confidence": 0.0-1.0,
  "reasoning": "breve justificativa"
}`,
              },
            ],
            max_tokens: 200,
            temperature: 0.1,
            response_format: { type: 'json_object' },
          },
          {
            timeout: 30000,
            headers: this.getHeaders(),
          }
        );

        const content = response.data.choices[0].message.content;
        return this.parseJSONFromMarkdown(content);
      });

      return classification;
    } catch (error) {
      console.error('Error classifying document:', error.response?.data || error.message);
      return { type: 'outro', confidence: 0, reasoning: 'Error in classification' };
    }
  }

  /**
   * Parse JSON from markdown code blocks
   */
  parseJSONFromMarkdown(content) {
    try {
      // Remove markdown code blocks (```json ... ``` ou ``` ... ```)
      const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim());
      }

      // Se não tiver markdown, tenta parsear direto
      return JSON.parse(content.trim());
    } catch (error) {
      console.error('Error parsing JSON from markdown:', error.message);
      console.error('Content received:', content.substring(0, 200));
      throw error;
    }
  }

  /**
   * Gerar resumo executivo de um caso
   */
  async generateCaseSummary(documents, caseInfo) {
    return this.queueApiCall(async () => {
      try {
        if (!this.mistralApiKey) {
          return 'Resumo automático indisponível. Configure MISTRAL_API_KEY para habilitar esta funcionalidade.';
        }

        console.log('📝 Generating case summary...');

        const documentsText = documents
          .map((doc) => `[${doc.documentType}]\n${doc.summary || doc.ocrText?.slice(0, 800)}`)
          .join('\n\n---\n\n');

        const prompt = `Gere um resumo SIMPLES e CURTO (máximo 2-3 frases) do seguinte caso jurídico:

Informações do Caso:
${JSON.stringify(caseInfo, null, 2)}

Documentos:
${documentsText}

IMPORTANTE:
- Máximo 2-3 frases curtas
- Estilo objetivo e direto
- Mencione apenas: tipo de ação, partes principais e objeto principal
- Exemplo: "Ação de cobrança de honorários por prestação de serviços entre João Silva e Tech Solutions LTDA."

Retorne APENAS o resumo, sem introduções ou seções.`;

        const response = await axios.post(
          `${this.mistralApiUrl}/chat/completions`,
          {
            model: this.model,
            messages: [
              {
                role: 'system',
                content: 'Você é um assistente que gera resumos curtos e objetivos de casos jurídicos. Responda APENAS com o resumo, sem introduções.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            max_tokens: 400,
            temperature: 0.3,
          },
          {
            timeout: 90000,
            headers: this.getHeaders(),
          }
        );

        return response.data.choices[0].message.content;
      } catch (error) {
        console.error('Error generating case summary:', error.response?.data || error.message);
        return 'Erro ao gerar resumo. Verifique a configuração da API Mistral.';
      }
    });
  }
}

module.exports = new AIService();
