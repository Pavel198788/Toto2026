import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { syncToGoogleSheets } from "@/lib/google-sheets"

export async function POST() {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    await syncToGoogleSheets()
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
