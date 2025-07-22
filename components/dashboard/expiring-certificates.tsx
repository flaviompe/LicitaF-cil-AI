import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, getDaysUntilExpiry } from '@/lib/utils'
import { Shield, AlertTriangle, Calendar } from 'lucide-react'

interface Certificate {
  id: string
  type: string
  issuer: string
  expiryDate: Date
  status: string
}

interface ExpiringCertificatesProps {
  certificates: Certificate[]
}

export function ExpiringCertificates({ certificates }: ExpiringCertificatesProps) {
  const getCertificateTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      RECEITA_FEDERAL: 'Receita Federal',
      FGTS: 'FGTS',
      INSS: 'INSS',
      TRABALHISTA: 'Trabalhista',
      ESTADUAL: 'Estadual',
      MUNICIPAL: 'Municipal',
      ANVISA: 'ANVISA',
      CREA: 'CREA',
      OTHER: 'Outros',
    }
    return labels[type] || type
  }

  const getExpiryStatus = (expiryDate: Date) => {
    const daysUntilExpiry = getDaysUntilExpiry(expiryDate)
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', label: 'Vencida', color: 'destructive' }
    } else if (daysUntilExpiry <= 7) {
      return { status: 'critical', label: 'Crítico', color: 'destructive' }
    } else if (daysUntilExpiry <= 30) {
      return { status: 'warning', label: 'Atenção', color: 'secondary' }
    } else {
      return { status: 'valid', label: 'Válida', color: 'default' }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Certidões
          </span>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/certificates">
              Gerenciar
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {certificates.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Shield className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>Nenhuma certidão cadastrada</p>
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <Link href="/dashboard/certificates">
                Cadastrar Primeira
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {certificates.map((certificate) => {
              const expiryStatus = getExpiryStatus(certificate.expiryDate)
              const daysUntilExpiry = getDaysUntilExpiry(certificate.expiryDate)
              
              return (
                <div
                  key={certificate.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm">
                        {getCertificateTypeLabel(certificate.type)}
                      </h4>
                      <Badge 
                        variant={expiryStatus.color as any}
                        className="text-xs"
                      >
                        {expiryStatus.label}
                      </Badge>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(certificate.expiryDate)}
                      {daysUntilExpiry > 0 && (
                        <span className="ml-2">
                          ({daysUntilExpiry} dias)
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {expiryStatus.status === 'critical' || expiryStatus.status === 'expired' ? (
                    <AlertTriangle className="h-4 w-4 text-red-500 ml-2" />
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}