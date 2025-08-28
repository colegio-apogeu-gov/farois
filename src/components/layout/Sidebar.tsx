import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  Building2, 
  Target, 
  TrendingUp, 
  LogOut,
  User
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const menuItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3
  },
  {
    label: 'Cadastros',
    href: '/cadastros',
    icon: Building2,
    subItems: [
      { label: 'Regionais', href: '/cadastros/regionais' },
      { label: 'Escolas', href: '/cadastros/escolas' },
      { label: 'Metas', href: '/cadastros/metas' }
    ]
  },
  {
    label: 'Resultados',
    href: '/resultados',
    icon: TrendingUp,
    subItems: [
      { label: 'Aulas Vagas', href: '/resultados/aulas-vagas' },
      { label: 'Presença CLT', href: '/resultados/presenca' },
      { label: 'Qualidade', href: '/resultados/qualidade' },
      { label: 'Infraestrutura', href: '/resultados/infraestrutura' },
      { label: 'Vagas Abertas', href: '/resultados/vagas-abertas' },
      { label: 'Rotina', href: '/resultados/rotina' },
      { label: 'Frequência', href: '/resultados/frequencia' },
      { label: 'NPS', href: '/resultados/nps' }
    ]
  }
];

export function Sidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Logout realizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao fazer logout');
    }
  };

  return (
    <aside className="bg-white shadow-sm border-r border-gray-200 h-screen w-64 fixed left-0 top-0 z-30">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Target size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Sistema Faróis</h1>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.href);
          
          return (
            <div key={item.href}>
              <Link
                to={item.href}
                className={`
                  flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
              
              {item.subItems && isActive && (
                <div className="ml-8 mt-2 space-y-1">
                  {item.subItems.map((subItem) => (
                    <Link
                      key={subItem.href}
                      to={subItem.href}
                      className={`
                        block px-3 py-1 text-sm rounded transition-colors
                        ${location.pathname === subItem.href
                          ? 'text-blue-700 bg-blue-50'
                          : 'text-gray-500 hover:text-gray-700'
                        }
                      `}
                    >
                      {subItem.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <User size={16} className="text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}