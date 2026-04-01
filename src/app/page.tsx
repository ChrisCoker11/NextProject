import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-6 py-32 px-16">
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          Welcome, {user?.email}
        </h1>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Sign out
          </button>
        </form>
      </main>
    </div>
  )
}