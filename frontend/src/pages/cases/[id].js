import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { cases, documents } from '../../services/api';
import { FaArrowLeft, FaEdit, FaTrash, FaFileAlt, FaPlus, FaRobot, FaTimes, FaCheckSquare, FaSquare, FaSearch, FaSave } from 'react-icons/fa';
import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';

export default function CaseDetails() {
  const router = useRouter();
  const { id } = router.query;
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [removeSearchTerm, setRemoveSearchTerm] = useState('');

  // Filtros do modal de adicionar
  const [addFilters, setAddFilters] = useState({
    ocrStatus: 'all',
    documentType: 'all',
  });

  // Filtros do modal de remover
  const [removeFilters, setRemoveFilters] = useState({
    ocrStatus: 'all',
    documentType: 'all',
  });

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

  // Buscar TODOS os documentos do sistema (sem filtro de caso)
  const { data: allDocumentsData } = useQuery(
    'all-documents',
    () => documents.list({ limit: 100 })
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

  // Mutation para vincular documentos ao caso
  const linkDocumentsMutation = useMutation(
    async (documentIds) => {
      // Atualizar cada documento para vincular ao caso
      await Promise.all(
        documentIds.map(docId => documents.update(docId, { caseId: id }))
      );
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['case-documents', id]);
        queryClient.invalidateQueries(['case', id]);
        queryClient.invalidateQueries('all-documents');
        setShowSelectModal(false);
        setSelectedDocIds([]);
        setSearchTerm('');
        toast.success('Documentos vinculados com sucesso!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Erro ao vincular documentos');
      }
    }
  );

  // Filtrar documentos disponíveis (sem caso ou de outro caso)
  const allDocs = allDocumentsData?.data?.documents || [];
  const currentCaseDocIds = caseDocuments?.data?.documents?.map(d => d._id) || [];

  const availableDocuments = useMemo(() => {
    return allDocs.filter(doc => !currentCaseDocIds.includes(doc._id));
  }, [allDocs, currentCaseDocIds]);

  // Filtrar por busca e filtros (modal adicionar)
  const filteredDocuments = useMemo(() => {
    let filtered = availableDocuments;

    // Filtrar por status OCR
    if (addFilters.ocrStatus !== 'all') {
      filtered = filtered.filter(doc => doc.ocrStatus === addFilters.ocrStatus);
    }

    // Filtrar por tipo de documento
    if (addFilters.documentType !== 'all') {
      filtered = filtered.filter(doc => doc.documentType === addFilters.documentType);
    }

    // Filtrar por busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.originalName?.toLowerCase().includes(term) ||
        doc.documentType?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [availableDocuments, searchTerm, addFilters]);

  const toggleSelectDoc = (docId) => {
    setSelectedDocIds(prev => {
      if (prev.includes(docId)) {
        return prev.filter(id => id !== docId);
      } else {
        return [...prev, docId];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedDocIds.length === filteredDocuments.length && filteredDocuments.length > 0) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredDocuments.map(doc => doc._id));
    }
  };

  const handleLinkDocuments = () => {
    if (selectedDocIds.length === 0) {
      toast.error('Selecione pelo menos um documento');
      return;
    }

    linkDocumentsMutation.mutate(selectedDocIds);
  };

  // Mutation para desvincular documentos do caso
  const unlinkDocumentsMutation = useMutation(
    async (documentIds) => {
      // Atualizar cada documento para remover o vínculo (caseId = null)
      await Promise.all(
        documentIds.map(docId => documents.update(docId, { caseId: null }))
      );
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['case-documents', id]);
        queryClient.invalidateQueries(['case', id]);
        queryClient.invalidateQueries('all-documents');
        setShowRemoveModal(false);
        setSelectedDocIds([]);
        setRemoveSearchTerm('');
        toast.success('Documentos desvinculados com sucesso!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Erro ao desvincular documentos');
      }
    }
  );

  // Documentos vinculados ao caso atual
  const caseDocsList = caseDocuments?.data?.documents || [];

  // Filtrar documentos do caso por busca e filtros (modal de remover)
  const filteredCaseDocs = useMemo(() => {
    let filtered = caseDocsList;

    // Filtrar por status OCR
    if (removeFilters.ocrStatus !== 'all') {
      filtered = filtered.filter(doc => doc.ocrStatus === removeFilters.ocrStatus);
    }

    // Filtrar por tipo de documento
    if (removeFilters.documentType !== 'all') {
      filtered = filtered.filter(doc => doc.documentType === removeFilters.documentType);
    }

    // Filtrar por busca
    if (removeSearchTerm) {
      const term = removeSearchTerm.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.originalName?.toLowerCase().includes(term) ||
        doc.documentType?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [caseDocsList, removeSearchTerm, removeFilters]);

  const toggleSelectRemoveDoc = (docId) => {
    setSelectedDocIds(prev => {
      if (prev.includes(docId)) {
        return prev.filter(id => id !== docId);
      } else {
        return [...prev, docId];
      }
    });
  };

  const toggleSelectAllRemove = () => {
    if (selectedDocIds.length === filteredCaseDocs.length && filteredCaseDocs.length > 0) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredCaseDocs.map(doc => doc._id));
    }
  };

  const handleUnlinkDocuments = () => {
    if (selectedDocIds.length === 0) {
      toast.error('Selecione pelo menos um documento');
      return;
    }

    unlinkDocumentsMutation.mutate(selectedDocIds);
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

                {/* Documents */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Documentos ({caseDocuments?.data?.documents?.length || 0})
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowSelectModal(true)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        <FaPlus /> Adicionar
                      </button>
                      {caseDocuments?.data?.documents?.length > 0 && (
                        <button
                          onClick={() => setShowRemoveModal(true)}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                        >
                          <FaTrash /> Remover
                        </button>
                      )}
                    </div>
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

                {/* AI Summary */}
                {caseItem?.consolidatedSummary && (
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow p-4 border border-purple-200">
                    <div className="flex items-center gap-2 mb-3">
                      <FaRobot className="text-purple-600" />
                      <h2 className="text-sm font-semibold text-gray-900">Resumo IA</h2>
                    </div>
                    <div className="text-xs text-gray-700 line-clamp-6 leading-relaxed">
                      {caseItem.consolidatedSummary}
                    </div>
                    <button
                      onClick={() => {
                        const modal = document.createElement('div');
                        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
                        modal.innerHTML = `
                          <div class="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6">
                            <div class="flex items-center justify-between mb-4">
                              <div class="flex items-center gap-2">
                                <svg class="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>
                                <h3 class="text-lg font-semibold text-gray-900">Resumo Completo - IA</h3>
                              </div>
                              <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                              </button>
                            </div>
                            <div class="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">${caseItem.consolidatedSummary}</div>
                          </div>
                        `;
                        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
                        document.body.appendChild(modal);
                      }}
                      className="text-xs text-purple-600 hover:text-purple-700 mt-2 font-medium"
                    >
                      Ver resumo completo →
                    </button>
                  </div>
                )}

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

      {/* Modal de Seleção de Documentos */}
      {showSelectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Adicionar Documentos ao Caso</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Selecione os documentos que deseja vincular ao caso "{caseItem?.title}"
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSelectModal(false);
                  setSelectedDocIds([]);
                  setSearchTerm('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="text-2xl" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome do arquivo ou tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status OCR</label>
                <select
                  value={addFilters.ocrStatus}
                  onChange={(e) => setAddFilters({ ...addFilters, ocrStatus: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todos</option>
                  <option value="pending">Pendente</option>
                  <option value="processing">Processando</option>
                  <option value="completed">Concluído</option>
                  <option value="failed">Falhou</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Documento</label>
                <select
                  value={addFilters.documentType}
                  onChange={(e) => setAddFilters({ ...addFilters, documentType: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todos os Tipos</option>
                  <option value="peticao_inicial">Petição Inicial</option>
                  <option value="contestacao">Contestação</option>
                  <option value="sentenca">Sentença</option>
                  <option value="acordao">Acórdão</option>
                  <option value="despacho">Despacho</option>
                  <option value="parecer">Parecer</option>
                  <option value="documento_pessoal">Documento Pessoal</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>

            {/* Select All Checkbox */}
            {filteredDocuments.length > 0 && (
              <div className="flex items-center justify-between mb-4 pb-3 border-b">
                <label className="flex items-center cursor-pointer">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600"
                  >
                    {selectedDocIds.length === filteredDocuments.length && filteredDocuments.length > 0 ? (
                      <FaCheckSquare className="text-blue-600 text-lg" />
                    ) : (
                      <FaSquare className="text-gray-400 text-lg" />
                    )}
                    Selecionar todos ({filteredDocuments.length})
                  </button>
                </label>
                {selectedDocIds.length > 0 && (
                  <span className="text-sm text-gray-600">
                    {selectedDocIds.length} selecionado(s)
                  </span>
                )}
              </div>
            )}

            {/* Documents List */}
            <div className="flex-1 overflow-y-auto mb-6">
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <FaFileAlt className="mx-auto text-gray-300 text-5xl mb-4" />
                  <p className="text-gray-500">
                    {availableDocuments.length === 0
                      ? 'Todos os documentos já estão vinculados a algum caso'
                      : 'Nenhum documento encontrado com esse termo'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDocuments.map((doc) => (
                    <label
                      key={doc._id}
                      className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocIds.includes(doc._id)}
                        onChange={() => toggleSelectDoc(doc._id)}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-3 flex-1">
                        {selectedDocIds.includes(doc._id) ? (
                          <FaCheckSquare className="text-blue-600 text-lg flex-shrink-0" />
                        ) : (
                          <FaSquare className="text-gray-400 text-lg flex-shrink-0" />
                        )}
                        <FaFileAlt className="text-blue-500 text-xl flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {doc.originalName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {doc.documentType || 'Não classificado'}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              {(doc.size / 1024).toFixed(1)} KB
                            </span>
                            {doc.ocrStatus === 'completed' && (
                              <>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-green-600">✓ Processado</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowSelectModal(false);
                  setSelectedDocIds([]);
                  setSearchTerm('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={linkDocumentsMutation.isLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleLinkDocuments}
                disabled={linkDocumentsMutation.isLoading || selectedDocIds.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {linkDocumentsMutation.isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Vinculando...
                  </>
                ) : (
                  <>
                    <FaSave />
                    Vincular Documentos ({selectedDocIds.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Remoção de Documentos */}
      {showRemoveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Remover Documentos do Caso</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Selecione os documentos que deseja desvincular do caso "{caseItem?.title}"
                </p>
              </div>
              <button
                onClick={() => {
                  setShowRemoveModal(false);
                  setSelectedDocIds([]);
                  setRemoveSearchTerm('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="text-2xl" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome do arquivo ou tipo..."
                  value={removeSearchTerm}
                  onChange={(e) => setRemoveSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status OCR</label>
                <select
                  value={removeFilters.ocrStatus}
                  onChange={(e) => setRemoveFilters({ ...removeFilters, ocrStatus: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todos</option>
                  <option value="pending">Pendente</option>
                  <option value="processing">Processando</option>
                  <option value="completed">Concluído</option>
                  <option value="failed">Falhou</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Documento</label>
                <select
                  value={removeFilters.documentType}
                  onChange={(e) => setRemoveFilters({ ...removeFilters, documentType: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todos os Tipos</option>
                  <option value="peticao_inicial">Petição Inicial</option>
                  <option value="contestacao">Contestação</option>
                  <option value="sentenca">Sentença</option>
                  <option value="acordao">Acórdão</option>
                  <option value="despacho">Despacho</option>
                  <option value="parecer">Parecer</option>
                  <option value="documento_pessoal">Documento Pessoal</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>

            {/* Select All Checkbox */}
            {filteredCaseDocs.length > 0 && (
              <div className="flex items-center justify-between mb-4 pb-3 border-b">
                <label className="flex items-center cursor-pointer">
                  <button
                    onClick={toggleSelectAllRemove}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-red-600"
                  >
                    {selectedDocIds.length === filteredCaseDocs.length && filteredCaseDocs.length > 0 ? (
                      <FaCheckSquare className="text-red-600 text-lg" />
                    ) : (
                      <FaSquare className="text-gray-400 text-lg" />
                    )}
                    Selecionar todos ({filteredCaseDocs.length})
                  </button>
                </label>
                {selectedDocIds.length > 0 && (
                  <span className="text-sm text-gray-600">
                    {selectedDocIds.length} selecionado(s)
                  </span>
                )}
              </div>
            )}

            {/* Documents List */}
            <div className="flex-1 overflow-y-auto mb-6">
              {filteredCaseDocs.length === 0 ? (
                <div className="text-center py-12">
                  <FaFileAlt className="mx-auto text-gray-300 text-5xl mb-4" />
                  <p className="text-gray-500">
                    {caseDocsList.length === 0
                      ? 'Nenhum documento vinculado a este caso'
                      : 'Nenhum documento encontrado com esse termo'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCaseDocs.map((doc) => (
                    <label
                      key={doc._id}
                      className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocIds.includes(doc._id)}
                        onChange={() => toggleSelectRemoveDoc(doc._id)}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-3 flex-1">
                        {selectedDocIds.includes(doc._id) ? (
                          <FaCheckSquare className="text-red-600 text-lg flex-shrink-0" />
                        ) : (
                          <FaSquare className="text-gray-400 text-lg flex-shrink-0" />
                        )}
                        <FaFileAlt className="text-blue-500 text-xl flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {doc.originalName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {doc.documentType || 'Não classificado'}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              {(doc.size / 1024).toFixed(1)} KB
                            </span>
                            {doc.ocrStatus === 'completed' && (
                              <>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-green-600">✓ Processado</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowRemoveModal(false);
                  setSelectedDocIds([]);
                  setRemoveSearchTerm('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={unlinkDocumentsMutation.isLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleUnlinkDocuments}
                disabled={unlinkDocumentsMutation.isLoading || selectedDocIds.length === 0}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {unlinkDocumentsMutation.isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Removendo...
                  </>
                ) : (
                  <>
                    <FaTrash />
                    Desvincular Documentos ({selectedDocIds.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
