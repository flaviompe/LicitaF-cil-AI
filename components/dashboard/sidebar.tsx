'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  FileText,
  Home,
  Search,
  Shield,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  HelpCircle,
  Briefcase,
  DollarSign,
  Scale,
  MessageSquare,
  Send,
  Award,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { UserRole } from '@/lib/role-permissions'
import { AccessControlConfig } from '@/lib/access-control'

// Mapeamento de ícones
const iconMap: { [key: string]: any } = {
  Home,
  FileText,
  Send,
  Award,
  DollarSign,
  Scale,
  Settings,
  MessageSquare,
  BarChart3,
  Users,
  Shield,
  Search,
  Bell,
  HelpCircle,
  Briefcase
}

interface SidebarProps {
  userRole: UserRole
  accessConfig: AccessControlConfig
}

export function Sidebar({ userRole, accessConfig }: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({})
  const pathname = usePathname()

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  // Obter label do perfil do usuário
  const getRoleLabel = (role: UserRole): string => {
    const roleLabels: { [key in UserRole]: string } = {
      ADMIN: 'Administrador',
      JURIDICO: 'Jurídico',
      COMERCIAL: 'Comercial',
      TECNICO: 'Técnico',
      FINANCEIRO: 'Financeiro',
      COLABORADOR_EXTERNO: 'Colaborador Externo',
      USER: 'Usuário'
    }
    return roleLabels[role]
  }

  return (
    <>
      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-0 z-50 lg:hidden",
        sidebarOpen ? "block" : "hidden"
      )}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-gray-900">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center space-x-2">
              <div className="bg-primary rounded-lg p-2">
                <FileText className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                LicitaFácil Pro
              </h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          <SidebarContent 
            pathname={pathname} 
            accessConfig={accessConfig}
            userRole={userRole}
            expandedItems={expandedItems}
            toggleExpanded={toggleExpanded}
          />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6">
          <div className="flex h-16 shrink-0 items-center">
            <div className="flex items-center space-x-2">
              <div className="bg-primary rounded-lg p-2">
                <FileText className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                LicitaFácil Pro
              </h1>
            </div>
          </div>
          <SidebarContent 
            pathname={pathname} 
            accessConfig={accessConfig}
            userRole={userRole}
            expandedItems={expandedItems}
            toggleExpanded={toggleExpanded}
          />
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white dark:bg-gray-900 px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </Button>
        <div className="flex-1 text-sm font-semibold leading-6 text-gray-900 dark:text-white">
          Dashboard - {getRoleLabel(userRole)}
        </div>
      </div>
    </>
  )
}

interface SidebarContentProps {
  pathname: string
  accessConfig: AccessControlConfig
  userRole: UserRole
  expandedItems: { [key: string]: boolean }
  toggleExpanded: (itemId: string) => void
}

function SidebarContent({ 
  pathname, 
  accessConfig, 
  userRole, 
  expandedItems, 
  toggleExpanded 
}: SidebarContentProps) {
  const getRoleLabel = (role: UserRole): string => {
    const roleLabels: { [key in UserRole]: string } = {
      ADMIN: 'Administrador',
      JURIDICO: 'Jurídico',
      COMERCIAL: 'Comercial',
      TECNICO: 'Técnico',
      FINANCEIRO: 'Financeiro',
      COLABORADOR_EXTERNO: 'Colaborador Externo',
      USER: 'Usuário'
    }
    return roleLabels[role]
  }

  const getRoleBadgeColor = (role: UserRole): string => {
    const colors: { [key in UserRole]: string } = {
      ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      JURIDICO: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      COMERCIAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      TECNICO: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      FINANCEIRO: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      COLABORADOR_EXTERNO: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      USER: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
    }
    return colors[role]
  }

  return (
    <nav className="flex flex-1 flex-col">
      <ul role="list" className="flex flex-1 flex-col gap-y-7">
        {/* Badge do perfil do usuário */}
        <li className="mb-4">
          <div className="text-center">
            <Badge className={cn("text-xs font-medium", getRoleBadgeColor(userRole))}>
              {getRoleLabel(userRole)}
            </Badge>
          </div>
        </li>

        {/* Menu principal */}
        <li>
          <ul role="list" className="-mx-2 space-y-1">
            {accessConfig.menuItems.map((item) => {
              const IconComponent = iconMap[item.icon]
              const isExpanded = expandedItems[item.id]
              const hasSubmenu = item.submenu && item.submenu.length > 0

              return (
                <li key={item.id}>
                  {hasSubmenu ? (
                    <>
                      <button
                        onClick={() => toggleExpanded(item.id)}
                        className={cn(
                          'w-full group flex items-center justify-between gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors',
                          'text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-primary/10'
                        )}
                      >
                        <div className="flex items-center gap-x-3">
                          {IconComponent && <IconComponent className="h-6 w-6 shrink-0" />}
                          {item.label}
                        </div>
                        {isExpanded ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </button>
                      {isExpanded && (
                        <ul className="ml-6 mt-1 space-y-1">
                          {item.submenu?.filter(subitem => subitem.visible).map((subitem) => (
                            <li key={subitem.path}>
                              <Link
                                href={subitem.path}
                                className={cn(
                                  pathname === subitem.path
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-primary/10',
                                  'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium transition-colors'
                                )}
                              >
                                {subitem.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.path}
                      className={cn(
                        pathname === item.path
                          ? 'bg-primary text-primary-foreground'
                          : 'text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-primary/10',
                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors'
                      )}
                    >
                      {IconComponent && <IconComponent className="h-6 w-6 shrink-0" />}
                      {item.label}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </li>

        {/* Configurações e logout */}
        <li className="mt-auto">
          <div className="text-xs font-semibold leading-6 text-gray-400 dark:text-gray-500 mb-2">
            Sistema
          </div>
          <ul role="list" className="-mx-2 space-y-1">
            <li>
              <Link
                href="/dashboard/settings"
                className={cn(
                  pathname === "/dashboard/settings"
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-primary/10',
                  'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors'
                )}
              >
                <Settings className="h-6 w-6 shrink-0" />
                Configurações
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/support"
                className={cn(
                  pathname === "/dashboard/support"
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-primary/10',
                  'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors'
                )}
              >
                <HelpCircle className="h-6 w-6 shrink-0" />
                Suporte
              </Link>
            </li>
            <li>
              <button
                onClick={() => signOut()}
                className="w-full group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-700 dark:text-gray-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="h-6 w-6 shrink-0" />
                Sair
              </button>
            </li>
          </ul>
        </li>

        {/* Informações do sistema */}
        <li className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Modo:</span>
              <span className="font-medium">Produção</span>
            </div>
            <div className="flex justify-between">
              <span>Perfil:</span>
              <span className="font-medium">{getRoleLabel(userRole)}</span>
            </div>
            <div className="flex justify-between">
              <span>Módulos:</span>
              <span className="font-medium">{accessConfig.availableModules.length}</span>
            </div>
          </div>
        </li>
      </ul>
    </nav>
  )
}