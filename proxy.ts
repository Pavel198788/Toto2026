import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isAuthenticated = !!req.auth
  const { pathname } = req.nextUrl

  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/cron")) {
    return NextResponse.next()
  }

  const publicPaths = ["/", "/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password"]
  if (!isAuthenticated && !publicPaths.includes(pathname)) {
    return NextResponse.redirect(new URL("/auth/login", req.url))
  }

  if (pathname.startsWith("/admin") && !req.auth?.user?.isAdmin) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
