'use client'

import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, Search, Settings, User, LogOut, Shield } from 'lucide-react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { UserRole } from '@/lib/role-permissions'
import { AccessControlConfig } from '@/lib/access-control'

interface HeaderProps {
  userRole: UserRole
  accessConfig: AccessControlConfig
}

export function Header({ userRole, accessConfig }: HeaderProps) {
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="relative flex flex-1">
          {/* Search bar placeholder */}
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              className="block w-full rounded-md border-0 bg-gray-50 dark:bg-gray-800 py-1.5 pl-10 pr-3 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
              placeholder="Buscar licitações..."
              type="search"
            />
          </div>
        </div>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Role Badge */}
          <Badge variant="outline" className="hidden sm:flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {getRoleLabel(userRole)}
          </Badge>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
              {getNotificationCount(userRole)}
            </span>
          </Button>

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name || ''} />
                  <AvatarFallback>
                    {session?.user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {session?.user?.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session?.user?.email}
                  </p>
                  <Badge variant="secondary" className="text-xs w-fit mt-1">
                    {getRoleLabel(userRole)} • {accessConfig.availableModules.length} módulos
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

// Funções auxiliares
function getRoleLabel(role: UserRole): string {
  const roleLabels: { [key in UserRole]: string } = {
    ADMIN: 'Admin',
    JURIDICO: 'Jurídico',
    COMERCIAL: 'Comercial',
    TECNICO: 'Técnico',
    FINANCEIRO: 'Financeiro',
    COLABORADOR_EXTERNO: 'Colaborador',
    USER: 'Usuário'
  }
  return roleLabels[role]
}

function getNotificationCount(role: UserRole): number {
  // Simulação de notificações específicas por perfil
  const notificationsByRole: { [key in UserRole]: number } = {
    ADMIN: 12,
    JURIDICO: 8,
    COMERCIAL: 5,
    TECNICO: 3,
    FINANCEIRO: 7,
    COLABORADOR_EXTERNO: 2,
    USER: 4
  }
  return notificationsByRole[role]
}