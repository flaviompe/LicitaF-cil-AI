import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  Filter, 
  Star, 
  MapPin, 
  Building, 
  Users, 
  TrendingUp, 
  Award,
  ShoppingCart,
  Target,
  Users as Handshake,
  CheckCircle,
  Clock,
  DollarSign,
  ArrowRight,
  Plus,
  Zap
} from 'lucide-react'
import Link from 'next/link'

export default async function MarketplacePage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/login')
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      company: true,
      subscriptions: {
        include: {
          plan: true,
        },
        take: 1,
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  })

  if (!user) {
    redirect('/login')
  }

  const currentPlan = user.subscriptions[0]?.plan?.name || 'Starter'

  // Estatísticas simuladas do marketplace
  const stats = {
    totalSuppliers: 1847,
    activeSuppliers: 1523,
    verifiedSuppliers: 892,
    totalProjects: 5234,
    completedProjects: 4891,
    totalValue: 45678900,
    averageProjectValue: 8950,
    successRate: 94.2
  }

  // Fornecedores em destaque (simulados)
  const featuredSuppliers = [
    {
      id: '1',
      companyName: 'TechBuild Engenharia',
      tradeName: 'TechBuild',
      categories: ['Engenharia', 'Construção'],
      rating: 4.8,
      reviewCount: 156,
      location: 'São Paulo, SP',
      verified: true,
      featured: true,
      responseTime: '2h',
      projectsCompleted: 89,
      description: 'Especializada em projetos de infraestrutura e construção civil com mais de 15 anos de experiência.'
    },
    {
      id: '2',
      companyName: 'Inovação Digital Ltda',
      tradeName: 'InovaTech',
      categories: ['Tecnologia', 'Consultoria'],
      rating: 4.9,
      reviewCount: 203,
      location: 'Rio de Janeiro, RJ',
      verified: true,
      featured: true,
      responseTime: '1h',
      projectsCompleted: 134,
      description: 'Desenvolvimento de sistemas e soluções tecnológicas para o setor público.'
    },
    {
      id: '3',
      companyName: 'Consultoria Empresarial Santos',
      tradeName: 'CES Consultoria',
      categories: ['Consultoria', 'Serviços'],
      rating: 4.7,
      reviewCount: 98,
      location: 'Belo Horizonte, MG',
      verified: true,
      featured: false,
      responseTime: '3h',
      projectsCompleted: 67,
      description: 'Consultoria especializada em processos licitatórios e gestão pública.'
    }
  ]

  // Categorias populares
  const categories = [
    { id: 'engineering', name: 'Engenharia', icon: '🏗️', count: 234 },
    { id: 'construction', name: 'Construção', icon: '🔨', count: 189 },
    { id: 'technology', name: 'Tecnologia', icon: '💻', count: 156 },
    { id: 'consulting', name: 'Consultoria', icon: '👥', count: 98 },
    { id: 'services', name: 'Serviços', icon: '💼', count: 145 },
    { id: 'supplies', name: 'Fornecimentos', icon: '📦', count: 78 }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Marketplace de Fornecedores</h1>
            <p className="text-xl text-blue-100">
              Conecte-se com fornecedores especializados em licitações públicas
            </p>
            <div className="flex items-center space-x-6 mt-4 text-sm">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>{stats.totalSuppliers} fornecedores</span>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>{stats.completedProjects} projetos concluídos</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>{stats.successRate}% de sucesso</span>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.activeSuppliers}</div>
                <div className="text-sm text-blue-100">Fornecedores Ativos</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar fornecedores, serviços ou especialidades..."
                className="pl-10"
              />
            </div>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="SP">São Paulo</SelectItem>
                <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                <SelectItem value="MG">Minas Gerais</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Building className="h-5 w-5 mr-2 text-blue-600" />
              Fornecedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <span className="font-medium">{stats.totalSuppliers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Ativos</span>
                <span className="font-medium text-green-600">{stats.activeSuppliers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Verificados</span>
                <span className="font-medium text-blue-600">{stats.verifiedSuppliers}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Target className="h-5 w-5 mr-2 text-green-600" />
              Projetos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <span className="font-medium">{stats.totalProjects}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Concluídos</span>
                <span className="font-medium text-green-600">{stats.completedProjects}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Taxa de Sucesso</span>
                <span className="font-medium text-purple-600">{stats.successRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-purple-600" />
              Valores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Movimentado</span>
                <span className="font-medium">
                  R$ {(stats.totalValue / 1000000).toFixed(1)}M
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Valor Médio</span>
                <span className="font-medium text-green-600">
                  R$ {stats.averageProjectValue.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Handshake className="h-5 w-5 mr-2 text-orange-600" />
              Ações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/marketplace/suppliers/register">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Tornar-se Fornecedor
                </Button>
              </Link>
              <Link href="/marketplace/requests/create">
                <Button className="w-full justify-start">
                  <Zap className="h-4 w-4 mr-2" />
                  Solicitar Serviço
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Categorias Populares</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Card key={category.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2">{category.icon}</div>
                <div className="font-medium text-sm">{category.name}</div>
                <div className="text-xs text-gray-500">{category.count} fornecedores</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Featured Suppliers */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Fornecedores em Destaque</h2>
          <Button variant="outline">
            Ver Todos
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredSuppliers.map((supplier) => (
            <Card key={supplier.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-blue-100 text-blue-600 font-bold">
                        {supplier.companyName.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{supplier.companyName}</CardTitle>
                      <p className="text-sm text-gray-500">{supplier.tradeName}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
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
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {supplier.categories.map((category) => (
                      <Badge key={category} variant="outline" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {supplier.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="font-medium">{supplier.rating}</span>
                      <span className="text-gray-500">({supplier.reviewCount})</span>
                    </div>
                    <div className="flex items-center space-x-1 text-gray-500">
                      <MapPin className="h-4 w-4" />
                      <span>{supplier.location}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1 text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>Responde em {supplier.responseTime}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-gray-500">
                      <Award className="h-4 w-4" />
                      <span>{supplier.projectsCompleted} projetos</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Ver Perfil
                    </Button>
                    <Button size="sm" className="flex-1">
                      Solicitar Orçamento
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Plan Features */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Recursos do Marketplace - Plano {currentPlan}
          </CardTitle>
          <CardDescription>
            Recursos disponíveis para interagir com fornecedores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Busca de fornecedores</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Visualização de perfis</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Avaliações e reviews</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Solicitação de orçamentos</span>
              </div>
              <div className="flex items-center space-x-2">
                {currentPlan !== 'Starter' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-orange-500" />
                )}
                <span className="text-sm">Gestão de contratos</span>
              </div>
              <div className="flex items-center space-x-2">
                {currentPlan === 'Enterprise' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-orange-500" />
                )}
                <span className="text-sm">Suporte prioritário</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="text-sm">
                <strong>Solicitações mensais:</strong>
                <br />
                {currentPlan === 'Starter' ? '5 solicitações' : 
                 currentPlan === 'Professional' ? '20 solicitações' : 
                 'Ilimitado'}
              </div>
              <div className="text-sm">
                <strong>Fornecedores favoritos:</strong>
                <br />
                {currentPlan === 'Starter' ? '3 fornecedores' : 
                 currentPlan === 'Professional' ? '10 fornecedores' : 
                 'Ilimitado'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade CTA */}
      {currentPlan === 'Starter' && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-purple-100 p-3 rounded-full">
                  <Zap className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Desbloqueie o Poder do Marketplace
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Mais solicitações, contratos avançados e suporte prioritário
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-2">
                  A partir de R$ 97/mês
                </div>
                <Button>
                  Fazer Upgrade
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}