import { useRouter } from 'next/router';
import {
  FaHome,
  FaFolder,
  FaFileAlt,
  FaQuestionCircle,
  FaChartBar,
  FaSearch,
  FaSignOutAlt,
  FaUser
} from 'react-icons/fa';

export default function Sidebar() {
  const router = useRouter();

  const menuItems = [
    {
      name: 'Dashboard',
      icon: FaHome,
      path: '/dashboard',
      description: 'Visão geral do sistema'
    },
    {
      name: 'Casos',
      icon: FaFolder,
      path: '/cases',
      description: 'Gerenciar casos jurídicos'
    },
    {
      name: 'Documentos',
      icon: FaFileAlt,
      path: '/documents',
      description: 'Upload e análise de documentos'
    },
    {
      name: 'Busca Semântica',
      icon: FaSearch,
      path: '/search',
      description: 'Buscar nos documentos com IA'
    },
    {
      name: 'Questionários',
      icon: FaQuestionCircle,
      path: '/questionnaires',
      description: 'Questionários gerados por IA'
    },
    {
      name: 'Relatórios',
      icon: FaChartBar,
      path: '/reports',
      description: 'Estatísticas e análises'
    },
  ];

  const isActive = (path) => {
    return router.pathname === path || router.pathname.startsWith(path + '/');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white w-64 fixed left-0 top-0">
      {/* Logo / Header */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-white">Parecer</h1>
        <p className="text-sm text-gray-400 mt-1">Sistema de Análise Jurídica</p>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`
                w-full px-6 py-3 flex items-center gap-4 transition-all duration-200
                ${active
                  ? 'bg-blue-600 text-white border-l-4 border-blue-400'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white border-l-4 border-transparent'
                }
              `}
              title={item.description}
            >
              <Icon className="text-xl flex-shrink-0" />
              <div className="flex-1 text-left">
                <div className="font-medium">{item.name}</div>
                {active && (
                  <div className="text-xs text-blue-200 mt-0.5">{item.description}</div>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer / User Section */}
      <div className="border-t border-gray-700">
        <button
          onClick={() => router.push('/profile')}
          className="w-full px-6 py-3 flex items-center gap-4 hover:bg-gray-800 transition-colors"
        >
          <FaUser className="text-xl" />
          <div className="flex-1 text-left">
            <div className="font-medium text-sm">Perfil</div>
            <div className="text-xs text-gray-400">Configurações</div>
          </div>
        </button>

        <button
          onClick={handleLogout}
          className="w-full px-6 py-4 flex items-center gap-4 hover:bg-red-600 transition-colors"
        >
          <FaSignOutAlt className="text-xl" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </div>
  );
}
