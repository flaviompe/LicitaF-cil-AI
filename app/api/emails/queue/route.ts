import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getEmailQueue } from '@/lib/email-queue'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin users can view queue details
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as any
    const priority = searchParams.get('priority') as any
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined

    const queue = getEmailQueue()
    const emails = queue.getAllEmails({
      status,
      priority,
      limit,
      offset
    })

    const stats = queue.getQueueStats()
    const performanceMetrics = queue.getPerformanceMetrics()

    return NextResponse.json({
      success: true,
      data: {
        emails,
        stats,
        performanceMetrics,
        pagination: {
          limit,
          offset,
          total: stats.total
        }
      }
    })

  } catch (error) {
    console.error('Queue API error:', error)
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

    // Only admin users can manage queue
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, emailId, config } = body

    const queue = getEmailQueue()

    switch (action) {
      case 'retry':
        if (!emailId) {
          return NextResponse.json(
            { success: false, error: 'Email ID required for retry action' },
            { status: 400 }
          )
        }
        
        const retryResult = queue.retryEmail(emailId)
        return NextResponse.json({
          success: retryResult,
          message: retryResult ? 'Email queued for retry' : 'Email not found or cannot be retried'
        })

      case 'retry-all-failed':
        const retriedCount = queue.retryAllFailed()
        return NextResponse.json({
          success: true,
          message: `${retriedCount} failed emails queued for retry`
        })

      case 'remove':
        if (!emailId) {
          return NextResponse.json(
            { success: false, error: 'Email ID required for remove action' },
            { status: 400 }
          )
        }
        
        const removeResult = queue.removeEmail(emailId)
        return NextResponse.json({
          success: removeResult,
          message: removeResult ? 'Email removed from queue' : 'Email not found or cannot be removed'
        })

      case 'clear':
        const { status: filterStatus } = body
        const removedCount = queue.clearQueue(filterStatus ? { status: filterStatus } : undefined)
        return NextResponse.json({
          success: true,
          message: `${removedCount} emails removed from queue`
        })

      case 'update-config':
        if (!config) {
          return NextResponse.json(
            { success: false, error: 'Config required for update-config action' },
            { status: 400 }
          )
        }
        
        queue.updateConfig(config)
        return NextResponse.json({
          success: true,
          message: 'Queue configuration updated'
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Queue management API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}