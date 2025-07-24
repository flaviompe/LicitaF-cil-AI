import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getEmailTemplateService, EmailTemplate } from '@/lib/email-templates'

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
    const category = searchParams.get('category') as EmailTemplate['category'] | null
    const templateId = searchParams.get('id')

    const templateService = getEmailTemplateService()

    if (templateId) {
      // Get specific template
      const template = templateService.getTemplate(templateId)
      if (!template) {
        return NextResponse.json(
          { success: false, error: 'Template not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: template
      })
    }

    // Get all templates or by category
    const templates = category 
      ? templateService.getTemplatesByCategory(category)
      : templateService.getAllTemplates()

    return NextResponse.json({
      success: true,
      data: templates
    })

  } catch (error) {
    console.error('Templates API error:', error)
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

    // Only admin users can create templates
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const templateService = getEmailTemplateService()

    // Validate template
    const validation = templateService.validateTemplate(body)
    if (!validation.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Template validation failed',
          details: validation.errors
        },
        { status: 400 }
      )
    }

    // Add template
    templateService.addCustomTemplate(body)

    return NextResponse.json({
      success: true,
      message: 'Template created successfully',
      data: { id: body.id }
    })

  } catch (error) {
    console.error('Template creation API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin users can update templates
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Template ID required' },
        { status: 400 }
      )
    }

    const templateService = getEmailTemplateService()
    
    // Validate updates if provided
    if (Object.keys(updates).length > 0) {
      const validation = templateService.validateTemplate({ id, ...updates })
      if (!validation.valid) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Template validation failed',
            details: validation.errors
          },
          { status: 400 }
        )
      }
    }

    const success = templateService.updateTemplate(id, updates)

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully'
    })

  } catch (error) {
    console.error('Template update API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin users can delete templates
    if ((session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID required' },
        { status: 400 }
      )
    }

    const templateService = getEmailTemplateService()
    const success = templateService.deleteTemplate(templateId)

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    })

  } catch (error) {
    console.error('Template deletion API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}