'use client'

import { useEffect, useRef, useState } from 'react'

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
}

interface Conversation {
  id: string
  title: string
  created_at: string
}

export default function ChatWindow() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load conversations list
  useEffect(() => {
    fetch('/api/chat')
      .then((r) => r.json())
      .then((data) => setConversations(data.conversations ?? []))
  }, [])

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    fetch(`/api/chat?conversationId=${activeId}`)
      .then((r) => r.json())
      .then((data) => setMessages(data.messages ?? []))
  }, [activeId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function startNewChat() {
    setActiveId(null)
    setMessages([])
    setInput('')
  }

  async function handleDelete(id: string) {
    await fetch(`/api/chat?conversationId=${id}`, { method: 'DELETE' })
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (activeId === id) startNewChat()
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId: activeId }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${data.error ?? 'Something went wrong'}` }])
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])

        // If this was a new conversation, add it to the sidebar
        if (!activeId && data.conversationId) {
          setActiveId(data.conversationId)
          const title = text.slice(0, 60)
          setConversations((prev) => [{ id: data.conversationId, title, created_at: new Date().toISOString() }, ...prev])
        }
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error: Failed to reach the server' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="w-64 flex-shrink-0 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
          <div className="p-3">
            <button
              onClick={startNewChat}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
            >
              + New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-1 rounded-lg px-2 py-2 cursor-pointer transition-colors ${
                  activeId === conv.id
                    ? 'bg-zinc-100 dark:bg-zinc-800'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-900'
                }`}
                onClick={() => setActiveId(conv.id)}
              >
                <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 truncate">
                  {conv.title}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(conv.id) }}
                  className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity text-xs px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Main chat area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm mr-3"
          >
            ☰
          </button>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {activeId ? conversations.find((c) => c.id === activeId)?.title : 'New chat'}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl w-full mx-auto">
          {messages.length === 0 && !loading && (
            <p className="text-center text-sm text-zinc-400 dark:text-zinc-600 mt-16">
              Start a conversation
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={msg.id ?? i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                    : 'bg-white text-zinc-900 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-50 dark:border-zinc-800'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-2.5 bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="px-4 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 max-w-3xl w-full mx-auto"
        >
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
              rows={1}
              placeholder="Message..."
              className="flex-1 resize-none rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}