const axios = require('axios');
const pdf = require('pdf-parse');

class OCRService {
  constructor() {
    // Suporta tanto URL local quanto API oficial do Mistral
    this.mistralApiUrl = process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1';
    this.mistralApiKey = process.env.MISTRAL_API_KEY || null;
    this.useOfficialAPI = !!this.mistralApiKey;

    if (this.useOfficialAPI) {
      console.log('✓ Using Mistral Official API');
    } else {
      console.log('⚠ Mistral API Key not configured - OCR will only work with native PDF text extraction');
    }
  }

  /**
   * Processar documento com OCR usando Mistral
   */
  async processDocument(documentBuffer, mimeType) {
    try {
      // Validar entrada
      if (!documentBuffer || !Buffer.isBuffer(documentBuffer)) {
        throw new Error('Invalid document buffer');
      }

      if (!mimeType) {
        throw new Error('MIME type is required');
      }

      // Se for PDF, primeiro tenta extrair texto nativo
      if (mimeType === 'application/pdf') {
        try {
          const pdfText = await this.extractPdfText(documentBuffer);
          if (pdfText && pdfText.trim().length > 100) {
            console.log(`✓ PDF text extracted successfully (${pdfText.length} chars)`);
            return {
              text: pdfText,
              method: 'native_pdf',
              confidence: 0.95,
            };
          }
        } catch (error) {
          console.log('Native PDF extraction failed, falling back to OCR:', error.message);
        }
      }

      // Se falhou ou não é PDF, usa Mistral OCR
      return await this.performMistralOCR(documentBuffer, mimeType);
    } catch (error) {
      console.error('Error in OCR processing:', error.message);
      throw error;
    }
  }

  /**
   * Extrair texto nativo de PDF com sanitização robusta
   */
  async extractPdfText(buffer) {
    try {
      const data = await pdf(buffer, {
        max: 0, // sem limite de páginas
      });

      if (!data || !data.text) {
        throw new Error('No text extracted from PDF');
      }

      let text = data.text;
      const originalLength = text.length;

      // Log informações sobre o PDF
      console.log(`PDF Info: ${data.numpages} pages, ${originalLength} chars`);

      // Aplicar sanitização
      text = this.sanitizeText(text);

      const sanitizedLength = text.length;
      const diff = originalLength - sanitizedLength;

      if (diff > 0) {
        console.log(`Text sanitization: ${diff} chars corrected`);
      }

      return text;
    } catch (error) {
      console.error('Error extracting PDF text:', error.message);
      throw error;
    }
  }

  /**
   * Sanitizar texto removendo encoding incorreto e normalizando
   */
  sanitizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    try {
      // 1. Normalizar Unicode para composição canônica
      text = text.normalize('NFC');

      // 2. Remover caracteres de controle inválidos (mas manter quebras de linha)
      text = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

      // 3. Aplicar correções de encoding UTF-8
      text = this.fixEncodingIssues(text);

      // 4. Corrigir ligaduras tipográficas
      text = this.fixLigatures(text);

      // 5. Normalizar espaços em branco
      text = this.normalizeWhitespace(text);

      return text;
    } catch (error) {
      console.error('Error sanitizing text:', error.message);
      return text; // Retorna texto original em caso de erro
    }
  }

  /**
   * Corrigir problemas de encoding UTF-8
   */
  fixEncodingIssues(text) {
    // Mapeamento de caracteres UTF-8 corrompidos
    const encodingMap = {
      // Minúsculas com acentos
      'Ã§': 'ç', 'Ã£': 'ã', 'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í',
      'Ã³': 'ó', 'Ãº': 'ú', 'Ã¢': 'â', 'Ãª': 'ê', 'Ã´': 'ô',
      'Ã ': 'à', 'Ãµ': 'õ',

      // Maiúsculas com acentos
      'Ã': 'Á', 'Ã‰': 'É', 'Ã': 'Í', 'Ã"': 'Ó', 'Ãš': 'Ú',
      'Ã‚': 'Â', 'Ãˆ': 'Ê', 'ÃŽ': 'Î', 'Ã"': 'Ô', 'Ã€': 'À',
      'Ã‡': 'Ç', 'Ãƒ': 'Ã', 'Ã•': 'Õ',

      // Combinações comuns
      'Ã§Ã£o': 'ção', 'Ã§Ã£': 'ção', 'Ã§ao': 'ção',
      'Ã§Ãµes': 'ções', 'Ã§Ãµ': 'ções',
      'Ã£o': 'ão',
    };

    // Aplicar substituições (ordem importa - mais específico primeiro)
    const sortedEntries = Object.entries(encodingMap)
      .sort((a, b) => b[0].length - a[0].length); // Ordenar por tamanho (maior primeiro)

    for (const [wrong, correct] of sortedEntries) {
      if (text.includes(wrong)) {
        text = text.split(wrong).join(correct);
      }
    }

    // Padrões regex para casos genéricos
    // ÇÍO -> ÇÃO (em palavras maiúsculas)
    text = text.replace(/([A-ZÇÃÕ]{2,})ÇÍO/g, '$1ÇÃO');

    // Palavras específicas comuns
    const wordReplacements = {
      'PRESTAÇÍO': 'PRESTAÇÃO',
      'RESCISÍO': 'RESCISÃO',
      'OBSERVAÇÍO': 'OBSERVAÇÃO',
      'INFORMAÇÍO': 'INFORMAÇÃO',
      'OBRIGAÇÍO': 'OBRIGAÇÃO',
      'SITUAÇÍO': 'SITUAÇÃO',
    };

    for (const [wrong, correct] of Object.entries(wordReplacements)) {
      text = text.replace(new RegExp(wrong, 'g'), correct);
    }

    return text;
  }

  /**
   * Corrigir ligaduras tipográficas (fi, fl, ffi, ffl)
   * O caractere � (U+FFFD) frequentemente substitui essas ligaduras
   */
  fixLigatures(text) {
    // Verificar se há caracteres replacement
    if (!text.includes('�')) {
      return text;
    }

    // Palavras específicas conhecidas
    const ligatureWords = [
      ['identi�cad', 'identificad'],
      ['identi�', 'identifi'],
      ['especi�ca', 'especifica'],
      ['especí�ca', 'específica'],
      ['con�dencial', 'confidencial'],
      ['con�rma', 'confirma'],
      ['con�gura', 'configura'],
      ['con�', 'confi'],
      ['�rmam', 'firmam'],
      ['�rma', 'firma'],
      ['�nal', 'final'],
      ['pro�ssional', 'profissional'],
      ['of�cio', 'ofício'],
      ['of�cial', 'oficial'],
      ['bene�c', 'benefíc'],
      ['�sica', 'física'],
      ['arti�cial', 'artificial'],
      ['dif�cil', 'difícil'],
      ['justi�ca', 'justifica'],
      ['certi�ca', 'certifica'],
      ['rati�ca', 'ratifica'],
      ['noti�ca', 'notifica'],
      ['modi�ca', 'modifica'],
      ['clari�ca', 'clarifica'],
      ['plani�ca', 'planifica'],
      ['signi�ca', 'significa'],
      ['�ca', 'fica'],
      ['de�n', 'defin'],
      ['re�n', 'refin'],
      ['in�n', 'infin'],
    ];

    // Aplicar substituições (case-insensitive)
    for (const [wrong, correct] of ligatureWords) {
      const regex = new RegExp(wrong, 'gi');
      text = text.replace(regex, correct);
    }

    // Padrão genérico: letra + � + vogal/consoante = provavelmente "fi"
    text = text.replace(/([a-záéíóúãõâêôàçü])�([aeiouc])/gi, '$1fi$2');

    // � no início de palavra = provavelmente "fi"
    text = text.replace(/\b�([aeiouc])/gi, 'fi$1');

    // Avisar se ainda houver � no texto
    if (text.includes('�')) {
      const count = (text.match(/�/g) || []).length;
      console.warn(`⚠ Text still contains ${count} replacement character(s) after ligature fixing`);
    }

    return text;
  }

  /**
   * Normalizar espaços em branco
   */
  normalizeWhitespace(text) {
    // Remover espaços múltiplos (mas manter quebras de linha)
    text = text.replace(/ {2,}/g, ' ');

    // Remover espaços no início e fim de linhas
    text = text.split('\n').map(line => line.trim()).join('\n');

    // Limitar quebras de linha consecutivas a 2
    text = text.replace(/\n{3,}/g, '\n\n');

    // Remover espaços antes de pontuação
    text = text.replace(/ +([.,;:!?)])/g, '$1');

    // Adicionar espaço após pontuação se não houver
    text = text.replace(/([.,;:!?])([A-Za-z])/g, '$1 $2');

    return text.trim();
  }

  /**
   * Realizar OCR usando Mistral Pixtral
   */
  async performMistralOCR(documentBuffer, mimeType) {
    try {
      // Verificar se tem API key configurada
      if (!this.mistralApiKey) {
        throw new Error('Mistral API Key not configured. Please set MISTRAL_API_KEY in .env file');
      }

      // Validar tamanho do documento
      const sizeInMB = documentBuffer.length / (1024 * 1024);
      if (sizeInMB > 20) {
        console.warn(`⚠ Large document: ${sizeInMB.toFixed(2)}MB - OCR may take longer`);
      }

      // Converter buffer para base64
      const base64Document = documentBuffer.toString('base64');

      // Preparar headers
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.mistralApiKey}`,
      };

      // Modelo correto para API oficial do Mistral
      const model = this.useOfficialAPI ? 'pixtral-12b-2409' : 'mistralai/Pixtral-12B-2409';

      console.log(`Starting Mistral OCR with model ${model}...`);

      // Criar requisição para Mistral
      const response = await axios.post(
        `${this.mistralApiUrl}/chat/completions`,
        {
          model: model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extraia TODO o texto deste documento jurídico com máxima precisão.

IMPORTANTE:
- Mantenha a formatação e estrutura original
- Preserve números de processo, datas, valores, nomes e CPF/CNPJ
- Transcreva assinaturas e carimbos visíveis
- Use encoding UTF-8 correto para acentos (ç, ã, á, é, etc)
- NÃO adicione comentários ou explicações
- Retorne APENAS o texto extraído`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Document}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 4096,
          temperature: 0.1,
        },
        {
          timeout: 120000, // 2 minutos
          headers: headers,
        }
      );

      const extractedText = response.data.choices[0].message.content;

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('Mistral returned empty text');
      }

      console.log(`✓ Mistral OCR completed (${extractedText.length} chars)`);

      // Aplicar sanitização também no texto do Mistral
      const sanitizedText = this.sanitizeText(extractedText);

      return {
        text: sanitizedText,
        method: 'mistral_ocr',
        confidence: 0.85,
        model: model,
      };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error('Error in Mistral OCR:', errorMsg);

      // Tratamento específico de erros
      if (error.code === 'ECONNABORTED') {
        throw new Error('OCR timeout - document may be too large');
      }

      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded - please try again later');
      }

      if (error.response?.status === 401) {
        throw new Error('Invalid Mistral API key');
      }

      throw new Error(`Failed to perform OCR with Mistral: ${errorMsg}`);
    }
  }

  /**
   * Processar múltiplas páginas de um documento
   */
  async processMultiPageDocument(documentBuffer, mimeType) {
    try {
      // Para documentos PDF com múltiplas páginas
      if (mimeType === 'application/pdf') {
        const pdfData = await pdf(documentBuffer);
        const numPages = pdfData.numpages;

        console.log(`Processing PDF with ${numPages} pages`);

        // Se o documento for muito grande, avisar
        if (numPages > 50) {
          console.warn(`⚠ Large PDF: ${numPages} pages - processing may take time`);
        }
      }

      // Processar documento completo
      return await this.processDocument(documentBuffer, mimeType);
    } catch (error) {
      console.error('Error processing multi-page document:', error.message);
      throw error;
    }
  }

  /**
   * Validar qualidade do OCR
   */
  validateOCRQuality(text) {
    if (!text || typeof text !== 'string') {
      return { valid: false, reason: 'Invalid text', score: 0 };
    }

    if (text.trim().length < 50) {
      return { valid: false, reason: 'Text too short', score: 0 };
    }

    // Calcular métricas de qualidade
    const totalChars = text.length;

    // Caracteres alfanuméricos e pontuação comum
    const validChars = text.match(/[a-zA-ZÀ-ÿ0-9\s.,;:!?()\-]/g) || [];
    const validRatio = validChars.length / totalChars;

    // Caracteres replacement (problema)
    const replacementChars = (text.match(/�/g) || []).length;
    const replacementRatio = replacementChars / totalChars;

    // Espaços e quebras de linha
    const whitespaceChars = (text.match(/\s/g) || []).length;
    const whitespaceRatio = whitespaceChars / totalChars;

    // Calcular score (0-1)
    let score = validRatio;
    score -= replacementRatio * 2; // Penalizar caracteres replacement

    // Whitespace razoável: 10-30% é bom
    if (whitespaceRatio < 0.1 || whitespaceRatio > 0.4) {
      score -= 0.1;
    }

    score = Math.max(0, Math.min(1, score));

    const valid = score >= 0.7;

    return {
      valid,
      score: parseFloat(score.toFixed(2)),
      reason: valid ? 'Good quality' : 'Low quality text',
      metrics: {
        totalChars,
        validRatio: parseFloat(validRatio.toFixed(2)),
        replacementChars,
        whitespaceRatio: parseFloat(whitespaceRatio.toFixed(2)),
      }
    };
  }
}

module.exports = new OCRService();
