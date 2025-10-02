import { useQuery } from 'react-query';
import { cases, documents } from '../services/api';
import { FaChartBar, FaChartPie, FaChartLine, FaFileAlt, FaFolder } from 'react-icons/fa';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Reports() {
  const { data: casesData } = useQuery('cases', () => cases.list());
  const { data: documentsData } = useQuery('documents', () => documents.list());

  // Estatísticas de casos por área jurídica
  const casesByArea = {};
  casesData?.data?.cases?.forEach(c => {
    const area = c.areaJuridica || 'Não definido';
    casesByArea[area] = (casesByArea[area] || 0) + 1;
  });

  const areaChartData = Object.entries(casesByArea).map(([area, count]) => ({
    name: area,
    value: count
  }));

  // Estatísticas de casos por status
  const casesByStatus = {};
  casesData?.data?.cases?.forEach(c => {
    const status = c.status || 'Não definido';
    casesByStatus[status] = (casesByStatus[status] || 0) + 1;
  });

  const statusChartData = Object.entries(casesByStatus).map(([status, count]) => ({
    name: status,
    value: count
  }));

  // Estatísticas de documentos por status OCR
  const docsByStatus = {};
  documentsData?.data?.documents?.forEach(d => {
    const status = d.ocrStatus || 'pending';
    docsByStatus[status] = (docsByStatus[status] || 0) + 1;
  });

  const ocrStatusData = Object.entries(docsByStatus).map(([status, count]) => ({
    name: status,
    value: count
  }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const stats = [
    {
      name: 'Total de Casos',
      value: casesData?.data?.total || 0,
      icon: FaFolder,
      color: 'bg-blue-500',
    },
    {
      name: 'Total de Documentos',
      value: documentsData?.data?.total || 0,
      icon: FaFileAlt,
      color: 'bg-green-500',
    },
    {
      name: 'Docs Processados',
      value: documentsData?.data?.documents?.filter(d => d.ocrStatus === 'completed').length || 0,
      icon: FaChartLine,
      color: 'bg-purple-500',
    },
    {
      name: 'Em Processamento',
      value: documentsData?.data?.documents?.filter(d => d.ocrStatus === 'processing').length || 0,
      icon: FaChartBar,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600 mt-1">Estatísticas e análises do sistema</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-8 py-8">
        {/* Stats Cards */}
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

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Cases by Area */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FaChartPie className="text-blue-600" />
              Casos por Área Jurídica
            </h2>
            {areaChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={areaChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {areaChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-12">Nenhum dado disponível</p>
            )}
          </div>

          {/* Cases by Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FaChartBar className="text-green-600" />
              Casos por Status
            </h2>
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-12">Nenhum dado disponível</p>
            )}
          </div>
        </div>

        {/* OCR Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaChartLine className="text-purple-600" />
            Status de Processamento OCR
          </h2>
          {ocrStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ocrStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">Nenhum dado disponível</p>
          )}
        </div>
      </main>
    </div>
  );
}
