import React from 'react';
import { 
  ChartBarIcon, 
  DocumentTextIcon, 
  BellIcon, 
  TrendingUpIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
  const statsData = [
    {
      title: 'Oportunidades Ativas',
      value: '47',
      change: '+12%',
      changeType: 'increase',
      icon: TrendingUpIcon,
      color: 'bg-green-500'
    },
    {
      title: 'Monitores Ativos',
      value: '8',
      change: '+2',
      changeType: 'increase',
      icon: BellIcon,
      color: 'bg-blue-500'
    },
    {
      title: 'Documentos Analisados',
      value: '156',
      change: '+28%',
      changeType: 'increase',
      icon: DocumentTextIcon,
      color: 'bg-purple-500'
    },
    {
      title: 'Taxa de Sucesso',
      value: '73%',
      change: '+5%',
      changeType: 'increase',
      icon: CheckCircleIcon,
      color: 'bg-amber-500'
    }
  ];

  const opportunityData = [
    { name: 'Jan', oportunidades: 65, vencidas: 12 },
    { name: 'Fev', oportunidades: 78, vencidas: 18 },
    { name: 'Mar', oportunidades: 82, vencidas: 15 },
    { name: 'Abr', oportunidades: 91, vencidas: 22 },
    { name: 'Mai', oportunidades: 105, vencidas: 28 },
    { name: 'Jun', oportunidades: 118, vencidas: 31 }
  ];

  const categoryData = [
    { name: 'Tecnologia', value: 35, color: '#8884d8' },
    { name: 'Consultorias', value: 25, color: '#82ca9d' },
    { name: 'Obras', value: 20, color: '#ffc658' },
    { name: 'Serviços', value: 15, color: '#ff7300' },
    { name: 'Outros', value: 5, color: '#0088fe' }
  ];

  const recentOpportunities = [
    {
      id: 1,
      title: 'Desenvolvimento de Sistema de Gestão',
      organ: 'Prefeitura de São Paulo',
      value: 450000,
      deadline: '2024-02-15',
      status: 'open',
      probability: 85
    },
    {
      id: 2,
      title: 'Consultoria em Transformação Digital',
      organ: 'Governo do Estado de SP',
      value: 780000,
      deadline: '2024-02-20',
      status: 'open',
      probability: 92
    },
    {
      id: 3,
      title: 'Implementação de ERP',
      organ: 'SABESP',
      value: 1200000,
      deadline: '2024-02-18',
      status: 'analyzing',
      probability: 67
    }
  ];

  const legalAlerts = [
    {
      type: 'warning',
      message: 'Certidão CND próxima ao vencimento (5 dias)',
      time: '2 horas atrás'
    },
    {
      type: 'info',
      message: 'Nova jurisprudência TCU sobre pregões eletrônicos',
      time: '4 horas atrás'
    },
    {
      type: 'success',
      message: 'Documentação da Empresa XYZ aprovada automaticamente',
      time: '6 horas atrás'
    }
  ];

  const getProbabilityClass = (prob) => {
    if (prob >= 80) return 'success-probability-high';
    if (prob >= 60) return 'success-probability-medium';
    return 'success-probability-low';
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Visão geral das suas oportunidades e atividades de licitação</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl card-shadow p-6">
              <div className="flex items-center">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <div className="flex items-center">
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                    <span className="ml-2 text-sm font-medium text-green-600">{stat.change}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl card-shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Oportunidades por Mês</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={opportunityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="oportunidades" fill="#3b82f6" />
              <Bar dataKey="vencidas" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl card-shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Oportunidades por Categoria</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {categoryData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-gray-600">{item.name}: {item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl card-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Oportunidades Recentes</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Ver todas
            </button>
          </div>
          
          <div className="space-y-4">
            {recentOpportunities.map((opportunity) => (
              <div key={opportunity.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{opportunity.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{opportunity.organ}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>R$ {opportunity.value.toLocaleString('pt-BR')}</span>
                      <span>Prazo: {opportunity.deadline}</span>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      opportunity.status === 'open' ? 'bg-green-100 text-green-800' :
                      opportunity.status === 'analyzing' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {opportunity.status === 'open' ? 'Aberto' :
                       opportunity.status === 'analyzing' ? 'Analisando' : 'Fechado'}
                    </span>
                    <p className={`text-sm mt-1 ${getProbabilityClass(opportunity.probability)}`}>
                      {opportunity.probability}% sucesso
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl card-shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas Jurídicos</h3>
          
          <div className="space-y-3">
            {legalAlerts.map((alert, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                <div className="flex-shrink-0">
                  {alert.type === 'warning' && (
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                  )}
                  {alert.type === 'info' && (
                    <EyeIcon className="h-5 w-5 text-blue-500" />
                  )}
                  {alert.type === 'success' && (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
          
          <button className="w-full mt-4 text-center text-blue-600 hover:text-blue-800 text-sm font-medium">
            Ver todos os alertas
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;