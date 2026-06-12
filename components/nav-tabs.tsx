"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const TABS = [
  { href: "/matches", label: "МАТЧИ" },
  { href: "/leaderboard", label: "РЕЙТИНГ" },
  { href: "/analytics", label: "АНАЛИТИКА" },
  { href: "/profile", label: "ПРОФИЛЬ" },
  { href: "/grid", label: "СЕТКА" },
  { href: "/standings", label: "ГРУППЫ" },
  { href: "/bonus", label: "БОНУС" },
  { href: "/rules", label: "ПРАВИЛА" },
]

export function NavTabs({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  return (
    <div className="relative border-t border-[#1a1500]">
      <div className="container mx-auto px-4">
        <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                "px-4 py-2 text-[11px] tracking-widest whitespace-nowrap border-b-2 -mb-px transition-colors duration-150",
                pathname.startsWith(tab.href)
                  ? "text-yellow-400 border-yellow-400"
                  : "text-gray-500 border-transparent hover:text-gray-300",
              ].join(" ")}
            >
              {tab.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className="px-4 py-2 text-[10px] tracking-widest whitespace-nowrap border-b-2 -mb-px border-transparent text-orange-600 hover:text-orange-500 transition-colors duration-150"
            >
              АДМИН
            </Link>
          )}
        </div>
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-[#0a0a0a] pointer-events-none" />
    </div>
  )
}
