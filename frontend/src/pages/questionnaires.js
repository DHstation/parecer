import { useQuery } from 'react-query';
import { useRouter } from 'next/router';
import { questionnaires } from '../services/api';
import { FaQuestionCircle, FaPlus } from 'react-icons/fa';

export default function Questionnaires() {
  const router = useRouter();
  const { data, isLoading } = useQuery('questionnaires', () => questionnaires.list());

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Questionários</h1>
              <p className="text-gray-600 mt-1">Questionários gerados por IA</p>
            </div>
            <button
              onClick={() => router.push('/questionnaires/generate')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <FaPlus /> Gerar Questionário
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-8 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Carregando questionários...</p>
          </div>
        ) : data?.data?.questionnaires?.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FaQuestionCircle className="text-6xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-2">Nenhum questionário encontrado</p>
            <p className="text-gray-500 text-sm mb-6">
              Gere questionários automaticamente a partir de casos e documentos
            </p>
            <button
              onClick={() => router.push('/questionnaires/generate')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Gerar Primeiro Questionário
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.data?.questionnaires?.map((q) => (
              <div
                key={q._id}
                onClick={() => router.push(`/questionnaires/${q._id}`)}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer p-6"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{q.title}</h3>
                <p className="text-gray-600 mb-4">
                  {q.questions?.length || 0} perguntas
                </p>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    {q.type}
                  </span>
                  {q.caseId && (
                    <span className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                      Com caso
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
