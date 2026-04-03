import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSportsContext } from '@/lib/sports'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return Response.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const message = body?.message
    let conversationId = body?.conversationId

    if (!message?.trim()) {
      return Response.json({ error: 'Message is required' }, { status: 400 })
    }

    // Create a new conversation if none provided
    if (!conversationId) {
      const title = message.slice(0, 60)
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title })
        .select('id')
        .single()
      if (convError) {
        return Response.json({ error: `Failed to create conversation: ${convError.message}` }, { status: 500 })
      }
      conversationId = conv.id
    }

    // Load history for this conversation
    const { data: history, error: historyError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (historyError) {
      return Response.json({ error: `DB error: ${historyError.message}` }, { status: 500 })
    }

    // Save user message
    await supabase.from('messages').insert({
      user_id: user.id,
      conversation_id: conversationId,
      role: 'user',
      content: message,
    })

    // Build Gemini chat history
    const chatHistory = (history ?? []).map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }))

    const sportsContext = await getSportsContext(message)
    const prompt = sportsContext ? `${sportsContext}\n\nUser: ${message}` : message

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const chat = model.startChat({ history: chatHistory })
    const result = await chat.sendMessage(prompt)
    const reply = result.response.text()

    // Save assistant reply
    await supabase.from('messages').insert({
      user_id: user.id,
      conversation_id: conversationId,
      role: 'assistant',
      content: reply,
    })

    return Response.json({ reply, conversationId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conversationId = request.nextUrl.searchParams.get('conversationId')

    if (conversationId) {
      // Load messages for a specific conversation
      const { data: messages, error } = await supabase
        .from('messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) {
        return Response.json({ error: error.message }, { status: 500 })
      }
      return Response.json({ messages: messages ?? [] })
    }

    // Load all conversations
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }
    return Response.json({ conversations: conversations ?? [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conversationId = request.nextUrl.searchParams.get('conversationId')
    if (!conversationId) {
      return Response.json({ error: 'conversationId is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', user.id)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }
    return Response.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: msg }, { status: 500 })
  }
}