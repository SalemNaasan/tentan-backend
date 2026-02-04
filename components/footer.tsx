import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            tentan.nu - Tentaplugg för läkarstudenter
          </p>
          <nav className="flex gap-6">
            <Link
              href="/about"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Om oss
            </Link>
            <Link
              href="/study"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Plugga
            </Link>
          </nav>
        </div>
        <div className="mt-6 border-t border-border pt-6">
          <p className="text-center text-xs text-muted-foreground">
            Denna plattform är ett studieverktyg. Verifiera information med officiellt kursmaterial.
          </p>
        </div>
      </div>
    </footer>
  )
}
