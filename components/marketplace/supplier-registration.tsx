'use client';

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Building, 
  MapPin, 
  Phone, 
  Globe, 
  FileText, 
  Award, 
  Clock,
  Users,
  DollarSign,
  Upload,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SupplierRegistrationProps {
  onComplete?: () => void
}

const categories = [
  { id: 'engineering', name: 'Engenharia', icon: '🏗️' },
  { id: 'construction', name: 'Construção', icon: '🔨' },
  { id: 'services', name: 'Serviços Gerais', icon: '💼' },
  { id: 'technology', name: 'Tecnologia', icon: '💻' },
  { id: 'consulting', name: 'Consultoria', icon: '👥' },
  { id: 'supplies', name: 'Fornecimentos', icon: '📦' },
  { id: 'healthcare', name: 'Saúde', icon: '🏥' },
  { id: 'education', name: 'Educação', icon: '📚' },
  { id: 'security', name: 'Segurança', icon: '🔒' },
  { id: 'cleaning', name: 'Limpeza', icon: '🧹' },
  { id: 'food', name: 'Alimentação', icon: '🍽️' },
  { id: 'transportation', name: 'Transporte', icon: '🚛' }
]

const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

export function SupplierRegistration({ onComplete }: SupplierRegistrationProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    // Dados básicos
    companyName: '',
    tradeName: '',
    cnpj: '',
    description: '',
    
    // Categorias e especialidades
    categories: [] as string[],
    specialties: [] as string[],
    
    // Endereço
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Brasil'
    },
    
    // Contato
    contact: {
      phone: '',
      email: '',
      website: '',
      whatsapp: ''
    },
    
    // Horário de funcionamento
    workingHours: {
      monday: { open: '08:00', close: '18:00', closed: false },
      tuesday: { open: '08:00', close: '18:00', closed: false },
      wednesday: { open: '08:00', close: '18:00', closed: false },
      thursday: { open: '08:00', close: '18:00', closed: false },
      friday: { open: '08:00', close: '18:00', closed: false },
      saturday: { open: '08:00', close: '12:00', closed: false },
      sunday: { open: '08:00', close: '12:00', closed: true }
    },
    
    // Áreas de atuação
    serviceAreas: [] as string[],
    
    // Portfólio
    portfolio: {
      projectsCompleted: 0,
      yearsExperience: 0,
      teamSize: 0,
      monthlyCapacity: 0,
      averageProjectValue: 0
    },
    
    // Documentos
    documents: [] as Array<{
      type: string
      name: string
      url: string
    }>
  })

  const steps = [
    {
      id: 'basic',
      title: 'Dados Básicos',
      description: 'Informações da empresa'
    },
    {
      id: 'categories',
      title: 'Categorias',
      description: 'Áreas de atuação'
    },
    {
      id: 'contact',
      title: 'Contato',
      description: 'Informações de contato'
    },
    {
      id: 'portfolio',
      title: 'Portfólio',
      description: 'Experiência e capacidade'
    },
    {
      id: 'documents',
      title: 'Documentos',
      description: 'Certificações e licenças'
    }
  ]

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}
    
    switch (step) {
      case 0: // Dados básicos
        if (!formData.companyName) newErrors.companyName = 'Nome da empresa é obrigatório'
        if (!formData.cnpj) newErrors.cnpj = 'CNPJ é obrigatório'
        if (!formData.description) newErrors.description = 'Descrição é obrigatória'
        break
        
      case 1: // Categorias
        if (formData.categories.length === 0) newErrors.categories = 'Selecione pelo menos uma categoria'
        break
        
      case 2: // Contato
        if (!formData.contact.phone) newErrors.phone = 'Telefone é obrigatório'
        if (!formData.contact.email) newErrors.email = 'Email é obrigatório'
        if (!formData.address.street) newErrors.street = 'Endereço é obrigatório'
        if (!formData.address.city) newErrors.city = 'Cidade é obrigatória'
        if (!formData.address.state) newErrors.state = 'Estado é obrigatório'
        if (!formData.address.zipCode) newErrors.zipCode = 'CEP é obrigatório'
        break
        
      case 3: // Portfólio
        if (formData.portfolio.yearsExperience <= 0) newErrors.yearsExperience = 'Anos de experiência é obrigatório'
        if (formData.portfolio.teamSize <= 0) newErrors.teamSize = 'Tamanho da equipe é obrigatório'
        break
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/marketplace/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        const data = await response.json()
        onComplete?.()
        router.push('/marketplace/supplier/profile')
      } else {
        const error = await response.json()
        setErrors({ submit: error.message })
      }
    } catch (error) {
      setErrors({ submit: 'Erro ao cadastrar fornecedor' })
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryToggle = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId]
    }))
  }

  const handleSpecialtyAdd = (specialty: string) => {
    if (specialty && !formData.specialties.includes(specialty)) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, specialty]
      }))
    }
  }

  const handleSpecialtyRemove = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }))
  }

  const handleServiceAreaAdd = (area: string) => {
    if (area && !formData.serviceAreas.includes(area)) {
      setFormData(prev => ({
        ...prev,
        serviceAreas: [...prev.serviceAreas, area]
      }))
    }
  }

  const handleServiceAreaRemove = (area: string) => {
    setFormData(prev => ({
      ...prev,
      serviceAreas: prev.serviceAreas.filter(a => a !== area)
    }))
  }

  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Cadastro de Fornecedor</h1>
        <p className="text-gray-600">
          Complete seu cadastro para começar a receber solicitações de serviços
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium">
            Passo {currentStep + 1} de {steps.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(progress)}% concluído
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Steps */}
      <div className="mb-8">
        <div className="flex justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                'flex flex-col items-center text-center',
                index <= currentStep ? 'text-blue-600' : 'text-gray-400'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center mb-2',
                index <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200'
              )}>
                {index < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-sm">{index + 1}</span>
                )}
              </div>
              <div className="max-w-[120px]">
                <div className="text-sm font-medium">{step.title}</div>
                <div className="text-xs text-gray-500">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="companyName">Nome da Empresa *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Digite o nome da empresa"
                  className={errors.companyName ? 'border-red-500' : ''}
                />
                {errors.companyName && (
                  <p className="text-sm text-red-500 mt-1">{errors.companyName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="tradeName">Nome Fantasia</Label>
                <Input
                  id="tradeName"
                  value={formData.tradeName}
                  onChange={(e) => setFormData(prev => ({ ...prev, tradeName: e.target.value }))}
                  placeholder="Digite o nome fantasia (opcional)"
                />
              </div>

              <div>
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                  className={errors.cnpj ? 'border-red-500' : ''}
                />
                {errors.cnpj && (
                  <p className="text-sm text-red-500 mt-1">{errors.cnpj}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Descrição da Empresa *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva sua empresa, serviços oferecidos e diferenciais..."
                  rows={4}
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-red-500 mt-1">{errors.description}</p>
                )}
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <Label>Categorias de Atuação *</Label>
                <p className="text-sm text-gray-500 mb-4">
                  Selecione as áreas em que sua empresa atua
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className={cn(
                        'flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50',
                        formData.categories.includes(category.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      )}
                      onClick={() => handleCategoryToggle(category.id)}
                    >
                      <Checkbox
                        checked={formData.categories.includes(category.id)}
                        onChange={() => handleCategoryToggle(category.id)}
                      />
                      <span className="text-lg">{category.icon}</span>
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                  ))}
                </div>
                {errors.categories && (
                  <p className="text-sm text-red-500 mt-1">{errors.categories}</p>
                )}
              </div>

              <div>
                <Label>Especialidades</Label>
                <p className="text-sm text-gray-500 mb-2">
                  Adicione especialidades específicas da sua área
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.specialties.map((specialty) => (
                    <Badge
                      key={specialty}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleSpecialtyRemove(specialty)}
                    >
                      {specialty} ×
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Digite uma especialidade"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSpecialtyAdd(e.currentTarget.value)
                        e.currentTarget.value = ''
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.querySelector('input[placeholder="Digite uma especialidade"]') as HTMLInputElement
                      if (input) {
                        handleSpecialtyAdd(input.value)
                        input.value = ''
                      }
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>

              <div>
                <Label>Áreas de Atendimento</Label>
                <p className="text-sm text-gray-500 mb-2">
                  Selecione os estados onde sua empresa atende
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.serviceAreas.map((area) => (
                    <Badge
                      key={area}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleServiceAreaRemove(area)}
                    >
                      {area} ×
                    </Badge>
                  ))}
                </div>
                <Select onValueChange={(value) => handleServiceAreaAdd(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {brazilianStates.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={formData.contact.phone}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      contact: { ...prev.contact, phone: e.target.value }
                    }))}
                    placeholder="(11) 99999-9999"
                    className={errors.phone ? 'border-red-500' : ''}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.contact.email}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      contact: { ...prev.contact, email: e.target.value }
                    }))}
                    placeholder="contato@empresa.com"
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.contact.website}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      contact: { ...prev.contact, website: e.target.value }
                    }))}
                    placeholder="https://www.empresa.com"
                  />
                </div>

                <div>
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.contact.whatsapp}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      contact: { ...prev.contact, whatsapp: e.target.value }
                    }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div>
                <Label>Endereço</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="md:col-span-2">
                    <Input
                      value={formData.address.street}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, street: e.target.value }
                      }))}
                      placeholder="Rua, número, bairro"
                      className={errors.street ? 'border-red-500' : ''}
                    />
                    {errors.street && (
                      <p className="text-sm text-red-500 mt-1">{errors.street}</p>
                    )}
                  </div>

                  <div>
                    <Input
                      value={formData.address.city}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, city: e.target.value }
                      }))}
                      placeholder="Cidade"
                      className={errors.city ? 'border-red-500' : ''}
                    />
                    {errors.city && (
                      <p className="text-sm text-red-500 mt-1">{errors.city}</p>
                    )}
                  </div>

                  <div>
                    <Select
                      value={formData.address.state}
                      onValueChange={(value) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, state: value }
                      }))}
                    >
                      <SelectTrigger className={errors.state ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {brazilianStates.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.state && (
                      <p className="text-sm text-red-500 mt-1">{errors.state}</p>
                    )}
                  </div>

                  <div>
                    <Input
                      value={formData.address.zipCode}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, zipCode: e.target.value }
                      }))}
                      placeholder="CEP"
                      className={errors.zipCode ? 'border-red-500' : ''}
                    />
                    {errors.zipCode && (
                      <p className="text-sm text-red-500 mt-1">{errors.zipCode}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="yearsExperience">Anos de Experiência *</Label>
                  <Input
                    id="yearsExperience"
                    type="number"
                    value={formData.portfolio.yearsExperience}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      portfolio: { ...prev.portfolio, yearsExperience: parseInt(e.target.value) || 0 }
                    }))}
                    placeholder="5"
                    className={errors.yearsExperience ? 'border-red-500' : ''}
                  />
                  {errors.yearsExperience && (
                    <p className="text-sm text-red-500 mt-1">{errors.yearsExperience}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="teamSize">Tamanho da Equipe *</Label>
                  <Input
                    id="teamSize"
                    type="number"
                    value={formData.portfolio.teamSize}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      portfolio: { ...prev.portfolio, teamSize: parseInt(e.target.value) || 0 }
                    }))}
                    placeholder="10"
                    className={errors.teamSize ? 'border-red-500' : ''}
                  />
                  {errors.teamSize && (
                    <p className="text-sm text-red-500 mt-1">{errors.teamSize}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="projectsCompleted">Projetos Concluídos</Label>
                  <Input
                    id="projectsCompleted"
                    type="number"
                    value={formData.portfolio.projectsCompleted}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      portfolio: { ...prev.portfolio, projectsCompleted: parseInt(e.target.value) || 0 }
                    }))}
                    placeholder="50"
                  />
                </div>

                <div>
                  <Label htmlFor="monthlyCapacity">Capacidade Mensal</Label>
                  <Input
                    id="monthlyCapacity"
                    type="number"
                    value={formData.portfolio.monthlyCapacity}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      portfolio: { ...prev.portfolio, monthlyCapacity: parseInt(e.target.value) || 0 }
                    }))}
                    placeholder="5"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Quantos projetos consegue executar simultaneamente
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="averageProjectValue">Valor Médio dos Projetos (R$)</Label>
                <Input
                  id="averageProjectValue"
                  type="number"
                  value={formData.portfolio.averageProjectValue}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    portfolio: { ...prev.portfolio, averageProjectValue: parseInt(e.target.value) || 0 }
                  }))}
                  placeholder="50000"
                />
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  O upload de documentos será habilitado após o cadastro inicial. 
                  Você poderá enviar certificações, licenças e outros documentos no seu perfil.
                </AlertDescription>
              </Alert>

              <div>
                <Label>Documentos Obrigatórios</Label>
                <div className="space-y-3 mt-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">Cartão CNPJ</div>
                        <div className="text-sm text-gray-500">Comprovante de inscrição</div>
                      </div>
                    </div>
                    <Badge variant="outline">Obrigatório</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Award className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-medium">Licenças e Alvarás</div>
                        <div className="text-sm text-gray-500">Conforme área de atuação</div>
                      </div>
                    </div>
                    <Badge variant="outline">Obrigatório</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Building className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-medium">Certificações</div>
                        <div className="text-sm text-gray-500">ISO, qualidade, etc.</div>
                      </div>
                    </div>
                    <Badge variant="secondary">Opcional</Badge>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Após o cadastro, sua empresa passará por um processo de verificação que pode 
                  levar até 2 dias úteis. Você receberá um email com o resultado.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {errors.submit && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button onClick={handleNext}>
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Finalizando...' : 'Finalizar Cadastro'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}