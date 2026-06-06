import Link from "next/link"
import { auth, signOut } from "@/lib/auth"
import { NavTabs } from "@/components/nav-tabs"

export async function Navbar() {
  const session = await auth()

  return (
    <nav className="bg-[#0a0a0a] border-b-2 border-[#1a1500]">
      {/* Строка 1: Лого + пользователь */}
      <div className="container mx-auto px-4 flex items-center justify-between h-11">
        <Link
          href="/"
          className="text-sm font-black text-yellow-400 tracking-widest hover:text-yellow-300 transition-colors"
        >
          ⚽ ТОТО 2026
        </Link>
        {session ? (
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-gray-600 tracking-widest hidden sm:inline">
              {session.user.name?.split(" ")[0].toUpperCase()}
            </span>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/" })
              }}
            >
              <button
                type="submit"
                className="text-[10px] text-gray-700 hover:text-gray-400 tracking-widest transition-colors"
              >
                ВЫЙТИ
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/auth/login"
            className="text-[10px] text-yellow-400 font-bold tracking-widest hover:text-yellow-300 transition-colors"
          >
            ВОЙТИ
          </Link>
        )}
      </div>

      {/* Строка 2: Скролл-вкладки (только залогиненным) */}
      {session && <NavTabs isAdmin={session.user.isAdmin ?? false} />}
    </nav>
  )
}
