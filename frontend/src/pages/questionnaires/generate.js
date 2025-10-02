import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { cases, documents, questionnaires } from '../../services/api';
import { FaArrowLeft, FaRobot, FaCheckCircle } from 'react-icons/fa';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function GenerateQuestionnaire() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedCase, setSelectedCase] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [questionnaireType, setQuestionnaireType] = useState('initial_analysis');

  // Buscar casos
  const { data: casesData } = useQuery('cases', () => cases.list());

  // Buscar documentos do caso selecionado
  const { data: documentsData } = useQuery(
    ['case-documents', selectedCase],
    () => documents.list({ caseId: selectedCase }),
    { enabled: !!selectedCase }
  );

  // Mutation para gerar questionário
  const generateMutation = useMutation(
    (data) => questionnaires.generate(data),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('questionnaires');
        toast.success('Questionário gerado com sucesso!');
        router.push(`/questionnaires/${response.data._id}`);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Erro ao gerar questionário');
      }
    }
  );

  const handleGenerate = () => {
    if (!selectedCase) {
      toast.error('Selecione um caso');
      return;
    }
    if (selectedDocuments.length === 0) {
      toast.error('Selecione pelo menos um documento');
      return;
    }

    generateMutation.mutate({
      caseId: selectedCase,
      documentIds: selectedDocuments,
      type: questionnaireType
    });
  };

  const toggleDocument = (docId) => {
    setSelectedDocuments(prev => {
      if (prev.includes(docId)) {
        return prev.filter(id => id !== docId);
      } else {
        return [...prev, docId];
      }
    });
  };

  const toggleAllDocuments = () => {
    const allDocs = documentsData?.data?.documents || [];
    const processedDocs = allDocs.filter(doc => doc.ocrStatus === 'completed');

    if (selectedDocuments.length === processedDocs.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(processedDocs.map(doc => doc._id));
    }
  };

  const casesList = casesData?.data?.cases || [];
  const allDocuments = documentsData?.data?.documents || [];
  const processedDocuments = allDocuments.filter(doc => doc.ocrStatus === 'completed');

  const questionnaireTypes = [
    { value: 'initial_analysis', label: 'Análise Inicial' },
    { value: 'complementary', label: 'Complementar' },
    { value: 'checklist', label: 'Checklist' },
    { value: 'custom', label: 'Personalizado' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/questionnaires')}
              className="mr-4 p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <FaArrowLeft className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerar Questionário</h1>
              <p className="text-gray-600 mt-1">Configure e gere um questionário automaticamente com IA</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Seleção de Caso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Caso *
            </label>
            <select
              value={selectedCase}
              onChange={(e) => {
                setSelectedCase(e.target.value);
                setSelectedDocuments([]);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione um caso</option>
              {casesList.map(c => (
                <option key={c._id} value={c._id}>
                  {c.title} {c.numeroProcesso ? `- ${c.numeroProcesso}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Questionário */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Questionário *
            </label>
            <select
              value={questionnaireType}
              onChange={(e) => setQuestionnaireType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {questionnaireTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Seleção de Documentos */}
          {selectedCase && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Documentos Processados *
                </label>
                {processedDocuments.length > 0 && (
                  <button
                    onClick={toggleAllDocuments}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {selectedDocuments.length === processedDocuments.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                )}
              </div>

              {allDocuments.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    Nenhum documento encontrado para este caso.
                    Faça upload de documentos primeiro.
                  </p>
                </div>
              ) : processedDocuments.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm font-medium mb-2">
                    Documentos encontrados, mas nenhum processado ainda.
                  </p>
                  <p className="text-yellow-700 text-xs mb-2">
                    Total de documentos: {allDocuments.length}
                  </p>
                  <div className="text-xs text-yellow-700">
                    <p className="font-medium mb-1">Status dos documentos:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {allDocuments.map((doc, idx) => (
                        <li key={idx}>
                          {doc.originalName} - <strong>{doc.ocrStatus || 'pending'}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-yellow-700 text-xs mt-2">
                    Aguarde o processamento OCR para gerar questionários.
                  </p>
                </div>
              ) : (
                <div className="border border-gray-300 rounded-lg divide-y max-h-96 overflow-y-auto">
                  {processedDocuments.map(doc => (
                    <label
                      key={doc._id}
                      className="flex items-center p-4 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocuments.includes(doc._id)}
                        onChange={() => toggleDocument(doc._id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {doc.originalName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {doc.documentType || 'Não classificado'} • {(doc.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      {selectedDocuments.includes(doc._id) && (
                        <FaCheckCircle className="text-blue-600 ml-2" />
                      )}
                    </label>
                  ))}
                </div>
              )}

              {selectedDocuments.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {selectedDocuments.length} documento(s) selecionado(s)
                </p>
              )}
            </div>
          )}

          {/* Informação sobre IA */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <FaRobot className="text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Geração Automática com IA</p>
                <p className="text-blue-700">
                  O questionário será gerado automaticamente com base no conteúdo dos documentos selecionados.
                  Este processo pode levar alguns segundos devido aos limites de taxa da API.
                </p>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => router.push('/questionnaires')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={generateMutation.isLoading}
            >
              Cancelar
            </button>
            <button
              onClick={handleGenerate}
              disabled={!selectedCase || selectedDocuments.length === 0 || generateMutation.isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
            >
              {generateMutation.isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Gerando...
                </>
              ) : (
                <>
                  <FaRobot className="mr-2" />
                  Gerar Questionário
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
