// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
  })

  return NextResponse.json(
    { id: user.id, name: user.name, email: user.email },
    { status: 201 }
  )
}
