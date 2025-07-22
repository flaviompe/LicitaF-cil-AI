import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  Search, 
  FileText, 
  Shield, 
  Bell,
  HelpCircle,
  BarChart3,
  Settings 
} from 'lucide-react'

const quickActions = [
  {
    title: 'Nova Proposta',
    description: 'Criar proposta para licitação',
    href: '/dashboard/proposals/new',
    icon: Plus,
    color: 'bg-blue-500 hover:bg-blue-600',
  },
  {
    title: 'Buscar Oportunidades',
    description: 'Encontrar novas licitações',
    href: '/dashboard/opportunities',
    icon: Search,
    color: 'bg-green-500 hover:bg-green-600',
  },
  {
    title: 'Gerenciar Certidões',
    description: 'Atualizar documentos',
    href: '/dashboard/certificates',
    icon: Shield,
    color: 'bg-orange-500 hover:bg-orange-600',
  },
  {
    title: 'Ver Relatórios',
    description: 'Acompanhar desempenho',
    href: '/dashboard/reports',
    icon: BarChart3,
    color: 'bg-purple-500 hover:bg-purple-600',
  },
  {
    title: 'Configurar Alertas',
    description: 'Personalizar notificações',
    href: '/dashboard/notifications',
    icon: Bell,
    color: 'bg-yellow-500 hover:bg-yellow-600',
  },
  {
    title: 'Guia Completo',
    description: 'Aprender sobre licitações',
    href: '/dashboard/guide',
    icon: HelpCircle,
    color: 'bg-indigo-500 hover:bg-indigo-600',
  },
]

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Button
              key={action.title}
              variant="outline"
              size="sm"
              className="h-auto p-3 flex flex-col items-center text-center"
              asChild
            >
              <Link href={action.href}>
                <div className={`p-2 rounded-full ${action.color} text-white mb-2`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="text-xs font-medium">{action.title}</div>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}