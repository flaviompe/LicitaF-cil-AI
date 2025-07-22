import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ExternalLink, Calendar, DollarSign, Building } from 'lucide-react'

interface Opportunity {
  id: string
  title: string
  description: string
  organ: string
  publishDate: Date
  openingDate: Date
  estimatedValue: number | null
  bidType: string
  status: string
}

interface RecentOpportunitiesProps {
  opportunities: Opportunity[]
}

export function RecentOpportunities({ opportunities }: RecentOpportunitiesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Oportunidades Recentes</span>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/opportunities">
              Ver Todas
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {opportunities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhuma oportunidade encontrada</p>
            <p className="text-sm mt-2">
              Configure seus filtros para encontrar licitações relevantes
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opportunity) => (
              <div
                key={opportunity.id}
                className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {opportunity.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                      {opportunity.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-1" />
                        {opportunity.organ}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(opportunity.publishDate)}
                      </div>
                      {opportunity.estimatedValue && (
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          {formatCurrency(opportunity.estimatedValue)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <Badge variant="secondary">{opportunity.bidType}</Badge>
                    <Badge 
                      variant={opportunity.status === 'OPEN' ? 'default' : 'secondary'}
                    >
                      {opportunity.status === 'OPEN' ? 'Aberta' : 'Fechada'}
                    </Badge>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/opportunities/${opportunity.id}`}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}