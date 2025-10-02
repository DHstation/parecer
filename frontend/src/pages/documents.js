import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { documents } from '../services/api';
import { FaUpload, FaFileAlt, FaSearch, FaSpinner, FaFilter, FaDownload, FaTimes, FaTrash, FaCheckSquare, FaSquare } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';

export default function Documents() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    ocrStatus: 'all',
    documentType: 'all',
  });

  // Estados para seleção múltipla
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const limit = 20;

  const { data, isLoading } = useQuery(
    ['documents', page, filters],
    () => documents.list({
      page,
      limit,
      ocrStatus: filters.ocrStatus !== 'all' ? filters.ocrStatus : undefined,
      documentType: filters.documentType !== 'all' ? filters.documentType : undefined,
    })
  );

  const uploadMutation = useMutation(
    (formData) => documents.upload(formData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('documents');
        setShowUploadModal(false);
        setSelectedFiles([]);
        setUploadProgress({});
        toast.success('Documentos enviados com sucesso!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Erro ao enviar documentos');
        setUploadProgress({});
      }
    }
  );

  const bulkDeleteMutation = useMutation(
    async (ids) => {
      // Deletar múltiplos documentos em paralelo
      await Promise.all(ids.map(id => documents.delete(id)));
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('documents');
        setSelectedDocs([]);
        setShowDeleteConfirm(false);
        toast.success(`${selectedDocs.length} documento(s) excluído(s) com sucesso!`);
      },
      onError: (error) => {
        toast.error('Erro ao excluir documentos');
        setShowDeleteConfirm(false);
      }
    }
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        const errors = rejectedFiles.map(f => {
          if (f.errors.find(e => e.code === 'file-too-large')) {
            return `${f.file.name} é muito grande (máx. 50MB)`;
          }
          if (f.errors.find(e => e.code === 'file-invalid-type')) {
            return `${f.file.name} tem tipo inválido`;
          }
          return `${f.file.name} inválido`;
        });
        toast.error(errors.join(', '));
      }

      if (acceptedFiles.length > 0) {
        setSelectedFiles(acceptedFiles);
      }
    }
  });

  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      toast.error('Selecione pelo menos um arquivo');
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('documents', file);
    });

    setUploadProgress({ uploading: true });
    uploadMutation.mutate(formData);
  };

  const removeFile = (index) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  // Funções de seleção múltipla
  const toggleSelectDoc = (docId) => {
    setSelectedDocs(prev => {
      if (prev.includes(docId)) {
        return prev.filter(id => id !== docId);
      } else {
        return [...prev, docId];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedDocs.length === filteredDocs.length && filteredDocs.length > 0) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(filteredDocs.map(doc => doc._id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedDocs.length === 0) {
      toast.error('Selecione pelo menos um documento');
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedDocs);
  };

  // Busca local nos dados já carregados
  const filteredDocs = useMemo(() => {
    return data?.data?.documents?.filter(doc =>
      doc.originalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.documentType?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];
  }, [data, searchTerm]);

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

  const documentTypes = [
    { value: 'all', label: 'Todos os Tipos' },
    { value: 'peticao_inicial', label: 'Petição Inicial' },
    { value: 'contestacao', label: 'Contestação' },
    { value: 'sentenca', label: 'Sentença' },
    { value: 'acordao', label: 'Acórdão' },
    { value: 'despacho', label: 'Despacho' },
    { value: 'parecer', label: 'Parecer' },
    { value: 'contrato', label: 'Contrato' },
    { value: 'procuracao', label: 'Procuração' },
    { value: 'documento_pessoal', label: 'Documento Pessoal' },
    { value: 'outro', label: 'Outro' },
  ];

  const ocrStatuses = [
    { value: 'all', label: 'Todos os Status' },
    { value: 'pending', label: 'Pendente' },
    { value: 'processing', label: 'Processando' },
    { value: 'completed', label: 'Concluído' },
    { value: 'failed', label: 'Falhou' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Documentos</h1>
              <p className="text-gray-600 mt-1">Upload e análise de documentos</p>
            </div>
            <div className="flex gap-3">
              {selectedDocs.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-all"
                >
                  <FaTrash /> Excluir ({selectedDocs.length})
                </button>
              )}
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <FaUpload /> Upload
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome do arquivo ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-4 items-center">
            <FaFilter className="text-gray-600" />

            <select
              value={filters.ocrStatus}
              onChange={(e) => {
                setFilters({ ...filters, ocrStatus: e.target.value });
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {ocrStatuses.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>

            <select
              value={filters.documentType}
              onChange={(e) => {
                setFilters({ ...filters, documentType: e.target.value });
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {documentTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>

            {(filters.ocrStatus !== 'all' || filters.documentType !== 'all') && (
              <button
                onClick={() => {
                  setFilters({ ocrStatus: 'all', documentType: 'all' });
                  setPage(1);
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Documents List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Carregando documentos...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FaFileAlt className="text-6xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Nenhum documento encontrado</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Fazer Upload
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={toggleSelectAll}
                        className="text-gray-600 hover:text-gray-900 transition-colors"
                        title={selectedDocs.length === filteredDocs.length && filteredDocs.length > 0 ? "Desmarcar todos" : "Selecionar todos"}
                      >
                        {selectedDocs.length === filteredDocs.length && filteredDocs.length > 0 ? (
                          <FaCheckSquare className="w-5 h-5" />
                        ) : (
                          <FaSquare className="w-5 h-5" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome do Arquivo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status OCR
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tamanho
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDocs.map((doc) => (
                    <tr
                      key={doc._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleSelectDoc(doc._id)}
                          className="text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          {selectedDocs.includes(doc._id) ? (
                            <FaCheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <FaSquare className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          onClick={() => router.push(`/documents/${doc._id}`)}
                          className="flex items-center cursor-pointer"
                        >
                          <FaFileAlt className="text-blue-500 mr-3" />
                          <div className="text-sm font-medium text-gray-900 hover:text-blue-600">
                            {doc.originalName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {doc.documentType || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[doc.ocrStatus]}`}>
                          {doc.ocrStatus === 'processing' && <FaSpinner className="animate-spin mr-1" />}
                          {statusLabels[doc.ocrStatus]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {(doc.size / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => router.push(`/documents/${doc._id}`)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          title="Ver detalhes"
                        >
                          <FaDownload /> Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data?.data?.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Página {data.data.currentPage} de {data.data.totalPages} ({data.data.total} documentos)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(data.data.totalPages, p + 1))}
                    disabled={page >= data.data.totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Upload de Documentos</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="text-2xl" />
              </button>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <input {...getInputProps()} />
              <FaUpload className="text-5xl text-gray-400 mx-auto mb-4" />
              {isDragActive ? (
                <p className="text-lg text-blue-600">Solte os arquivos aqui...</p>
              ) : (
                <div>
                  <p className="text-lg text-gray-700 mb-2">
                    Arraste arquivos aqui ou clique para selecionar
                  </p>
                  <p className="text-sm text-gray-500">
                    Suportado: PDF, PNG, JPG (máx. 50MB por arquivo)
                  </p>
                </div>
              )}
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Arquivos selecionados ({selectedFiles.length}):
                </h3>
                <ul className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-3 flex-1">
                        <FaFileAlt className="text-blue-500" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-700 font-medium">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-800"
                        disabled={uploadProgress.uploading}
                      >
                        <FaTimes />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {uploadProgress.uploading && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FaSpinner className="animate-spin text-blue-600 text-xl" />
                  <span className="text-blue-900">Enviando documentos...</span>
                </div>
              </div>
            )}

            <div className="flex gap-4 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFiles([]);
                }}
                disabled={uploadProgress.uploading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={uploadMutation.isLoading || selectedFiles.length === 0 || uploadProgress.uploading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploadProgress.uploading ? 'Enviando...' : 'Fazer Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <FaTrash className="text-red-600 text-xl" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Confirmar Exclusão
            </h2>

            <p className="text-gray-600 text-center mb-6">
              Tem certeza que deseja excluir <span className="font-bold">{selectedDocs.length}</span> documento(s)?
              Esta ação não pode ser desfeita.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={bulkDeleteMutation.isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmBulkDelete}
                disabled={bulkDeleteMutation.isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {bulkDeleteMutation.isLoading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <FaTrash />
                    Excluir
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
