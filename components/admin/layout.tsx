'use client'

import { useState } from 'react'
import AdminNavigation from './navigation'
import AdminHeader from './header'

interface AdminLayoutProps {
  children: React.ReactNode
  user?: {
    name: string
    email: string
    imageUrl?: string
    role?: string
  }
}

export default function AdminLayout({ children, user }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <AdminNavigation user={user} />
      
      {/* Main content area */}
      <div className="lg:pl-72">
        {/* Header */}
        <AdminHeader 
          user={user} 
          onMobileMenuClick={() => setSidebarOpen(true)} 
        />
        
        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}