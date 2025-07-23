'use client';

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Book, 
  Video, 
  FileText, 
  Download,
  ExternalLink,
  Search,
  Play,
  Clock,
  Star,
  HelpCircle,
  CheckCircle,
  ArrowRight
} from 'lucide-react'

export function SupportResources() {
  const [searchTerm, setSearchTerm] = useState('')

  const faqs = [
    {
      id: '1',
      question: 'Como funciona a análise de IA?',
      answer: 'Nossa IA analisa editais de licitação usando GPT-4, identificando requisitos, riscos e oportunidades automaticamente.',
      category: 'ai',
      popularity: 5
    },
    {
      id: '2',
      question: 'Posso cancelar minha assinatura a qualquer momento?',
      answer: 'Sim, você pode cancelar sua assinatura a qualquer momento. Você continuará tendo acesso até o final do período pago.',
      category: 'billing',
      popularity: 4
    },
    {
      id: '3',
      question: 'Como adicionar certificados digitais?',
      answer: 'Vá para Gestão de Certificados no dashboard e clique em "Adicionar Certificado". Selecione o arquivo .p12 e insira a senha.',
      category: 'certificates',
      popularity: 4
    },
    {
      id: '4',
      question: 'Qual a diferença entre os planos?',
      answer: 'O plano Starter permite 5 análises/mês, Professional 50 análises com recursos avançados, e Enterprise oferece análises ilimitadas.',
      category: 'billing',
      popularity: 5
    },
    {
      id: '5',
      question: 'Como criar uma proposta automática?',
      answer: 'Após analisar um edital, clique em "Gerar Proposta" na página de resultados. A IA criará um template personalizado.',
      category: 'proposals',
      popularity: 3
    }
  ]

  const guides = [
    {
      id: '1',
      title: 'Guia Completo - Primeiros Passos',
      description: 'Aprenda a configurar sua conta e começar a usar o LicitaFácil',
      category: 'getting-started',
      readTime: 8,
      difficulty: 'Básico',
      icon: '🚀'
    },
    {
      id: '2',
      title: 'Configurando Certificados Digitais',
      description: 'Como adicionar e gerenciar certificados A1 e A3',
      category: 'certificates',
      readTime: 12,
      difficulty: 'Intermediário',
      icon: '🔐'
    },
    {
      id: '3',
      title: 'Análise de Editais com IA',
      description: 'Maximize suas chances usando nossa IA para análise',
      category: 'ai',
      readTime: 15,
      difficulty: 'Intermediário',
      icon: '🤖'
    },
    {
      id: '4',
      title: 'Criando Propostas Vencedoras',
      description: 'Estratégias para elaborar propostas competitivas',
      category: 'proposals',
      readTime: 20,
      difficulty: 'Avançado',
      icon: '📝'
    },
    {
      id: '5',
      title: 'Monitoramento de Oportunidades',
      description: 'Configure alertas e monitore licitações relevantes',
      category: 'monitoring',
      readTime: 10,
      difficulty: 'Básico',
      icon: '🔍'
    }
  ]

  const videos = [
    {
      id: '1',
      title: 'Introdução ao LicitaFácil',
      description: 'Visão geral da plataforma e principais recursos',
      duration: '8:45',
      views: '2.1k',
      category: 'getting-started',
      thumbnail: '/api/placeholder/300/200'
    },
    {
      id: '2',
      title: 'Configuração Inicial da Conta',
      description: 'Como configurar sua empresa e perfil',
      duration: '12:30',
      views: '1.8k',
      category: 'getting-started',
      thumbnail: '/api/placeholder/300/200'
    },
    {
      id: '3',
      title: 'Análise de Editais - Passo a Passo',
      description: 'Tutorial completo da análise com IA',
      duration: '18:15',
      views: '3.2k',
      category: 'ai',
      thumbnail: '/api/placeholder/300/200'
    },
    {
      id: '4',
      title: 'Gerenciamento de Certificados',
      description: 'Adicionar e usar certificados digitais',
      duration: '15:20',
      views: '1.5k',
      category: 'certificates',
      thumbnail: '/api/placeholder/300/200'
    }
  ]

  const downloads = [
    {
      id: '1',
      title: 'Checklist de Documentos',
      description: 'Lista completa de documentos necessários para licitações',
      type: 'PDF',
      size: '245 KB',
      category: 'documents'
    },
    {
      id: '2',
      title: 'Template de Proposta Técnica',
      description: 'Modelo padrão para elaboração de propostas',
      type: 'DOCX',
      size: '1.2 MB',
      category: 'proposals'
    },
    {
      id: '3',
      title: 'Planilha de Controle de Prazos',
      description: 'Controle todos os prazos importantes',
      type: 'XLSX',
      size: '85 KB',
      category: 'management'
    },
    {
      id: '4',
      title: 'Guia de Recursos da IA',
      description: 'Manual completo dos recursos de análise',
      type: 'PDF',
      size: '890 KB',
      category: 'ai'
    }
  ]

  const getCategoryLabel = (category: string) => {
    const categories = {
      'getting-started': 'Primeiros Passos',
      'ai': 'Inteligência Artificial',
      'certificates': 'Certificados',
      'proposals': 'Propostas',
      'billing': 'Faturamento',
      'monitoring': 'Monitoramento',
      'documents': 'Documentos',
      'management': 'Gestão'
    }
    return categories[category as keyof typeof categories] || category
  }

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredGuides = guides.filter(guide =>
    guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guide.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredVideos = videos.filter(video =>
    video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredDownloads = downloads.filter(download =>
    download.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    download.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Pesquisar na base de conhecimento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
              <Book className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-medium">Guias</h3>
            <p className="text-sm text-gray-600">{guides.length} artigos</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-3">
              <Video className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-medium">Vídeos</h3>
            <p className="text-sm text-gray-600">{videos.length} tutoriais</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
              <HelpCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-medium">FAQ</h3>
            <p className="text-sm text-gray-600">{faqs.length} perguntas</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-3">
              <Download className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="font-medium">Downloads</h3>
            <p className="text-sm text-gray-600">{downloads.length} recursos</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="faq" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="guides">Guias</TabsTrigger>
          <TabsTrigger value="videos">Vídeos</TabsTrigger>
          <TabsTrigger value="downloads">Downloads</TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="space-y-4">
          <div className="space-y-3">
            {filteredFaqs.map((faq) => (
              <Card key={faq.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center">
                      <HelpCircle className="h-5 w-5 mr-2 text-blue-600" />
                      {faq.question}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {getCategoryLabel(faq.category)}
                      </Badge>
                      <div className="flex items-center">
                        {[...Array(faq.popularity)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    {faq.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="guides" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGuides.map((guide) => (
              <Card key={guide.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{guide.icon}</div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{guide.title}</CardTitle>
                      <CardDescription>{guide.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{guide.readTime} min</span>
                      </div>
                      <Badge variant="outline">{guide.difficulty}</Badge>
                    </div>
                    <Badge variant="outline">
                      {getCategoryLabel(guide.category)}
                    </Badge>
                  </div>
                  <Button className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Ler Guia
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="videos" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredVideos.map((video) => (
              <Card key={video.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="aspect-video bg-gray-100 rounded-lg mb-3 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                        <Play className="h-8 w-8 text-white ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                      {video.duration}
                    </div>
                  </div>
                  <CardTitle className="text-lg">{video.title}</CardTitle>
                  <CardDescription>{video.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{video.views} visualizações</span>
                      <Badge variant="outline">
                        {getCategoryLabel(video.category)}
                      </Badge>
                    </div>
                  </div>
                  <Button className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Assistir
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="downloads" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDownloads.map((download) => (
              <Card key={download.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="bg-orange-100 p-2 rounded-full">
                      <FileText className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{download.title}</CardTitle>
                      <CardDescription>{download.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <Badge variant="outline">{download.type}</Badge>
                      <span>{download.size}</span>
                    </div>
                    <Badge variant="outline">
                      {getCategoryLabel(download.category)}
                    </Badge>
                  </div>
                  <Button className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Help Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Não encontrou o que procurava?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Nossa equipe está sempre pronta para ajudar você
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Button>
                <HelpCircle className="h-4 w-4 mr-2" />
                Criar Ticket
              </Button>
              <Button variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                Falar com Suporte
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}