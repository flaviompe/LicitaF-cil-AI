'use client';

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Shield, 
  Upload, 
  Calendar, 
  AlertCircle,
  CheckCircle,
  FileText,
  ArrowRight
} from 'lucide-react'

interface DocumentsStepProps {
  user: any
  data?: any
  onNext: (data?: any) => void
}

export function DocumentsStep({ user, data, onNext }: DocumentsStepProps) {
  const [documents, setDocuments] = useState(data || {
    certidaoRegularidadeFGTS: { file: null, expiryDate: '', status: 'pending' },
    certidaoNegativaTributos: { file: null, expiryDate: '', status: 'pending' },
    certidaoRegularidadeTrabalho: { file: null, expiryDate: '', status: 'pending' },
    certidaoNegativaINSS: { file: null, expiryDate: '', status: 'pending' },
    alvara: { file: null, expiryDate: '', status: 'pending' },
  })

  const documentTypes = [
    {
      key: 'certidaoRegularidadeFGTS',
      title: 'Certidão de Regularidade do FGTS',
      description: 'Necessária para comprovar regularidade com o FGTS',
      required: true,
    },
    {
      key: 'certidaoNegativaTributos',
      title: 'Certidão Negativa de Tributos',
      description: 'Certidão negativa de débitos municipais',
      required: true,
    },
    {
      key: 'certidaoRegularidadeTrabalho',
      title: 'Certidão de Regularidade do Trabalho',
      description: 'Certidão negativa de débitos trabalhistas',
      required: true,
    },
    {
      key: 'certidaoNegativaINSS',
      title: 'Certidão Negativa do INSS',
      description: 'Certidão de regularidade previdenciária',
      required: true,
    },
    {
      key: 'alvara',
      title: 'Alvará de Funcionamento',
      description: 'Licença municipal para funcionamento',
      required: false,
    },
  ]

  const handleFileUpload = (key: string, file: File) => {
    setDocuments(prev => ({
      ...prev,
      [key]: { ...prev[key], file, status: 'uploaded' }
    }))
  }

  const handleDateChange = (key: string, date: string) => {
    setDocuments(prev => ({
      ...prev,
      [key]: { ...prev[key], expiryDate: date }
    }))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Enviado</Badge>
      case 'expired':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Vencido</Badge>
      case 'expiring':
        return <Badge variant="secondary" className="bg-yellow-500"><Calendar className="h-3 w-3 mr-1" />Vencendo</Badge>
      default:
        return <Badge variant="outline">Pendente</Badge>
    }
  }

  const handleNext = () => {
    onNext(documents)
  }

  const isComplete = documentTypes.filter(doc => doc.required).every(doc => 
    documents[doc.key]?.file && documents[doc.key]?.expiryDate
  )

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Shield className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Documentos e Certidões</h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Mantenha seus documentos organizados e nunca perca um prazo importante
        </p>
      </div>

      <div className="space-y-4">
        {documentTypes.map((docType) => (
          <Card key={docType.key} className="border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    {docType.title}
                    {docType.required && <span className="text-red-500 ml-1">*</span>}
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {docType.description}
                  </p>
                </div>
                {getStatusBadge(documents[docType.key]?.status || 'pending')}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`file-${docType.key}`} className="text-sm font-medium">
                    Arquivo do Documento
                  </Label>
                  <div className="mt-1">
                    <Input
                      id={`file-${docType.key}`}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(docType.key, file)
                      }}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  {documents[docType.key]?.file && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ {documents[docType.key].file.name}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor={`date-${docType.key}`} className="text-sm font-medium">
                    Data de Vencimento
                  </Label>
                  <Input
                    id={`date-${docType.key}`}
                    type="date"
                    value={documents[docType.key]?.expiryDate || ''}
                    onChange={(e) => handleDateChange(docType.key, e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">Dica Importante</h4>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              Mantenha sempre suas certidões atualizadas. O sistema enviará alertas 30 dias antes do vencimento
              para que você possa renovar com antecedência.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Button 
          onClick={handleNext} 
          disabled={!isComplete}
          size="lg" 
          className="px-8"
        >
          Continuar
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
        {!isComplete && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Complete os documentos obrigatórios para prosseguir
          </p>
        )}
      </div>
    </div>
  )
}