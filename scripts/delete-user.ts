import { prisma } from "../lib/db"

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  })
  console.log("All users:", users)

  const tester = users.find(u =>
    u.name?.toLowerCase().includes("тест") ||
    u.name?.toLowerCase().includes("test") ||
    u.email?.toLowerCase().includes("test")
  )

  if (!tester) {
    console.log("Tester user not found")
  } else {
    await prisma.prediction.deleteMany({ where: { userId: tester.id } })
    await prisma.user.delete({ where: { id: tester.id } })
    console.log("Deleted:", tester.name, tester.email)
  }

  await prisma.$disconnect()
}

main()
