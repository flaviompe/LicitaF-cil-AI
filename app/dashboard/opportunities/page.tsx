import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { OpportunityFilters } from '@/components/opportunities/opportunity-filters'
import { OpportunityList } from '@/components/opportunities/opportunity-list'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Search, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface SearchParams {
  search?: string
  bidType?: string
  status?: string
  organ?: string
  page?: string
}

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return <div>Não autorizado</div>
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { company: true },
  })

  if (!user?.company) {
    return <div>Empresa não encontrada</div>
  }

  const page = parseInt(searchParams.page || '1')
  const limit = 20
  const offset = (page - 1) * limit

  // Construir filtros
  const where: any = {
    companyId: user.company.id,
  }

  if (searchParams.search) {
    where.OR = [
      { title: { contains: searchParams.search, mode: 'insensitive' } },
      { description: { contains: searchParams.search, mode: 'insensitive' } },
      { organ: { contains: searchParams.search, mode: 'insensitive' } },
    ]
  }

  if (searchParams.bidType) {
    where.bidType = searchParams.bidType
  }

  if (searchParams.status) {
    where.status = searchParams.status
  }

  if (searchParams.organ) {
    where.organ = { contains: searchParams.organ, mode: 'insensitive' }
  }

  // Buscar oportunidades
  const [opportunities, totalCount] = await Promise.all([
    db.opportunity.findMany({
      where,
      orderBy: { publishDate: 'desc' },
      take: limit,
      skip: offset,
      include: {
        proposals: {
          where: { userId: session.user.id },
          take: 1,
        },
      },
    }),
    db.opportunity.count({ where }),
  ])

  // Buscar estatísticas
  const stats = await db.opportunity.aggregate({
    where: { companyId: user.company.id },
    _count: { id: true },
  })

  const openOpportunities = await db.opportunity.count({
    where: { companyId: user.company.id, status: 'OPEN' },
  })

  const totalPages = Math.ceil(totalCount / limit)

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Oportunidades de Licitação
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gerencie e monitore todas as oportunidades de licitação
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button asChild>
            <Link href="/dashboard/opportunities/new">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Oportunidade
            </Link>
          </Button>
        </div>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Oportunidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats._count.id}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Oportunidades Abertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{openOpportunities}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Propostas Enviadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {opportunities.filter(op => op.proposals.length > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Filtros de Busca
          </CardTitle>
          <CardDescription>
            Use os filtros abaixo para encontrar oportunidades específicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OpportunityFilters />
        </CardContent>
      </Card>

      {/* Lista de oportunidades */}
      <OpportunityList
        opportunities={opportunities}
        totalCount={totalCount}
        currentPage={page}
        totalPages={totalPages}
      />

      {/* Mensagem quando não há oportunidades */}
      {opportunities.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nenhuma oportunidade encontrada
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Tente ajustar os filtros ou adicionar uma nova oportunidade
            </p>
            <Button asChild>
              <Link href="/dashboard/opportunities/new">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeira Oportunidade
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}