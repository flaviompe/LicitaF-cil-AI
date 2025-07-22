'use client'

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'

// Lazy loading wrapper with loading state
function withLazyLoading<T = {}>(
  importFunc: () => Promise<{ default: ComponentType<T> }>,
  loadingComponent?: ComponentType
) {
  return dynamic(importFunc, {
    loading: loadingComponent || (() => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )),
    ssr: false
  })
}

// Lazy-loaded admin components for performance optimization
export const LazyAdminDashboard = withLazyLoading(
  () => import('./dashboard'),
  () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg animate-pulse">
        <div className="px-6 py-8 sm:px-8">
          <div className="h-8 bg-blue-500 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-blue-400 rounded w-1/2"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-300 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    </div>
  )
)

export const LazyAdminUsers = withLazyLoading(
  () => import('./users-management'),
  () => (
    <div className="space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
      <div className="bg-white rounded-lg shadow">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 border-b border-gray-200 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
)

export const LazyAdminCompanies = withLazyLoading(
  () => import('./companies-management'),
  () => (
    <div className="space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
)

export const LazyAdminAnalytics = withLazyLoading(
  () => import('./analytics-dashboard'),
  () => (
    <div className="space-y-6">
      <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-40 bg-gray-100 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  )
)

export const LazyAdminSettings = withLazyLoading(
  () => import('./settings-panel'),
  () => (
    <div className="space-y-6">
      <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-6 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
)

// Performance optimized chart component
export const LazyAdminCharts = withLazyLoading(
  () => import('./charts'),
  () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      ))}
    </div>
  )
)

// Route-based code splitting helper
export const getRouteComponent = (route: string) => {
  const routeComponents: Record<string, ComponentType> = {
    '/admin': LazyAdminDashboard,
    '/admin/users': LazyAdminUsers,
    '/admin/companies': LazyAdminCompanies,
    '/admin/analytics': LazyAdminAnalytics,
    '/admin/settings': LazyAdminSettings,
  }

  return routeComponents[route] || LazyAdminDashboard
}

// Preload components for better UX
export const preloadComponent = (componentName: string) => {
  const preloadMap: Record<string, () => Promise<any>> = {
    dashboard: () => import('./dashboard'),
    users: () => import('./users-management'),
    companies: () => import('./companies-management'),
    analytics: () => import('./analytics-dashboard'),
    settings: () => import('./settings-panel'),
    charts: () => import('./charts')
  }

  const preloadFunc = preloadMap[componentName]
  if (preloadFunc) {
    preloadFunc().catch(() => {
      // Silently handle preload errors
    })
  }
}

// Hook for preloading on hover/focus
export const usePreload = () => {
  const handlePreload = (componentName: string) => {
    return {
      onMouseEnter: () => preloadComponent(componentName),
      onFocus: () => preloadComponent(componentName)
    }
  }

  return { handlePreload }
}