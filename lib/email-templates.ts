import { EmailData } from './email-service'

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  description: string
  category: 'welcome' | 'notification' | 'marketing' | 'system' | 'legal' | 'billing'
  variables: string[]
  html: string
  text: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TemplateVariables {
  [key: string]: string | number | Date | boolean
}

class EmailTemplateService {
  private templates: Map<string, EmailTemplate> = new Map()

  constructor() {
    this.initializeDefaultTemplates()
  }

  private initializeDefaultTemplates() {
    const defaultTemplates: EmailTemplate[] = [
      {
        id: 'welcome',
        name: 'E-mail de Boas-vindas',
        subject: 'Bem-vindo ao LicitaFácil AI, {{userName}}!',
        description: 'E-mail enviado quando um novo usuário se cadastra',
        category: 'welcome',
        variables: ['userName', 'userEmail', 'dashboardUrl', 'companyName'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo ao LicitaFácil AI</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">
                LicitaFácil AI
            </h1>
            <p style="color: #E0F2FE; margin: 10px 0 0 0; font-size: 16px;">
                Sua plataforma de licitações inteligente
            </p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #1E40AF; margin: 0 0 20px 0; font-size: 24px;">
                Bem-vindo, {{userName}}! 🎉
            </h2>
            
            <p style="margin: 0 0 20px 0; font-size: 16px;">
                Parabéns por se juntar ao LicitaFácil AI! Você agora tem acesso à plataforma mais avançada 
                para gestão de licitações públicas no Brasil.
            </p>
            
            <div style="background: #F8FAFC; border-radius: 8px; padding: 25px; margin: 25px 0;">
                <h3 style="color: #1E40AF; margin: 0 0 15px 0; font-size: 18px;">
                    🚀 O que você pode fazer agora:
                </h3>
                <ul style="margin: 0; padding-left: 20px;">
                    <li style="margin-bottom: 8px;">Monitorar automaticamente milhares de licitações</li>
                    <li style="margin-bottom: 8px;">Usar nossa IA jurídica especializada em Lei 14.133/2021</li>
                    <li style="margin-bottom: 8px;">Analisar editais com precisão de 94.3%</li>
                    <li style="margin-bottom: 8px;">Gerenciar certidões e documentos automaticamente</li>
                    <li style="margin-bottom: 8px;">Receber alertas personalizados por WhatsApp e e-mail</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{dashboardUrl}}" 
                   style="display: inline-block; background: #10B981; color: white; padding: 15px 30px; 
                          text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Acessar Meu Dashboard
                </a>
            </div>
            
            <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 25px 0;">
                <h4 style="color: #92400E; margin: 0 0 10px 0;">💡 Dica Importante:</h4>
                <p style="color: #92400E; margin: 0; font-size: 14px;">
                    Complete seu perfil empresarial para receber oportunidades mais relevantes. 
                    Quanto mais detalhado, melhor nossa IA pode te ajudar!
                </p>
            </div>
            
            <p style="margin: 25px 0 0 0; font-size: 16px;">
                Nossa equipe está aqui para ajudar! Se tiver dúvidas, responda este e-mail ou 
                acesse nossa central de ajuda.
            </p>
            
            <p style="margin: 20px 0 0 0; font-size: 16px;">
                Bem-vindo à revolução das licitações! 🚀<br>
                <strong>Equipe LicitaFácil AI</strong>
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #F8FAFC; padding: 20px 30px; border-top: 1px solid #E5E7EB;">
            <p style="margin: 0; font-size: 12px; color: #6B7280; text-align: center;">
                Este e-mail foi enviado para {{userEmail}}<br>
                LicitaFácil AI - Democratizando o acesso às licitações públicas<br>
                <a href="#" style="color: #3B82F6;">Cancelar inscrição</a> | 
                <a href="#" style="color: #3B82F6;">Preferências de e-mail</a>
            </p>
        </div>
    </div>
</body>
</html>`,
        text: `Bem-vindo ao LicitaFácil AI, {{userName}}!

Parabéns por se juntar à plataforma mais avançada para gestão de licitações públicas no Brasil.

O que você pode fazer agora:
- Monitorar automaticamente milhares de licitações
- Usar nossa IA jurídica especializada 
- Analisar editais com precisão de 94.3%
- Gerenciar certidões automaticamente
- Receber alertas personalizados

Acesse seu dashboard: {{dashboardUrl}}

Equipe LicitaFácil AI`
      },

      {
        id: 'opportunity-alert',
        name: 'Alerta de Nova Oportunidade',
        subject: '🎯 Nova oportunidade: {{opportunityTitle}}',
        description: 'Notificação sobre nova licitação relevante',
        category: 'notification',
        variables: ['userName', 'opportunityTitle', 'organ', 'value', 'deadline', 'modality', 'opportunityUrl'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nova Oportunidade de Licitação</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">
                🎯 Nova Oportunidade Encontrada!
            </h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px;">
                Olá {{userName}},
            </p>
            
            <p style="margin: 0 0 25px 0; font-size: 16px;">
                Encontramos uma nova licitação que pode ser perfeita para sua empresa:
            </p>
            
            <!-- Opportunity Card -->
            <div style="border: 2px solid #10B981; border-radius: 12px; padding: 25px; margin: 25px 0; background: #F0FDF4;">
                <h2 style="color: #065F46; margin: 0 0 15px 0; font-size: 20px;">
                    {{opportunityTitle}}
                </h2>
                
                <div style="display: grid; gap: 12px;">
                    <div style="display: flex; align-items: center;">
                        <span style="color: #065F46; font-weight: bold; width: 100px;">🏛️ Órgão:</span>
                        <span>{{organ}}</span>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <span style="color: #065F46; font-weight: bold; width: 100px;">💰 Valor:</span>
                        <span style="font-size: 18px; font-weight: bold; color: #059669;">R$ {{value}}</span>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <span style="color: #065F46; font-weight: bold; width: 100px;">📅 Prazo:</span>
                        <span>{{deadline}}</span>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <span style="color: #065F46; font-weight: bold; width: 100px;">📋 Modalidade:</span>
                        <span>{{modality}}</span>
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{opportunityUrl}}" 
                   style="display: inline-block; background: #10B981; color: white; padding: 15px 30px; 
                          text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Ver Detalhes Completos
                </a>
            </div>
            
            <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 25px 0;">
                <h4 style="color: #92400E; margin: 0 0 10px 0;">⚡ Ação Rápida Recomendada:</h4>
                <p style="color: #92400E; margin: 0; font-size: 14px;">
                    Use nossa IA jurídica para analisar este edital em segundos e descobrir suas chances de vitória!
                </p>
            </div>
            
            <p style="margin: 25px 0 0 0; font-size: 14px; color: #6B7280;">
                Este alerta foi criado baseado no seu perfil empresarial e preferências.
            </p>
        </div>
    </div>
</body>
</html>`,
        text: `Nova Oportunidade de Licitação!

{{opportunityTitle}}

🏛️ Órgão: {{organ}}
💰 Valor: R$ {{value}}
📅 Prazo: {{deadline}}
📋 Modalidade: {{modality}}

Ver detalhes: {{opportunityUrl}}

Equipe LicitaFácil AI`
      },

      {
        id: 'certificate-expiry',
        name: 'Alerta de Vencimento de Certidão',
        subject: '⚠️ Certidão vencendo em {{daysToExpiry}} dias',
        description: 'Alerta sobre vencimento próximo de certidões',
        category: 'notification',
        variables: ['userName', 'certificateName', 'expiryDate', 'daysToExpiry', 'renewalUrl'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alerta de Vencimento</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">
                ⚠️ Atenção: Certidão Vencendo
            </h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px;">
                Olá {{userName}},
            </p>
            
            <div style="background: #FEF3C7; border: 2px solid #F59E0B; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #92400E; margin: 0 0 15px 0;">
                    📋 {{certificateName}}
                </h3>
                <p style="color: #92400E; margin: 0; font-size: 16px;">
                    <strong>Vence em:</strong> {{daysToExpiry}} dias ({{expiryDate}})
                </p>
            </div>
            
            <p style="margin: 20px 0; font-size: 16px;">
                Para continuar participando de licitações, é essencial manter suas certidões sempre atualizadas.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{renewalUrl}}" 
                   style="display: inline-block; background: #F59E0B; color: white; padding: 15px 30px; 
                          text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Renovar Agora
                </a>
            </div>
        </div>
    </div>
</body>
</html>`,
        text: `Atenção: Certidão Vencendo

{{certificateName}} vence em {{daysToExpiry}} dias ({{expiryDate}})

Renove agora: {{renewalUrl}}

Equipe LicitaFácil AI`
      },

      {
        id: 'password-reset',
        name: 'Redefinição de Senha',
        subject: '🔒 Redefinição de senha - LicitaFácil AI',
        description: 'E-mail para redefinição de senha',
        category: 'system',
        variables: ['userName', 'resetUrl', 'expiryTime'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redefinição de Senha</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">
                🔒 Redefinição de Senha
            </h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px;">
                Olá {{userName}},
            </p>
            
            <p style="margin: 0 0 25px 0; font-size: 16px;">
                Recebemos uma solicitação para redefinir a senha da sua conta no LicitaFácil AI.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{resetUrl}}" 
                   style="display: inline-block; background: #3B82F6; color: white; padding: 15px 30px; 
                          text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Redefinir Minha Senha
                </a>
            </div>
            
            <div style="background: #FEE2E2; border-left: 4px solid #EF4444; padding: 15px; margin: 25px 0;">
                <p style="color: #DC2626; margin: 0; font-size: 14px;">
                    <strong>⏰ Este link expira em {{expiryTime}}.</strong><br>
                    Se você não solicitou esta redefinição, ignore este e-mail.
                </p>
            </div>
            
            <p style="margin: 25px 0 0 0; font-size: 14px; color: #6B7280;">
                Por segurança, este link só pode ser usado uma vez.
            </p>
        </div>
    </div>
</body>
</html>`,
        text: `Redefinição de Senha

Clique no link para redefinir sua senha: {{resetUrl}}

Este link expira em {{expiryTime}}.

Equipe LicitaFácil AI`
      }
    ]

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template)
    })
  }

  getTemplate(id: string): EmailTemplate | undefined {
    return this.templates.get(id)
  }

  getAllTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values())
  }

  getTemplatesByCategory(category: EmailTemplate['category']): EmailTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category)
  }

  renderTemplate(templateId: string, variables: TemplateVariables, trackingOptions?: {
    emailId?: string
    userEmail?: string
    trackOpens?: boolean
    trackClicks?: boolean
  }): { html: string; text: string; subject: string } | null {
    const template = this.getTemplate(templateId)
    if (!template) return null

    let html = template.html
    let text = template.text
    let subject = template.subject

    // Replace variables in all content
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g')
      const stringValue = this.formatVariable(value)
      
      html = html.replace(placeholder, stringValue)
      text = text.replace(placeholder, stringValue)
      subject = subject.replace(placeholder, stringValue)
    })

    // Add tracking if requested
    if (trackingOptions?.emailId && trackingOptions?.userEmail) {
      if (trackingOptions.trackOpens) {
        html = this.addOpenTracking(html, trackingOptions.emailId, trackingOptions.userEmail)
      }
      
      if (trackingOptions.trackClicks) {
        html = this.addClickTracking(html, trackingOptions.emailId, trackingOptions.userEmail)
      }
    }

    return { html, text, subject }
  }

  private formatVariable(value: string | number | Date | boolean): string {
    if (value instanceof Date) {
      return value.toLocaleDateString('pt-BR')
    }
    
    if (typeof value === 'number') {
      // Format currency if it looks like a monetary value
      if (value > 1000) {
        return value.toLocaleString('pt-BR')
      }
      return value.toString()
    }
    
    return String(value)
  }

  private addOpenTracking(html: string, emailId: string, userEmail: string): string {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const trackingPixel = `<img src="${baseUrl}/api/emails/track/open?emailId=${emailId}&email=${encodeURIComponent(userEmail)}" width="1" height="1" style="display:none;" alt="" />`
    
    // Add tracking pixel before closing body tag
    if (html.includes('</body>')) {
      return html.replace('</body>', `${trackingPixel}</body>`)
    } else {
      // If no body tag, append at the end
      return html + trackingPixel
    }
  }

  private addClickTracking(html: string, emailId: string, userEmail: string): string {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    
    // Replace all links with tracked versions
    return html.replace(/<a\s+([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*?)>/gi, (match, beforeHref, originalUrl, afterHref) => {
      // Skip if it's already a tracking link or an anchor link
      if (originalUrl.includes('/api/emails/track/') || originalUrl.startsWith('#') || originalUrl.startsWith('mailto:')) {
        return match
      }
      
      // Extract link text if available
      const linkTextMatch = match.match(/>(.*?)<\/a>/i)
      const linkText = linkTextMatch ? linkTextMatch[1].replace(/<[^>]*>/g, '').trim() : ''
      
      // Create tracking URL
      const trackingParams = new URLSearchParams({
        emailId,
        email: userEmail,
        url: originalUrl
      })
      
      if (linkText) {
        trackingParams.set('text', linkText)
      }
      
      const trackingUrl = `${baseUrl}/api/emails/track/click?${trackingParams.toString()}`
      
      return `<a ${beforeHref}href="${trackingUrl}"${afterHref}>`
    })
  }

  createEmailFromTemplate(
    templateId: string, 
    variables: TemplateVariables, 
    recipient: string | string[],
    overrides?: Partial<EmailData>
  ): EmailData | null {
    const rendered = this.renderTemplate(templateId, variables)
    if (!rendered) return null

    return {
      to: recipient,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      ...overrides
    }
  }

  addCustomTemplate(template: Omit<EmailTemplate, 'createdAt' | 'updatedAt'>): void {
    const newTemplate: EmailTemplate = {
      ...template,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    this.templates.set(template.id, newTemplate)
  }

  updateTemplate(id: string, updates: Partial<EmailTemplate>): boolean {
    const existing = this.templates.get(id)
    if (!existing) return false

    const updated: EmailTemplate = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    }
    
    this.templates.set(id, updated)
    return true
  }

  deleteTemplate(id: string): boolean {
    return this.templates.delete(id)
  }

  validateTemplate(template: Partial<EmailTemplate>): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!template.id) errors.push('ID é obrigatório')
    if (!template.name) errors.push('Nome é obrigatório')
    if (!template.subject) errors.push('Assunto é obrigatório')
    if (!template.html) errors.push('Conteúdo HTML é obrigatório')
    if (!template.text) errors.push('Conteúdo texto é obrigatório')

    // Check for required variables in content
    if (template.variables && template.html) {
      template.variables.forEach(variable => {
        if (!template.html!.includes(`{{${variable}}}`)) {
          errors.push(`Variável {{${variable}}} não encontrada no HTML`)
        }
      })
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Singleton instance
let templateService: EmailTemplateService | null = null

export const getEmailTemplateService = (): EmailTemplateService => {
  if (!templateService) {
    templateService = new EmailTemplateService()
  }
  return templateService
}

// Helper functions for common email types
export const createWelcomeEmail = (userName: string, userEmail: string, companyName?: string) => {
  const service = getEmailTemplateService()
  return service.createEmailFromTemplate('welcome', {
    userName,
    userEmail,
    dashboardUrl: `${process.env.NEXTAUTH_URL}/dashboard`,
    companyName: companyName || 'sua empresa'
  }, userEmail)
}

export const createOpportunityAlert = (
  userName: string, 
  userEmail: string, 
  opportunity: {
    id: string
    title: string
    organ: string
    value: number
    deadline: Date
    modality: string
  }
) => {
  const service = getEmailTemplateService()
  return service.createEmailFromTemplate('opportunity-alert', {
    userName,
    opportunityTitle: opportunity.title,
    organ: opportunity.organ,
    value: opportunity.value.toLocaleString('pt-BR'),
    deadline: opportunity.deadline.toLocaleDateString('pt-BR'),
    modality: opportunity.modality,
    opportunityUrl: `${process.env.NEXTAUTH_URL}/dashboard/opportunities/${opportunity.id}`
  }, userEmail)
}

export const createCertificateExpiryAlert = (
  userName: string,
  userEmail: string,
  certificate: {
    name: string
    expiryDate: Date
    daysToExpiry: number
  }
) => {
  const service = getEmailTemplateService()
  return service.createEmailFromTemplate('certificate-expiry', {
    userName,
    certificateName: certificate.name,
    expiryDate: certificate.expiryDate.toLocaleDateString('pt-BR'),
    daysToExpiry: certificate.daysToExpiry,
    renewalUrl: `${process.env.NEXTAUTH_URL}/dashboard/certificates`
  }, userEmail)
}

export const createPasswordResetEmail = (
  userName: string,
  userEmail: string,
  resetToken: string
) => {
  const service = getEmailTemplateService()
  return service.createEmailFromTemplate('password-reset', {
    userName,
    resetUrl: `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`,
    expiryTime: '1 hora'
  }, userEmail)
}

export type { EmailTemplate, TemplateVariables }