import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'
import ChatWindow from '@/app/components/ChatWindow'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{user?.email}</span>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Sign out
          </button>
        </form>
      </header>
      <ChatWindow />
    </div>
  )
}