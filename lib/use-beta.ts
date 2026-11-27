"use client"

import { useEffect, useState } from "react"

// Om besökaren har betaåtkomst (se lib/beta-auth.ts). Hämtas en gång per sidladdning och delas av alla komponenter.

let cached: boolean | null = null
let pending: Promise<boolean> | null = null
const listeners = new Set<(beta: boolean) => void>()

function fetchBeta(): Promise<boolean> {
  if (!pending) {
    pending = fetch("/api/beta", { cache: "no-store" })
      .then(res => (res.ok ? res.json() : { beta: false }))
      .then(data => !!data.beta)
      .catch(() => false)
      .then(beta => {
        cached = beta
        listeners.forEach(fn => fn(beta))
        return beta
      })
  }
  return pending
}

/** Sätt status direkt efter att koden aktiverats eller stängts av */
export function setBetaStatus(beta: boolean) {
  cached = beta
  pending = Promise.resolve(beta)
  listeners.forEach(fn => fn(beta))
}

export function useBeta(): boolean {
  const [beta, setBeta] = useState<boolean>(cached ?? false)
  useEffect(() => {
    listeners.add(setBeta)
    if (cached === null) fetchBeta()
    else setBeta(cached)
    return () => {
      listeners.delete(setBeta)
    }
  }, [])
  return beta
}
