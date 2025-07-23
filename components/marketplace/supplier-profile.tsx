'use client';

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Building, 
  MapPin, 
  Phone, 
  Globe, 
  Mail, 
  Clock, 
  Star, 
  Award, 
  FileText,
  Users,
  DollarSign,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Edit,
  Upload,
  Download,
  Eye,
  MessageSquare,
  Calendar,
  Target,
  Briefcase,
  Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SupplierData {
  id: string
  companyName: string
  tradeName: string
  cnpj: string
  description: string
  categories: string[]
  specialties: string[]
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  contact: {
    phone: string
    email: string
    website?: string
    whatsapp?: string
  }
  portfolio: {
    projectsCompleted: number
    yearsExperience: number
    teamSize: number
    monthlyCapacity: number
    averageProjectValue: number
  }
  rating: {
    average: number
    count: number
    breakdown: {
      5: number
      4: number
      3: number
      2: number
      1: number
    }
  }
  status: 'pending' | 'active' | 'suspended' | 'rejected'
  verified: boolean
  featured: boolean
  responseTime: number
  responseRate: number
  completionRate: number
  repeatClientRate: number
  createdAt: string
  lastActiveAt: string
  documents: Array<{
    id: string
    type: string
    name: string
    url: string
    verified: boolean
  }>
  certifications: Array<{
    id: string
    name: string
    issuedBy: string
    issuedAt: string
    expiresAt?: string
    verified: boolean
  }>
  reviews: Array<{
    id: string
    clientName: string
    rating: number
    comment: string
    createdAt: string
    response?: {
      content: string
      respondedAt: string
    }
  }>
}

interface SupplierProfileProps {
  supplierId?: string
  editable?: boolean
  className?: string
}

const categoryNames: Record<string, string> = {
  engineering: 'Engenharia',
  construction: 'Construção',
  services: 'Serviços Gerais',
  technology: 'Tecnologia',
  consulting: 'Consultoria',
  supplies: 'Fornecimentos',
  healthcare: 'Saúde',
  education: 'Educação',
  security: 'Segurança',
  cleaning: 'Limpeza',
  food: 'Alimentação',
  transportation: 'Transporte'
}

export function SupplierProfile({ supplierId, editable = false, className }: SupplierProfileProps) {
  const { data: session } = useSession()
  const [supplier, setSupplier] = useState<SupplierData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchSupplierData()
  }, [supplierId])

  const fetchSupplierData = async () => {
    try {
      const url = supplierId 
        ? `/api/marketplace/suppliers/${supplierId}`
        : '/api/marketplace/suppliers/me'
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setSupplier(data.supplier)
      }
    } catch (error) {
      console.error('Erro ao buscar dados do fornecedor:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'suspended': return 'bg-red-100 text-red-800'
      case 'rejected': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo'
      case 'pending': return 'Pendente'
      case 'suspended': return 'Suspenso'
      case 'rejected': return 'Rejeitado'
      default: return 'Desconhecido'
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          'h-4 w-4',
          i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        )}
      />
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Fornecedor não encontrado</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-xl font-bold">
                  {supplier.companyName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <h1 className="text-2xl font-bold">{supplier.companyName}</h1>
                  {supplier.verified && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verificado
                    </Badge>
                  )}
                  {supplier.featured && (
                    <Badge className="bg-purple-100 text-purple-800">
                      <Star className="h-3 w-3 mr-1" />
                      Destaque
                    </Badge>
                  )}
                </div>
                
                {supplier.tradeName && (
                  <p className="text-gray-600 mb-2">{supplier.tradeName}</p>
                )}
                
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{supplier.address.city}, {supplier.address.state}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{supplier.portfolio.yearsExperience} anos de experiência</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{supplier.portfolio.teamSize} colaboradores</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(supplier.status)}>
                {getStatusText(supplier.status)}
              </Badge>
              {editable && (
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avaliação</p>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold">{supplier.rating.average.toFixed(1)}</span>
                  <div className="flex">
                    {renderStars(supplier.rating.average)}
                  </div>
                </div>
                <p className="text-xs text-gray-500">{supplier.rating.count} avaliações</p>
              </div>
              <Star className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tempo de Resposta</p>
                <p className="text-2xl font-bold">{supplier.responseTime}h</p>
                <p className="text-xs text-gray-500">Média</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Conclusão</p>
                <p className="text-2xl font-bold">{supplier.completionRate}%</p>
                <p className="text-xs text-gray-500">Projetos concluídos</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clientes Recorrentes</p>
                <p className="text-2xl font-bold">{supplier.repeatClientRate}%</p>
                <p className="text-xs text-gray-500">Taxa de retorno</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Alerts */}
      {supplier.status === 'pending' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Seu perfil está em análise. Você receberá um email quando a verificação for concluída.
          </AlertDescription>
        </Alert>
      )}

      {supplier.status === 'suspended' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Seu perfil está suspenso. Entre em contato com o suporte para mais informações.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="portfolio">Portfólio</TabsTrigger>
          <TabsTrigger value="reviews">Avaliações</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="contact">Contato</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sobre a Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">{supplier.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Categorias de Atuação</h4>
                  <div className="flex flex-wrap gap-2">
                    {supplier.categories.map((category) => (
                      <Badge key={category} variant="outline">
                        {categoryNames[category] || category}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Especialidades</h4>
                  <div className="flex flex-wrap gap-2">
                    {supplier.specialties.map((specialty) => (
                      <Badge key={specialty} variant="secondary">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Métricas de Desempenho</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Taxa de Resposta</span>
                      <span>{supplier.responseRate}%</span>
                    </div>
                    <Progress value={supplier.responseRate} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Taxa de Conclusão</span>
                      <span>{supplier.completionRate}%</span>
                    </div>
                    <Progress value={supplier.completionRate} className="h-2" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Clientes Recorrentes</span>
                      <span>{supplier.repeatClientRate}%</span>
                    </div>
                    <Progress value={supplier.repeatClientRate} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Avaliação Média</span>
                      <span>{supplier.rating.average.toFixed(1)}/5</span>
                    </div>
                    <Progress value={(supplier.rating.average / 5) * 100} className="h-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Portfólio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <Target className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold">{supplier.portfolio.projectsCompleted}</div>
                  <div className="text-sm text-gray-500">Projetos Concluídos</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold">{supplier.portfolio.yearsExperience}</div>
                  <div className="text-sm text-gray-500">Anos de Experiência</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <div className="text-2xl font-bold">{supplier.portfolio.teamSize}</div>
                  <div className="text-sm text-gray-500">Membros da Equipe</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <Briefcase className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                  <div className="text-2xl font-bold">{supplier.portfolio.monthlyCapacity}</div>
                  <div className="text-sm text-gray-500">Capacidade Mensal</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-red-600" />
                  <div className="text-2xl font-bold">
                    {formatCurrency(supplier.portfolio.averageProjectValue)}
                  </div>
                  <div className="text-sm text-gray-500">Valor Médio dos Projetos</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Avaliações dos Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              {supplier.reviews.length > 0 ? (
                <div className="space-y-4">
                  {supplier.reviews.map((review) => (
                    <div key={review.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{review.clientName}</span>
                          <div className="flex">
                            {renderStars(review.rating)}
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2">{review.comment}</p>
                      {review.response && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">
                            Resposta do fornecedor:
                          </div>
                          <p className="text-sm">{review.response.content}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">Nenhuma avaliação ainda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Documentos e Certificações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {supplier.documents.map((document) => (
                  <div key={document.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">{document.name}</div>
                        <div className="text-sm text-gray-500">{document.type}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {document.verified ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verificado
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          Em análise
                        </Badge>
                      )}
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {supplier.certifications.map((cert) => (
                  <div key={cert.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Award className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-medium">{cert.name}</div>
                        <div className="text-sm text-gray-500">
                          {cert.issuedBy} • {formatDate(cert.issuedAt)}
                          {cert.expiresAt && ` • Expira em ${formatDate(cert.expiresAt)}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {cert.verified ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verificado
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          Em análise
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {editable && (
                <div className="mt-4">
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Adicionar Documento
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações de Contato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">Telefone</div>
                      <div className="text-gray-600">{supplier.contact.phone}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Email</div>
                      <div className="text-gray-600">{supplier.contact.email}</div>
                    </div>
                  </div>
                  
                  {supplier.contact.website && (
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-medium">Website</div>
                        <div className="text-gray-600">{supplier.contact.website}</div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-red-600" />
                    <div>
                      <div className="font-medium">Endereço</div>
                      <div className="text-gray-600">
                        {supplier.address.street}<br />
                        {supplier.address.city}, {supplier.address.state}<br />
                        {supplier.address.zipCode}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Building className="h-5 w-5 text-orange-600" />
                    <div>
                      <div className="font-medium">CNPJ</div>
                      <div className="text-gray-600">{supplier.cnpj}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}