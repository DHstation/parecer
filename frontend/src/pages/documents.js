import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { documents } from '../services/api';
import { FaUpload, FaFileAlt, FaSearch, FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';

export default function Documents() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const { data, isLoading } = useQuery('documents', () => documents.list());

  const uploadMutation = useMutation(
    (formData) => documents.upload(formData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('documents');
        setShowUploadModal(false);
        setSelectedFiles([]);
        toast.success('Documentos enviados com sucesso!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Erro ao enviar documentos');
      }
    }
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg']
    },
    onDrop: (acceptedFiles) => {
      setSelectedFiles(acceptedFiles);
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

    uploadMutation.mutate(formData);
  };

  const filteredDocs = data?.data?.documents?.filter(doc =>
    doc.originalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.documentType?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Documentos</h1>
              <p className="text-gray-600 mt-1">Upload e análise de documentos</p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <FaUpload /> Upload
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-8 py-8">
        {/* Search */}
        <div className="mb-6">
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
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocs.map((doc) => (
                  <tr
                    key={doc._id}
                    onClick={() => router.push(`/documents/${doc._id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaFileAlt className="text-blue-500 mr-3" />
                        <div className="text-sm font-medium text-gray-900">{doc.originalName}</div>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload de Documentos</h2>

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
                    Suportado: PDF, PNG, JPG (máx. 50MB)
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
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <span className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-4 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFiles([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={uploadMutation.isLoading || selectedFiles.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploadMutation.isLoading ? 'Enviando...' : 'Fazer Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
