'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import type { User, Permission } from '@/types/admin'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  permissions: Permission[]
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Role-based permissions mapping
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
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

interface AdminAuthProviderProps {
  children: React.ReactNode
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const { data: session, status } = useSession()
  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])

  const isLoading = status === 'loading'
  const isAuthenticated = !!session?.user && !!user

  useEffect(() => {
    if (session?.user) {
      // Transform session user to our User type
      const transformedUser: User = {
        id: session.user.id || '',
        name: session.user.name || '',
        email: session.user.email || '',
        imageUrl: session.user.image || undefined,
        role: (session.user as any).role || 'COLABORADOR',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      setUser(transformedUser)
      
      // Set permissions based on role
      const userPermissions = ROLE_PERMISSIONS[transformedUser.role || 'COLABORADOR'] || []
      setPermissions(userPermissions)
    } else {
      setUser(null)
      setPermissions([])
    }
  }, [session])

  const hasPermission = (permission: Permission): boolean => {
    return permissions.includes(permission)
  }

  const hasAnyPermission = (requiredPermissions: Permission[]): boolean => {
    return requiredPermissions.some(permission => permissions.includes(permission))
  }

  const refreshUser = async (): Promise<void> => {
    // Implement user refresh logic if needed
    // For example, refetch user data from API
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    permissions,
    hasPermission,
    hasAnyPermission,
    refreshUser
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAdminAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}

// Permission checking components
interface PermissionGateProps {
  permission: Permission | Permission[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { hasPermission, hasAnyPermission } = useAdminAuth()
  
  const hasAccess = Array.isArray(permission) 
    ? hasAnyPermission(permission)
    : hasPermission(permission)

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

// Role checking component
interface RoleGateProps {
  roles: User['role'] | User['role'][]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const { user } = useAdminAuth()
  
  if (!user) return <>{fallback}</>
  
  const allowedRoles = Array.isArray(roles) ? roles : [roles]
  const hasAccess = allowedRoles.includes(user.role)

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

// Hook for checking if user can access admin area
export function useAdminAccess() {
  const { user, isAuthenticated } = useAdminAuth()
  
  const canAccessAdmin = isAuthenticated && user && [
    'ADMIN', 
    'JURIDICO', 
    'COMERCIAL', 
    'TECNICO', 
    'FINANCEIRO'
  ].includes(user.role || '')

  return {
    canAccessAdmin,
    isLoading: !user && isAuthenticated,
    user
  }
}