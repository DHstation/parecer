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
   * Classificar tipo de documento por padrões (rápido, sem API)
   */
  classifyByPatterns(text) {
    const textLower = text.toLowerCase();
    const first500 = textLower.slice(0, 500);
    const first2000 = textLower.slice(0, 2000);

    // Detectar documentos que devem ser classificados como "outro" PRIMEIRO
    const outroPatterns = [
      /ata\s+(de\s+)?assembl(e|é)ia/i,
      /assembl(e|é)ia\s+geral/i,
      /edital/i,
      /portaria/i,
      /regulamento/i,
      /estatuto\s+social/i
    ];

    for (const pattern of outroPatterns) {
      if (pattern.test(first2000)) {
        return { type: 'outro', confidence: 0.90, reasoning: 'Pattern matching - Documento especial detectado' };
      }
    }

    const scores = {
      peticao_inicial: 0,
      contestacao: 0,
      sentenca: 0,
      acordao: 0,
      despacho: 0,
      parecer: 0,
      contrato: 0,
      procuracao: 0,
      documento_pessoal: 0
    };

    // PARECER - Maior prioridade quando identificado
    if (/parecer\s+jur[ií]dico/i.test(first500)) scores.parecer += 30;
    else if (/parecer/i.test(first2000)) scores.parecer += 20;

    if (/opini[ãa]o\s+jur[ií]dica/i.test(textLower)) scores.parecer += 12;
    if (/(entende-se|conclui-se|opina-se)\s+que/i.test(textLower)) scores.parecer += 10;
    if (/an[áa]lise\s+jur[ií]dica/i.test(textLower)) scores.parecer += 8;

    // SENTENÇA - Padrões específicos
    if (/senten[çc]a/i.test(textLower)) scores.sentenca += 18;
    if (/julgo\s+(procedente|improcedente)/i.test(textLower)) scores.sentenca += 15;
    if (/dispositivo.*julgo/i.test(textLower)) scores.sentenca += 8;
    if (/ante\s+o\s+exposto/i.test(textLower)) scores.sentenca += 5;

    // ACÓRDÃO - Padrões de tribunal
    if (/ac[óo]rd[ãa]o/i.test(textLower)) scores.acordao += 20;
    if (/desembargador/i.test(textLower)) scores.acordao += 15;
    if (/tribunal/i.test(textLower)) scores.acordao += 8;
    if (/vistos,?\s+relatados/i.test(textLower)) scores.acordao += 10;

    // PETIÇÃO INICIAL - Início de ação
    if (/peti[çc][ãa]o\s+inicial/i.test(first2000)) scores.peticao_inicial += 20;
    if (/exmo.*juiz/i.test(first500) && /requer/i.test(textLower)) scores.peticao_inicial += 12;
    if (/vem\s+respeitosamente/i.test(first2000)) scores.peticao_inicial += 10;
    if (/dos\s+fatos/i.test(textLower) && /dos\s+pedidos/i.test(textLower)) scores.peticao_inicial += 8;

    // CONTESTAÇÃO - Resposta do réu
    if (/contesta[çc][ãa]o/i.test(first2000)) scores.contestacao += 20;
    if (/impugna[çc][ãa]o/i.test(textLower)) scores.contestacao += 12;
    if (/r[ée]u/i.test(textLower) && /improcedente/i.test(textLower)) scores.contestacao += 10;
    if (/n[ãa]o\s+procede/i.test(textLower)) scores.contestacao += 5;

    // CONTRATO - Acordos entre partes
    if (/contrato/i.test(first2000)) scores.contrato += 20;
    if (/cl[áa]usula/i.test(textLower) && /contratante/i.test(textLower)) scores.contrato += 15;
    if (/partes\s+contratantes/i.test(textLower)) scores.contrato += 12;
    if (/contratado/i.test(textLower) && /contratante/i.test(textLower)) scores.contrato += 10;

    // PROCURAÇÃO - Delegação de poderes
    if (/procura[çc][ãa]o/i.test(first2000)) scores.procuracao += 20;
    if (/poderes\s+para/i.test(textLower)) scores.procuracao += 15;
    if (/outorgante/i.test(textLower) && /outorgado/i.test(textLower)) scores.procuracao += 12;
    if (/constitui.*advogado/i.test(textLower)) scores.procuracao += 10;

    // DESPACHO - Decisão judicial simples
    if (/despacho/i.test(first2000)) scores.despacho += 20;
    if (/(defiro|indefiro)/i.test(textLower)) scores.despacho += 12;
    if (/(intime-se|intimem-se|cumpra-se)/i.test(textLower)) scores.despacho += 10;

    // DOCUMENTO PESSOAL - RG, CPF, Certidões
    if (/certid[ãa]o/i.test(textLower)) scores.documento_pessoal += 18;
    if (/\b(rg|cpf)\b/i.test(textLower)) scores.documento_pessoal += 15;
    if (/carteira\s+de\s+identidade/i.test(textLower)) scores.documento_pessoal += 12;
    if (/registro\s+geral/i.test(textLower)) scores.documento_pessoal += 10;

    // REGRAS DE EXCLUSÃO - Evitar conflitos entre tipos

    // Se claramente parecer, reduzir sentença/despacho
    if (scores.parecer >= 20) {
      scores.sentenca -= 15;
      scores.despacho -= 15;
      scores.acordao -= 10;
    }

    // Se claramente sentença, reduzir parecer
    if (scores.sentenca >= 18 && /julgo/i.test(textLower)) {
      scores.parecer -= 12;
    }

    // Se tem "parecer" no título mas tem "julgo", é sentença
    if (/parecer/i.test(first500) && /julgo\s+(procedente|improcedente)/i.test(textLower)) {
      scores.parecer -= 20;
      scores.sentenca += 10;
    }

    // Se é acórdão, não pode ser sentença
    if (scores.acordao >= 20) {
      scores.sentenca -= 10;
    }

    // Se é contrato, não pode ser procuração
    if (scores.contrato >= 20) {
      scores.procuracao -= 15;
    }

    // Encontrar tipo com maior pontuação
    let maxScore = 0;
    let bestType = 'outro';

    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestType = type;
      }
    }

    // Calcular confiança baseado na pontuação
    const confidence = Math.min(0.98, maxScore / 25);

    return {
      type: maxScore > 10 ? bestType : 'outro',
      confidence,
      reasoning: 'Pattern matching'
    };
  }

  /**
   * Classificar tipo de documento (COM RATE LIMITING)
   */
  async classifyDocument(text) {
    try {
      // SEMPRE usar pattern matching primeiro (instantâneo, sem custo)
      const patternResult = this.classifyByPatterns(text);

      // Se confiança alta (>70%), retornar direto
      if (patternResult.confidence >= 0.7) {
        console.log(`✓ Classified by patterns: ${patternResult.type} (${Math.round(patternResult.confidence * 100)}%)`);
        return patternResult;
      }

      // Se API não disponível, retornar pattern matching
      if (!this.mistralApiKey) {
        console.log(`✓ Classified by patterns (no API): ${patternResult.type} (${Math.round(patternResult.confidence * 100)}%)`);
        return patternResult;
      }

      // Pegar início, meio e fim do documento para melhor análise
      const inicio = text.slice(0, 2500);
      const meio = text.slice(Math.floor(text.length / 2) - 500, Math.floor(text.length / 2) + 500);
      const fim = text.slice(-1500);
      const preview = `INÍCIO:\n${inicio}\n\n[...]\n\nMEIO:\n${meio}\n\n[...]\n\nFIM:\n${fim}`;

      // Tentar API (com rate limiting)
      const classification = await this.queueApiCall(async () => {
        console.log('🏷️  Classifying document...');

        const response = await axios.post(
          `${this.mistralApiUrl}/chat/completions`,
          {
            model: this.model,
            messages: [
              {
                role: 'system',
                content: 'Você é um especialista em análise e classificação de documentos jurídicos brasileiros. Analise cuidadosamente todo o conteúdo e classifique com precisão. Retorne APENAS JSON válido.',
              },
              {
                role: 'user',
                content: `Analise este documento jurídico e classifique seu tipo com ALTA PRECISÃO:

${preview}

TIPOS DE DOCUMENTOS (escolha o mais apropriado):

1. peticao_inicial - Petição inicial de ação judicial (contém: "Exmo", "requer", "dos pedidos", "valor da causa", "autor:")
2. contestacao - Contestação ou resposta à ação (contém: "contestação", "impugnação", "réu:", "pela improcedência")
3. sentenca - Sentença judicial de 1ª instância (contém: "SENTENÇA", "julgo procedente/improcedente", "ante o exposto", "custas processuais")
4. acordao - Acórdão de tribunal/2ª instância (contém: "ACÓRDÃO", "Desembargador", "Tribunal", "vistos, relatados")
5. despacho - Despacho judicial (contém: "DESPACHO", "defiro", "indefiro", "manifeste-se", documento curto)
6. parecer - Parecer jurídico ou técnico (contém: "PARECER", "opina-se", "análise jurídica")
7. contrato - Contrato entre partes (contém: "CONTRATO", "cláusula", "contratante", "contratado")
8. procuracao - Procuração (contém: "PROCURAÇÃO", "poderes para", "outorgante", "outorgado")
9. documento_pessoal - RG, CPF, CNH, certidões (contém: "RG", "CPF", "certidão", "nascimento")
10. outro - Nenhum dos anteriores

IMPORTANTE:
- Analise INÍCIO, MEIO e FIM do documento
- Procure palavras-chave específicas de cada tipo
- Não confunda sentença com acórdão
- Não confunda petição inicial com contestação
- Considere o contexto completo

Retorne APENAS este JSON (sem markdown, sem explicações):
{
  "type": "tipo_escolhido",
  "confidence": 0.0-1.0,
  "reasoning": "justificativa baseada em palavras-chave encontradas"
}`,
              },
            ],
            max_tokens: 300,
            temperature: 0.05,
            response_format: { type: 'json_object' },
          },
          {
            timeout: 45000,
            headers: this.getHeaders(),
          }
        );

        const content = response.data.choices[0].message.content;
        console.log('📄 Raw classification response:', content.substring(0, 200));

        const parsed = this.parseJSONFromMarkdown(content);
        console.log(`✓ Classified as: ${parsed.type} (${Math.round(parsed.confidence * 100)}%)`);

        return parsed;
      });

      return classification;
    } catch (error) {
      console.error('❌ API classification failed:', error.response?.data?.message || error.message);
      // Fallback para pattern matching se API falhar
      const patternResult = this.classifyByPatterns(text);
      console.log(`✓ Fallback to patterns: ${patternResult.type} (${Math.round(patternResult.confidence * 100)}%)`);
      return patternResult;
    }
  }

  /**
   * Parse JSON from markdown code blocks
   */
  parseJSONFromMarkdown(content) {
    try {
      let cleanContent = content.trim();

      // Remove markdown code blocks (```json ... ``` ou ``` ... ```)
      const jsonMatch = cleanContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);

      if (jsonMatch) {
        cleanContent = jsonMatch[1].trim();
      }

      // Remove backticks soltos no início e fim
      cleanContent = cleanContent.replace(/^`+|`+$/g, '');

      // Tentar parsear
      return JSON.parse(cleanContent);
    } catch (error) {
      console.error('❌ Error parsing JSON from markdown:', error.message);
      console.error('Content received (first 500 chars):', content.substring(0, 500));
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
