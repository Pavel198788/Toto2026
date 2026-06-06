import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/navbar"
import { Providers } from "@/components/providers"

const inter = Inter({ subsets: ["latin", "cyrillic"] })

export const metadata: Metadata = {
  title: "Тото 2026",
  description: "Футбольный тотализатор Чемпионата мира 2026",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className="dark">
      <body className={`${inter.className} bg-[#0a0a0a] text-gray-100 min-h-screen overflow-x-hidden`}>
        <Providers>
          <Navbar />
          <main className="container mx-auto px-4 py-8 max-w-7xl">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
