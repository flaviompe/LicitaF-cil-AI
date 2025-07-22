'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, Calendar, Grid3X3, List, Settings, 
  Search, Filter, Download, Plus, Bell, User,
  TrendingUp, AlertTriangle, CheckCircle, Clock,
  Target, DollarSign, FileText, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Tipos para o dashboard moderno
interface DashboardData {
  opportunities: Opportunity[];
  statistics: Statistics;
  recentActivity: Activity[];
  upcomingDeadlines: Deadline[];
}

interface Opportunity {
  id: string;
  title: string;
  entity: string;
  value: number;
  deadline: Date;
  status: 'OPEN' | 'ANALYZING' | 'BID_SUBMITTED' | 'UNDER_REVIEW' | 'WON' | 'LOST';
  category: string;
  probability: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  tags: string[];
}

interface Statistics {
  totalOpportunities: number;
  activeParticipations: number;
  winRate: number;
  totalValue: number;
  monthlyGrowth: number;
  avgResponseTime: number;
}

interface Activity {
  id: string;
  type: 'BID_SUBMITTED' | 'OPPORTUNITY_FOUND' | 'DEADLINE_REMINDER' | 'STATUS_CHANGE';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface Deadline {
  id: string;
  opportunityId: string;
  title: string;
  deadline: Date;
  daysLeft: number;
  type: 'SUBMISSION' | 'DOCUMENT' | 'PRESENTATION';
  completed: boolean;
}

type ViewMode = 'grid' | 'list' | 'kanban' | 'calendar';

export default function ModernDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Simular carregamento de dados
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setDashboardData({
        opportunities: generateMockOpportunities(),
        statistics: generateMockStatistics(),
        recentActivity: generateMockActivity(),
        upcomingDeadlines: generateMockDeadlines()
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOpportunities = dashboardData?.opportunities.filter(opp => {
    const matchesSearch = opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         opp.entity.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilters = selectedFilters.length === 0 || 
                          selectedFilters.some(filter => opp.tags.includes(filter));
    return matchesSearch && matchesFilters;
  }) || [];

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <DashboardHeader 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Sidebar - Statistics & Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            <StatisticsCards statistics={dashboardData!.statistics} />
            <QuickActions />
            <UpcomingDeadlines deadlines={dashboardData!.upcomingDeadlines} />
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Filters & Controls */}
            <FilterControls 
              selectedFilters={selectedFilters}
              setSelectedFilters={setSelectedFilters}
            />

            {/* Opportunities View */}
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {viewMode === 'grid' && <GridView opportunities={filteredOpportunities} />}
              {viewMode === 'list' && <ListView opportunities={filteredOpportunities} />}
              {viewMode === 'kanban' && <KanbanView opportunities={filteredOpportunities} />}
              {viewMode === 'calendar' && <CalendarView opportunities={filteredOpportunities} />}
            </motion.div>
          </div>
        </div>

        {/* Recent Activity Sidebar */}
        <div className="mt-8">
          <RecentActivity activities={dashboardData!.recentActivity} />
        </div>
      </div>
    </div>
  );
}

// Componente do Header
function DashboardHeader({ 
  searchQuery, 
  setSearchQuery, 
  viewMode, 
  setViewMode 
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}) {
  return (
    <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                LicitaFácil Pro
              </h1>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Buscar licitações..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 w-full"
              />
            </div>
          </div>

          {/* View Controls & Actions */}
          <div className="flex items-center space-x-2">
            
            {/* View Mode Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
              {[
                { mode: 'grid' as ViewMode, icon: Grid3X3 },
                { mode: 'list' as ViewMode, icon: List },
                { mode: 'kanban' as ViewMode, icon: BarChart3 },
                { mode: 'calendar' as ViewMode, icon: Calendar }
              ].map(({ mode, icon: Icon }) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                  className="px-2 py-1"
                >
                  <Icon className="w-4 h-4" />
                </Button>
              ))}
            </div>

            {/* Action Buttons */}
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Nova Oportunidade
            </Button>
            
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>

            {/* Notifications */}
            <Button variant="outline" size="sm" className="relative">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>

            {/* User Menu */}
            <Button variant="outline" size="sm">
              <User className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

// Componente de Cards de Estatísticas
function StatisticsCards({ statistics }: { statistics: Statistics }) {
  const stats = [
    {
      title: "Oportunidades Ativas",
      value: statistics.totalOpportunities,
      icon: Target,
      color: "from-blue-600 to-blue-700",
      change: `+${statistics.monthlyGrowth}%`
    },
    {
      title: "Taxa de Vitória",
      value: `${statistics.winRate}%`,
      icon: TrendingUp,
      color: "from-green-600 to-green-700",
      change: "+2.1%"
    },
    {
      title: "Valor Total",
      value: `R$ ${(statistics.totalValue / 1000000).toFixed(1)}M`,
      icon: DollarSign,
      color: "from-purple-600 to-purple-700",
      change: "+15.3%"
    },
    {
      title: "Tempo Médio",
      value: `${statistics.avgResponseTime}h`,
      icon: Clock,
      color: "from-orange-600 to-orange-700",
      change: "-0.5h"
    }
  ];

  return (
    <div className="space-y-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stat.value}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {stat.change}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// Quick Actions
function QuickActions() {
  const actions = [
    { title: "Análise de Edital", icon: FileText, color: "bg-blue-600" },
    { title: "Gerar Proposta", icon: Plus, color: "bg-green-600" },
    { title: "Consulta Jurídica", icon: Users, color: "bg-purple-600" },
    { title: "Relatórios", icon: BarChart3, color: "bg-orange-600" }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action, index) => (
          <Button
            key={action.title}
            variant="ghost"
            className="w-full justify-start"
            size="sm"
          >
            <div className={`w-6 h-6 rounded ${action.color} flex items-center justify-center mr-3`}>
              <action.icon className="w-3 h-3 text-white" />
            </div>
            {action.title}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

// Próximos Prazos
function UpcomingDeadlines({ deadlines }: { deadlines: Deadline[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Próximos Prazos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {deadlines.slice(0, 5).map((deadline) => (
          <div key={deadline.id} className="flex items-center space-x-3">
            <div className={`w-2 h-2 rounded-full ${
              deadline.daysLeft <= 1 ? 'bg-red-500' :
              deadline.daysLeft <= 3 ? 'bg-yellow-500' : 'bg-green-500'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {deadline.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {deadline.daysLeft} dias restantes
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Controles de Filtro
function FilterControls({ 
  selectedFilters, 
  setSelectedFilters 
}: {
  selectedFilters: string[];
  setSelectedFilters: (filters: string[]) => void;
}) {
  const filters = [
    'Tecnologia', 'Saúde', 'Educação', 'Infraestrutura', 
    'Serviços', 'Consultoria', 'Equipamentos'
  ];

  const toggleFilter = (filter: string) => {
    setSelectedFilters(
      selectedFilters.includes(filter)
        ? selectedFilters.filter(f => f !== filter)
        : [...selectedFilters, filter]
    );
  };

  return (
    <div className="flex items-center space-x-4 py-4">
      <Filter className="w-4 h-4 text-slate-600" />
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Badge
            key={filter}
            variant={selectedFilters.includes(filter) ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => toggleFilter(filter)}
          >
            {filter}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// Views diferentes
function GridView({ opportunities }: { opportunities: Opportunity[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {opportunities.map((opp, index) => (
        <motion.div
          key={opp.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <OpportunityCard opportunity={opp} />
        </motion.div>
      ))}
    </div>
  );
}

function ListView({ opportunities }: { opportunities: Opportunity[] }) {
  return (
    <div className="space-y-4">
      {opportunities.map((opp, index) => (
        <motion.div
          key={opp.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <OpportunityListItem opportunity={opp} />
        </motion.div>
      ))}
    </div>
  );
}

function KanbanView({ opportunities }: { opportunities: Opportunity[] }) {
  const stages = [
    { id: 'OPEN', title: 'Abertas', color: 'bg-blue-100 text-blue-800' },
    { id: 'ANALYZING', title: 'Analisando', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'BID_SUBMITTED', title: 'Proposta Enviada', color: 'bg-purple-100 text-purple-800' },
    { id: 'WON', title: 'Vencidas', color: 'bg-green-100 text-green-800' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stages.map((stage) => (
        <div key={stage.id} className="space-y-4">
          <div className={`px-3 py-2 rounded-lg ${stage.color} text-center font-medium`}>
            {stage.title}
          </div>
          <div className="space-y-3">
            {opportunities
              .filter(opp => opp.status === stage.id)
              .map((opp) => (
                <OpportunityCard key={opp.id} opportunity={opp} compact />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CalendarView({ opportunities }: { opportunities: Opportunity[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendário de Licitações</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-slate-500">
          <Calendar className="w-12 h-12 mx-auto mb-4" />
          <p>Visualização de calendário em desenvolvimento</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Card de Oportunidade
function OpportunityCard({ opportunity, compact = false }: { 
  opportunity: Opportunity; 
  compact?: boolean;
}) {
  const statusColors = {
    OPEN: 'bg-blue-100 text-blue-800',
    ANALYZING: 'bg-yellow-100 text-yellow-800',
    BID_SUBMITTED: 'bg-purple-100 text-purple-800',
    UNDER_REVIEW: 'bg-orange-100 text-orange-800',
    WON: 'bg-green-100 text-green-800',
    LOST: 'bg-red-100 text-red-800'
  };

  const riskColors = {
    LOW: 'bg-green-500',
    MEDIUM: 'bg-yellow-500',
    HIGH: 'bg-red-500'
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className={compact ? "p-4" : "p-6"}>
        <div className="space-y-4">
          
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold text-slate-900 dark:text-white ${compact ? 'text-sm' : 'text-lg'} line-clamp-2`}>
                {opportunity.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {opportunity.entity}
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${riskColors[opportunity.riskLevel]} ml-2 mt-1`} />
          </div>

          {/* Value & Probability */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Valor</p>
              <p className={`font-bold text-slate-900 dark:text-white ${compact ? 'text-sm' : 'text-lg'}`}>
                R$ {opportunity.value.toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600 dark:text-slate-400">Chance</p>
              <p className={`font-bold text-green-600 ${compact ? 'text-sm' : 'text-lg'}`}>
                {opportunity.probability}%
              </p>
            </div>
          </div>

          {/* Status & Deadline */}
          <div className="flex items-center justify-between">
            <Badge className={statusColors[opportunity.status]}>
              {opportunity.status.replace('_', ' ')}
            </Badge>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {Math.ceil((opportunity.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias
            </p>
          </div>

          {/* Tags */}
          {!compact && (
            <div className="flex flex-wrap gap-1">
              {opportunity.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Item de Lista
function OpportunityListItem({ opportunity }: { opportunity: Opportunity }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">
              {opportunity.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {opportunity.entity}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-900 dark:text-white">
              R$ {opportunity.value.toLocaleString('pt-BR')}
            </p>
            <p className="text-sm text-green-600">
              {opportunity.probability}% chance
            </p>
          </div>
          <Badge>
            {opportunity.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// Atividade Recente
function RecentActivity({ activities }: { activities: Activity[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.slice(0, 10).map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center space-x-3"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">{activity.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {activity.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activity.description}
                </p>
              </div>
              <p className="text-xs text-slate-400">
                {formatRelativeTime(activity.timestamp)}
              </p>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton de Loading
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Funções auxiliares
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// Funções para gerar dados mock
function generateMockOpportunities(): Opportunity[] {
  // Implementação dos dados mock...
  return [];
}

function generateMockStatistics(): Statistics {
  return {
    totalOpportunities: 145,
    activeParticipations: 23,
    winRate: 67,
    totalValue: 12500000,
    monthlyGrowth: 8.2,
    avgResponseTime: 2.4
  };
}

function generateMockActivity(): Activity[] {
  return [];
}

function generateMockDeadlines(): Deadline[] {
  return [];
}