import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { authConfig } from "@/lib/auth.config"

const DUMMY_HASH = "$2b$12$Qh27Dx80Nrv0vnPY5IrPcuR6LQjVXqmqb0ehTu699fGV3uOnfed02"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        const hashToCompare = user?.password ?? DUMMY_HASH
        const valid = await bcrypt.compare(
          credentials.password as string,
          hashToCompare
        )

        if (!user || !valid) return null

        return { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin }
      },
    }),
  ],
})
