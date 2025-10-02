import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { cases, documents } from '../../services/api';
import { FaArrowLeft, FaEdit, FaTrash, FaFileAlt, FaPlus, FaRobot } from 'react-icons/fa';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function CaseDetails() {
  const router = useRouter();
  const { id } = router.query;
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  const { data: caseData, isLoading } = useQuery(
    ['case', id],
    () => cases.get(id),
    { enabled: !!id }
  );

  const { data: caseDocuments } = useQuery(
    ['case-documents', id],
    () => documents.list({ caseId: id }),
    { enabled: !!id }
  );

  const updateMutation = useMutation(
    (data) => cases.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['case', id]);
        setIsEditing(false);
        toast.success('Caso atualizado!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Erro ao atualizar caso');
      }
    }
  );

  const deleteMutation = useMutation(
    () => cases.delete(id),
    {
      onSuccess: () => {
        toast.success('Caso excluído!');
        router.push('/cases');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Erro ao excluir caso');
      }
    }
  );

  const generateSummaryMutation = useMutation(
    () => cases.generateSummary(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['case', id]);
        toast.success('Resumo gerado com sucesso!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Erro ao gerar resumo');
      }
    }
  );

  const handleEdit = () => {
    setEditData({
      title: caseData?.data?.title || '',
      description: caseData?.data?.description || '',
      status: caseData?.data?.status || 'analise',
      areaJuridica: caseData?.data?.areaJuridica || 'civil'
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(editData);
  };

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir este caso?')) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const caseItem = caseData?.data;

  const statusColors = {
    analise: 'bg-yellow-100 text-yellow-800',
    em_andamento: 'bg-blue-100 text-blue-800',
    concluido: 'bg-green-100 text-green-800',
    arquivado: 'bg-gray-100 text-gray-800'
  };

  const statusLabels = {
    analise: 'Em Análise',
    em_andamento: 'Em Andamento',
    concluido: 'Concluído',
    arquivado: 'Arquivado'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/cases')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaArrowLeft className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {isEditing ? 'Editar Caso' : caseItem?.title}
                </h1>
                {caseItem?.numeroProcesso && (
                  <p className="text-gray-600 mt-1">Processo Nº {caseItem.numeroProcesso}</p>
                )}
              </div>
            </div>
            {!isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() => generateSummaryMutation.mutate()}
                  disabled={generateSummaryMutation.isLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  <FaRobot />
                  {generateSummaryMutation.isLoading ? 'Gerando...' : 'Gerar Resumo IA'}
                </button>
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <FaEdit /> Editar
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <FaTrash /> Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {isEditing ? (
            /* Edit Form */
            <div className="bg-white rounded-lg shadow p-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
                  <input
                    type="text"
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="analise">Em Análise</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="arquivado">Arquivado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Área Jurídica</label>
                  <select
                    value={editData.areaJuridica}
                    onChange={(e) => setEditData({ ...editData, areaJuridica: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="civil">Civil</option>
                    <option value="penal">Penal</option>
                    <option value="trabalhista">Trabalhista</option>
                    <option value="tributario">Tributário</option>
                    <option value="administrativo">Administrativo</option>
                    <option value="empresarial">Empresarial</option>
                    <option value="familia">Família</option>
                    <option value="consumidor">Consumidor</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                  <textarea
                    rows="6"
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={updateMutation.isLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {updateMutation.isLoading ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Info */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Informações do Caso</h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[caseItem?.status]}`}>
                        {statusLabels[caseItem?.status]}
                      </span>
                      {caseItem?.areaJuridica && (
                        <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm">
                          {caseItem.areaJuridica}
                        </span>
                      )}
                    </div>

                    {caseItem?.description && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Descrição</h3>
                        <p className="text-gray-600 whitespace-pre-wrap">{caseItem.description}</p>
                      </div>
                    )}

                    {caseItem?.cliente?.nome && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Cliente</h3>
                        <p className="text-gray-900">{caseItem.cliente.nome}</p>
                        <p className="text-sm text-gray-600 capitalize">{caseItem.cliente.tipo}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary */}
                {caseItem?.consolidatedSummary && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FaRobot className="text-purple-600" />
                      Resumo Gerado por IA
                    </h2>
                    <p className="text-gray-700 whitespace-pre-wrap">{caseItem.consolidatedSummary}</p>
                  </div>
                )}

                {/* Documents */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Documentos ({caseDocuments?.data?.documents?.length || 0})
                    </h2>
                    <button
                      onClick={() => router.push(`/documents?caseId=${id}`)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <FaPlus /> Adicionar
                    </button>
                  </div>

                  <div className="space-y-3">
                    {caseDocuments?.data?.documents?.map((doc) => (
                      <div
                        key={doc._id}
                        onClick={() => router.push(`/documents/${doc._id}`)}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                      >
                        <FaFileAlt className="text-blue-500 text-xl" />
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{doc.originalName}</h3>
                          <p className="text-sm text-gray-600">
                            {doc.documentType || 'Tipo não definido'} • {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <span className={`px-3 py-1 text-xs rounded-full ${
                          doc.ocrStatus === 'completed' ? 'bg-green-100 text-green-800' :
                          doc.ocrStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {doc.ocrStatus}
                        </span>
                      </div>
                    ))}
                    {(!caseDocuments?.data?.documents || caseDocuments.data.documents.length === 0) && (
                      <p className="text-gray-500 text-center py-8">Nenhum documento vinculado</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Metadata */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadados</h2>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-gray-600">Criado em</p>
                      <p className="font-medium text-gray-900">
                        {new Date(caseItem?.createdAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Última atualização</p>
                      <p className="font-medium text-gray-900">
                        {new Date(caseItem?.updatedAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    {caseItem?.tags && caseItem.tags.length > 0 && (
                      <div>
                        <p className="text-gray-600 mb-2">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {caseItem.tags.map((tag, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Critical Points */}
                {caseItem?.criticalPoints && caseItem.criticalPoints.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Pontos Críticos</h2>
                    <ul className="space-y-2">
                      {caseItem.criticalPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
                          <span className="text-sm text-gray-700">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risks */}
                {caseItem?.risks && caseItem.risks.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Riscos</h2>
                    <div className="space-y-3">
                      {caseItem.risks.map((risk, index) => (
                        <div key={index} className="border-l-4 border-orange-500 pl-3">
                          <p className="text-sm font-medium text-gray-900 capitalize">{risk.level}</p>
                          <p className="text-sm text-gray-600">{risk.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
