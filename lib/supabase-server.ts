import { createClient } from "@supabase/supabase-js"

// Supabase-klient för API-routes. Använder service role-nyckeln (som kringgår RLS)
// när den finns. Importera aldrig denna fil i klientkomponenter.
// Utan nyckeln faller den tillbaka på anon-nyckeln så att sidan fungerar under övergången.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey && process.env.NODE_ENV === "production") {
  console.warn("SUPABASE_SERVICE_ROLE_KEY saknas – API:t använder anon-nyckeln.")
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)
