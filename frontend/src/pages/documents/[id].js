import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { documents, cases } from '../../services/api';
import { FaArrowLeft, FaDownload, FaRedo, FaTrash, FaRobot, FaFileAlt, FaSave } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function DocumentDetails() {
  const router = useRouter();
  const { id } = router.query;
  const queryClient = useQueryClient();

  const [selectedCaseId, setSelectedCaseId] = useState('');

  const { data: docData, isLoading } = useQuery(
    ['document', id],
    () => documents.get(id),
    { enabled: !!id }
  );

  // Buscar lista de casos
  const { data: casesData } = useQuery('cases', () => cases.list());

  const updateMutation = useMutation(
    (data) => documents.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['document', id]);
        queryClient.invalidateQueries('documents');
        queryClient.invalidateQueries('cases');
        toast.success('Documento atualizado!');
        setSelectedCaseId('');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Erro ao atualizar documento');
      }
    }
  );

  const deleteMutation = useMutation(
    () => documents.delete(id),
    {
      onSuccess: () => {
        toast.success('Documento excluído!');
        router.push('/documents');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Erro ao excluir documento');
      }
    }
  );

  const reprocessMutation = useMutation(
    () => documents.reprocess(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['document', id]);
        toast.success('Reprocessamento iniciado!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Erro ao reprocessar');
      }
    }
  );

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir este documento?')) {
      deleteMutation.mutate();
    }
  };

  const handleDownload = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/documents/${id}/download`, '_blank');
  };

  const handleUpdateCase = () => {
    if (!selectedCaseId && selectedCaseId !== '') {
      toast.error('Selecione um caso');
      return;
    }

    updateMutation.mutate({
      caseId: selectedCaseId || null
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const doc = docData?.data;
  const casesList = casesData?.data?.cases || [];

  const statusColors = {
    pending: 'bg-gray-100 text-gray-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800'
  };

  const statusLabels = {
    pending: 'Pendente',
    processing: 'Processando',
    completed: 'Concluído',
    failed: 'Falhou'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/documents')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaArrowLeft className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{doc?.originalName}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[doc?.ocrStatus]}`}>
                    OCR: {statusLabels[doc?.ocrStatus]}
                  </span>
                  {doc?.documentType && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      {doc.documentType}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <FaDownload /> Download
              </button>
              <button
                onClick={() => reprocessMutation.mutate()}
                disabled={reprocessMutation.isLoading || doc?.ocrStatus === 'processing'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                <FaRedo /> Reprocessar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <FaTrash /> Excluir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* OCR Text */}
              {doc?.ocrText && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FaFileAlt className="text-blue-600" />
                    Texto Extraído (OCR)
                  </h2>
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded border border-gray-200">
                      {doc.ocrText}
                    </pre>
                  </div>
                </div>
              )}

              {/* Summary */}
              {doc?.summary && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FaRobot className="text-purple-600" />
                    Resumo Gerado por IA
                  </h2>
                  <p className="text-gray-700 whitespace-pre-wrap">{doc.summary}</p>
                </div>
              )}

              {/* Key Points */}
              {doc?.keyPoints && doc.keyPoints.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Pontos-Chave</h2>
                  <ul className="space-y-2">
                    {doc.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                        <span className="text-gray-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Extracted Data */}
              {doc?.extractedData && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Dados Extraídos</h2>
                  <div className="space-y-4">
                    {/* Partes */}
                    {doc.extractedData.partes && doc.extractedData.partes.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Partes</h3>
                        <div className="space-y-2">
                          {doc.extractedData.partes.map((parte, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded">
                              <p className="font-medium text-gray-900">{parte.nome}</p>
                              <p className="text-sm text-gray-600 capitalize">{parte.tipo}</p>
                              {parte.cpfCnpj && (
                                <p className="text-sm text-gray-600">{parte.cpfCnpj}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Advogados */}
                    {doc.extractedData.advogados && doc.extractedData.advogados.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Advogados</h3>
                        <div className="space-y-2">
                          {doc.extractedData.advogados.map((adv, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded">
                              <p className="font-medium text-gray-900">{adv.nome}</p>
                              {adv.oab && <p className="text-sm text-gray-600">{adv.oab}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Número do Processo */}
                    {doc.extractedData.numeroProcesso && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Número do Processo</h3>
                        <p className="text-gray-900 font-mono">{doc.extractedData.numeroProcesso}</p>
                      </div>
                    )}

                    {/* Valores */}
                    {doc.extractedData.valores && doc.extractedData.valores.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Valores</h3>
                        <div className="space-y-2">
                          {doc.extractedData.valores.map((valor, index) => (
                            <div key={index} className="flex justify-between p-3 bg-gray-50 rounded">
                              <span className="text-gray-700 capitalize">{valor.tipo}</span>
                              <span className="font-medium text-gray-900">
                                {valor.moeda} {valor.valor.toLocaleString('pt-BR')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Outras informações */}
                    {doc.extractedData.vara && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700">Vara</h3>
                        <p className="text-gray-900">{doc.extractedData.vara}</p>
                      </div>
                    )}
                    {doc.extractedData.comarca && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700">Comarca</h3>
                        <p className="text-gray-900">{doc.extractedData.comarca}</p>
                      </div>
                    )}
                    {doc.extractedData.assunto && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700">Assunto</h3>
                        <p className="text-gray-900">{doc.extractedData.assunto}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* File Info */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações do Arquivo</h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600">Tamanho</p>
                    <p className="font-medium text-gray-900">
                      {(doc?.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Tipo MIME</p>
                    <p className="font-medium text-gray-900">{doc?.mimeType}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Enviado em</p>
                    <p className="font-medium text-gray-900">
                      {new Date(doc?.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  {doc?.ocrProcessedAt && (
                    <div>
                      <p className="text-gray-600">Processado em</p>
                      <p className="font-medium text-gray-900">
                        {new Date(doc.ocrProcessedAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  )}
                  {doc?.confidence !== undefined && (
                    <div>
                      <p className="text-gray-600">Confiança da Classificação</p>
                      <p className="font-medium text-gray-900">
                        {(doc.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}

                  {/* Caso Vinculado */}
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-gray-600 mb-2">Caso Vinculado</p>
                    {doc?.caseId ? (
                      <div className="mb-3">
                        <p className="font-medium text-gray-900 text-sm mb-1">
                          {doc.caseId.title || 'Caso sem título'}
                        </p>
                        <button
                          onClick={() => router.push(`/cases/${doc.caseId._id || doc.caseId}`)}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Ver caso →
                        </button>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm mb-3">Nenhum caso vinculado</p>
                    )}

                    {/* Dropdown para alterar caso */}
                    <div className="space-y-2">
                      <label className="text-xs text-gray-600">Alterar vínculo:</label>
                      <select
                        value={selectedCaseId}
                        onChange={(e) => setSelectedCaseId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Selecione um caso</option>
                        <option value="null">❌ Remover vínculo</option>
                        {casesList.map(c => (
                          <option key={c._id} value={c._id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleUpdateCase}
                        disabled={!selectedCaseId || updateMutation.isLoading}
                        className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {updateMutation.isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            Salvando...
                          </>
                        ) : (
                          <>
                            <FaSave />
                            Salvar Vínculo
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Processing Status */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Status de Processamento</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">OCR</span>
                    <span className={`px-3 py-1 rounded-full text-xs ${statusColors[doc?.ocrStatus]}`}>
                      {statusLabels[doc?.ocrStatus]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Análise</span>
                    <span className={`px-3 py-1 rounded-full text-xs ${statusColors[doc?.analysisStatus]}`}>
                      {statusLabels[doc?.analysisStatus]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">RAG Indexado</span>
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      doc?.ragIndexed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {doc?.ragIndexed ? 'Sim' : 'Não'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {doc?.tags && doc.tags.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {doc.tags.map((tag, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {doc?.ocrError && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-red-600 mb-4">Erro no Processamento</h2>
                  <p className="text-sm text-gray-700 bg-red-50 p-3 rounded border border-red-200">
                    {doc.ocrError}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
