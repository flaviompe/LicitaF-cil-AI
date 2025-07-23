'use client';

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Target, 
  MapPin, 
  Building2,
  DollarSign,
  Clock,
  Filter,
  ArrowRight,
  Settings
} from 'lucide-react'

interface PreferencesStepProps {
  user: any
  data?: any
  onNext: (data?: any) => void
}

export function PreferencesStep({ user, data, onNext }: PreferencesStepProps) {
  const [preferences, setPreferences] = useState(data || {
    regions: [],
    categories: [],
    minValue: '',
    maxValue: '',
    autoApply: false,
    favoriteFilters: false,
    weeklyReport: true,
  })

  const regions = [
    { id: 'sp', name: 'São Paulo' },
    { id: 'rj', name: 'Rio de Janeiro' },
    { id: 'mg', name: 'Minas Gerais' },
    { id: 'rs', name: 'Rio Grande do Sul' },
    { id: 'pr', name: 'Paraná' },
    { id: 'ba', name: 'Bahia' },
    { id: 'sc', name: 'Santa Catarina' },
    { id: 'go', name: 'Goiás' },
  ]

  const categories = [
    { id: 'construcao', name: 'Construção Civil' },
    { id: 'servicos', name: 'Serviços Gerais' },
    { id: 'consultoria', name: 'Consultoria' },
    { id: 'tecnologia', name: 'Tecnologia' },
    { id: 'saude', name: 'Saúde' },
    { id: 'educacao', name: 'Educação' },
    { id: 'transporte', name: 'Transporte' },
    { id: 'alimentacao', name: 'Alimentação' },
    { id: 'limpeza', name: 'Limpeza' },
    { id: 'seguranca', name: 'Segurança' },
  ]

  const handleRegionChange = (regionId: string, checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      regions: checked 
        ? [...prev.regions, regionId]
        : prev.regions.filter(r => r !== regionId)
    }))
  }

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      categories: checked 
        ? [...prev.categories, categoryId]
        : prev.categories.filter(c => c !== categoryId)
    }))
  }

  const handleValueChange = (field: string, value: string) => {
    setPreferences(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSwitchChange = (field: string, checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [field]: checked
    }))
  }

  const handleNext = () => {
    onNext(preferences)
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
          <Target className="h-8 w-8 text-purple-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Preferências de Busca</h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Configure suas preferências para receber apenas as oportunidades mais relevantes
        </p>
      </div>

      {/* Regiões de Interesse */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <MapPin className="h-4 w-4 mr-2" />
            Regiões de Interesse
          </CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Selecione os estados onde deseja buscar oportunidades
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {regions.map((region) => (
              <div key={region.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`region-${region.id}`}
                  checked={preferences.regions.includes(region.id)}
                  onCheckedChange={(checked) => handleRegionChange(region.id, checked)}
                />
                <Label 
                  htmlFor={`region-${region.id}`} 
                  className="text-sm font-normal cursor-pointer"
                >
                  {region.name}
                </Label>
              </div>
            ))}
          </div>
          {preferences.regions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">Selecionados:</p>
              <div className="flex flex-wrap gap-2">
                {preferences.regions.map(regionId => {
                  const region = regions.find(r => r.id === regionId)
                  return region ? (
                    <Badge key={regionId} variant="secondary" className="text-xs">
                      {region.name}
                    </Badge>
                  ) : null
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categorias */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Building2 className="h-4 w-4 mr-2" />
            Áreas de Atuação
          </CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Escolha as categorias relacionadas ao seu negócio
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`category-${category.id}`}
                  checked={preferences.categories.includes(category.id)}
                  onCheckedChange={(checked) => handleCategoryChange(category.id, checked)}
                />
                <Label 
                  htmlFor={`category-${category.id}`} 
                  className="text-sm font-normal cursor-pointer"
                >
                  {category.name}
                </Label>
              </div>
            ))}
          </div>
          {preferences.categories.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">Selecionadas:</p>
              <div className="flex flex-wrap gap-2">
                {preferences.categories.map(categoryId => {
                  const category = categories.find(c => c.id === categoryId)
                  return category ? (
                    <Badge key={categoryId} variant="secondary" className="text-xs">
                      {category.name}
                    </Badge>
                  ) : null
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Faixa de Valores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <DollarSign className="h-4 w-4 mr-2" />
            Faixa de Valores
          </CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Defina a faixa de valores dos contratos de seu interesse
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minValue" className="text-sm font-medium">
                Valor Mínimo (R$)
              </Label>
              <input
                id="minValue"
                type="number"
                placeholder="Ex: 10000"
                value={preferences.minValue}
                onChange={(e) => handleValueChange('minValue', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>
            <div>
              <Label htmlFor="maxValue" className="text-sm font-medium">
                Valor Máximo (R$)
              </Label>
              <input
                id="maxValue"
                type="number"
                placeholder="Ex: 500000"
                value={preferences.maxValue}
                onChange={(e) => handleValueChange('maxValue', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações Avançadas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            Configurações Avançadas
          </CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Personalize ainda mais sua experiência
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="weeklyReport" className="text-sm font-medium">
                Relatório Semanal
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Receba um resumo semanal das oportunidades
              </p>
            </div>
            <Switch
              id="weeklyReport"
              checked={preferences.weeklyReport}
              onCheckedChange={(checked) => handleSwitchChange('weeklyReport', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="favoriteFilters" className="text-sm font-medium">
                Salvar Filtros Favoritos
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Permitir salvar combinações de filtros
              </p>
            </div>
            <Switch
              id="favoriteFilters"
              checked={preferences.favoriteFilters}
              onCheckedChange={(checked) => handleSwitchChange('favoriteFilters', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Filter className="h-5 w-5 text-purple-500 mt-0.5" />
          <div>
            <h4 className="font-medium text-purple-900 dark:text-purple-100">Dica de Uso</h4>
            <p className="text-sm text-purple-800 dark:text-purple-200 mt-1">
              Você pode alterar essas preferências a qualquer momento no painel de controle.
              Quanto mais específicas, mais relevantes serão as oportunidades apresentadas.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Button onClick={handleNext} size="lg" className="px-8">
          Continuar
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Configurações podem ser alteradas posteriormente
        </p>
      </div>
    </div>
  )
}