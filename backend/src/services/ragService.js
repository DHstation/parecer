const axios = require('axios');
const crypto = require('crypto');

class RAGService {
  constructor() {
    this.mistralApiKey = process.env.MISTRAL_API_KEY || null;
    this.mistralApiUrl = this.mistralApiKey
      ? 'https://api.mistral.ai/v1'
      : (process.env.MISTRAL_API_URL || 'http://mistral_ocr:8000/v1');
    this.vectorStore = new Map(); // Em produção, usar FAISS ou vector DB
    this.useSimpleEmbeddings = process.env.USE_SIMPLE_EMBEDDINGS !== 'false';

    if (this.mistralApiKey) {
      console.log('RAG Service initialized with Mistral Official API (Simple embeddings mode:', this.useSimpleEmbeddings, ')');
    } else {
      console.log('RAG Service initialized with local Mistral (Simple embeddings mode:', this.useSimpleEmbeddings, ')');
    }
  }

  /**
   * Gerar embeddings simples usando TF-IDF
   */
  generateSimpleEmbedding(text) {
    // Tokenizar e normalizar
    const tokens = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);

    // Criar vetor de frequência (simplificado)
    const termFreq = {};
    tokens.forEach(token => {
      termFreq[token] = (termFreq[token] || 0) + 1;
    });

    // Normalizar
    const magnitude = Math.sqrt(Object.values(termFreq).reduce((sum, freq) => sum + freq * freq, 0));
    Object.keys(termFreq).forEach(token => {
      termFreq[token] = termFreq[token] / magnitude;
    });

    return termFreq;
  }

  /**
   * Gerar embeddings para texto
   * Usa método simples de TF-IDF por padrão
   */
  async generateEmbedding(text) {
    try {
      // Usar embeddings simples (mais rápido, funciona sem dependências pesadas)
      if (this.useSimpleEmbeddings) {
        return this.generateSimpleEmbedding(text);
      }

      // Se tiver API de embeddings externa, usar aqui
      // Por exemplo: OpenAI, Cohere, etc.
      console.warn('External embeddings API not configured, falling back to simple embeddings');
      return this.generateSimpleEmbedding(text);
    } catch (error) {
      console.error('Error generating embedding:', error);
      return this.generateSimpleEmbedding(text);
    }
  }

  /**
   * Dividir texto em chunks para processamento
   */
  chunkText(text, chunkSize = 500, overlap = 50) {
    const chunks = [];
    const words = text.split(/\s+/);

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      chunks.push({
        text: chunk,
        startIndex: i,
        endIndex: Math.min(i + chunkSize, words.length),
      });
    }

    return chunks;
  }

  /**
   * Indexar documento no sistema RAG
   */
  async indexDocument(documentId, text, metadata = {}) {
    try {
      // Dividir texto em chunks
      const chunks = this.chunkText(text);

      const indexedChunks = [];

      for (const chunk of chunks) {
        // Gerar embedding para cada chunk
        const embedding = await this.generateEmbedding(chunk.text);

        const indexedChunk = {
          documentId,
          text: chunk.text,
          embedding,
          metadata: {
            ...metadata,
            startIndex: chunk.startIndex,
            endIndex: chunk.endIndex,
          },
        };

        // Armazenar no vector store
        const chunkId = `${documentId}_${chunk.startIndex}`;
        this.vectorStore.set(chunkId, indexedChunk);
        indexedChunks.push(chunkId);
      }

      console.log(`Indexed document ${documentId} with ${chunks.length} chunks`);
      return {
        documentId,
        chunksIndexed: chunks.length,
        chunkIds: indexedChunks,
      };
    } catch (error) {
      console.error('Error indexing document:', error);
      throw error;
    }
  }

  /**
   * Calcular similaridade de cosseno entre dois vetores TF-IDF
   */
  cosineSimilarity(vecA, vecB) {
    // Se são arrays
    if (Array.isArray(vecA) && Array.isArray(vecB)) {
      const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
      const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
      const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
      return dotProduct / (magnitudeA * magnitudeB);
    }

    // Se são objetos TF-IDF
    const terms = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    terms.forEach(term => {
      const a = vecA[term] || 0;
      const b = vecB[term] || 0;
      dotProduct += a * b;
      magA += a * a;
      magB += b * b;
    });

    const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Buscar documentos similares
   */
  async searchSimilar(query, topK = 5, filters = {}) {
    try {
      // Gerar embedding da query
      const queryEmbedding = await this.generateEmbedding(query);

      // Calcular similaridade com todos os chunks
      const results = [];

      for (const [chunkId, chunk] of this.vectorStore.entries()) {
        // Aplicar filtros se houver
        if (filters.documentId && chunk.documentId !== filters.documentId) {
          continue;
        }

        const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);

        results.push({
          chunkId,
          documentId: chunk.documentId,
          text: chunk.text,
          similarity,
          metadata: chunk.metadata,
        });
      }

      // Ordenar por similaridade e retornar top K
      results.sort((a, b) => b.similarity - a.similarity);
      return results.slice(0, topK);
    } catch (error) {
      console.error('Error searching similar documents:', error);
      throw error;
    }
  }

  /**
   * Gerar resposta usando RAG (Retrieval-Augmented Generation)
   */
  async generateAnswer(question, caseId = null) {
    try {
      // 1. Buscar contexto relevante
      const filters = caseId ? { caseId } : {};
      const relevantChunks = await this.searchSimilar(question, 5, filters);

      if (relevantChunks.length === 0) {
        return {
          answer: 'Não encontrei informações relevantes nos documentos indexados.',
          confidence: 0,
          sources: [],
        };
      }

      // 2. Construir contexto
      const context = relevantChunks
        .map((chunk, idx) => `[${idx + 1}] ${chunk.text}`)
        .join('\n\n');

      // 3. Gerar resposta usando Mistral
      const model = this.mistralApiKey ? 'pixtral-12b-2409' : 'mistralai/Pixtral-12B-2409';
      const headers = {
        'Content-Type': 'application/json',
      };

      // Adicionar Authorization se tiver API key
      if (this.mistralApiKey) {
        headers['Authorization'] = `Bearer ${this.mistralApiKey}`;
      }

      const response = await axios.post(
        `${this.mistralApiUrl}/chat/completions`,
        {
          model: model,
          messages: [
            {
              role: 'system',
              content: `Você é um assistente jurídico especializado em análise de documentos.
              Use apenas as informações fornecidas no contexto para responder.
              Se não houver informação suficiente, indique claramente.
              Cite as fontes usando os números [1], [2], etc.`,
            },
            {
              role: 'user',
              content: `Contexto dos documentos:\n${context}\n\nPergunta: ${question}`,
            },
          ],
          max_tokens: 1024,
          temperature: 0.3,
        },
        {
          headers: headers,
          timeout: 60000,
        }
      );

      const answer = response.data.choices[0].message.content;

      return {
        answer,
        confidence: relevantChunks[0].similarity,
        sources: relevantChunks.map((chunk) => ({
          documentId: chunk.documentId,
          text: chunk.text.slice(0, 200) + '...',
          similarity: chunk.similarity,
        })),
      };
    } catch (error) {
      console.error('Error generating answer with RAG:', error);
      throw error;
    }
  }

  /**
   * Remover documento do índice
   */
  removeDocument(documentId) {
    let removed = 0;
    for (const [chunkId, chunk] of this.vectorStore.entries()) {
      if (chunk.documentId === documentId) {
        this.vectorStore.delete(chunkId);
        removed++;
      }
    }
    console.log(`Removed ${removed} chunks for document ${documentId}`);
    return removed;
  }

  /**
   * Obter estatísticas do vector store
   */
  getStats() {
    const documents = new Set();
    for (const chunk of this.vectorStore.values()) {
      documents.add(chunk.documentId);
    }

    return {
      totalChunks: this.vectorStore.size,
      totalDocuments: documents.size,
    };
  }
}

module.exports = new RAGService();
