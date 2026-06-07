import { prisma } from "../lib/db"

async function main() {
  const count = await prisma.prediction.count()
  console.log("Predictions before:", count)
  await prisma.prediction.deleteMany()
  console.log("All predictions deleted")
  await prisma.$disconnect()
}

main()
