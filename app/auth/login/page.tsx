"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const result = await signIn("credentials", { email, password, redirect: false })
      if (!result?.ok || result?.error) {
        setError("Неверный email или пароль")
      } else {
        router.push("/matches")
        router.refresh()
      }
    } catch {
      setError("Ошибка сети")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-yellow-400 tracking-wide mb-2">С ВОЗВРАЩЕНИЕМ!</h1>
          <p className="text-sm text-gray-500">Твои прогнозы ждут</p>
        </div>
        <div
          className="bg-[#111] border border-[#1a1500] rounded-sm p-6"
          style={{ borderTop: "2px solid #facc15" }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[9px] text-yellow-400 tracking-widest uppercase">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ivan@example.com"
                required
                className="w-full bg-[#0d0d0d] border border-[#1a1500] rounded-sm px-3 py-2.5 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-yellow-400/50 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-[9px] text-yellow-400 tracking-widest uppercase">Пароль</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-[#0d0d0d] border border-[#1a1500] rounded-sm px-3 py-2.5 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-yellow-400/50 transition-colors"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="text-right">
              <Link href="/auth/forgot-password" className="text-[10px] text-yellow-400/50 hover:text-yellow-400 transition-colors">
                Забыли пароль?
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-400 text-black font-black tracking-widest py-3 rounded-sm text-xs hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "ВХОД..." : "ВОЙТИ →"}
            </button>
          </form>
          <p className="text-center text-xs text-gray-600 mt-5">
            Нет аккаунта?{" "}
            <Link href="/auth/register" className="text-yellow-400 hover:text-yellow-300 transition-colors">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
