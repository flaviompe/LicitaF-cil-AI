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
  Award
} from 'lucide-react'
import { UserRole } from '@/lib/role-permissions'
import { AccessControlConfig } from '@/lib/access-control'

// Mapeamento de ícones
const iconMap = {
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
  const pathname = usePathname()

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
          <SidebarContent pathname={pathname} />
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
          <SidebarContent pathname={pathname} />
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
          Dashboard
        </div>
      </div>
    </>
  )
}

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-1 flex-col">
      <ul role="list" className="flex flex-1 flex-col gap-y-7">
        <li>
          <ul role="list" className="-mx-2 space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    pathname === item.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-primary/10',
                    'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors'
                  )}
                >
                  <item.icon className="h-6 w-6 shrink-0" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </li>
        <li>
          <div className="text-xs font-semibold leading-6 text-gray-400 dark:text-gray-500">
            Configurações
          </div>
          <ul role="list" className="-mx-2 mt-2 space-y-1">
            {secondaryNavigation.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    pathname === item.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-primary/10',
                    'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors'
                  )}
                >
                  <item.icon className="h-6 w-6 shrink-0" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </li>
        <li className="mt-auto">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-700 dark:text-gray-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            <LogOut className="h-6 w-6 mr-3" />
            Sair
          </Button>
        </li>
      </ul>
    </nav>
  )
}