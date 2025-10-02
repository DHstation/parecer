import { useState } from 'react';
import { FaSearch, FaRobot } from 'react-icons/fa';
import { documents } from '../services/api';
import toast from 'react-hot-toast';

export default function Search() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) {
      toast.error('Digite uma pergunta');
      return;
    }

    setIsLoading(true);
    try {
      const response = await documents.ask(question);
      setAnswer(response.data);
      toast.success('Resposta gerada!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao buscar resposta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Busca Semântica</h1>
          <p className="text-gray-600 mt-1">Faça perguntas sobre seus documentos usando IA</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Search Form */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <form onSubmit={handleAsk}>
              <div className="flex items-center gap-4 mb-4">
                <FaRobot className="text-3xl text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Pergunte ao Assistente Jurídico
                </h2>
              </div>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Exemplo: Quais são os principais pontos da petição inicial?"
                rows="4"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processando...
                  </>
                ) : (
                  <>
                    <FaSearch /> Buscar Resposta
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Answer */}
          {answer && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resposta:</h3>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{answer.answer}</p>
              </div>

              {answer.sources && answer.sources.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Fontes:</h4>
                  <div className="space-y-2">
                    {answer.sources.map((source, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded text-sm text-gray-600">
                        <p className="font-medium">Documento {index + 1}</p>
                        <p className="mt-1">{source.text}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Similaridade: {(source.similarity * 100).toFixed(1)}%
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {answer.confidence !== undefined && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    Confiança: {(answer.confidence * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Help */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Dicas de uso:</h3>
            <ul className="space-y-2 text-blue-800">
              <li>• Faça perguntas específicas sobre os documentos indexados</li>
              <li>• Use termos jurídicos precisos para melhores resultados</li>
              <li>• O sistema usa RAG (Retrieval-Augmented Generation) para buscar informações relevantes</li>
              <li>• As respostas são baseadas apenas nos documentos do sistema</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
