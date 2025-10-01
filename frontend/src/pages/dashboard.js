import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useQuery } from 'react-query';
import { cases, documents } from '../services/api';
import { FaFileAlt, FaFolder, FaQuestionCircle, FaChartLine } from 'react-icons/fa';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const { data: casesData } = useQuery('cases', () => cases.list({ limit: 5 }));
  const { data: documentsData } = useQuery('documents', () => documents.list({ limit: 5 }));

  const stats = [
    {
      name: 'Total de Casos',
      value: casesData?.data?.total || 0,
      icon: FaFolder,
      color: 'bg-blue-500',
    },
    {
      name: 'Documentos',
      value: documentsData?.data?.total || 0,
      icon: FaFileAlt,
      color: 'bg-green-500',
    },
    {
      name: 'Processados',
      value: documentsData?.data?.documents?.filter(d => d.ocrStatus === 'completed').length || 0,
      icon: FaChartLine,
      color: 'bg-purple-500',
    },
    {
      name: 'Questionários',
      value: 0,
      icon: FaQuestionCircle,
      color: 'bg-orange-500',
    },
  ];

  return (
    <>
      <Head>
        <title>Dashboard - Parecer</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/cases')}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Casos
              </button>
              <button
                onClick={() => router.push('/documents')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Documentos
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  router.push('/login');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat) => (
              <div key={stat.name} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <stat.icon className="text-white text-2xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Cases */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Casos Recentes</h2>
              <div className="space-y-3">
                {casesData?.data?.cases?.slice(0, 5).map((caseItem) => (
                  <div
                    key={caseItem._id}
                    onClick={() => router.push(`/cases/${caseItem._id}`)}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <h3 className="font-medium text-gray-900">{caseItem.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {caseItem.numeroProcesso || 'Sem número de processo'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        caseItem.status === 'analise' ? 'bg-yellow-100 text-yellow-800' :
                        caseItem.status === 'em_andamento' ? 'bg-blue-100 text-blue-800' :
                        caseItem.status === 'concluido' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {caseItem.status}
                      </span>
                      {caseItem.areaJuridica && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          {caseItem.areaJuridica}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {(!casesData?.data?.cases || casesData.data.cases.length === 0) && (
                  <p className="text-gray-500 text-center py-4">Nenhum caso encontrado</p>
                )}
              </div>
            </div>

            {/* Recent Documents */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Documentos Recentes</h2>
              <div className="space-y-3">
                {documentsData?.data?.documents?.slice(0, 5).map((doc) => (
                  <div
                    key={doc._id}
                    onClick={() => router.push(`/documents/${doc._id}`)}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <h3 className="font-medium text-gray-900">{doc.originalName}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        doc.ocrStatus === 'completed' ? 'bg-green-100 text-green-800' :
                        doc.ocrStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
                        doc.ocrStatus === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {doc.ocrStatus}
                      </span>
                      {doc.documentType && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          {doc.documentType}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {(!documentsData?.data?.documents || documentsData.data.documents.length === 0) && (
                  <p className="text-gray-500 text-center py-4">Nenhum documento encontrado</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
