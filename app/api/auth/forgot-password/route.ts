import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import nodemailer from "nodemailer"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email обязателен" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json({ ok: true })
    }

    await prisma.passwordResetToken.deleteMany({ where: { email } })

    const token = randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await prisma.passwordResetToken.create({
      data: { email, token, expires },
    })

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: `"Тото 2026" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Сброс пароля — Тото 2026",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Сброс пароля</h2>
          <p>Привет, ${user.name}!</p>
          <p>Кто-то запросил сброс пароля для твоего аккаунта в Тото 2026.</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block;background:#eab308;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
              Сбросить пароль
            </a>
          </p>
          <p style="color:#888;font-size:13px;">Ссылка действует 24 часа. Если ты не запрашивал сброс — просто проигнорируй это письмо.</p>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("forgot-password error:", err)
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    )
  }
}
