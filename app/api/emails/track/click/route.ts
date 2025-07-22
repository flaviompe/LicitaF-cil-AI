import { NextRequest, NextResponse } from 'next/server'
import { trackEmailClicked } from '@/lib/email-analytics'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get('emailId')
    const originalUrl = searchParams.get('url')
    const userEmail = searchParams.get('email')
    const linkText = searchParams.get('text')
    
    if (!emailId || !originalUrl) {
      return NextResponse.json(
        { error: 'Missing emailId or url parameter' },
        { status: 400 }
      )
    }

    // Validate the original URL
    try {
      new URL(originalUrl)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL parameter' },
        { status: 400 }
      )
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

    // Track the click event
    if (userEmail) {
      await trackEmailClicked(emailId, userEmail, originalUrl, linkText || undefined, {
        ipAddress,
        userAgent,
        deviceType
      })
    }

    // Redirect to the original URL
    return NextResponse.redirect(originalUrl, 302)

  } catch (error) {
    console.error('Email click tracking error:', error)
    
    // Still redirect to the original URL even on error
    const originalUrl = new URL(request.url).searchParams.get('url')
    if (originalUrl) {
      try {
        new URL(originalUrl)
        return NextResponse.redirect(originalUrl, 302)
      } catch {
        // Invalid URL, return error
        return NextResponse.json(
          { error: 'Invalid URL parameter' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Missing url parameter' },
      { status: 400 }
    )
  }
}