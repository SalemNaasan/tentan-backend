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

// Modeller i turordning (GEMINI_MODEL, kommaseparerade). Är en modell överbelastad (429/503) provas nästa.
// Båda standardmodellerna ingår i Googles gratiskvot.
const GEMINI_DEFAULT_MODELS = "gemini-3.5-flash,gemini-3.5-flash-lite"

async function openGemini(req: StreamRequest): Promise<Response> {
  const models = (process.env.GEMINI_MODEL?.trim() || GEMINI_DEFAULT_MODELS).split(",").map(m => m.trim()).filter(Boolean)
  let lastStatus = 0
  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: req.messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
          // Lågt tänkande: svaren bygger på materialet, och det halverar svarstiden
          generationConfig: { maxOutputTokens: req.maxTokens, thinkingConfig: { thinkingLevel: process.env.GEMINI_THINKING?.trim() || "low" } },
        }),
      }
    )
    if (res.ok && res.body) return res
    lastStatus = res.status
    console.error(`Gemini ${model} ${res.status}:`, (await res.text().catch(() => "")).slice(0, 300))
    // Bara överbelastning eller tillfälliga fel går vidare till nästa modell
    if (![429, 500, 503].includes(res.status)) break
  }
  if (lastStatus === 429 || lastStatus === 503) throw new ChatProviderError("rate limit", "rate_limit")
  if ([400, 401, 403, 404].includes(lastStatus)) throw new ChatProviderError(`gemini ${lastStatus}`, "config")
  throw new ChatProviderError(`gemini ${lastStatus}`, "other")
}

async function* streamGemini(req: StreamRequest): AsyncGenerator<string> {
  const res = await openGemini(req)

  const reader = res.body!.getReader()
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
