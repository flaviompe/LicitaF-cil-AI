import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

// Importar sistema de inicialização das integrações
import '@/lib/integration-startup'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LicitaFácil AI - Gestão Completa de Licitações',
  description: 'Sistema completo para pequenos e médios empresários participarem de licitações públicas com facilidade e eficiência.',
  keywords: ['licitações', 'públicas', 'empresários', 'PME', 'gestão', 'automação', 'IA', 'artificial intelligence'],
  authors: [{ name: 'LicitaFácil AI' }],
  creator: 'LicitaFácil AI',
  publisher: 'LicitaFácil AI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://licitafacil.com.br'),
  openGraph: {
    title: 'LicitaFácil Pro - Gestão Completa de Licitações',
    description: 'Sistema completo para pequenos e médios empresários participarem de licitações públicas',
    url: 'https://licitafacil.com.br',
    siteName: 'LicitaFácil Pro',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'LicitaFácil Pro',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LicitaFácil Pro - Gestão Completa de Licitações',
    description: 'Sistema completo para pequenos e médios empresários participarem de licitações públicas',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}