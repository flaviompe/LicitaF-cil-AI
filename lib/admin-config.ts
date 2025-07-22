import {
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CpuChipIcon,
  CurrencyDollarIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

import type { NavigationItem, TeamItem, User, Permission } from '@/types/admin'

// Navigation configuration by user role
export const getNavigationForRole = (role: User['role']): NavigationItem[] => {
  const baseNavigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: HomeIcon,
      current: false
    }
  ]

  const roleSpecificNavigation: Record<string, NavigationItem[]> = {
    ADMIN: [
      ...baseNavigation,
      {
        name: 'Usuários',
        href: '/admin/users',
        icon: UsersIcon,
        current: false
      },
      {
        name: 'Empresas',
        href: '/admin/companies',
        icon: BuildingOfficeIcon,
        current: false
      },
      {
        name: 'Licitações',
        href: '/admin/opportunities',
        icon: DocumentTextIcon,
        current: false
      },
      {
        name: 'Analytics',
        href: '/admin/analytics',
        icon: ChartBarIcon,
        current: false
      },
      {
        name: 'IA Jurídica',
        href: '/admin/ai-legal',
        icon: CpuChipIcon,
        current: false
      },
      {
        name: 'Financeiro',
        href: '/admin/billing',
        icon: CurrencyDollarIcon,
        current: false
      },
      {
        name: 'Academy',
        href: '/admin/academy',
        icon: AcademicCapIcon,
        current: false
      },
      {
        name: 'Chat Suporte',
        href: '/admin/chat',
        icon: ChatBubbleLeftRightIcon,
        current: false
      },
      {
        name: 'Notificações',
        href: '/admin/notifications',
        icon: BellIcon,
        current: false
      },
      {
        name: 'Segurança',
        href: '/admin/security',
        icon: ShieldCheckIcon,
        current: false
      },
      {
        name: 'Configurações',
        href: '/admin/settings',
        icon: Cog6ToothIcon,
        current: false
      }
    ],

    JURIDICO: [
      ...baseNavigation,
      {
        name: 'Licitações',
        href: '/admin/opportunities',
        icon: DocumentTextIcon,
        current: false
      },
      {
        name: 'IA Jurídica',
        href: '/admin/ai-legal',
        icon: CpuChipIcon,
        current: false
      },
      {
        name: 'Documentos',
        href: '/admin/documents',
        icon: ClipboardDocumentListIcon,
        current: false
      },
      {
        name: 'Relatórios',
        href: '/admin/reports',
        icon: ChartBarIcon,
        current: false
      },
      {
        name: 'Academy',
        href: '/admin/academy',
        icon: AcademicCapIcon,
        current: false
      }
    ],

    COMERCIAL: [
      ...baseNavigation,
      {
        name: 'Empresas',
        href: '/admin/companies',
        icon: BuildingOfficeIcon,
        current: false
      },
      {
        name: 'Licitações',
        href: '/admin/opportunities',
        icon: DocumentTextIcon,
        current: false
      },
      {
        name: 'Analytics',
        href: '/admin/analytics',
        icon: ChartBarIcon,
        current: false
      },
      {
        name: 'Chat Suporte',
        href: '/admin/chat',
        icon: ChatBubbleLeftRightIcon,
        current: false
      },
      {
        name: 'Relatórios',
        href: '/admin/reports',
        icon: ChartBarIcon,
        current: false
      }
    ],

    TECNICO: [
      ...baseNavigation,
      {
        name: 'Licitações',
        href: '/admin/opportunities',
        icon: DocumentTextIcon,
        current: false
      },
      {
        name: 'IA Jurídica',
        href: '/admin/ai-legal',
        icon: CpuChipIcon,
        current: false
      },
      {
        name: 'Chat Suporte',
        href: '/admin/chat',
        icon: ChatBubbleLeftRightIcon,
        current: false
      },
      {
        name: 'Configurações',
        href: '/admin/settings',
        icon: Cog6ToothIcon,
        current: false
      }
    ],

    FINANCEIRO: [
      ...baseNavigation,
      {
        name: 'Analytics',
        href: '/admin/analytics',
        icon: ChartBarIcon,
        current: false
      },
      {
        name: 'Financeiro',
        href: '/admin/billing',
        icon: CurrencyDollarIcon,
        current: false
      },
      {
        name: 'Relatórios',
        href: '/admin/reports',
        icon: ChartBarIcon,
        current: false
      }
    ],

    COLABORADOR: [
      ...baseNavigation,
      {
        name: 'Relatórios',
        href: '/admin/reports',
        icon: ChartBarIcon,
        current: false
      }
    ]
  }

  return roleSpecificNavigation[role || 'COLABORADOR'] || baseNavigation
}

// Team configuration by organization
export const getTeamsForUser = (user: User): TeamItem[] => {
  const baseTeams: TeamItem[] = []

  // Admin users can see all teams
  if (user.role === 'ADMIN') {
    return [
      {
        id: 1,
        name: 'Equipe Jurídica',
        href: '/admin/teams/legal',
        initial: 'J',
        current: false,
        memberCount: 5
      },
      {
        id: 2,
        name: 'Equipe Técnica',
        href: '/admin/teams/tech',
        initial: 'T',
        current: false,
        memberCount: 8
      },
      {
        id: 3,
        name: 'Equipe Comercial',
        href: '/admin/teams/sales',
        initial: 'C',
        current: false,
        memberCount: 12
      },
      {
        id: 4,
        name: 'Equipe Financeira',
        href: '/admin/teams/finance',
        initial: 'F',
        current: false,
        memberCount: 3
      }
    ]
  }

  // Role-specific team visibility
  const roleTeamMapping: Record<string, TeamItem[]> = {
    JURIDICO: [
      {
        id: 1,
        name: 'Equipe Jurídica',
        href: '/admin/teams/legal',
        initial: 'J',
        current: false
      }
    ],
    TECNICO: [
      {
        id: 2,
        name: 'Equipe Técnica',
        href: '/admin/teams/tech',
        initial: 'T',
        current: false
      }
    ],
    COMERCIAL: [
      {
        id: 3,
        name: 'Equipe Comercial',
        href: '/admin/teams/sales',
        initial: 'C',
        current: false
      }
    ],
    FINANCEIRO: [
      {
        id: 4,
        name: 'Equipe Financeira',
        href: '/admin/teams/finance',
        initial: 'F',
        current: false
      }
    ]
  }

  return roleTeamMapping[user.role || 'COLABORADOR'] || baseTeams
}

// Organization settings that can be customized
export interface OrganizationConfig {
  name: string
  logo?: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  theme: 'light' | 'dark' | 'auto'
  timezone: string
  language: 'pt-BR' | 'en-US'
  features: {
    enableChat: boolean
    enableNotifications: boolean
    enableAI: boolean
    enableAnalytics: boolean
    enableMobileApp: boolean
  }
}

export const defaultOrganizationConfig: OrganizationConfig = {
  name: 'LicitaFácil AI',
  primaryColor: '#3B82F6', // blue-500
  secondaryColor: '#1E40AF', // blue-700
  accentColor: '#10B981', // green-500
  theme: 'light',
  timezone: 'America/Sao_Paulo',
  language: 'pt-BR',
  features: {
    enableChat: true,
    enableNotifications: true,
    enableAI: true,
    enableAnalytics: true,
    enableMobileApp: true
  }
}

// Theme configurations
export interface ThemeConfig {
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
    textSecondary: string
    border: string
    success: string
    warning: string
    error: string
    info: string
  }
  gradients: {
    primary: string
    secondary: string
    accent: string
  }
}

export const themes: Record<string, ThemeConfig> = {
  default: {
    name: 'LicitaFácil Default',
    colors: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      accent: '#10B981',
      background: '#F9FAFB',
      surface: '#FFFFFF',
      text: '#111827',
      textSecondary: '#6B7280',
      border: '#E5E7EB',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6'
    },
    gradients: {
      primary: 'from-blue-600 to-blue-800',
      secondary: 'from-blue-500 to-purple-600',
      accent: 'from-green-500 to-blue-500'
    }
  },
  
  government: {
    name: 'Governo',
    colors: {
      primary: '#059669',
      secondary: '#047857',
      accent: '#0D9488',
      background: '#F0FDF4',
      surface: '#FFFFFF',
      text: '#111827',
      textSecondary: '#6B7280',
      border: '#D1FAE5',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#0891B2'
    },
    gradients: {
      primary: 'from-green-600 to-green-800',
      secondary: 'from-green-500 to-teal-600',
      accent: 'from-teal-500 to-green-500'
    }
  },

  corporate: {
    name: 'Corporativo',
    colors: {
      primary: '#1F2937',
      secondary: '#374151',
      accent: '#3B82F6',
      background: '#F9FAFB',
      surface: '#FFFFFF',
      text: '#111827',
      textSecondary: '#6B7280',
      border: '#E5E7EB',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6'
    },
    gradients: {
      primary: 'from-gray-800 to-gray-900',
      secondary: 'from-gray-700 to-gray-800',
      accent: 'from-blue-500 to-blue-600'
    }
  },

  tech: {
    name: 'Tecnologia',
    colors: {
      primary: '#7C3AED',
      secondary: '#5B21B6',
      accent: '#EC4899',
      background: '#FAFAF9',
      surface: '#FFFFFF',
      text: '#111827',
      textSecondary: '#6B7280',
      border: '#E5E7EB',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6'
    },
    gradients: {
      primary: 'from-purple-600 to-purple-800',
      secondary: 'from-purple-500 to-pink-600',
      accent: 'from-pink-500 to-purple-500'
    }
  }
}

// Permission checking utilities
export const hasPermission = (userRole: User['role'], permission: Permission): boolean => {
  const rolePermissions: Record<string, Permission[]> = {
    ADMIN: [
      'VIEW_DASHBOARD',
      'MANAGE_USERS',
      'MANAGE_COMPANIES',
      'MANAGE_OPPORTUNITIES',
      'VIEW_ANALYTICS',
      'MANAGE_SETTINGS',
      'MANAGE_SYSTEM',
      'VIEW_REPORTS',
      'MANAGE_BILLING',
      'MANAGE_LEGAL_AI'
    ],
    JURIDICO: [
      'VIEW_DASHBOARD',
      'MANAGE_OPPORTUNITIES',
      'VIEW_ANALYTICS',
      'VIEW_REPORTS',
      'MANAGE_LEGAL_AI'
    ],
    COMERCIAL: [
      'VIEW_DASHBOARD',
      'MANAGE_COMPANIES',
      'MANAGE_OPPORTUNITIES',
      'VIEW_ANALYTICS',
      'VIEW_REPORTS'
    ],
    TECNICO: [
      'VIEW_DASHBOARD',
      'MANAGE_OPPORTUNITIES',
      'MANAGE_SYSTEM',
      'VIEW_REPORTS'
    ],
    FINANCEIRO: [
      'VIEW_DASHBOARD',
      'VIEW_ANALYTICS',
      'MANAGE_BILLING',
      'VIEW_REPORTS'
    ],
    COLABORADOR: [
      'VIEW_DASHBOARD',
      'VIEW_REPORTS'
    ]
  }

  return rolePermissions[userRole || 'COLABORADOR']?.includes(permission) || false
}

// Quick action configurations by role
export const getQuickActionsForRole = (role: User['role']) => {
  const roleActions: Record<string, Array<{name: string, href: string, icon: any}>> = {
    ADMIN: [
      { name: 'Adicionar Usuário', href: '/admin/users/new', icon: UsersIcon },
      { name: 'Nova Empresa', href: '/admin/companies/new', icon: BuildingOfficeIcon },
      { name: 'Configurações', href: '/admin/settings', icon: Cog6ToothIcon },
      { name: 'Relatórios', href: '/admin/reports', icon: ChartBarIcon }
    ],
    JURIDICO: [
      { name: 'Consultar IA', href: '/admin/ai-legal', icon: CpuChipIcon },
      { name: 'Nova Análise', href: '/admin/opportunities/analyze', icon: DocumentTextIcon },
      { name: 'Documentos', href: '/admin/documents', icon: ClipboardDocumentListIcon }
    ],
    COMERCIAL: [
      { name: 'Nova Empresa', href: '/admin/companies/new', icon: BuildingOfficeIcon },
      { name: 'Agendar Reunião', href: '/admin/calendar', icon: CalendarIcon },
      { name: 'Chat Suporte', href: '/admin/chat', icon: ChatBubbleLeftRightIcon }
    ],
    TECNICO: [
      { name: 'Chat Suporte', href: '/admin/chat', icon: ChatBubbleLeftRightIcon },
      { name: 'Configurações', href: '/admin/settings', icon: Cog6ToothIcon }
    ],
    FINANCEIRO: [
      { name: 'Relatórios', href: '/admin/reports', icon: ChartBarIcon },
      { name: 'Billing', href: '/admin/billing', icon: CurrencyDollarIcon }
    ]
  }

  return roleActions[role || 'COLABORADOR'] || []
}