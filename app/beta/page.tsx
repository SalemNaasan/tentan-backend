"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, FlaskConical, Loader2 } from "lucide-react"
import { setBetaStatus, useBeta } from "@/lib/use-beta"

export default function BetaPage() {
  const beta = useBeta()
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activate = async (value: string) => {
    if (!value.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/beta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Koden stämmer inte")
      setBetaStatus(true)
      setCode("")
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const deactivate = async () => {
    setBusy(true)
    await fetch("/api/beta", { method: "DELETE" }).catch(() => {})
    setBetaStatus(false)
    setBusy(false)
  }

  // Länk med koden: tentan.nu/beta?kod=XXXX aktiverar direkt och tar bort koden ur adressfältet
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fromLink = params.get("kod") || params.get("code")
    if (fromLink) {
      window.history.replaceState(null, "", window.location.pathname)
      activate(fromLink)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-md px-4 py-16">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                {beta ? <CheckCircle2 className="h-5 w-5" /> : <FlaskConical className="h-5 w-5" />}
              </div>
              <CardTitle>{beta ? "Beta är aktiverat" : "Betafunktioner"}</CardTitle>
              <CardDescription>
                {beta
                  ? "Du ser fler tentafrågor och kan filtrera och sortera frågor per föreläsning på övningssidan."
                  : "Har du fått en betakod? Skriv in den här för att prova nya funktioner innan de släpps."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {beta ? (
                <div className="space-y-3">
                  <Button asChild className="w-full">
                    <Link href="/study">Till övningsfrågorna</Link>
                  </Button>
                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={deactivate} disabled={busy}>
                    Stäng av beta på den här enheten
                  </Button>
                </div>
              ) : (
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    activate(code)
                  }}
                >
                  <Input
                    placeholder="Betakod"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-invalid={!!error}
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={busy || !code.trim()}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Aktivera
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
