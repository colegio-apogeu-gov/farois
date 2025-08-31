import { Layout } from '../../components/layout/Layout';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Users, 
  GraduationCap, 
  UserCheck, 
  Star, 
  Building, 
  Briefcase, 
  CheckCircle, 
  BarChart3, 
  TrendingUp,
  FileText
} from 'lucide-react';

const resultadosCards = [
  {
    title: 'Aulas Vagas',
    description: 'Registros quinzenais de aulas vagas',
    icon: Calendar,
    href: '/resultados/aulas-vagas',
    color: 'bg-red-50 text-red-600'
  },
  {
    title: 'Presença - Professores',
    description: 'Presença quinzenal dos professores',
    icon: GraduationCap,
    href: '/resultados/presenca-professores',
    color: 'bg-blue-50 text-blue-600'
  },
  {
    title: 'Presença - Técnico Pedagógico',
    description: 'Presença quinzenal dos técnicos pedagógicos',
    icon: UserCheck,
    href: '/resultados/presenca-tp',
    color: 'bg-purple-50 text-purple-600'
  },
  {
    title: 'Presença - Apoio/Administrativo',
    description: 'Presença quinzenal do pessoal de apoio',
    icon: Users,
    href: '/resultados/presenca-apoio',
    color: 'bg-green-50 text-green-600'
  },
  {
    title: 'Qualidade',
    description: 'Pontuação mensal de qualidade',
    icon: Star,
    href: '/resultados/qualidade',
    color: 'bg-yellow-50 text-yellow-600'
  },
  {
    title: 'Plano de Infraestrutura',
    description: 'Conclusão mensal dos planos',
    icon: Building,
    href: '/resultados/infraestrutura',
    color: 'bg-gray-50 text-gray-600'
  },
  {
    title: 'Vagas em Aberto',
    description: 'Vagas quinzenais em aberto',
    icon: Briefcase,
    href: '/resultados/vagas-abertas',
    color: 'bg-orange-50 text-orange-600'
  },
  {
    title: 'Rotina',
    description: 'Cumprimento quinzenal de rotinas',
    icon: CheckCircle,
    href: '/resultados/rotina',
    color: 'bg-teal-50 text-teal-600'
  },
  {
    title: 'Frequência',
    description: 'Resultado anual de frequência',
    icon: BarChart3,
    href: '/resultados/frequencia',
    color: 'bg-indigo-50 text-indigo-600'
  },
  {
    title: 'NPS',
    description: 'Net Promoter Score mensal',
    icon: TrendingUp,
    href: '/resultados/nps',
    color: 'bg-pink-50 text-pink-600'
  },
  {
    title: 'Observações',
    description: 'Diagnósticos e ações quinzenais',
    icon: FileText,
    href: '/resultados/observacoes',
    color: 'bg-indigo-50 text-indigo-600'
  }
];

export function ResultadosIndexPage() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Resultados</h1>
          <p className="text-gray-600 mt-1">Registre e acompanhe os resultados por categoria</p>
        </div>

        {/* Cards de navegação */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resultadosCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                to={card.href}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${card.color} group-hover:scale-110 transition-transform`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-gray-600 mt-1 text-sm">
                      {card.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Informações adicionais */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Importantes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Periodicidade dos Registros</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• <strong>Quinzenal:</strong> Aulas vagas, Presença, Vagas abertas, Rotina</li>
                <li>• <strong>Mensal:</strong> Qualidade, Infraestrutura, NPS</li>
                <li>• <strong>Anual:</strong> Frequência</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Sistema de Faróis</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Verde: Meta atingida</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-600">Amarelo: Atenção necessária</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                  <span className="text-gray-600">Vermelho: Ação urgente</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}