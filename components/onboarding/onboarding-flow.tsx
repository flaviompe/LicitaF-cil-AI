'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  FileText, 
  Building,
  Shield,
  Bell,
  Target,
  Sparkles
} from 'lucide-react'

import { WelcomeStep } from './steps/welcome-step'
import { CompanyInfoStep } from './steps/company-info-step'
import { DocumentsStep } from './steps/documents-step'
import { PreferencesStep } from './steps/preferences-step'
import { NotificationsStep } from './steps/notifications-step'
import { CompletionStep } from './steps/completion-step'

interface User {
  id: string
  name: string | null
  email: string
  company: {
    id: string
    name: string
    cnpj: string
    isActive: boolean
  } | null
  certificates: Array<{
    id: string
    type: string
    status: string
  }>
}

interface OnboardingFlowProps {
  user: User
}

const STEPS = [
  {
    id: 'welcome',
    title: 'Bem-vindo!',
    description: 'Vamos configurar sua conta',
    icon: Sparkles,
    component: WelcomeStep,
  },
  {
    id: 'company',
    title: 'Informações da Empresa',
    description: 'Complete os dados da sua empresa',
    icon: Building,
    component: CompanyInfoStep,
  },
  {
    id: 'documents',
    title: 'Documentos e Certidões',
    description: 'Configure suas certidões',
    icon: Shield,
    component: DocumentsStep,
  },
  {
    id: 'preferences',
    title: 'Preferências',
    description: 'Personalize sua experiência',
    icon: Target,
    component: PreferencesStep,
  },
  {
    id: 'notifications',
    title: 'Notificações',
    description: 'Configure alertas importantes',
    icon: Bell,
    component: NotificationsStep,
  },
  {
    id: 'completion',
    title: 'Pronto!',
    description: 'Sua conta está configurada',
    icon: CheckCircle,
    component: CompletionStep,
  },
]

export function OnboardingFlow({ user }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [stepData, setStepData] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(false)

  const progress = ((currentStep + 1) / STEPS.length) * 100
  const CurrentStepComponent = STEPS[currentStep].component

  const handleNext = async (data?: any) => {
    if (data) {
      setStepData(prev => ({ ...prev, [STEPS[currentStep].id]: data }))
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    
    try {
      // Salvar dados do onboarding
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stepData),
      })

      if (!response.ok) {
        throw new Error('Erro ao completar onboarding')
      }

      // Redirecionar para dashboard
      window.location.href = '/dashboard'
    } catch (error) {
      console.error('Erro ao completar onboarding:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary rounded-lg p-3">
              <FileText className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Configuração da Conta
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Vamos configurar sua conta para você começar a participar de licitações
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Progresso
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {currentStep + 1} de {STEPS.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps Navigation */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center ${
                index < STEPS.length - 1 ? 'flex-1' : ''
              }`}
            >
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    index < currentStep
                      ? 'bg-green-500 text-white'
                      : index === currentStep
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}
                >
                  {index < currentStep ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <div className="ml-3 hidden sm:block">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {step.description}
                  </div>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 mx-4 hidden sm:block" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <STEPS[currentStep].icon className="h-6 w-6 mr-3" />
                  {STEPS[currentStep].title}
                </CardTitle>
                <CardDescription>
                  {STEPS[currentStep].description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CurrentStepComponent
                  user={user}
                  data={stepData[STEPS[currentStep].id]}
                  onNext={handleNext}
                  onComplete={handleComplete}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={() => handleNext()}
              disabled={isLoading}
              className="flex items-center"
            >
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={isLoading}
              className="flex items-center"
            >
              {isLoading ? 'Finalizando...' : 'Finalizar'}
              <CheckCircle className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Precisa de ajuda? Entre em contato com nosso{' '}
            <a href="/support" className="text-primary hover:underline">
              suporte especializado
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}