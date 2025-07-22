import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { RecentOpportunities } from '@/components/dashboard/recent-opportunities'
import { ExpiringCertificates } from '@/components/dashboard/expiring-certificates'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { AdminDashboard } from '@/components/dashboard/admin-dashboard'
import { JuridicoDashboard } from '@/components/dashboard/juridico-dashboard'
import { ComercialDashboard } from '@/components/dashboard/comercial-dashboard'
import { TecnicoDashboard } from '@/components/dashboard/tecnico-dashboard'
import { FinanceiroDashboard } from '@/components/dashboard/financeiro-dashboard'
import { ColaboradorExternoDashboard } from '@/components/dashboard/colaborador-externo-dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, TrendingUp, Calendar, FileText } from 'lucide-react'
import { UserRole } from '@/lib/role-permissions'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return <div>Carregando...</div>
  }

  // Buscar dados do usuário e empresa
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      company: true,
      proposals: {
        include: {
          opportunity: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      },
      certificates: {
        where: {
          status: 'VALID',
        },
        orderBy: {
          expiryDate: 'asc',
        },
        take: 5,
      },
    },
  })

  if (!user) {
    return <div>Usuário não encontrado</div>
  }

  // Buscar oportunidades recentes
  const recentOpportunities = await db.opportunity.findMany({
    where: {
      companyId: user.company?.id,
      status: 'OPEN',
    },
    orderBy: {
      publishDate: 'desc',
    },
    take: 10,
  })

  // Calcular estatísticas
  const totalProposals = await db.proposal.count({
    where: { userId: session.user.id },
  })

  const acceptedProposals = await db.proposal.count({
    where: {
      userId: session.user.id,
      status: 'ACCEPTED',
    },
  })

  const pendingProposals = await db.proposal.count({
    where: {
      userId: session.user.id,
      status: 'PENDING',
    },
  })

  const expiringCertificates = await db.certificate.count({
    where: {
      userId: session.user.id,
      expiryDate: {
        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
      },
      status: 'VALID',
    },
  })

  const successRate = totalProposals > 0 ? (acceptedProposals / totalProposals) * 100 : 0

  // Renderizar dashboard específico baseado no perfil do usuário
  const userRole = (session.user.role || 'USER') as UserRole

  // Dados mock para demonstração dos dashboards específicos
  const mockStats = {
    admin: {
      totalUsers: 1250,
      totalOpportunities: 450,
      totalProposals: 2800,
      totalCompanies: 340,
      systemHealth: 'Excelente',
      revenueThisMonth: 87500,
      criticalAlerts: 0
    },
    juridico: {
      certificatesExpiring: expiringCertificates,
      legalDocumentsReview: 12,
      complianceStatus: 'Conforme',
      regulatoryUpdates: 3,
      pendingLegalAnalysis: 8,
      completedAnalysis: 24
    },
    comercial: {
      monthlyRevenue: 145000,
      proposalsWon: acceptedProposals,
      proposalsSubmitted: totalProposals,
      winRate: successRate,
      activePipeline: 18,
      monthlyTarget: 200000,
      newOpportunities: 7,
      closingOpportunities: 3
    },
    tecnico: {
      systemUptime: 99.7,
      activeServers: 12,
      totalServers: 14,
      pendingUpdates: 3,
      securityAlerts: 1,
      backupStatus: 'OK',
      performanceScore: 87,
      criticalIssues: 0
    },
    financeiro: {
      monthlyRevenue: 245000,
      monthlyExpenses: 180000,
      profit: 65000,
      profitMargin: 26.5,
      pendingPayments: 45000,
      overdueBills: 2,
      cashFlow: 125000,
      projectedRevenue: 280000,
      budgetVariance: 8.5
    },
    colaboradorExterno: {
      availableOpportunities: recentOpportunities.length,
      recentUpdates: 5,
      accessLevel: 'Consulta',
      lastLogin: '16/07/2025 14:30',
      notificationsEnabled: true
    }
  }

  // Renderizar dashboard específico baseado no perfil
  switch (userRole) {
    case 'ADMIN':
      return <AdminDashboard user={user} stats={mockStats.admin} />
    
    case 'JURIDICO':
      return <JuridicoDashboard user={user} stats={mockStats.juridico} />
    
    case 'COMERCIAL':
      return <ComercialDashboard user={user} stats={mockStats.comercial} />
    
    case 'TECNICO':
      return <TecnicoDashboard user={user} stats={mockStats.tecnico} />
    
    case 'FINANCEIRO':
      return <FinanceiroDashboard user={user} stats={mockStats.financeiro} />
    
    case 'COLABORADOR_EXTERNO':
      return <ColaboradorExternoDashboard user={user} stats={mockStats.colaboradorExterno} />
    
    default:
      // Dashboard padrão para usuários normais
      return (
        <div className="space-y-8">
          {/* Cabeçalho */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Bem-vindo de volta, {user.name}!
            </p>
          </div>

          {/* Estatísticas */}
          <DashboardStats
            totalProposals={totalProposals}
            acceptedProposals={acceptedProposals}
            pendingProposals={pendingProposals}
            successRate={successRate}
          />

          {/* Alertas importantes */}
          {expiringCertificates > 0 && (
            <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-800 dark:text-orange-200">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Atenção: Certidões Vencendo
                </CardTitle>
                <CardDescription className="text-orange-700 dark:text-orange-300">
                  Você tem {expiringCertificates} certidão(ões) vencendo nos próximos 30 dias
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Grid principal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {/* Oportunidades recentes */}
            <div className="lg:col-span-2">
              <RecentOpportunities opportunities={recentOpportunities} />
            </div>

            {/* Sidebar direita */}
            <div className="space-y-6">
              {/* Ações rápidas */}
              <QuickActions />

              {/* Certidões expirando */}
              <ExpiringCertificates certificates={user.certificates} />

              {/* Resumo mensal */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Resumo do Mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        Propostas Enviadas
                      </span>
                      <span className="font-semibold">{user.proposals.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        Taxa de Sucesso
                      </span>
                      <span className="font-semibold">{successRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        Oportunidades Ativas
                      </span>
                      <span className="font-semibold">{recentOpportunities.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Próximos vencimentos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Próximos Vencimentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {user.certificates.slice(0, 3).map((cert) => (
                      <div key={cert.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">
                          {cert.type}
                        </span>
                        <span className="font-medium">
                          {new Date(cert.expiryDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    ))}
                    {user.certificates.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Nenhuma certidão cadastrada
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )
  }
}