import { NextRequest } from 'next/server'
import { chatService } from '@/lib/chat'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const role = searchParams.get('role') || 'user'

    if (!userId) {
      return new Response('User ID required', { status: 400 })
    }

    // Verificar se o WebSocket já foi configurado
    if (!chatService['wss']) {
      return new Response('WebSocket server not initialized', { status: 500 })
    }

    return new Response('WebSocket endpoint ready', { 
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    })

  } catch (error) {
    console.error('WebSocket endpoint error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}