'use client';

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  Key, 
  Plus, 
  Copy, 
  Eye, 
  EyeOff, 
  Trash2, 
  Activity,
  Webhook,
  BarChart3,
  Calendar,
  Settings,
  AlertTriangle,
  CheckCircle,
  Code,
  Globe,
  Lock,
  Zap
} from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  key: string
  permissions: string[]
  rateLimit: {
    requests: number
    window: number
  }
  isActive: boolean
  lastUsed?: Date
  expiresAt?: Date
  createdAt: Date
}

interface WebhookEndpoint {
  id: string
  url: string
  events: string[]
  secret: string
  isActive: boolean
  lastTriggered?: Date
  failureCount: number
  createdAt: Date
}

interface ApiManagementProps {
  userId: string
  currentPlan: string
}

export function ApiManagement({ userId, currentPlan }: ApiManagementProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([])
  const [showNewKeyForm, setShowNewKeyForm] = useState(false)
  const [showNewWebhookForm, setShowNewWebhookForm] = useState(false)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const [newKey, setNewKey] = useState({
    name: '',
    permissions: [] as string[],
    rateLimit: { requests: 100, window: 3600 },
    expiresAt: ''
  })

  const [newWebhook, setNewWebhook] = useState({
    url: '',
    events: [] as string[]
  })

  const permissions = [
    { id: 'opportunities:read', label: 'Ler Oportunidades', description: 'Acesso de leitura a oportunidades' },
    { id: 'opportunities:write', label: 'Escrever Oportunidades', description: 'Criar e modificar oportunidades' },
    { id: 'certificates:read', label: 'Ler Certificados', description: 'Acesso de leitura a certificados' },
    { id: 'certificates:write', label: 'Escrever Certificados', description: 'Criar e modificar certificados' },
    { id: 'proposals:read', label: 'Ler Propostas', description: 'Acesso de leitura a propostas' },
    { id: 'proposals:write', label: 'Escrever Propostas', description: 'Criar e modificar propostas' },
    { id: 'analytics:read', label: 'Ler Analytics', description: 'Acesso aos dados de analytics' },
    { id: 'notifications:send', label: 'Enviar Notificações', description: 'Enviar notificações' },
    { id: 'webhooks:manage', label: 'Gerenciar Webhooks', description: 'Criar e gerenciar webhooks' }
  ]

  const webhookEvents = [
    { id: 'opportunity.created', label: 'Oportunidade Criada', description: 'Quando uma nova oportunidade é criada' },
    { id: 'opportunity.updated', label: 'Oportunidade Atualizada', description: 'Quando uma oportunidade é modificada' },
    { id: 'certificate.expiring', label: 'Certificado Expirando', description: 'Quando um certificado está próximo do vencimento' },
    { id: 'certificate.expired', label: 'Certificado Expirado', description: 'Quando um certificado expira' },
    { id: 'proposal.submitted', label: 'Proposta Enviada', description: 'Quando uma proposta é enviada' },
    { id: 'proposal.deadline', label: 'Prazo de Proposta', description: 'Quando o prazo de uma proposta está próximo' },
    { id: 'payment.success', label: 'Pagamento Sucesso', description: 'Quando um pagamento é confirmado' },
    { id: 'payment.failed', label: 'Pagamento Falhou', description: 'Quando um pagamento falha' },
    { id: 'analysis.completed', label: 'Análise Concluída', description: 'Quando uma análise de IA é concluída' }
  ]

  const planLimits = {
    'Starter': { maxKeys: 1, maxWebhooks: 0, maxRequests: 100 },
    'Professional': { maxKeys: 5, maxWebhooks: 3, maxRequests: 1000 },
    'Enterprise': { maxKeys: 50, maxWebhooks: 20, maxRequests: 10000 }
  }

  const currentLimits = planLimits[currentPlan as keyof typeof planLimits] || planLimits['Starter']

  useEffect(() => {
    loadApiKeys()
    loadWebhooks()
  }, [])

  const loadApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys')
      const data = await response.json()
      setApiKeys(data.apiKeys || [])
    } catch (error) {
      console.error('Erro ao carregar chaves API:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadWebhooks = async () => {
    try {
      const response = await fetch('/api/webhooks')
      const data = await response.json()
      setWebhooks(data.webhooks || [])
    } catch (error) {
      console.error('Erro ao carregar webhooks:', error)
    }
  }

  const createApiKey = async () => {
    try {
      if (!newKey.name || newKey.permissions.length === 0) {
        toast({
          title: 'Erro',
          description: 'Nome e permissões são obrigatórios',
          variant: 'destructive'
        })
        return
      }

      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKey)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      const data = await response.json()
      setApiKeys([...apiKeys, data.apiKey])
      setShowNewKeyForm(false)
      setNewKey({
        name: '',
        permissions: [],
        rateLimit: { requests: 100, window: 3600 },
        expiresAt: ''
      })

      toast({
        title: 'Chave API criada',
        description: 'A chave API foi criada com sucesso'
      })
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const createWebhook = async () => {
    try {
      if (!newWebhook.url || newWebhook.events.length === 0) {
        toast({
          title: 'Erro',
          description: 'URL e eventos são obrigatórios',
          variant: 'destructive'
        })
        return
      }

      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWebhook)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      const data = await response.json()
      setWebhooks([...webhooks, data.webhook])
      setShowNewWebhookForm(false)
      setNewWebhook({
        url: '',
        events: []
      })

      toast({
        title: 'Webhook criado',
        description: 'O webhook foi criado com sucesso'
      })
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const deleteApiKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/api-keys?id=${keyId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      setApiKeys(apiKeys.filter(key => key.id !== keyId))
      toast({
        title: 'Chave API removida',
        description: 'A chave API foi removida com sucesso'
      })
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const deleteWebhook = async (webhookId: string) => {
    try {
      const response = await fetch(`/api/webhooks?id=${webhookId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      setWebhooks(webhooks.filter(webhook => webhook.id !== webhookId))
      toast({
        title: 'Webhook removido',
        description: 'O webhook foi removido com sucesso'
      })
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copiado',
      description: 'Texto copiado para a área de transferência'
    })
  }

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys)
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId)
    } else {
      newVisible.add(keyId)
    }
    setVisibleKeys(newVisible)
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const canCreateApiKey = apiKeys.length < currentLimits.maxKeys
  const canCreateWebhook = webhooks.length < currentLimits.maxWebhooks

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            API Pública LicitaFácil
          </CardTitle>
          <CardDescription>
            Integre o LicitaFácil com seus sistemas usando nossa API REST
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {apiKeys.length} / {currentLimits.maxKeys}
              </div>
              <div className="text-sm text-gray-600">Chaves API</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {webhooks.length} / {currentLimits.maxWebhooks}
              </div>
              <div className="text-sm text-gray-600">Webhooks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {currentLimits.maxRequests}
              </div>
              <div className="text-sm text-gray-600">Requisições/hora</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Limitations */}
      {currentPlan === 'Starter' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Plano Starter:</strong> Você tem acesso limitado à API. 
            Faça upgrade para Professional ou Enterprise para mais recursos.
            <Button variant="link" className="p-0 h-auto font-normal ml-2">
              Ver planos
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="keys">Chaves API</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="docs">Documentação</TabsTrigger>
          <TabsTrigger value="usage">Uso</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          {/* API Keys Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Chaves API</h3>
              <p className="text-sm text-gray-600">
                Gerencie suas chaves de acesso à API
              </p>
            </div>
            <Button 
              onClick={() => setShowNewKeyForm(true)}
              disabled={!canCreateApiKey}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Chave
            </Button>
          </div>

          {/* New Key Form */}
          {showNewKeyForm && (
            <Card>
              <CardHeader>
                <CardTitle>Criar Nova Chave API</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="keyName">Nome</Label>
                  <Input
                    id="keyName"
                    value={newKey.name}
                    onChange={(e) => setNewKey({...newKey, name: e.target.value})}
                    placeholder="Ex: Integração Principal"
                  />
                </div>

                <div>
                  <Label>Permissões</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {permissions.map((perm) => (
                      <div key={perm.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={perm.id}
                          checked={newKey.permissions.includes(perm.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewKey({
                                ...newKey,
                                permissions: [...newKey.permissions, perm.id]
                              })
                            } else {
                              setNewKey({
                                ...newKey,
                                permissions: newKey.permissions.filter(p => p !== perm.id)
                              })
                            }
                          }}
                        />
                        <div>
                          <Label htmlFor={perm.id} className="font-medium">
                            {perm.label}
                          </Label>
                          <p className="text-xs text-gray-600">{perm.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="requests">Requisições/hora</Label>
                    <Input
                      id="requests"
                      type="number"
                      value={newKey.rateLimit.requests}
                      onChange={(e) => setNewKey({
                        ...newKey,
                        rateLimit: {
                          ...newKey.rateLimit,
                          requests: parseInt(e.target.value) || 100
                        }
                      })}
                      max={currentLimits.maxRequests}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expires">Expira em (opcional)</Label>
                    <Input
                      id="expires"
                      type="date"
                      value={newKey.expiresAt}
                      onChange={(e) => setNewKey({...newKey, expiresAt: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button onClick={createApiKey}>
                    Criar Chave
                  </Button>
                  <Button variant="outline" onClick={() => setShowNewKeyForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* API Keys List */}
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <Card key={key.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium">{key.name}</h4>
                        <Badge variant={key.isActive ? "default" : "secondary"}>
                          {key.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2 mb-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {visibleKeys.has(key.id) ? key.key : '••••••••••••••••••••'}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleKeyVisibility(key.id)}
                        >
                          {visibleKeys.has(key.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(key.key)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>
                          Permissões: {key.permissions.join(', ')}
                        </div>
                        <div>
                          Rate Limit: {key.rateLimit.requests} req/h
                        </div>
                        <div>
                          Criado em: {formatDate(key.createdAt)}
                        </div>
                        {key.lastUsed && (
                          <div>
                            Último uso: {formatDate(key.lastUsed)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteApiKey(key.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {apiKeys.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma chave API criada ainda</p>
                  <Button 
                    className="mt-4"
                    onClick={() => setShowNewKeyForm(true)}
                    disabled={!canCreateApiKey}
                  >
                    Criar primeira chave
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          {/* Webhooks Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Webhooks</h3>
              <p className="text-sm text-gray-600">
                Receba notificações em tempo real de eventos
              </p>
            </div>
            <Button 
              onClick={() => setShowNewWebhookForm(true)}
              disabled={!canCreateWebhook}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Webhook
            </Button>
          </div>

          {/* Webhook availability check */}
          {currentLimits.maxWebhooks === 0 && (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                Webhooks não estão disponíveis no plano {currentPlan}. 
                Faça upgrade para Professional ou Enterprise.
              </AlertDescription>
            </Alert>
          )}

          {/* New Webhook Form */}
          {showNewWebhookForm && canCreateWebhook && (
            <Card>
              <CardHeader>
                <CardTitle>Criar Novo Webhook</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="webhookUrl">URL do Webhook</Label>
                  <Input
                    id="webhookUrl"
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook({...newWebhook, url: e.target.value})}
                    placeholder="https://sua-api.com/webhook"
                  />
                </div>

                <div>
                  <Label>Eventos</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {webhookEvents.map((event) => (
                      <div key={event.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={event.id}
                          checked={newWebhook.events.includes(event.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewWebhook({
                                ...newWebhook,
                                events: [...newWebhook.events, event.id]
                              })
                            } else {
                              setNewWebhook({
                                ...newWebhook,
                                events: newWebhook.events.filter(e => e !== event.id)
                              })
                            }
                          }}
                        />
                        <div>
                          <Label htmlFor={event.id} className="font-medium">
                            {event.label}
                          </Label>
                          <p className="text-xs text-gray-600">{event.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button onClick={createWebhook}>
                    Criar Webhook
                  </Button>
                  <Button variant="outline" onClick={() => setShowNewWebhookForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Webhooks List */}
          <div className="space-y-3">
            {webhooks.map((webhook) => (
              <Card key={webhook.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium">{webhook.url}</h4>
                        <Badge variant={webhook.isActive ? "default" : "secondary"}>
                          {webhook.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                        {webhook.failureCount > 0 && (
                          <Badge variant="destructive">
                            {webhook.failureCount} falhas
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>
                          Eventos: {webhook.events.join(', ')}
                        </div>
                        <div>
                          Secret: {webhook.secret}
                        </div>
                        <div>
                          Criado em: {formatDate(webhook.createdAt)}
                        </div>
                        {webhook.lastTriggered && (
                          <div>
                            Último trigger: {formatDate(webhook.lastTriggered)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteWebhook(webhook.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {webhooks.length === 0 && canCreateWebhook && (
              <Card>
                <CardContent className="text-center py-8">
                  <Webhook className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhum webhook configurado ainda</p>
                  <Button 
                    className="mt-4"
                    onClick={() => setShowNewWebhookForm(true)}
                  >
                    Criar primeiro webhook
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Code className="h-5 w-5 mr-2" />
                Documentação da API
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Base URL</h4>
                  <code className="bg-gray-100 px-3 py-2 rounded block">
                    https://api.licitafacil.com/v1
                  </code>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Autenticação</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Inclua sua chave API no header de todas as requisições:
                  </p>
                  <code className="bg-gray-100 px-3 py-2 rounded block">
                    X-API-Key: sua_chave_api_aqui
                  </code>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Endpoints Principais</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">GET</Badge>
                      <code>/opportunities</code>
                      <span className="text-sm text-gray-600">Listar oportunidades</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">POST</Badge>
                      <code>/opportunities</code>
                      <span className="text-sm text-gray-600">Criar oportunidade</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">GET</Badge>
                      <code>/certificates</code>
                      <span className="text-sm text-gray-600">Listar certificados</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">GET</Badge>
                      <code>/analytics</code>
                      <span className="text-sm text-gray-600">Obter analytics</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Exemplo de Requisição</h4>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`curl -X GET \\
  https://api.licitafacil.com/v1/opportunities \\
  -H "X-API-Key: sua_chave_api_aqui" \\
  -H "Content-Type: application/json"`}
                  </pre>
                </div>

                <div>
                  <Button variant="outline">
                    Ver Documentação Completa
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Uso da API
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">1,247</div>
                    <div className="text-sm text-gray-600">Requisições este mês</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">98.5%</div>
                    <div className="text-sm text-gray-600">Taxa de sucesso</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">145ms</div>
                    <div className="text-sm text-gray-600">Tempo médio</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Endpoints Mais Usados</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">GET /opportunities</span>
                      <span className="text-sm font-medium">847 (68%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">GET /certificates</span>
                      <span className="text-sm font-medium">245 (20%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">GET /analytics</span>
                      <span className="text-sm font-medium">155 (12%)</span>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Activity className="h-4 w-4" />
                  <AlertDescription>
                    Você está usando {Math.round((1247 / currentLimits.maxRequests) * 100)}% do seu limite mensal de requisições.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}