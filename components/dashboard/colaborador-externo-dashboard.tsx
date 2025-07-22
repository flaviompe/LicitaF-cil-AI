import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Eye, 
  FileText, 
  MessageSquare, 
  Clock, 
  Search,
  HelpCircle,
  Filter,
  Bell
} from 'lucide-react'

interface ColaboradorExternoDashboardProps {
  user: any
  stats: {
    availableOpportunities: number
    recentUpdates: number
    accessLevel: string
    lastLogin: string
    notificationsEnabled: boolean
  }
}

export function ColaboradorExternoDashboard({ user, stats }: ColaboradorExternoDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Cabeçalho Colaborador Externo */}
      <div className="bg-gradient-to-r from-gray-600 to-slate-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Eye className="h-6 w-6 mr-2" />
              Painel de Consulta
            </h1>
            <p className="text-gray-100">Bem-vindo, {user.name} - Colaborador Externo</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-100">Nível de Acesso</div>
            <div className="text-lg font-bold">{stats.accessLevel}</div>
          </div>
        </div>
      </div>

      {/* Informações de Acesso */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <HelpCircle className="h-5 w-5 mr-2" />
            Informações de Acesso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-blue-700">
              • Você tem acesso limitado apenas às oportunidades de licitação
            </p>
            <p className="text-blue-700">
              • Utilize o assistente de IA para tirar dúvidas sobre editais
            </p>
            <p className="text-blue-700">
              • Último acesso: {stats.lastLogin}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Básicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oportunidades Disponíveis</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.availableOpportunities}</div>
            <p className="text-xs text-muted-foreground">Licitações ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atualizações Recentes</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentUpdates}</div>
            <p className="text-xs text-muted-foreground">Novos editais esta semana</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assistente IA</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Disponível</div>
            <p className="text-xs text-muted-foreground">Para consultas jurídicas</p>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="h-5 w-5 mr-2" />
              Buscar Oportunidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Por Órgão</span>
                <Badge variant="outline">Filtro disponível</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Por Modalidade</span>
                <Badge variant="outline">Filtro disponível</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Por Valor</span>
                <Badge variant="outline">Filtro disponível</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Oportunidades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Pregão Eletrônico SABESP</span>
                <Badge variant="secondary">Novo</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Concorrência Petrobras</span>
                <Badge variant="outline">2 dias</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Licitação Prefeitura SP</span>
                <Badge variant="outline">1 semana</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aviso de Limitações */}
      <Card className="border-gray-200 bg-gray-50">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-800">
            <Filter className="h-5 w-5 mr-2" />
            Recursos Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-green-700 mb-2">✓ Permitido</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Visualizar oportunidades</li>
                <li>• Consultar editais</li>
                <li>• Usar assistente IA</li>
                <li>• Receber notificações</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-red-700 mb-2">✗ Restrito</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Gerenciar propostas</li>
                <li>• Acessar dados financeiros</li>
                <li>• Modificar certificados</li>
                <li>• Configurações do sistema</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}