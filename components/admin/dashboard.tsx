'use client';

import { Fragment } from 'react'
import { Transition } from '@headlessui/react'
import {
  UsersIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline'
import {
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/20/solid'

interface DashboardStats {
  totalUsers: number
  totalCompanies: number
  totalOpportunities: number
  revenueThisMonth: number
  systemHealth: string
  criticalAlerts: number
  userGrowth: number
  revenueGrowth: number
  opportunityGrowth: number
  aiAccuracy: number
}

interface AdminDashboardProps {
  user: {
    name: string
    email: string
    role?: string
  }
  stats: DashboardStats
}

const statsConfig = [
  {
    id: 'users',
    name: 'Total de Usuários',
    stat: 'totalUsers',
    icon: UsersIcon,
    change: 'userGrowth',
    changeType: 'increase',
    color: 'blue'
  },
  {
    id: 'companies',
    name: 'Empresas Ativas',
    stat: 'totalCompanies',
    icon: BuildingOfficeIcon,
    change: 'userGrowth',
    changeType: 'increase',
    color: 'green'
  },
  {
    id: 'opportunities',
    name: 'Licitações Monitoradas',
    stat: 'totalOpportunities',
    icon: DocumentTextIcon,
    change: 'opportunityGrowth',
    changeType: 'increase',
    color: 'purple'
  },
  {
    id: 'revenue',
    name: 'Receita Mensal',
    stat: 'revenueThisMonth',
    icon: CurrencyDollarIcon,
    change: 'revenueGrowth',
    changeType: 'increase',
    color: 'yellow',
    format: 'currency'
  },
]

const systemMetrics = [
  { name: 'Precisão da IA', value: 'aiAccuracy', format: 'percentage', color: 'green' },
  { name: 'Uptime do Sistema', value: 99.9, format: 'percentage', color: 'blue' },
  { name: 'Tempo de Resposta', value: '< 2s', format: 'text', color: 'purple' },
  { name: 'Satisfação dos Usuários', value: '4.7/5', format: 'text', color: 'yellow' },
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

function formatValue(value: number, format?: string) {
  if (format === 'currency') {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value)
  }
  
  if (format === 'percentage') {
    return `${value}%`
  }
  
  return new Intl.NumberFormat('pt-BR').format(value)
}

export default function AdminDashboard({ user, stats }: AdminDashboardProps) {
  const hasAlerts = stats.criticalAlerts > 0

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg">
        <div className="px-6 py-8 sm:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Bem-vindo, {user.name}
              </h1>
              <p className="mt-2 text-blue-100">
                Painel de Controle - LicitaFácil AI
              </p>
              <p className="mt-1 text-sm text-blue-200">
                {user.role || 'Administrador do Sistema'}
              </p>
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
                  <CheckCircleIcon className="h-5 w-5 text-white" />
                </div>
                <span className="text-white font-medium">Sistema Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {hasAlerts && (
        <Transition
          show={hasAlerts}
          as={Fragment}
          enter="transform ease-out duration-300 transition"
          enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
          enterTo="translate-y-0 opacity-100 sm:translate-x-0"
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="rounded-md bg-red-50 p-4 border border-red-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Alertas Críticos do Sistema
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    {stats.criticalAlerts} {stats.criticalAlerts === 1 ? 'alerta crítico requer' : 'alertas críticos requerem'} atenção imediata.
                  </p>
                </div>
                <div className="mt-4">
                  <div className="-mx-2 -my-1.5 flex">
                    <button
                      type="button"
                      className="rounded-md bg-red-50 px-2 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
                    >
                      Ver detalhes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statsConfig.map((item) => {
          const statValue = stats[item.stat as keyof DashboardStats] as number
          const changeValue = stats[item.change as keyof DashboardStats] as number
          const isPositive = changeValue > 0
          
          return (
            <div
              key={item.id}
              className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow-md hover:shadow-lg transition-shadow duration-200 sm:px-6"
            >
              <div>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <item.icon
                      className={classNames(
                        item.color === 'blue' && 'text-blue-600',
                        item.color === 'green' && 'text-green-600',
                        item.color === 'purple' && 'text-purple-600',
                        item.color === 'yellow' && 'text-yellow-600',
                        'h-6 w-6'
                      )}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {item.name}
                      </dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">
                          {formatValue(statValue, item.format)}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 right-0 transform translate-x-6 translate-y-6">
                <div className={classNames(
                  item.color === 'blue' && 'bg-blue-50',
                  item.color === 'green' && 'bg-green-50',
                  item.color === 'purple' && 'bg-purple-50',
                  item.color === 'yellow' && 'bg-yellow-50',
                  'inline-flex h-12 w-12 items-center justify-center rounded-full'
                )}>
                  <item.icon
                    className={classNames(
                      item.color === 'blue' && 'text-blue-600',
                      item.color === 'green' && 'text-green-600',
                      item.color === 'purple' && 'text-purple-600',
                      item.color === 'yellow' && 'text-yellow-600',
                      'h-6 w-6'
                    )}
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div className="absolute bottom-2 left-4">
                <div className="flex items-center">
                  {isPositive ? (
                    <ArrowUpIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 text-red-500" />
                  )}
                  <span className={classNames(
                    isPositive ? 'text-green-600' : 'text-red-600',
                    'text-sm font-medium'
                  )}>
                    {Math.abs(changeValue)}%
                  </span>
                  <span className="ml-1 text-xs text-gray-500">vs mês anterior</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* System Metrics */}
      <div className="bg-white shadow-lg rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <CpuChipIcon className="h-6 w-6 text-gray-600 mr-3" />
            <h3 className="text-lg font-medium text-gray-900">
              Métricas do Sistema
            </h3>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {systemMetrics.map((metric) => (
              <div key={metric.name} className="text-center">
                <div className={classNames(
                  metric.color === 'blue' && 'text-blue-600',
                  metric.color === 'green' && 'text-green-600',
                  metric.color === 'purple' && 'text-purple-600',
                  metric.color === 'yellow' && 'text-yellow-600',
                  'text-2xl font-bold'
                )}>
                  {typeof metric.value === 'number' ? 
                    formatValue(metric.value, metric.format) : 
                    metric.value
                  }
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {metric.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="bg-white shadow-lg rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Atividade Recente
            </h3>
          </div>
          <div className="p-6">
            <div className="flow-root">
              <ul className="-mb-8">
                {[
                  { action: 'Nova empresa cadastrada', user: 'Sistema', time: '2 min' },
                  { action: 'Backup automático concluído', user: 'Sistema', time: '1 hora' },
                  { action: 'Usuário aprovado', user: 'Admin', time: '2 horas' },
                  { action: 'Relatório gerado', user: 'Sistema', time: '3 horas' },
                ].map((item, itemIdx) => (
                  <li key={itemIdx}>
                    <div className="relative pb-8">
                      {itemIdx !== 3 ? (
                        <span
                          className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="bg-gray-400 h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white">
                            <ClockIcon className="h-4 w-4 text-white" aria-hidden="true" />
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm text-gray-900">{item.action}</p>
                            <p className="text-xs text-gray-500">por {item.user}</p>
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-gray-500">
                            <time>{item.time}</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white shadow-lg rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Status do Sistema
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                { name: 'Servidor Principal', status: 'online', value: '99.9%' },
                { name: 'Base de Dados', status: 'online', value: '100%' },
                { name: 'API Externa', status: 'online', value: '98.5%' },
                { name: 'Processamento IA', status: 'online', value: '97.2%' },
              ].map((service) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-2 w-2 bg-green-400 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-900">{service.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">{service.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}