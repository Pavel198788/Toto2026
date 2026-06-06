"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Ошибка регистрации")
      } else {
        router.push("/auth/login")
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
          <h1 className="text-4xl font-black text-yellow-400 tracking-wide mb-2">ПРИВЕТ, БРО!</h1>
          <p className="text-sm text-gray-500">Регистрируйся, делай пароль и погнали!</p>
        </div>
        <div
          className="bg-[#111] border border-[#1a1500] rounded-sm p-6"
          style={{ borderTop: "2px solid #facc15" }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-[9px] text-yellow-400 tracking-widest uppercase">Имя</label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Иванов"
                required
                className="w-full bg-[#0d0d0d] border border-[#1a1500] rounded-sm px-3 py-2.5 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-yellow-400/50 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[9px] text-yellow-400 tracking-widest uppercase">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
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
                minLength={6}
                autoComplete="new-password"
                className="w-full bg-[#0d0d0d] border border-[#1a1500] rounded-sm px-3 py-2.5 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-yellow-400/50 transition-colors"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-400 text-black font-black tracking-widest py-3 rounded-sm text-xs hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "РЕГИСТРАЦИЯ..." : "ПОГНАЛИ →"}
            </button>
          </form>
          <p className="text-center text-xs text-gray-600 mt-5">
            Уже есть аккаунт?{" "}
            <Link href="/auth/login" className="text-yellow-400 hover:text-yellow-300 transition-colors">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
