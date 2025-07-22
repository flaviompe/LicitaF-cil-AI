import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Scale, 
  FileText, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  BookOpen,
  Gavel
} from 'lucide-react'

interface JuridicoDashboardProps {
  user: any
  stats: {
    certificatesExpiring: number
    legalDocumentsReview: number
    complianceStatus: string
    regulatoryUpdates: number
    pendingLegalAnalysis: number
    completedAnalysis: number
  }
}

export function JuridicoDashboard({ user, stats }: JuridicoDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Cabeçalho Jurídico */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Scale className="h-6 w-6 mr-2" />
              Painel Jurídico
            </h1>
            <p className="text-emerald-100">Bem-vindo, {user.name} - Especialista Jurídico</p>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white">
            Compliance: {stats.complianceStatus}
          </Badge>
        </div>
      </div>

      {/* Alertas Jurídicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.certificatesExpiring > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center text-amber-800">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Certidões Vencendo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-amber-700">
                {stats.certificatesExpiring} certidões vencendo em 30 dias
              </p>
            </CardContent>
          </Card>
        )}

        {stats.legalDocumentsReview > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800">
                <FileText className="h-5 w-5 mr-2" />
                Documentos para Revisão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-blue-700">
                {stats.legalDocumentsReview} documentos aguardando análise jurídica
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Métricas Jurídicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Análises Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingLegalAnalysis}</div>
            <p className="text-xs text-muted-foreground">Documentos aguardando análise</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Análises Concluídas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedAnalysis}</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atualizações Regulatórias</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.regulatoryUpdates}</div>
            <p className="text-xs text-muted-foreground">Novas regulamentações</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certidões Válidas</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground">Taxa de regularidade</p>
          </CardContent>
        </Card>
      </div>

      {/* Ações Jurídicas Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Documentos Prioritários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Edital TCE-SP 2024-001</span>
                <Badge variant="destructive">Urgente</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Contrato Prefeitura Santos</span>
                <Badge variant="secondary">Revisão</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Certidão INSS - Empresa XYZ</span>
                <Badge variant="outline">Pendente</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Agenda Jurídica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Audiência Tribunal - 14h</span>
                <Badge variant="secondary">Hoje</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Análise Edital SABESP</span>
                <Badge variant="outline">Amanhã</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Reunião Compliance</span>
                <Badge variant="outline">Sex 10:00</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}