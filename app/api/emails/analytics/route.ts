import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getEmailAnalyticsService, generateEmailReport } from '@/lib/email-analytics'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'summary'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const templateId = searchParams.get('templateId')
    const campaignId = searchParams.get('campaignId')
    const userId = searchParams.get('userId')

    const analyticsService = getEmailAnalyticsService()

    switch (reportType) {
      case 'summary':
        // Get overall summary for the last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const today = new Date()
        
        const filters: any = {}
        if (templateId) filters.templateId = templateId
        if (campaignId) filters.campaignId = campaignId
        if (userId) filters.userId = userId

        const summaryReport = await generateEmailReport(thirtyDaysAgo, today, filters)
        
        return NextResponse.json({
          success: true,
          data: summaryReport
        })

      case 'custom':
        // Custom date range report
        if (!startDate || !endDate) {
          return NextResponse.json(
            { success: false, error: 'Start date and end date required for custom report' },
            { status: 400 }
          )
        }

        const start = new Date(startDate)
        const end = new Date(endDate)
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return NextResponse.json(
            { success: false, error: 'Invalid date format' },
            { status: 400 }
          )
        }

        const customFilters: any = {}
        if (templateId) customFilters.templateId = templateId
        if (campaignId) customFilters.campaignId = campaignId
        if (userId) customFilters.userId = userId

        const customReport = await generateEmailReport(start, end, customFilters)
        
        return NextResponse.json({
          success: true,
          data: customReport
        })

      case 'template':
        // Template-specific metrics
        if (!templateId) {
          return NextResponse.json(
            { success: false, error: 'Template ID required for template metrics' },
            { status: 400 }
          )
        }

        const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 30
        const templateMetrics = await analyticsService.getTemplateMetrics(templateId, days)
        
        return NextResponse.json({
          success: true,
          data: templateMetrics
        })

      case 'user':
        // User-specific metrics
        if (!userId) {
          return NextResponse.json(
            { success: false, error: 'User ID required for user metrics' },
            { status: 400 }
          )
        }

        const userMetrics = await analyticsService.getUserMetrics(userId)
        
        return NextResponse.json({
          success: true,
          data: userMetrics
        })

      case 'realtime':
        // Real-time statistics
        const realtimeStats = await analyticsService.getRealtimeStats()
        
        return NextResponse.json({
          success: true,
          data: realtimeStats
        })

      case 'campaigns':
        // Campaign list with basic metrics
        const sessionUser = session.user as any
        const campaigns = await analyticsService.getAllCampaigns({
          createdBy: sessionUser.role === 'ADMIN' ? undefined : sessionUser.id
        })
        
        return NextResponse.json({
          success: true,
          data: campaigns
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid report type' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin users can create campaigns
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action } = body

    const analyticsService = getEmailAnalyticsService()

    switch (action) {
      case 'create-campaign':
        const { name, description, templateId, recipientFilter, settings } = body
        
        if (!name || !templateId) {
          return NextResponse.json(
            { success: false, error: 'Campaign name and template ID are required' },
            { status: 400 }
          )
        }

        const sessionUser = session.user as any
        const campaignId = await analyticsService.createCampaign({
          name,
          description,
          templateId,
          createdBy: sessionUser.id,
          status: 'draft',
          recipientCount: 0,
          recipientFilter: recipientFilter || {},
          settings: {
            trackOpens: true,
            trackClicks: true,
            suppressBounces: true,
            batchSize: 100,
            delayBetweenBatches: 60,
            ...settings
          }
        })

        return NextResponse.json({
          success: true,
          data: { campaignId },
          message: 'Campaign created successfully'
        })

      case 'update-campaign':
        const { campaignId: updateCampaignId, updates } = body
        
        if (!updateCampaignId) {
          return NextResponse.json(
            { success: false, error: 'Campaign ID required' },
            { status: 400 }
          )
        }

        const updateSuccess = await analyticsService.updateCampaign(updateCampaignId, updates)
        
        if (!updateSuccess) {
          return NextResponse.json(
            { success: false, error: 'Campaign not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Campaign updated successfully'
        })

      case 'track-event':
        // Manual event tracking (for testing or special cases)
        const { emailId, eventType, userEmail, metadata } = body
        
        if (!emailId || !eventType || !userEmail) {
          return NextResponse.json(
            { success: false, error: 'Email ID, event type, and user email are required' },
            { status: 400 }
          )
        }

        const eventId = await analyticsService.trackEvent({
          emailId,
          eventType,
          userEmail,
          metadata
        })

        return NextResponse.json({
          success: true,
          data: { eventId },
          message: 'Event tracked successfully'
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}