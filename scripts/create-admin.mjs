import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import "dotenv/config"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const hash = await bcrypt.hash("admin123", 10)
const user = await prisma.user.upsert({
  where: { email: "admin@toto2026.ru" },
  update: { isAdmin: true },
  create: { email: "admin@toto2026.ru", name: "Admin", password: hash, isAdmin: true },
})
console.log("Admin created:", user.email, "| password: admin123")
await prisma.$disconnect()
