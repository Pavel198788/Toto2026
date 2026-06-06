import Link from "next/link"
import { auth, signOut } from "@/lib/auth"

export async function Navbar() {
  const session = await auth()

  return (
    <nav className="border-b border-gray-800 bg-gray-900">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-yellow-400 hover:text-yellow-300">
          ⚽ Тото 2026
        </Link>
        <div className="flex items-center gap-6 text-sm">
          {session ? (
            <>
              <Link href="/matches" className="text-gray-300 hover:text-white transition-colors">
                Матчи
              </Link>
              <Link href="/leaderboard" className="text-gray-300 hover:text-white transition-colors">
                Рейтинг
              </Link>
              <Link href="/profile" className="text-gray-300 hover:text-white transition-colors">
                Мои прогнозы
              </Link>
              <Link href="/standings" className="text-gray-300 hover:text-white transition-colors">
                Группы
              </Link>
              <Link href="/grid" className="text-gray-300 hover:text-white transition-colors">
                Сетка
              </Link>
              <Link href="/bonus" className="text-gray-300 hover:text-white transition-colors">
                Бонус
              </Link>
              <Link href="/rules" className="text-gray-300 hover:text-white transition-colors">
                Правила
              </Link>
              {session.user.isAdmin && (
                <Link href="/admin" className="text-orange-400 hover:text-orange-300 transition-colors">
                  Админ
                </Link>
              )}
              <span className="text-gray-500">{session.user.name}</span>
              <form
                action={async () => {
                  "use server"
                  await signOut({ redirectTo: "/" })
                }}
              >
                <button
                  type="submit"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Выйти
                </button>
              </form>
            </>
          ) : (
            <Link href="/auth/login" className="text-yellow-400 hover:text-yellow-300 font-medium">
              Войти
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
