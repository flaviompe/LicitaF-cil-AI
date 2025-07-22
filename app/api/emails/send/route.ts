import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getEmailService, EmailData } from '@/lib/email-service'
import { getEmailQueue } from '@/lib/email-queue'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      to, 
      cc, 
      bcc, 
      subject, 
      html, 
      text, 
      attachments, 
      priority = 'normal',
      useQueue = true,
      templateId,
      templateVariables
    } = body

    // Validate required fields
    if (!to || !subject) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, subject' },
        { status: 400 }
      )
    }

    if (!html && !text && !templateId) {
      return NextResponse.json(
        { success: false, error: 'Email content required: html, text, or templateId' },
        { status: 400 }
      )
    }

    const emailData: EmailData = {
      to,
      cc,
      bcc,
      subject,
      html,
      text,
      attachments,
      priority: priority as 'high' | 'normal' | 'low'
    }

    if (useQueue) {
      // Add to queue for reliable delivery
      const queue = getEmailQueue()
      const queueId = await queue.addToQueue(emailData, {
        priority: priority as 'high' | 'normal' | 'low',
        templateId,
        templateVariables
      })

      return NextResponse.json({
        success: true,
        queueId,
        message: 'Email added to queue successfully'
      })
    } else {
      // Send immediately
      const emailService = getEmailService()
      let emailToSend = emailData

      // If using template, render it first
      if (templateId && templateVariables) {
        const { getEmailTemplateService } = await import('@/lib/email-templates')
        const templateService = getEmailTemplateService()
        
        const rendered = templateService.createEmailFromTemplate(
          templateId,
          templateVariables,
          emailData.to,
          emailData
        )
        
        if (rendered) {
          emailToSend = rendered
        } else {
          return NextResponse.json(
            { success: false, error: 'Template not found or invalid' },
            { status: 400 }
          )
        }
      }

      const result = await emailService.sendEmail(emailToSend)

      return NextResponse.json(result, {
        status: result.success ? 200 : 400
      })
    }

  } catch (error) {
    console.error('Email send API error:', error)
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

    // Only admin users can view email status
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const queue = getEmailQueue()
    const stats = queue.getQueueStats()
    const performanceMetrics = queue.getPerformanceMetrics()

    return NextResponse.json({
      success: true,
      data: {
        queueStats: stats,
        performanceMetrics,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Email status API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}