'use client'

import { useEffect, useRef, useState } from 'react'

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
}

interface Conversation {
  id: string
  title: string
  created_at: string
}

// ── Icons ──────────────────────────────────────────────────────────────────

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="7.5" y1="2" x2="7.5" y2="13" />
      <line x1="2" y1="7.5" x2="13" y2="7.5" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 3.5h12M5 3.5V2.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 .75.75V3.5M5.5 6.5v5M9.5 6.5v5M2.5 3.5l.75 9a.75.75 0 0 0 .75.75h7a.75.75 0 0 0 .75-.75l.75-9" />
    </svg>
  )
}

function IconSend() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 7.5L1.5 1.5l2.25 6-2.25 6 12-6z" />
    </svg>
  )
}

function IconCopy() {
  return (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="5" width="8.5" height="8.5" rx="1.25" />
      <path d="M10 5V3.25A1.25 1.25 0 0 0 8.75 2h-6.5A1.25 1.25 0 0 0 1 3.25v6.5A1.25 1.25 0 0 0 2.25 11H4" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 7.5l3.5 3.5 6.5-7" />
    </svg>
  )
}

function IconSidebar() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="14" height="14" rx="2" />
      <line x1="5.5" y1="1.5" x2="5.5" y2="15.5" />
    </svg>
  )
}

function IconMoon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12.5 9A6 6 0 0 1 6 2.5a6 6 0 1 0 6.5 6.5z" />
    </svg>
  )
}

function IconSun() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="7.5" cy="7.5" r="2.5" />
      <line x1="7.5" y1="1" x2="7.5" y2="3" />
      <line x1="7.5" y1="12" x2="7.5" y2="14" />
      <line x1="1" y1="7.5" x2="3" y2="7.5" />
      <line x1="12" y1="7.5" x2="14" y2="7.5" />
      <line x1="3.05" y1="3.05" x2="4.47" y2="4.47" />
      <line x1="10.53" y1="10.53" x2="11.95" y2="11.95" />
      <line x1="3.05" y1="11.95" x2="4.47" y2="10.53" />
      <line x1="10.53" y1="4.47" x2="11.95" y2="3.05" />
    </svg>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getDateGroup(dateStr: string): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86_400_000)
  const weekAgo = new Date(today.getTime() - 6 * 86_400_000)
  const d = new Date(dateStr)
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  if (day.getTime() === today.getTime()) return 'Today'
  if (day.getTime() === yesterday.getTime()) return 'Yesterday'
  if (day >= weekAgo) return 'This week'
  return 'Earlier'
}

const GROUP_ORDER = ['Today', 'Yesterday', 'This week', 'Earlier']

function AssistantAvatar({ size = 22 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
        background: 'var(--accent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 10 10" fill="white">
        <path d="M5 0.5L6.3 3.7L9.5 4.5L7.2 6.8L7.8 10L5 8.6L2.2 10L2.8 6.8L0.5 4.5L3.7 3.7Z" />
      </svg>
    </div>
  )
}

// ── MessageBubble ──────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  index,
  copiedKey,
  onCopy,
  isStreaming,
}: {
  msg: Message
  index: number
  copiedKey: string | null
  onCopy: (text: string, key: string) => void
  isStreaming: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const msgKey = msg.id ?? `${msg.role}-${index}`
  const isCopied = copiedKey === msgKey

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end msg-enter">
        <div
          className="relative"
          style={{ maxWidth: '72%' }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div
            className="px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
            style={{
              borderRadius: '16px 16px 4px 16px',
              background: 'var(--user-bg)',
              color: 'var(--user-text)',
            }}
          >
            {msg.content}
          </div>
          {hovered && (
            <div
              className="absolute flex items-center gap-1.5"
              style={{
                bottom: -22,
                right: 0,
                animation: 'fade-in 0.15s ease-out',
                whiteSpace: 'nowrap',
              }}
            >
              {msg.timestamp && (
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                onClick={() => onCopy(msg.content, msgKey)}
                className="p-0.5 rounded transition-colors"
                style={{ color: isCopied ? 'var(--accent)' : 'var(--text-secondary)' }}
                title="Copy"
              >
                {isCopied ? <IconCheck /> : <IconCopy />}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5 msg-enter">
      <div style={{ marginTop: 2 }}>
        <AssistantAvatar />
      </div>
      <div
        className="relative"
        style={{ maxWidth: '82%' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className="px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
          style={{
            borderRadius: '4px 16px 16px 16px',
            background: 'var(--assistant-bg)',
            color: 'var(--text-primary)',
          }}
        >
          {msg.content}
          {isStreaming && <span className="cursor-blink" />}
        </div>
        {hovered && msg.content && (
          <div
            className="absolute flex items-center gap-1.5"
            style={{
              bottom: -22,
              left: 0,
              animation: 'fade-in 0.15s ease-out',
              whiteSpace: 'nowrap',
            }}
          >
            <button
              onClick={() => onCopy(msg.content, msgKey)}
              className="p-0.5 rounded transition-colors"
              style={{ color: isCopied ? 'var(--accent)' : 'var(--text-secondary)' }}
              title="Copy"
            >
              {isCopied ? <IconCheck /> : <IconCopy />}
            </button>
            {msg.timestamp && (
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── ChatWindow ─────────────────────────────────────────────────────────────

export default function ChatWindow() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [dark, setDark] = useState(true)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    fetch('/api/chat')
      .then((r) => r.json())
      .then((data) => setConversations(data.conversations ?? []))
  }, [])

  useEffect(() => {
    if (!activeId) { setMessages([]); return }
    fetch(`/api/chat?conversationId=${activeId}`)
      .then((r) => r.json())
      .then((data) => setMessages(data.messages ?? []))
  }, [activeId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [input])

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

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setMessages((prev) => [...prev, { role: 'user', content: text, timestamp: new Date() }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId: activeId }),
      })

      if (!res.ok) {
        const data = await res.json()
        setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${data.error ?? 'Something went wrong'}`, timestamp: new Date() }])
        return
      }

      const newConversationId = res.headers.get('X-Conversation-Id')
      setMessages((prev) => [...prev, { role: 'assistant', content: '', timestamp: new Date() }])

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let firstChunk = true

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (firstChunk) { setLoading(false); firstChunk = false }
        fullText += decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: fullText,
          }
          return updated
        })
      }

      if (!activeId && newConversationId) {
        setActiveId(newConversationId)
        setConversations((prev) => [
          { id: newConversationId, title: text.slice(0, 60), created_at: new Date().toISOString() },
          ...prev,
        ])
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error: Failed to reach the server', timestamp: new Date() }])
    } finally {
      setLoading(false)
    }
  }

  const grouped = GROUP_ORDER.reduce<Record<string, Conversation[]>>((acc, g) => {
    const group = conversations.filter((c) => getDateGroup(c.created_at) === g)
    if (group.length > 0) acc[g] = group
    return acc
  }, {})

  const activeTitle = activeId
    ? (conversations.find((c) => c.id === activeId)?.title ?? 'Chat')
    : 'New chat'

  const showLoadingDots = loading && (messages.length === 0 || messages[messages.length - 1]?.role !== 'assistant')

  return (
    <div
      className="flex flex-1 overflow-hidden"
      style={{ height: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
    >
      {/* ── Sidebar ── */}
      {sidebarOpen && (
        <aside
          className="flex-shrink-0 flex flex-col overflow-hidden"
          style={{ width: 260, background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
        >
          {/* Brand */}
          <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 10 10" fill="white">
                <path d="M5 0.5L6.3 3.7L9.5 4.5L7.2 6.8L7.8 10L5 8.6L2.2 10L2.8 6.8L0.5 4.5L3.7 3.7Z" />
              </svg>
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Claude Chat</span>
          </div>

          {/* New chat button */}
          <div className="px-3 pb-3">
            <button
              onClick={startNewChat}
              className="flex items-center gap-2 w-full rounded-xl px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              <IconPlus />
              New chat
            </button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {Object.entries(grouped).map(([group, convs]) => (
              <div key={group} className="mb-3">
                <p
                  className="px-2 py-1 text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {group}
                </p>
                {convs.map((conv) => (
                  <div
                    key={conv.id}
                    className="group flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer transition-colors"
                    style={{ background: activeId === conv.id ? 'var(--surface2)' : 'transparent' }}
                    onClick={() => setActiveId(conv.id)}
                  >
                    <span
                      className="flex-1 text-sm truncate"
                      style={{ color: activeId === conv.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                    >
                      {conv.title}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(conv.id) }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Delete"
                    >
                      <IconTrash />
                    </button>
                  </div>
                ))}
              </div>
            ))}
            {conversations.length === 0 && (
              <p className="text-xs px-2 py-3" style={{ color: 'var(--text-secondary)' }}>
                No conversations yet
              </p>
            )}
          </div>

          {/* User footer */}
          <div
            className="flex items-center gap-2.5 px-3 py-3"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <div
              className="flex items-center justify-center text-xs font-semibold flex-shrink-0"
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--accent)',
                color: 'white',
              }}
            >
              U
            </div>
            <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>You</span>
          </div>
        </aside>
      )}

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header
          className="flex items-center gap-3 px-4 flex-shrink-0"
          style={{
            height: 52,
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="transition-opacity hover:opacity-60 flex-shrink-0"
            style={{ color: 'var(--text-secondary)' }}
            title="Toggle sidebar"
          >
            <IconSidebar />
          </button>
          <span
            className="flex-1 text-sm font-medium truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {activeTitle}
          </span>
          <button
            onClick={() => setDark((d) => !d)}
            className="transition-opacity hover:opacity-60 flex-shrink-0"
            style={{ color: 'var(--text-secondary)' }}
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? <IconSun /> : <IconMoon />}
          </button>
        </header>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ background: 'var(--bg)' }}
        >
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
            {/* Empty state */}
            {messages.length === 0 && !loading && (
              <div
                className="flex flex-col items-center text-center"
                style={{ marginTop: '20vh', animation: 'fade-in 0.3s ease-out' }}
              >
                <div
                  className="flex items-center justify-center mb-4"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: 'var(--accent)',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 10 10" fill="white">
                    <path d="M5 0.5L6.3 3.7L9.5 4.5L7.2 6.8L7.8 10L5 8.6L2.2 10L2.8 6.8L0.5 4.5L3.7 3.7Z" />
                  </svg>
                </div>
                <h2
                  className="text-xl font-semibold mb-1.5"
                  style={{ color: 'var(--text-primary)' }}
                >
                  How can I help?
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Ask me anything — I&apos;m here to help.
                </p>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id ?? i}
                msg={msg}
                index={i}
                copiedKey={copiedKey}
                onCopy={copyText}
                isStreaming={
                  loading &&
                  i === messages.length - 1 &&
                  msg.role === 'assistant' &&
                  msg.content.length > 0
                }
              />
            ))}

            {/* Loading dots */}
            {showLoadingDots && (
              <div className="flex items-start gap-2.5 msg-enter">
                <AssistantAvatar />
                <div
                  className="flex items-center gap-1.5 px-4 py-3"
                  style={{
                    borderRadius: '4px 16px 16px 16px',
                    background: 'var(--assistant-bg)',
                  }}
                >
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="block rounded-full bounce-dot"
                      style={{
                        width: 6,
                        height: 6,
                        background: 'var(--text-secondary)',
                        animationDelay: `${delay}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input area */}
        <div
          className="flex-shrink-0 px-4 py-4"
          style={{
            background: 'var(--surface)',
            borderTop: '1px solid var(--border)',
          }}
        >
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div
              className="flex gap-2 items-end rounded-2xl px-3 py-2"
              style={{
                background: 'var(--input-bg)',
                border: '1.5px solid var(--border)',
                transition: 'border-color 0.15s',
              }}
              onFocusCapture={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)'
              }}
              onBlurCapture={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'
              }}
            >
              <textarea
                ref={textareaRef}
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
                className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed"
                style={{
                  color: 'var(--text-primary)',
                  maxHeight: 160,
                  overflowY: 'auto',
                }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex-shrink-0 flex items-center justify-center rounded-xl transition-opacity disabled:opacity-30 hover:opacity-80"
                style={{
                  width: 34,
                  height: 34,
                  background: 'var(--accent)',
                  color: 'white',
                }}
              >
                <IconSend />
              </button>
            </div>
            <p className="text-xs text-center mt-2" style={{ color: 'var(--text-secondary)' }}>
              Press Enter to send · Shift+Enter for new line
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
