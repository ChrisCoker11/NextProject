import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSportsContext } from '@/lib/sports'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: 'ANTHROPIC_API_KEY is not set' }, { status: 500 })
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

    const sportsContext = await getSportsContext(message)
    const userContent = sportsContext ? `${sportsContext}\n\nUser: ${message}` : message

    // Trim to last 20 messages so long conversations never hit Claude's token limit
    const recentHistory = (history ?? []).slice(-20)

    // Build Claude message history
    const chatHistory: Anthropic.MessageParam[] = recentHistory.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }))
    chatHistory.push({ role: 'user', content: userContent })

    const systemPrompt = process.env.CHATBOT_SYSTEM_PROMPT
      ?? 'You are a helpful, knowledgeable assistant. Be concise and direct. When you are unsure, say so.'

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const stream = anthropic.messages.stream({
      model: 'claude-opus-4-7',
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      // cache_control tells Anthropic to cache this system prompt — after the first request
      // it's served at ~10% token cost instead of full price
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: chatHistory,
    })

    // Stream text chunks to the client as they arrive instead of waiting for the full response
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        let fullText = ''
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              fullText += event.delta.text
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
        } finally {
          controller.close()
          // Save the complete reply to the DB after the stream finishes
          if (fullText) {
            await supabase.from('messages').insert({
              user_id: user.id,
              conversation_id: conversationId,
              role: 'assistant',
              content: fullText,
            })
          }
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        // Send conversationId in a header since we can no longer use JSON body
        'X-Conversation-Id': conversationId,
      },
    })
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