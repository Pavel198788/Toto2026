import { prisma } from "../lib/db"

const EMAIL = "nav@mail.ru"

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, name: true, email: true },
  })

  if (!user) {
    console.log(`User not found: ${EMAIL}`)
    await prisma.$disconnect()
    return
  }

  console.log(`Found: ${user.name} <${user.email}>`)

  await prisma.prediction.deleteMany({ where: { userId: user.id } })
  await prisma.bonusPrediction.deleteMany({ where: { userId: user.id } })
  await prisma.user.delete({ where: { id: user.id } })

  console.log("Deleted successfully.")
  await prisma.$disconnect()
}

main()
