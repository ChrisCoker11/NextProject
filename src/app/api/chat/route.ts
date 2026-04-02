import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { NextRequest } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { message } = await request.json()
  if (!message?.trim()) {
    return Response.json({ error: 'Message is required' }, { status: 400 })
  }

  // Load existing history from DB
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  // Save user message
  await supabase.from('messages').insert({
    user_id: user.id,
    role: 'user',
    content: message,
  })

  // Build Gemini chat history (all previous messages, excluding the new one)
  const chatHistory = (history ?? []).map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }))

  let reply: string
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const chat = model.startChat({ history: chatHistory })
    const result = await chat.sendMessage(message)
    reply = result.response.text()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gemini request failed'
    return Response.json({ error: message }, { status: 500 })
  }

  // Save assistant reply
  await supabase.from('messages').insert({
    user_id: user.id,
    role: 'assistant',
    content: reply,
  })

  return Response.json({ reply })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('id, role, content, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  return Response.json({ messages: messages ?? [] })
}