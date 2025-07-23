// Sistema de Controle de Acesso e Permissões
import React from 'react';
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { rolePermissions, UserRole, hasPermission, canAccessModule } from './role-permissions'

// Middleware de autenticação e autorização
export async function authMiddleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const userRole = (token.role as UserRole) || 'USER'
  const pathname = req.nextUrl.pathname

  // Verificar acesso a rotas específicas
  const accessDenied = checkRouteAccess(pathname, userRole)
  
  if (accessDenied) {
    return NextResponse.redirect(new URL('/unauthorized', req.url))
  }

  // Adicionar informações de permissão aos headers
  const response = NextResponse.next()
  response.headers.set('x-user-role', userRole)
  response.headers.set('x-user-permissions', JSON.stringify(rolePermissions[userRole]))
  
  return response
}

// Verificar acesso a rotas específicas
function checkRouteAccess(pathname: string, userRole: UserRole): boolean {
  const permissions = rolePermissions[userRole]

  // Rotas administrativas
  if (pathname.startsWith('/admin')) {
    return userRole !== 'ADMIN'
  }

  // Rotas específicas por módulo
  const routeModuleMap: { [key: string]: string } = {
    '/dashboard/analytics': 'analytics',
    '/dashboard/users': 'users',
    '/dashboard/system': 'system',
    '/opportunities/manage': 'opportunities',
    '/proposals/manage': 'proposals',
    '/certificates/manage': 'certificates',
    '/financials': 'financials',
    '/legal': 'legal',
    '/technical': 'technical'
  }

  for (const [route, module] of Object.entries(routeModuleMap)) {
    if (pathname.startsWith(route)) {
      return !canAccessModule(userRole, module)
    }
  }

  // Verificações específicas por permissão
  if (pathname.includes('/manage') || pathname.includes('/edit') || pathname.includes('/delete')) {
    if (pathname.includes('opportunities') && !permissions.canManageOpportunities) return true
    if (pathname.includes('proposals') && !permissions.canManageProposals) return true
    if (pathname.includes('certificates') && !permissions.canManageCertificates) return true
    if (pathname.includes('financials') && !permissions.canManageFinancials) return true
    if (pathname.includes('users') && !permissions.canManageUsers) return true
    if (pathname.includes('legal') && !permissions.canManageLegalDocuments) return true
    if (pathname.includes('technical') && !permissions.canManageTechnicalSpecs) return true
  }

  return false
}

// Hook para verificação de permissões no cliente
export function usePermissions() {
  return {
    hasPermission: (permission: keyof typeof rolePermissions.USER) => {
      // Esta função seria implementada no lado cliente
      // com o contexto do usuário autenticado
      return true
    },
    canAccessModule: (module: string) => {
      // Esta função seria implementada no lado cliente
      return true
    }
  }
}

// Componente de proteção de rota
interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: keyof typeof rolePermissions.USER
  requiredModule?: string
  userRole?: UserRole
  fallback?: React.ReactNode
}

export function ProtectedRoute({ 
  children, 
  requiredPermission, 
  requiredModule, 
  userRole = 'USER',
  fallback = React.createElement('div', null, 'Acesso negado')
}: ProtectedRouteProps) {
  // Verificar permissão específica
  if (requiredPermission && !hasPermission(userRole, requiredPermission)) {
    return fallback
  }

  // Verificar acesso ao módulo
  if (requiredModule && !canAccessModule(userRole, requiredModule)) {
    return fallback
  }

  return children
}

// Componente de botão condicional baseado em permissão
interface ConditionalButtonProps {
  permission?: keyof typeof rolePermissions.USER
  module?: string
  userRole?: UserRole
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function ConditionalButton({
  permission,
  module,
  userRole = 'USER',
  children,
  className,
  onClick
}: ConditionalButtonProps) {
  // Verificar se tem permissão
  const hasRequiredPermission = permission ? hasPermission(userRole, permission) : true
  const hasModuleAccess = module ? canAccessModule(userRole, module) : true

  if (!hasRequiredPermission || !hasModuleAccess) {
    return null
  }

  return (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  )
}

// Utilitário para filtrar dados baseado em permissões
export function filterDataByPermissions<T>(
  data: T[],
  userRole: UserRole,
  filterFunction: (item: T, permissions: typeof rolePermissions.USER) => boolean
): T[] {
  const permissions = rolePermissions[userRole]
  return data.filter(item => filterFunction(item, permissions))
}

// Utilitário para obter configuração de menu baseada no perfil
export function getMenuConfiguration(userRole: UserRole) {
  const permissions = rolePermissions[userRole]
  const availableModules = permissions.dashboardModules

  const menuItems = [
    {
      id: 'overview',
      label: 'Visão Geral',
      icon: 'Home',
      path: '/dashboard',
      visible: availableModules.includes('overview')
    },
    {
      id: 'opportunities',
      label: 'Oportunidades',
      icon: 'FileText',
      path: '/dashboard/opportunities',
      visible: availableModules.includes('opportunities'),
      submenu: [
        {
          label: 'Visualizar',
          path: '/dashboard/opportunities',
          visible: permissions.canViewOpportunities
        },
        {
          label: 'Gerenciar',
          path: '/dashboard/opportunities/manage',
          visible: permissions.canManageOpportunities
        }
      ]
    },
    {
      id: 'proposals',
      label: 'Propostas',
      icon: 'Send',
      path: '/dashboard/proposals',
      visible: availableModules.includes('proposals'),
      submenu: [
        {
          label: 'Visualizar',
          path: '/dashboard/proposals',
          visible: permissions.canViewProposals
        },
        {
          label: 'Gerenciar',
          path: '/dashboard/proposals/manage',
          visible: permissions.canManageProposals
        }
      ]
    },
    {
      id: 'certificates',
      label: 'Certidões',
      icon: 'Award',
      path: '/dashboard/certificates',
      visible: availableModules.includes('certificates'),
      submenu: [
        {
          label: 'Visualizar',
          path: '/dashboard/certificates',
          visible: permissions.canViewCertificates
        },
        {
          label: 'Gerenciar',
          path: '/dashboard/certificates/manage',
          visible: permissions.canManageCertificates
        }
      ]
    },
    {
      id: 'financials',
      label: 'Financeiro',
      icon: 'DollarSign',
      path: '/dashboard/financials',
      visible: availableModules.includes('financials'),
      submenu: [
        {
          label: 'Visualizar',
          path: '/dashboard/financials',
          visible: permissions.canViewFinancials
        },
        {
          label: 'Gerenciar',
          path: '/dashboard/financials/manage',
          visible: permissions.canManageFinancials
        }
      ]
    },
    {
      id: 'legal',
      label: 'Jurídico',
      icon: 'Scale',
      path: '/dashboard/legal',
      visible: availableModules.includes('legal'),
      submenu: [
        {
          label: 'Documentos',
          path: '/dashboard/legal',
          visible: permissions.canViewLegalDocuments
        },
        {
          label: 'Gerenciar',
          path: '/dashboard/legal/manage',
          visible: permissions.canManageLegalDocuments
        }
      ]
    },
    {
      id: 'technical',
      label: 'Técnico',
      icon: 'Settings',
      path: '/dashboard/technical',
      visible: availableModules.includes('technical'),
      submenu: [
        {
          label: 'Especificações',
          path: '/dashboard/technical',
          visible: permissions.canViewTechnicalSpecs
        },
        {
          label: 'Gerenciar',
          path: '/dashboard/technical/manage',
          visible: permissions.canManageTechnicalSpecs
        }
      ]
    },
    {
      id: 'ai-assistant',
      label: 'Assistente IA',
      icon: 'MessageSquare',
      path: '/dashboard/ai-assistant',
      visible: availableModules.includes('ai-assistant') && permissions.canAccessAI
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: 'BarChart3',
      path: '/dashboard/analytics',
      visible: availableModules.includes('analytics') && permissions.canViewAnalytics
    },
    {
      id: 'users',
      label: 'Usuários',
      icon: 'Users',
      path: '/dashboard/users',
      visible: availableModules.includes('users') && permissions.canViewUsers,
      submenu: [
        {
          label: 'Visualizar',
          path: '/dashboard/users',
          visible: permissions.canViewUsers
        },
        {
          label: 'Gerenciar',
          path: '/dashboard/users/manage',
          visible: permissions.canManageUsers
        }
      ]
    },
    {
      id: 'system',
      label: 'Sistema',
      icon: 'Shield',
      path: '/dashboard/system',
      visible: availableModules.includes('system') && permissions.canManageSystem
    }
  ]

  return menuItems.filter(item => item.visible)
}

// Tipos para TypeScript
export interface AccessControlConfig {
  userRole: UserRole
  permissions: typeof rolePermissions.USER
  availableModules: string[]
  menuItems: ReturnType<typeof getMenuConfiguration>
}

// Função para obter configuração completa de controle de acesso
export function getAccessControlConfig(userRole: UserRole): AccessControlConfig {
  const permissions = rolePermissions[userRole]
  const availableModules = permissions.dashboardModules
  const menuItems = getMenuConfiguration(userRole)

  return {
    userRole,
    permissions,
    availableModules,
    menuItems
  }
}

// Validador de ações do usuário
export function validateUserAction(
  action: string,
  resource: string,
  userRole: UserRole
): { allowed: boolean; reason?: string } {
  const permissions = rolePermissions[userRole]

  // Mapear ações para permissões
  const actionPermissionMap: { [key: string]: { [key: string]: keyof typeof permissions } } = {
    view: {
      opportunities: 'canViewOpportunities',
      proposals: 'canViewProposals',
      certificates: 'canViewCertificates',
      financials: 'canViewFinancials',
      users: 'canViewUsers',
      legal: 'canViewLegalDocuments',
      technical: 'canViewTechnicalSpecs',
      analytics: 'canViewAnalytics'
    },
    manage: {
      opportunities: 'canManageOpportunities',
      proposals: 'canManageProposals',
      certificates: 'canManageCertificates',
      financials: 'canManageFinancials',
      users: 'canManageUsers',
      legal: 'canManageLegalDocuments',
      technical: 'canManageTechnicalSpecs',
      system: 'canManageSystem'
    }
  }

  const requiredPermission = actionPermissionMap[action]?.[resource]
  
  if (!requiredPermission) {
    return { allowed: false, reason: 'Ação ou recurso não reconhecido' }
  }

  const hasRequiredPermission = permissions[requiredPermission] as boolean

  if (!hasRequiredPermission) {
    return { 
      allowed: false, 
      reason: `Sem permissão para ${action} ${resource}. Nível de acesso: ${userRole}` 
    }
  }

  return { allowed: true }
}