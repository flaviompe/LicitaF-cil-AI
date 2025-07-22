import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { getAccessControlConfig } from '@/lib/access-control'
import { UserRole } from '@/lib/role-permissions'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Obter configuração de controle de acesso para o usuário
  const userRole = (session.user.role || 'USER') as UserRole
  const accessConfig = getAccessControlConfig(userRole)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar userRole={userRole} accessConfig={accessConfig} />
      <div className="lg:pl-64">
        <Header userRole={userRole} accessConfig={accessConfig} />
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}