import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { supabaseAdmin } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"]

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  try {
    const form = await req.formData()
    const file = form.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Ingen fil skickades" }, { status: 400 })
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Filen måste vara en bild" }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Bilden är större än 5 MB" }, { status: 400 })
    }

    const ext = (file.name.split(".").pop() || "").toLowerCase()
    const safeExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : "png"
    const filePath = `${Math.random().toString(36).substring(2)}-${Date.now()}.${safeExt}`

    const { error } = await supabaseAdmin.storage
      .from("question-images")
      .upload(filePath, file, { contentType: file.type })

    if (error) throw error

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("question-images")
      .getPublicUrl(filePath)

    return NextResponse.json({ url: publicUrl })
  } catch (error: any) {
    console.error("Image upload error:", error)
    return NextResponse.json({ error: error.message || "Uppladdningen misslyckades" }, { status: 500 })
  }
}
