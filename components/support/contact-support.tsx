'use client';

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  Phone, 
  Mail, 
  MessageCircle, 
  Clock,
  MapPin,
  Send,
  CheckCircle,
  Zap,
  Users,
  Globe,
  Calendar,
  Star
} from 'lucide-react'

interface ContactSupportProps {
  user: any
}

export function ContactSupport({ user }: ContactSupportProps) {
  const [contactForm, setContactForm] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    message: '',
    phone: user.phone || '',
    preferredContact: 'email'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!contactForm.subject.trim() || !contactForm.message.trim() || !contactForm.category) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Simular envio
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: 'Mensagem Enviada',
        description: 'Sua mensagem foi enviada com sucesso. Responderemos em breve.',
      })

      setContactForm({
        subject: '',
        category: '',
        priority: 'medium',
        message: '',
        phone: user.phone || '',
        preferredContact: 'email'
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao enviar mensagem. Tente novamente.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const contactMethods = [
    {
      icon: MessageCircle,
      title: 'Chat ao Vivo',
      description: 'Fale conosco em tempo real',
      availability: '24/7',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      action: 'Iniciar Chat'
    },
    {
      icon: Phone,
      title: 'Telefone',
      description: '(11) 99999-9999',
      availability: 'Seg-Sex 8h-18h',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      action: 'Ligar'
    },
    {
      icon: Mail,
      title: 'Email',
      description: 'suporte@licitafacil.com',
      availability: 'Resposta em 2h',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      action: 'Enviar Email'
    }
  ]

  const businessHours = [
    { day: 'Segunda-feira', hours: '8:00 - 18:00' },
    { day: 'Terça-feira', hours: '8:00 - 18:00' },
    { day: 'Quarta-feira', hours: '8:00 - 18:00' },
    { day: 'Quinta-feira', hours: '8:00 - 18:00' },
    { day: 'Sexta-feira', hours: '8:00 - 18:00' },
    { day: 'Sábado', hours: 'Fechado' },
    { day: 'Domingo', hours: 'Fechado' }
  ]

  const supportTeam = [
    {
      name: 'Maria Silva',
      role: 'Gerente de Suporte',
      specialty: 'Suporte Técnico',
      avatar: '/api/placeholder/40/40'
    },
    {
      name: 'João Santos',
      role: 'Especialista em IA',
      specialty: 'Análise de Editais',
      avatar: '/api/placeholder/40/40'
    },
    {
      name: 'Ana Costa',
      role: 'Consultora de Negócios',
      specialty: 'Planos e Faturamento',
      avatar: '/api/placeholder/40/40'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Contact Methods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {contactMethods.map((method, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 ${method.bgColor} rounded-full mb-3`}>
                <method.icon className={`h-6 w-6 ${method.color}`} />
              </div>
              <CardTitle className="text-lg">{method.title}</CardTitle>
              <CardDescription>{method.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Badge variant="outline" className="mb-3">
                {method.availability}
              </Badge>
              <Button className="w-full">
                {method.action}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contact Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Send className="h-5 w-5 mr-2" />
            Enviar Mensagem
          </CardTitle>
          <CardDescription>
            Preencha o formulário abaixo e nossa equipe responderá em breve
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Assunto *</label>
                <Input
                  placeholder="Descreva brevemente o assunto"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({...contactForm, subject: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria *</label>
                <Select value={contactForm.category} onValueChange={(value) => setContactForm({...contactForm, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Suporte Técnico</SelectItem>
                    <SelectItem value="billing">Faturamento</SelectItem>
                    <SelectItem value="feature">Solicitação de Recurso</SelectItem>
                    <SelectItem value="training">Treinamento</SelectItem>
                    <SelectItem value="sales">Vendas</SelectItem>
                    <SelectItem value="general">Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Prioridade</label>
                <Select value={contactForm.priority} onValueChange={(value) => setContactForm({...contactForm, priority: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Contato Preferido</label>
                <Select value={contactForm.preferredContact} onValueChange={(value) => setContactForm({...contactForm, preferredContact: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Como prefere ser contatado?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Telefone</label>
              <Input
                placeholder="(11) 99999-9999"
                value={contactForm.phone}
                onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mensagem *</label>
              <Textarea
                placeholder="Descreva sua dúvida ou problema detalhadamente..."
                value={contactForm.message}
                onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                rows={4}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Mensagem
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Business Hours */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Horário de Funcionamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {businessHours.map((schedule, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{schedule.day}</span>
                  <span className={`text-sm ${schedule.hours === 'Fechado' ? 'text-red-600' : 'text-green-600'}`}>
                    {schedule.hours}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Localização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="font-medium">Escritório Principal</div>
                <div className="text-sm text-gray-600">
                  Av. Paulista, 1000 - Bela Vista<br />
                  São Paulo, SP - 01310-100
                </div>
              </div>
              <div>
                <div className="font-medium">Telefone</div>
                <div className="text-sm text-gray-600">(11) 99999-9999</div>
              </div>
              <div>
                <div className="font-medium">Email</div>
                <div className="text-sm text-gray-600">suporte@licitafacil.com</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Support Team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Nossa Equipe de Suporte
          </CardTitle>
          <CardDescription>
            Conheça os especialistas prontos para ajudar você
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {supportTeam.map((member, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <div className="font-medium">{member.name}</div>
                <div className="text-sm text-gray-600">{member.role}</div>
                <Badge variant="outline" className="mt-2">
                  {member.specialty}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Service Level */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Garantia de Qualidade
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Nosso compromisso é oferecer suporte excepcional
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{'< 2h'}</div>
                <div className="text-sm text-gray-600">Tempo de resposta</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">98%</div>
                <div className="text-sm text-gray-600">Satisfação do cliente</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">24/7</div>
                <div className="text-sm text-gray-600">Disponibilidade</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Alert>
        <Zap className="h-4 w-4" />
        <AlertDescription>
          <strong>Suporte de Emergência:</strong> Para problemas críticos que afetam licitações em andamento, 
          entre em contato através do WhatsApp (11) 99999-9999 ou email urgente@licitafacil.com
        </AlertDescription>
      </Alert>
    </div>
  )
}