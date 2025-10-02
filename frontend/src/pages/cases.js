import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { cases } from '../services/api';
import { FaPlus, FaFolder, FaSearch } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function Cases() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCase, setNewCase] = useState({
    title: '',
    description: '',
    numeroProcesso: '',
    areaJuridica: 'civil',
    cliente: { nome: '', tipo: 'autor' }
  });

  const { data, isLoading } = useQuery('cases', () => cases.list());

  const createMutation = useMutation(
    (data) => cases.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('cases');
        setShowCreateModal(false);
        setNewCase({
          title: '',
          description: '',
          numeroProcesso: '',
          areaJuridica: 'civil',
          cliente: { nome: '', tipo: 'autor' }
        });
        toast.success('Caso criado com sucesso!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Erro ao criar caso');
      }
    }
  );

  const handleCreateCase = (e) => {
    e.preventDefault();
    createMutation.mutate(newCase);
  };

  const filteredCases = data?.data?.cases?.filter(c =>
    c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.numeroProcesso?.includes(searchTerm) ||
    c.areaJuridica?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Casos</h1>
              <p className="text-gray-600 mt-1">Gerenciar casos jurídicos</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <FaPlus /> Novo Caso
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
              placeholder="Buscar por título, número do processo ou área jurídica..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Cases Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Carregando casos...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FaFolder className="text-6xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Nenhum caso encontrado</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Criar Primeiro Caso
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCases.map((caseItem) => (
              <div
                key={caseItem._id}
                onClick={() => router.push(`/cases/${caseItem._id}`)}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer p-6"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{caseItem.title}</h3>
                {caseItem.numeroProcesso && (
                  <p className="text-sm text-gray-600 mb-3">Nº {caseItem.numeroProcesso}</p>
                )}
                <p className="text-gray-700 mb-4 line-clamp-2">{caseItem.description || 'Sem descrição'}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1 text-xs rounded-full ${statusColors[caseItem.status]}`}>
                    {statusLabels[caseItem.status]}
                  </span>
                  {caseItem.areaJuridica && (
                    <span className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                      {caseItem.areaJuridica}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Criar Novo Caso</h2>
            <form onSubmit={handleCreateCase}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCase.title}
                    onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número do Processo
                  </label>
                  <input
                    type="text"
                    value={newCase.numeroProcesso}
                    onChange={(e) => setNewCase({ ...newCase, numeroProcesso: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Área Jurídica
                  </label>
                  <select
                    value={newCase.areaJuridica}
                    onChange={(e) => setNewCase({ ...newCase, areaJuridica: e.target.value })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Cliente
                  </label>
                  <input
                    type="text"
                    value={newCase.cliente.nome}
                    onChange={(e) => setNewCase({
                      ...newCase,
                      cliente: { ...newCase.cliente, nome: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    rows="4"
                    value={newCase.description}
                    onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isLoading ? 'Criando...' : 'Criar Caso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
