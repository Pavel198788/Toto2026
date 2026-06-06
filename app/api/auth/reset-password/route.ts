import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const { token, password } = await req.json()

  if (!token || !password || typeof token !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Пароль минимум 6 символов" }, { status: 400 })
  }

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } })

  if (!resetToken || resetToken.expires < new Date()) {
    return NextResponse.json({ error: "Ссылка недействительна или устарела" }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 12)

  await prisma.user.update({
    where: { email: resetToken.email },
    data: { password: hashed },
  })

  await prisma.passwordResetToken.delete({ where: { token } })

  return NextResponse.json({ ok: true })
}
