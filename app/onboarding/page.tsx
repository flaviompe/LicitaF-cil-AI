import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/login')
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      company: true,
      certificates: true,
    }
  })

  if (!user) {
    redirect('/login')
  }

  // Verificar se o usuário já completou o onboarding
  const hasCompletedOnboarding = user.company && user.company.isActive

  if (hasCompletedOnboarding) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <OnboardingFlow user={user} />
    </div>
  )
}