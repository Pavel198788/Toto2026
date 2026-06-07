import { prisma } from "../lib/db"

async function main() {
  const r1 = await prisma.user.updateMany({
    where: { name: "Андрей Некрасов" },
    data: { name: "Некрасов Андрей" },
  })
  console.log("Некрасов Андрей:", r1.count)

  const r2 = await prisma.user.updateMany({
    where: { name: { startsWith: "Роман" } },
    data: { name: "Владимиров Роман" },
  })
  console.log("Владимиров Роман:", r2.count)

  await prisma.$disconnect()
}

main()
