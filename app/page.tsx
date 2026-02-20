import React from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, BookOpen, Filter, Brain, Download, Bell } from "lucide-react"
import { supabase } from "@/lib/supabase"

export const revalidate = 60 // Revalidate every minute

export default async function HomePage() {
  const { data: news } = await supabase
    .from('app_news')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {news && news.content && (
          <div className="bg-primary/10 border-b border-primary/20 px-4 py-3">
            <div className="mx-auto max-w-5xl flex items-start gap-3 text-sm text-foreground">
              <Bell className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="whitespace-pre-wrap leading-relaxed">{news.content}</div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="px-4 py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Plattform för tentaplugg
            </p>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Förbered dig för dina medicinska tentor med självförtroende
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground leading-relaxed">
              Ett digitalt studieverktyg för läkarstudenter vid Linköpings universitet. Öva med gamla tentafrågor, organiserade efter termin och ämnesområde.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href="/study">
                  Börja plugga
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/about">
                  Läs mer
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t border-border bg-card px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                Strukturerad tentaförberedelse
              </h2>
              <p className="mt-3 text-muted-foreground">
                Allt du behöver för effektivt och aktivt lärande
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={<BookOpen className="h-5 w-5" />}
                title="Gamla tentor"
                description="Tillgång till frågor från tidigare ordinarie tentor och omtentor från alla terminer"
              />
              <FeatureCard
                icon={<Filter className="h-5 w-5" />}
                title="Smart filtrering"
                description="Filtrera efter termin, tentaTyp eller ämnesområde för att fokusera ditt plugg"
              />
              <FeatureCard
                icon={<Brain className="h-5 w-5" />}
                title="Aktivt lärande"
                description="Frågor visas utan svar först, vilket uppmuntrar aktiv återkallning"
              />
              <FeatureCard
                icon={<Download className="h-5 w-5" />}
                title="Anki-export"
                description="Exportera frågor som Anki-flashcards för repetition med spaced repetition"
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-border bg-card px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Redo att börja?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Ingen inloggning krävs. Hoppa direkt in i pluggandet.
            </p>
            <Button asChild size="lg" className="mt-6 gap-2">
              <Link href="/study">
                Bläddra bland frågor
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-foreground">
        {icon}
      </div>
      <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

