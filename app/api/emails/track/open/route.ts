import { NextRequest, NextResponse } from 'next/server'
import { trackEmailOpened } from '@/lib/email-analytics'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get('emailId')
    const userEmail = searchParams.get('email')
    
    if (!emailId) {
      return new NextResponse('Missing emailId parameter', { status: 400 })
    }

    // Get user metadata
    const headersList = headers()
    const ipAddress = headersList.get('x-forwarded-for') || 
                     headersList.get('x-real-ip') || 
                     'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    // Determine device type from user agent
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop'
    if (userAgent.includes('Mobile')) {
      deviceType = 'mobile'
    } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      deviceType = 'tablet'
    }

    // Track the open event
    if (userEmail) {
      await trackEmailOpened(emailId, userEmail, {
        ipAddress,
        userAgent,
        deviceType
      })
    }

    // Return a 1x1 transparent pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    )

    return new NextResponse(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pixel.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Email open tracking error:', error)
    
    // Still return pixel even on error to not break email display
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    )

    return new NextResponse(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pixel.length.toString()
      }
    })
  }
}