import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  ExternalLink, 
  Calendar, 
  DollarSign, 
  Building, 
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface Opportunity {
  id: string
  title: string
  description: string
  organ: string
  publishDate: Date
  openingDate: Date
  closingDate: Date | null
  estimatedValue: number | null
  bidType: string
  status: string
  editalLink: string | null
  proposals: Array<{
    id: string
    status: string
  }>
}

interface OpportunityListProps {
  opportunities: Opportunity[]
  totalCount: number
  currentPage: number
  totalPages: number
}

export function OpportunityList({ 
  opportunities, 
  totalCount, 
  currentPage, 
  totalPages 
}: OpportunityListProps) {
  const getBidTypeLabel = (bidType: string) => {
    const labels: { [key: string]: string } = {
      PREGAO_ELETRONICO: 'Pregão Eletrônico',
      PREGAO_PRESENCIAL: 'Pregão Presencial',
      CONCORRENCIA: 'Concorrência',
      TOMADA_PRECOS: 'Tomada de Preços',
      CONVITE: 'Convite',
      DISPENSA: 'Dispensa',
      INEXIGIBILIDADE: 'Inexigibilidade',
    }
    return labels[bidType] || bidType
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { label: 'Aberta', icon: Clock, color: 'bg-green-100 text-green-800' }
      case 'CLOSED':
        return { label: 'Fechada', icon: CheckCircle, color: 'bg-gray-100 text-gray-800' }
      case 'CANCELLED':
        return { label: 'Cancelada', icon: AlertCircle, color: 'bg-red-100 text-red-800' }
      case 'SUSPENDED':
        return { label: 'Suspensa', icon: AlertCircle, color: 'bg-yellow-100 text-yellow-800' }
      default:
        return { label: status, icon: Clock, color: 'bg-blue-100 text-blue-800' }
    }
  }

  const getProposalStatus = (proposals: Array<{ status: string }>) => {
    if (proposals.length === 0) return null
    
    const proposal = proposals[0]
    switch (proposal.status) {
      case 'PENDING':
        return { label: 'Proposta Enviada', color: 'bg-yellow-100 text-yellow-800' }
      case 'ACCEPTED':
        return { label: 'Proposta Aceita', color: 'bg-green-100 text-green-800' }
      case 'REJECTED':
        return { label: 'Proposta Rejeitada', color: 'bg-red-100 text-red-800' }
      default:
        return { label: 'Proposta Enviada', color: 'bg-blue-100 text-blue-800' }
    }
  }

  const getDaysRemaining = (closingDate: Date | null) => {
    if (!closingDate) return null
    
    const now = new Date()
    const closing = new Date(closingDate)
    const diffTime = closing.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da lista */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Mostrando {opportunities.length} de {totalCount} oportunidades
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            asChild
          >
            <Link href={`/dashboard/opportunities?page=${currentPage - 1}`}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Link>
          </Button>
          <span className="text-sm text-gray-500">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            asChild
          >
            <Link href={`/dashboard/opportunities?page=${currentPage + 1}`}>
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Lista de oportunidades */}
      <div className="space-y-4">
        {opportunities.map((opportunity) => {
          const statusInfo = getStatusInfo(opportunity.status)
          const proposalStatus = getProposalStatus(opportunity.proposals)
          const daysRemaining = getDaysRemaining(opportunity.closingDate)
          
          return (
            <Card key={opportunity.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                        {opportunity.title}
                      </h3>
                      <Badge variant="outline">
                        {getBidTypeLabel(opportunity.bidType)}
                      </Badge>
                      <Badge className={statusInfo.color}>
                        <statusInfo.icon className="h-3 w-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                      {proposalStatus && (
                        <Badge className={proposalStatus.color}>
                          <FileText className="h-3 w-3 mr-1" />
                          {proposalStatus.label}
                        </Badge>
                      )}
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                      {opportunity.description}
                    </p>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-2" />
                        {opportunity.organ}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Publicação: {formatDate(opportunity.publishDate)}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Abertura: {formatDate(opportunity.openingDate)}
                      </div>
                      {opportunity.estimatedValue && (
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-2" />
                          {formatCurrency(opportunity.estimatedValue)}
                        </div>
                      )}
                    </div>

                    {daysRemaining !== null && (
                      <div className="mt-3">
                        {daysRemaining > 0 ? (
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            daysRemaining <= 3 
                              ? 'bg-red-100 text-red-800' 
                              : daysRemaining <= 7 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-green-100 text-green-800'
                          }`}>
                            <Clock className="h-3 w-3 mr-1" />
                            {daysRemaining} dia(s) restante(s)
                          </div>
                        ) : (
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Prazo encerrado
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 ml-6">
                    <Button size="sm" asChild>
                      <Link href={`/dashboard/opportunities/${opportunity.id}`}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Link>
                    </Button>
                    
                    {opportunity.editalLink && (
                      <Button size="sm" variant="outline" asChild>
                        <a 
                          href={opportunity.editalLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Edital
                        </a>
                      </Button>
                    )}

                    {opportunity.status === 'OPEN' && opportunity.proposals.length === 0 && (
                      <Button size="sm" variant="default" asChild>
                        <Link href={`/dashboard/proposals/new?opportunity=${opportunity.id}`}>
                          <FileText className="h-4 w-4 mr-2" />
                          Criar Proposta
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            asChild
          >
            <Link href={`/dashboard/opportunities?page=${currentPage - 1}`}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Link>
          </Button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={`/dashboard/opportunities?page=${page}`}>
                {page}
              </Link>
            </Button>
          ))}
          
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            asChild
          >
            <Link href={`/dashboard/opportunities?page=${currentPage + 1}`}>
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}