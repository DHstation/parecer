const axios = require('axios');

class AIService {
  constructor() {
    this.mistralApiUrl = process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1';
    this.mistralApiKey = process.env.MISTRAL_API_KEY || null;
    this.useOfficialAPI = !!this.mistralApiKey;

    // Modelo a ser usado (oficial usa mistral-large, local usa Pixtral)
    this.model = this.useOfficialAPI ? 'mistral-large-latest' : 'mistralai/Pixtral-12B-2409';

    if (!this.mistralApiKey) {
      console.warn('⚠ Mistral API Key not configured - AI analysis features will be limited');
    }
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
   * Analisar documento e extrair informações estruturadas
   */
  async analyzeDocument(text, documentType) {
    try {
      if (!this.mistralApiKey) {
        console.warn('Mistral API not available, skipping AI analysis');
        return this.getFallbackAnalysis(text);
      }

      const prompt = this.buildAnalysisPrompt(text, documentType);

      const response = await axios.post(
        `${this.mistralApiUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `Você é um assistente jurídico especializado em análise de documentos.
              Extraia informações estruturadas e relevantes de documentos jurídicos.
              Retorne sempre em formato JSON válido.`,
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
        }
      );

      const analysis = JSON.parse(response.data.choices[0].message.content);
      return analysis;
    } catch (error) {
      console.error('Error analyzing document:', error);
      throw error;
    }
  }

  /**
   * Construir prompt para análise baseado no tipo de documento
   */
  buildAnalysisPrompt(text, documentType) {
    const basePrompt = `Analise o seguinte documento jurídico e extraia as informações em formato JSON:

${text.slice(0, 8000)}

Retorne um JSON com a seguinte estrutura:
{
  "documentType": "tipo do documento",
  "confidence": 0.0-1.0,
  "summary": "resumo executivo do documento",
  "keyPoints": ["ponto 1", "ponto 2"],
  "partes": [{"tipo": "autor/reu", "nome": "...", "cpfCnpj": "..."}],
  "advogados": [{"nome": "...", "oab": "..."}],
  "numeroProcesso": "...",
  "datas": [{"tipo": "...", "data": "YYYY-MM-DD", "descricao": "..."}],
  "valores": [{"tipo": "...", "valor": 0.0}],
  "assunto": "...",
  "pedidos": ["pedido 1", "pedido 2"],
  "fundamentosLegais": ["art. X lei Y", "art. Z lei W"]
}`;

    return basePrompt;
  }

  /**
   * Gerar questionário baseado no conteúdo do documento
   */
  async generateQuestionnaire(documents, caseContext = {}) {
    try {
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
- Verifiquem conformidade procedimental`;

      const response = await axios.post(
        `${this.mistralApiUrl}/chat/completions`,
        {
          model: 'mistralai/Pixtral-12B-2409',
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
          max_tokens: 3000,
          temperature: 0.4,
          response_format: { type: 'json_object' },
        },
        {
          timeout: 120000,
        }
      );

      const questionnaire = JSON.parse(response.data.choices[0].message.content);
      return questionnaire;
    } catch (error) {
      console.error('Error generating questionnaire:', error);
      throw error;
    }
  }

  /**
   * Classificar tipo de documento
   */
  async classifyDocument(text) {
    try {
      const preview = text.slice(0, 2000);

      const response = await axios.post(
        `${this.mistralApiUrl}/chat/completions`,
        {
          model: 'mistralai/Pixtral-12B-2409',
          messages: [
            {
              role: 'system',
              content: 'Você é um especialista em documentos jurídicos. Classifique o tipo de documento.',
            },
            {
              role: 'user',
              content: `Classifique este documento jurídico:

${preview}

Retorne JSON:
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
        }
      );

      return JSON.parse(response.data.choices[0].message.content);
    } catch (error) {
      console.error('Error classifying document:', error);
      return { type: 'outro', confidence: 0, reasoning: 'Error in classification' };
    }
  }

  /**
   * Gerar resumo executivo de um caso
   */
  async generateCaseSummary(documents, caseInfo) {
    try {
      const documentsText = documents
        .map((doc) => `[${doc.documentType}]\n${doc.summary || doc.ocrText?.slice(0, 1000)}`)
        .join('\n\n---\n\n');

      const prompt = `Gere um resumo executivo completo do seguinte caso jurídico:

Informações do Caso:
${JSON.stringify(caseInfo, null, 2)}

Documentos:
${documentsText}

Gere um resumo executivo que inclua:
1. Panorama geral do caso
2. Partes envolvidas
3. Linha do tempo dos eventos principais
4. Questões jurídicas centrais
5. Pontos críticos a serem analisados
6. Riscos identificados
7. Oportunidades

Retorne em formato de texto estruturado e profissional.`;

      const response = await axios.post(
        `${this.mistralApiUrl}/chat/completions`,
        {
          model: 'mistralai/Pixtral-12B-2409',
          messages: [
            {
              role: 'system',
              content: 'Você é um advogado sênior gerando resumos executivos de casos.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 2048,
          temperature: 0.3,
        },
        {
          timeout: 90000,
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Error generating case summary:', error);
      throw error;
    }
  }
}

module.exports = new AIService();
