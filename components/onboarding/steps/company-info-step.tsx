'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building, MapPin, Phone, Mail, Globe, Users } from 'lucide-react'

const companySchema = z.object({
  fantasyName: z.string().optional(),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  address: z.string().min(10, 'Endereço deve ter pelo menos 10 caracteres'),
  city: z.string().min(2, 'Cidade é obrigatória'),
  state: z.string().min(2, 'Estado é obrigatório'),
  zipCode: z.string().min(8, 'CEP deve ter 8 dígitos'),
  businessType: z.string().min(1, 'Tipo de negócio é obrigatório'),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  description: z.string().optional(),
  employeeCount: z.string().optional(),
})

type CompanyFormData = z.infer<typeof companySchema>

interface CompanyInfoStepProps {
  user: any
  data?: CompanyFormData
  onNext: (data: CompanyFormData) => void
}

const BUSINESS_TYPES = [
  'Comércio',
  'Indústria',
  'Serviços',
  'Construção Civil',
  'Tecnologia',
  'Consultoria',
  'Alimentação',
  'Saúde',
  'Educação',
  'Transporte',
  'Outros',
]

const EMPLOYEE_COUNTS = [
  '1-5 funcionários',
  '6-20 funcionários',
  '21-50 funcionários',
  '51-100 funcionários',
  '101-500 funcionários',
  '500+ funcionários',
]

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

export function CompanyInfoStep({ user, data, onNext }: CompanyInfoStepProps) {
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: data || {},
  })

  const onSubmit = async (formData: CompanyFormData) => {
    setIsLoading(true)
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000))
      onNext(formData)
    } catch (error) {
      console.error('Erro ao salvar dados da empresa:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatPhone = (value: string) => {
    const cleanValue = value.replace(/\D/g, '')
    if (cleanValue.length <= 10) {
      return cleanValue.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }
    return cleanValue.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }

  const formatZipCode = (value: string) => {
    const cleanValue = value.replace(/\D/g, '')
    return cleanValue.replace(/(\d{5})(\d{3})/, '$1-$2')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Informações básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Informações da Empresa
          </CardTitle>
          <CardDescription>
            Complete os dados da sua empresa para melhor identificação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Razão Social</Label>
              <Input
                id="companyName"
                value={user.company?.name || ''}
                disabled
                className="bg-gray-50 dark:bg-gray-800"
              />
              <p className="text-xs text-gray-500">
                Para alterar a razão social, entre em contato com o suporte
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fantasyName">Nome Fantasia</Label>
              <Input
                id="fantasyName"
                placeholder="Nome fantasia da empresa"
                {...register('fantasyName')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              value={user.company?.cnpj || ''}
              disabled
              className="bg-gray-50 dark:bg-gray-800"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                {...register('phone')}
                onChange={(e) => {
                  const formatted = formatPhone(e.target.value)
                  setValue('phone', formatted)
                }}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                placeholder="https://www.suaempresa.com.br"
                {...register('website')}
              />
              {errors.website && (
                <p className="text-sm text-red-500">{errors.website.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Endereço
          </CardTitle>
          <CardDescription>
            Informe o endereço da sede da empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Endereço Completo *</Label>
            <Input
              id="address"
              placeholder="Rua, número, bairro"
              {...register('address')}
            />
            {errors.address && (
              <p className="text-sm text-red-500">{errors.address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade *</Label>
              <Input
                id="city"
                placeholder="Cidade"
                {...register('city')}
              />
              {errors.city && (
                <p className="text-sm text-red-500">{errors.city.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado *</Label>
              <Select onValueChange={(value) => setValue('state', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && (
                <p className="text-sm text-red-500">{errors.state.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">CEP *</Label>
              <Input
                id="zipCode"
                placeholder="00000-000"
                {...register('zipCode')}
                onChange={(e) => {
                  const formatted = formatZipCode(e.target.value)
                  setValue('zipCode', formatted)
                }}
              />
              {errors.zipCode && (
                <p className="text-sm text-red-500">{errors.zipCode.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações do negócio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Sobre o Negócio
          </CardTitle>
          <CardDescription>
            Nos ajude a entender melhor sua empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessType">Tipo de Negócio *</Label>
              <Select onValueChange={(value) => setValue('businessType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.businessType && (
                <p className="text-sm text-red-500">{errors.businessType.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeCount">Número de Funcionários</Label>
              <Select onValueChange={(value) => setValue('employeeCount', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_COUNTS.map((count) => (
                    <SelectItem key={count} value={count}>
                      {count}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição da Empresa</Label>
            <Textarea
              id="description"
              placeholder="Descreva brevemente os principais produtos/serviços da empresa"
              rows={3}
              {...register('description')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Botão de submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Continuar'}
        </Button>
      </div>
    </form>
  )
}