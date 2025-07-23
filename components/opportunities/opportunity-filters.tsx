'use client';

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, X } from 'lucide-react'

const bidTypes = [
  { value: 'PREGAO_ELETRONICO', label: 'Pregão Eletrônico' },
  { value: 'PREGAO_PRESENCIAL', label: 'Pregão Presencial' },
  { value: 'CONCORRENCIA', label: 'Concorrência' },
  { value: 'TOMADA_PRECOS', label: 'Tomada de Preços' },
  { value: 'CONVITE', label: 'Convite' },
  { value: 'DISPENSA', label: 'Dispensa' },
  { value: 'INEXIGIBILIDADE', label: 'Inexigibilidade' },
]

const statuses = [
  { value: 'OPEN', label: 'Aberta' },
  { value: 'CLOSED', label: 'Fechada' },
  { value: 'CANCELLED', label: 'Cancelada' },
  { value: 'SUSPENDED', label: 'Suspensa' },
]

export function OpportunityFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      params.delete('page') // Reset page when filtering
      return params.toString()
    },
    [searchParams]
  )

  const handleSearch = (value: string) => {
    router.push(`/dashboard/opportunities?${createQueryString('search', value)}`)
  }

  const handleBidTypeChange = (value: string) => {
    router.push(`/dashboard/opportunities?${createQueryString('bidType', value)}`)
  }

  const handleStatusChange = (value: string) => {
    router.push(`/dashboard/opportunities?${createQueryString('status', value)}`)
  }

  const handleOrganChange = (value: string) => {
    router.push(`/dashboard/opportunities?${createQueryString('organ', value)}`)
  }

  const clearFilters = () => {
    router.push('/dashboard/opportunities')
  }

  const hasFilters = searchParams.get('search') || searchParams.get('bidType') || 
                   searchParams.get('status') || searchParams.get('organ')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Busca por texto */}
        <div className="space-y-2">
          <Label htmlFor="search">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="search"
              placeholder="Título, descrição ou órgão..."
              className="pl-10"
              defaultValue={searchParams.get('search') || ''}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(e.currentTarget.value)
                }
              }}
            />
          </div>
        </div>

        {/* Filtro por tipo de licitação */}
        <div className="space-y-2">
          <Label htmlFor="bidType">Tipo de Licitação</Label>
          <Select
            value={searchParams.get('bidType') || ''}
            onValueChange={handleBidTypeChange}
          >
            <SelectTrigger id="bidType">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os tipos</SelectItem>
              {bidTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por status */}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={searchParams.get('status') || ''}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os status</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por órgão */}
        <div className="space-y-2">
          <Label htmlFor="organ">Órgão</Label>
          <Input
            id="organ"
            placeholder="Nome do órgão..."
            defaultValue={searchParams.get('organ') || ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleOrganChange(e.currentTarget.value)
              }
            }}
          />
        </div>
      </div>

      {/* Botão para limpar filtros */}
      {hasFilters && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Limpar Filtros
          </Button>
        </div>
      )}
    </div>
  )
}