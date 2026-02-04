import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, BookOpen, Shield, AlertTriangle } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12">
          {/* Hero */}
          <div className="mb-12 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Om tentan.nu
            </h1>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Ett digitalt studieverktyg för läkarstudenter vid Linköpings universitet
            </p>
          </div>

          {/* Content Sections */}
          <div className="space-y-8">
            {/* Purpose */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-foreground">Syfte</h2>
              <p className="text-muted-foreground leading-relaxed">
                tentan.nu är utformat för att hjälpa läkarstudenter förbereda sig för tentor genom
                aktivt övande med gamla tentafrågor. Plattformen är organiserad på ett strukturerat
                och flexibelt sätt, vilket gör att du kan fokusera på specifika terminer, ämnen
                eller tentaTyper.
              </p>
            </section>

            {/* Key Features */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-foreground">Nyckelfunktioner</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BookOpen className="h-4 w-4 text-accent" />
                      Aktiv återkallning
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Frågor visas utan svar först, vilket uppmuntrar dig att
                      aktivt arbeta igenom problemen innan du avslöjar lösningarna.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Shield className="h-4 w-4 text-accent" />
                      Flexibel filtrering
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Filtrera frågor efter termin, tentaTyp eller ämnesområde
                      för att fokusera dina studiepass på specifika ämnen.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Anki Integration */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-foreground">Anki-integration</h2>
              <p className="text-muted-foreground leading-relaxed">
                För att stödja långsiktigt lärande kan du exportera valda frågor som
                Anki-flashcards. Detta möjliggör repetition med spaced repetition, vilket är
                en av de mest effektiva metoderna för att behålla medicinsk kunskap
                över tid.
              </p>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Välj helt enkelt de frågor du vill öva på, klicka på exportknappen
                och importera den genererade filen till din Anki-app.
              </p>
            </section>

            {/* Important Notice */}
            <Card className="border-border bg-secondary/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-foreground" />
                  Viktig information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Denna plattform är ett kompletterande studieverktyg. Frågorna och
                  svaren som tillhandahålls är endast för utbildningsändamål. Verifiera alltid
                  information med officiellt kursmaterial och konsultera dina
                  lärare för auktoritativ vägledning.
                </p>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  Innehållet administreras med mänsklig övervakning, men kan innehålla
                  fel eller föråldrad information. Använd ditt eget omdöme när du studerar.
                </p>
              </CardContent>
            </Card>

            {/* Contact */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-foreground">Kontakt</h2>
              <p className="text-muted-foreground leading-relaxed">
                Om du har frågor, feedback eller upptäcker fel i innehållet,
                vänligen kontakta administratörerna.
              </p>
              <Card className="mt-4">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <Mail className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">E-post</p>
                      <a
                        href="mailto:admin@tentan.nu"
                        className="text-sm text-accent hover:underline"
                      >
                        admin@tentan.nu
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* FAQ */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                Vanliga frågor
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-foreground">
                    Behöver jag skapa ett konto?
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Nej, det krävs ingen studentinloggning. Plattformen är fritt
                    tillgänglig för alla läkarstudenter vid LiU.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">
                    Kan jag föreslå korrigeringar av svar?
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ja, kontakta oss gärna via e-post om du upptäcker fel eller
                    har förslag på hur vi kan förbättra innehållet.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">
                    Hur ofta läggs nytt innehåll till?
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Nya tentor läggs vanligtvis till efter varje tentaperiod. Kolla
                    tillbaka regelbundet för uppdaterat innehåll.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">
                    Hur fungerar Anki-exporten?
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Välj de frågor du vill öva på med hjälp av kryssrutorna,
                    klicka sedan på exportknappen. Filen kan importeras direkt
                    till Anki för dator eller mobil.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
