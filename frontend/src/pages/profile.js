import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { auth } from '../services/api';
import { FaUser, FaSave } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function Profile() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    oab: '',
    department: ''
  });

  const { data: profileData, isLoading } = useQuery('profile', () => auth.getProfile());

  useEffect(() => {
    if (profileData?.data) {
      setFormData({
        name: profileData.data.name || '',
        email: profileData.data.email || '',
        oab: profileData.data.oab || '',
        department: profileData.data.department || ''
      });
    }
  }, [profileData]);

  const updateMutation = useMutation(
    (data) => auth.updateProfile(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('profile');
        toast.success('Perfil atualizado com sucesso!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Erro ao atualizar perfil');
      }
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      name: formData.name,
      oab: formData.oab,
      department: formData.department
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Perfil</h1>
          <p className="text-gray-600 mt-1">Gerenciar suas informações pessoais</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8">
            {/* Avatar */}
            <div className="flex items-center mb-8">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {formData.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="ml-6">
                <h2 className="text-2xl font-semibold text-gray-900">{formData.name}</h2>
                <p className="text-gray-600">{formData.email}</p>
                <span className="inline-block mt-2 px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  {profileData?.data?.role}
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">O email não pode ser alterado</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    OAB
                  </label>
                  <input
                    type="text"
                    value={formData.oab}
                    onChange={(e) => setFormData({ ...formData, oab: e.target.value })}
                    placeholder="Ex: OAB/SP 123456"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departamento
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Ex: Contencioso Cível"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={updateMutation.isLoading}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <FaSave />
                    {updateMutation.isLoading ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </form>

            {/* Additional Info */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações da Conta</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Função</p>
                  <p className="font-medium text-gray-900">{profileData?.data?.role}</p>
                </div>
                <div>
                  <p className="text-gray-600">Último Login</p>
                  <p className="font-medium text-gray-900">
                    {profileData?.data?.lastLogin
                      ? new Date(profileData.data.lastLogin).toLocaleString('pt-BR')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Membro desde</p>
                  <p className="font-medium text-gray-900">
                    {new Date(profileData?.data?.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  <p className="font-medium text-green-600">
                    {profileData?.data?.isActive ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
