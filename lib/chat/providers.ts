import Anthropic from "@anthropic-ai/sdk"

// Endast för servern. AI-leverantörer för chatten – välj med CHAT_PROVIDER ("gemini" eller "anthropic").
// Utan CHAT_PROVIDER används den leverantör vars nyckel finns (Gemini först, eftersom gratiskvoten räcker långt).

export type ChatProvider = "gemini" | "anthropic"
export type ChatTurn = { role: "user" | "assistant"; content: string }

export interface StreamRequest {
  system: string
  messages: ChatTurn[]
  maxTokens: number
}

/** Fel som visas för användaren i chatten */
export class ChatProviderError extends Error {
  constructor(message: string, readonly kind: "rate_limit" | "config" | "other") {
    super(message)
  }
}

export function activeProvider(): ChatProvider | null {
  const chosen = process.env.CHAT_PROVIDER?.trim().toLowerCase()
  if (chosen === "gemini" || chosen === "anthropic") return chosen
  if (process.env.GEMINI_API_KEY) return "gemini"
  if (process.env.ANTHROPIC_API_KEY) return "anthropic"
  return null
}

export function providerKeyMissing(provider: ChatProvider): boolean {
  return provider === "gemini" ? !process.env.GEMINI_API_KEY : !process.env.ANTHROPIC_API_KEY
}

// ---------- Claude (Anthropic) ----------

const CLAUDE_MODEL = "claude-haiku-5-5"

async function* streamClaude(req: StreamRequest): AsyncGenerator<string> {
  const client = new Anthropic()
  try {
    const stream = client.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: req.maxTokens,
      output_config: { effort: "low" },
      system: req.system,
      messages: req.messages,
    })
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text
    }
    const final = await stream.finalMessage()
    if (final.stop_reason === "refusal") yield "\n\n_Det här kan jag tyvärr inte svara på. Ställ gärna en annan fråga om terminens innehåll._"
    else if (final.stop_reason === "max_tokens") yield " …"
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) throw new ChatProviderError("rate limit", "rate_limit")
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) throw new ChatProviderError("auth", "config")
    throw error
  }
}

// ---------- Gemini (Google) ----------

// Modellen väljs med GEMINI_MODEL; standard är en snabb och billig Flash-modell med gratiskvot
const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash"

async function* streamGemini(req: StreamRequest): AsyncGenerator<string> {
  const model = process.env.GEMINI_MODEL?.trim() || GEMINI_DEFAULT_MODEL
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: req.messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: req.maxTokens },
      }),
    }
  )
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "")
    console.error(`Gemini ${res.status}:`, detail.slice(0, 500))
    if (res.status === 429) throw new ChatProviderError("rate limit", "rate_limit")
    if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404) throw new ChatProviderError(`gemini ${res.status}`, "config")
    throw new ChatProviderError(`gemini ${res.status}`, "other")
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let finish: string | undefined
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let newline: number
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim()
      buffer = buffer.slice(newline + 1)
      if (!line.startsWith("data:")) continue
      try {
        const chunk = JSON.parse(line.slice(5))
        const candidate = chunk.candidates?.[0]
        for (const part of candidate?.content?.parts ?? []) {
          // Hoppa över modellens interna resonemang (thought-delar)
          if (typeof part.text === "string" && !part.thought) yield part.text
        }
        if (candidate?.finishReason) finish = candidate.finishReason
      } catch {
        // Ofullständig rad – ignoreras
      }
    }
  }
  if (finish === "MAX_TOKENS") yield " …"
  else if (finish && finish !== "STOP") yield "\n\n_Det här kan jag tyvärr inte svara på. Ställ gärna en annan fråga om terminens innehåll._"
}

export function streamAnswer(provider: ChatProvider, req: StreamRequest): AsyncGenerator<string> {
  return provider === "gemini" ? streamGemini(req) : streamClaude(req)
}
