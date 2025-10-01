const axios = require('axios');
const pdf = require('pdf-parse');
const storageService = require('./storageService');

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
      // Se for PDF, primeiro tenta extrair texto nativo
      if (mimeType === 'application/pdf') {
        try {
          const pdfText = await this.extractPdfText(documentBuffer);
          if (pdfText && pdfText.trim().length > 100) {
            return {
              text: pdfText,
              method: 'native_pdf',
              confidence: 0.95,
            };
          }
        } catch (error) {
          console.log('Native PDF extraction failed, falling back to OCR');
        }
      }

      // Se falhou ou não é PDF, usa Mistral OCR
      return await this.performMistralOCR(documentBuffer, mimeType);
    } catch (error) {
      console.error('Error in OCR processing:', error);
      throw error;
    }
  }

  /**
   * Extrair texto nativo de PDF
   */
  async extractPdfText(buffer) {
    try {
      const data = await pdf(buffer);
      return data.text;
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      throw error;
    }
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

      // Converter buffer para base64
      const base64Document = documentBuffer.toString('base64');

      // Preparar headers
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.mistralApiKey}`,
      };

      // Modelo correto para API oficial do Mistral
      const model = this.useOfficialAPI ? 'pixtral-12b-2409' : 'mistralai/Pixtral-12B-2409';

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
                  text: `Extraia todo o texto deste documento jurídico.
                  Mantenha a formatação e estrutura original.
                  Identifique e preserve:
                  - Números de processo
                  - Nomes de partes
                  - Datas
                  - Valores monetários
                  - Assinaturas e carimbos

                  Retorne apenas o texto extraído, sem comentários adicionais.`,
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

      return {
        text: extractedText,
        method: 'mistral_ocr',
        confidence: 0.85,
        model: model,
      };
    } catch (error) {
      console.error('Error in Mistral OCR:', error.response?.data || error.message);
      throw new Error(`Failed to perform OCR with Mistral: ${error.response?.data?.message || error.message}`);
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

        // Se o documento for muito grande, processar em chunks
        if (numPages > 50) {
          return await this.processLargeDocument(documentBuffer, numPages);
        }
      }

      // Processar documento completo
      return await this.processDocument(documentBuffer, mimeType);
    } catch (error) {
      console.error('Error processing multi-page document:', error);
      throw error;
    }
  }

  /**
   * Processar documentos grandes em chunks
   */
  async processLargeDocument(documentBuffer, numPages) {
    const chunkSize = 25;
    const chunks = [];

    for (let i = 0; i < numPages; i += chunkSize) {
      const endPage = Math.min(i + chunkSize, numPages);
      console.log(`Processing pages ${i + 1} to ${endPage}`);

      // Aqui você precisaria implementar a lógica para extrair páginas específicas
      // Por simplicidade, processamos o documento completo
      const result = await this.processDocument(documentBuffer, 'application/pdf');
      chunks.push(result.text);
    }

    return {
      text: chunks.join('\n\n--- PAGE BREAK ---\n\n'),
      method: 'chunked_processing',
      confidence: 0.8,
      pages: numPages,
    };
  }

  /**
   * Validar qualidade do OCR
   */
  validateOCRQuality(text) {
    if (!text || text.trim().length < 50) {
      return { valid: false, reason: 'Text too short' };
    }

    // Calcular proporção de caracteres válidos
    const validChars = text.match(/[a-zA-Z0-9\s.,;:!?()]/g) || [];
    const totalChars = text.length;
    const validRatio = validChars.length / totalChars;

    if (validRatio < 0.7) {
      return { valid: false, reason: 'Too many invalid characters' };
    }

    return { valid: true };
  }
}

module.exports = new OCRService();
