import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getEmailService } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin users can test email configuration
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { testType = 'connection', recipientEmail } = body

    const emailService = getEmailService()

    switch (testType) {
      case 'connection':
        // Test email service connection
        const connectionResult = await emailService.testConnection()
        return NextResponse.json({
          success: connectionResult.success,
          message: connectionResult.success 
            ? 'Email service connection successful' 
            : connectionResult.error,
          timestamp: new Date().toISOString()
        })

      case 'send':
        // Send test email
        if (!recipientEmail) {
          return NextResponse.json(
            { success: false, error: 'Recipient email required for send test' },
            { status: 400 }
          )
        }

        const isValidEmail = await emailService.verifyEmailAddress(recipientEmail)
        if (!isValidEmail) {
          return NextResponse.json(
            { success: false, error: 'Invalid recipient email address' },
            { status: 400 }
          )
        }

        const testEmailResult = await emailService.sendEmail({
          to: recipientEmail,
          subject: '🧪 Teste de E-mail - LicitaFácil AI',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%); padding: 30px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">LicitaFácil AI</h1>
                <p style="color: #E0F2FE; margin: 10px 0 0 0;">Teste de Configuração de E-mail</p>
              </div>
              
              <div style="padding: 30px;">
                <h2 style="color: #1E40AF; margin: 0 0 20px 0;">✅ Teste Realizado com Sucesso!</h2>
                
                <p>Se você está recebendo este e-mail, significa que a configuração do sistema de e-mails do LicitaFácil AI está funcionando corretamente.</p>
                
                <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h3 style="color: #059669; margin: 0 0 10px 0;">📊 Informações do Teste:</h3>
                  <ul style="color: #065F46; margin: 0; padding-left: 20px;">
                    <li><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</li>
                    <li><strong>Destinatário:</strong> ${recipientEmail}</li>
                    <li><strong>Servidor:</strong> ${process.env.EMAIL_PROVIDER || 'Nodemailer'}</li>
                    <li><strong>Status:</strong> Enviado com sucesso</li>
                  </ul>
                </div>
                
                <p>Este é um e-mail de teste automatizado. Não é necessário responder.</p>
                
                <p style="margin-top: 30px;">
                  <strong>Equipe LicitaFácil AI</strong><br>
                  <small style="color: #6B7280;">Sistema de Licitações Inteligente</small>
                </p>
              </div>
            </div>
          `,
          text: `
LicitaFácil AI - Teste de E-mail

✅ Teste Realizado com Sucesso!

Se você está recebendo este e-mail, significa que a configuração do sistema de e-mails está funcionando corretamente.

Informações do Teste:
- Data/Hora: ${new Date().toLocaleString('pt-BR')}
- Destinatário: ${recipientEmail}
- Servidor: ${process.env.EMAIL_PROVIDER || 'Nodemailer'}
- Status: Enviado com sucesso

Este é um e-mail de teste automatizado.

Equipe LicitaFácil AI
          `
        })

        return NextResponse.json({
          success: testEmailResult.success,
          message: testEmailResult.success 
            ? `Test email sent successfully to ${recipientEmail}` 
            : testEmailResult.error,
          messageId: testEmailResult.messageId,
          timestamp: new Date().toISOString()
        })

      case 'template':
        // Test template rendering
        const { templateId, templateVariables } = body
        
        if (!templateId) {
          return NextResponse.json(
            { success: false, error: 'Template ID required for template test' },
            { status: 400 }
          )
        }

        const { getEmailTemplateService } = await import('@/lib/email-templates')
        const templateService = getEmailTemplateService()
        
        const template = templateService.getTemplate(templateId)
        if (!template) {
          return NextResponse.json(
            { success: false, error: 'Template not found' },
            { status: 404 }
          )
        }

        const rendered = templateService.renderTemplate(templateId, templateVariables || {})
        if (!rendered) {
          return NextResponse.json(
            { success: false, error: 'Template rendering failed' },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Template rendered successfully',
          data: {
            template: {
              id: template.id,
              name: template.name,
              variables: template.variables
            },
            rendered: {
              subject: rendered.subject,
              html: rendered.html.substring(0, 500) + '...', // Truncate for response
              text: rendered.text.substring(0, 200) + '...' // Truncate for response
            }
          },
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid test type' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Email test API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin users can view email configuration
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Return email configuration status (without sensitive data)
    const config = {
      provider: process.env.EMAIL_PROVIDER || 'nodemailer',
      smtpHost: process.env.SMTP_HOST || 'Not configured',
      smtpPort: process.env.SMTP_PORT || 'Not configured',
      fromEmail: process.env.EMAIL_FROM || 'Not configured',
      configured: !!(
        process.env.EMAIL_PROVIDER && 
        (
          (process.env.EMAIL_PROVIDER === 'nodemailer' && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) ||
          (process.env.EMAIL_PROVIDER === 'resend' && process.env.RESEND_API_KEY) ||
          (process.env.EMAIL_PROVIDER === 'sendgrid' && process.env.SENDGRID_API_KEY)
        )
      )
    }

    return NextResponse.json({
      success: true,
      data: config,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Email config API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}