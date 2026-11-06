// Ljudmotor för OSCE-simulatorn, helt syntetiserad med Web Audio API.
// Inga ljudfiler behövs: hjärttoner, andningsljud, Korotkoffljud och visselsignaler
// byggs av brus och sinusvågor med filter och envelopes.

let ctx: AudioContext | null = null
let noiseBuffer: AudioBuffer | null = null

export function getAudioContext(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext
    ctx = new Ctor()
  }
  if (ctx.state === "suspended") ctx.resume()
  return ctx
}

function getNoise(ac: AudioContext): AudioBuffer {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ac.sampleRate) {
    noiseBuffer = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return noiseBuffer
}

/** En kort dämpad 'duns' – grunden i hjärttoner och Korotkoffljud */
function thump(
  ac: AudioContext,
  dest: AudioNode,
  at: number,
  { freq, duration, gain, noise = 0.35 }: { freq: number; duration: number; gain: number; noise?: number },
) {
  if (gain <= 0.001) return
  const env = ac.createGain()
  env.gain.setValueAtTime(0, at)
  env.gain.linearRampToValueAtTime(gain, at + 0.008)
  env.gain.exponentialRampToValueAtTime(0.0008, at + duration)
  env.connect(dest)

  const osc = ac.createOscillator()
  osc.type = "sine"
  osc.frequency.setValueAtTime(freq * 1.25, at)
  osc.frequency.exponentialRampToValueAtTime(freq, at + duration * 0.6)
  osc.connect(env)
  osc.start(at)
  osc.stop(at + duration + 0.02)

  if (noise > 0) {
    const src = ac.createBufferSource()
    src.buffer = getNoise(ac)
    const bp = ac.createBiquadFilter()
    bp.type = "bandpass"
    bp.frequency.value = freq * 2.2
    bp.Q.value = 1.2
    const ng = ac.createGain()
    ng.gain.value = noise
    src.connect(bp).connect(ng).connect(env)
    src.start(at, Math.random())
    src.stop(at + duration + 0.02)
  }
}

/* ------------------------------------------------------------------ */
/* Visselsignaler (1 min kvar / stationsbyte)                          */
/* ------------------------------------------------------------------ */

export function playWhistle(count: 1 | 2) {
  const ac = getAudioContext()
  for (let i = 0; i < count; i++) {
    const at = ac.currentTime + 0.05 + i * 0.75
    const osc = ac.createOscillator()
    osc.type = "triangle"
    osc.frequency.value = 2900
    // Visselpipans "drill": snabb frekvensmodulering
    const lfo = ac.createOscillator()
    lfo.frequency.value = 32
    const lfoGain = ac.createGain()
    lfoGain.gain.value = 160
    lfo.connect(lfoGain).connect(osc.frequency)

    const env = ac.createGain()
    env.gain.setValueAtTime(0, at)
    env.gain.linearRampToValueAtTime(0.22, at + 0.03)
    env.gain.setValueAtTime(0.22, at + 0.5)
    env.gain.exponentialRampToValueAtTime(0.001, at + 0.6)
    osc.connect(env).connect(ac.destination)
    osc.start(at)
    lfo.start(at)
    osc.stop(at + 0.62)
    lfo.stop(at + 0.62)
  }
}

/* ------------------------------------------------------------------ */
/* Andningscykel (delas av hjärt- och lungmotorn)                      */
/* ------------------------------------------------------------------ */

export interface BreathPattern {
  inspiration: number
  expiration: number
}

export const NORMAL_BREATH: BreathPattern = { inspiration: 1.6, expiration: 2.4 }
export const OBSTRUCTIVE_BREATH: BreathPattern = { inspiration: 1.2, expiration: 3.6 }

/** 0–1 position i andningscykeln och om vi andas in */
export function breathPhase(t: number, p: BreathPattern) {
  const cycle = p.inspiration + p.expiration
  const pos = ((t % cycle) + cycle) % cycle
  const inhaling = pos < p.inspiration
  return { inhaling, progress: inhaling ? pos / p.inspiration : (pos - p.inspiration) / p.expiration, pos, cycle }
}

/* ------------------------------------------------------------------ */
/* Stetoskopets filter: klocka vs membran                              */
/* ------------------------------------------------------------------ */

export type ChestPiece = "membrane" | "bell"

/** Skapar en kedja som efterliknar stetoskopets frekvensgång */
function createChestPiece(ac: AudioContext) {
  const input = ac.createGain()
  const hp = ac.createBiquadFilter()
  hp.type = "highpass"
  const lp = ac.createBiquadFilter()
  lp.type = "lowpass"
  const out = ac.createGain()
  input.connect(hp).connect(lp).connect(out)

  const set = (piece: ChestPiece) => {
    const now = ac.currentTime
    if (piece === "bell") {
      // Klockan släpper igenom låga frekvenser (S3, S4) och dämpar höga
      hp.frequency.setTargetAtTime(20, now, 0.05)
      lp.frequency.setTargetAtTime(220, now, 0.05)
      out.gain.setTargetAtTime(1.6, now, 0.05)
    } else {
      // Membranet filtrerar bort de lägsta frekvenserna och framhäver S1/S2
      hp.frequency.setTargetAtTime(90, now, 0.05)
      lp.frequency.setTargetAtTime(900, now, 0.05)
      out.gain.setTargetAtTime(1.5, now, 0.05)
    }
  }
  return { input, out, set }
}

/* ------------------------------------------------------------------ */
/* Hjärtljud                                                           */
/* ------------------------------------------------------------------ */

export interface HeartListenPoint {
  /** Relativ styrka för S1 (AV-klaffar) och S2 (A2/P2) vid stetoskopets läge */
  s1: number
  a2: number
  p2: number
  s3: number
  /** Total kontakt (0 = luft, 1 = bra anliggning över hjärtat) */
  contact: number
}

export class HeartSoundEngine {
  private ac: AudioContext
  private piece: ReturnType<typeof createChestPiece>
  private master: GainNode
  readonly analyser: AnalyserNode
  private timer: number | null = null
  private nextBeat = 0
  private startTime = 0
  private point: HeartListenPoint = { s1: 0, a2: 0, p2: 0, s3: 0, contact: 0 }
  bpm = 68
  hasS3 = false
  breath = NORMAL_BREATH
  /** Anropas vid varje S1 (för att räkna hjärtcykler i UI:t) */
  onBeat?: () => void

  constructor() {
    this.ac = getAudioContext()
    this.piece = createChestPiece(this.ac)
    this.master = this.ac.createGain()
    this.master.gain.value = 0.9
    this.analyser = this.ac.createAnalyser()
    this.analyser.fftSize = 2048
    this.piece.out.connect(this.master).connect(this.analyser).connect(this.ac.destination)
    this.piece.set("membrane")
  }

  setChestPiece(piece: ChestPiece) {
    this.piece.set(piece)
  }

  setPoint(point: HeartListenPoint) {
    this.point = point
  }

  /** Sekunder sedan start – används för att visa andningsfasen */
  elapsed() {
    return this.ac.currentTime - this.startTime
  }

  start() {
    if (this.timer !== null) return
    this.startTime = this.ac.currentTime
    this.nextBeat = this.ac.currentTime + 0.1
    // Schemalägg slag ~200 ms framåt i tiden för jämn timing
    this.timer = window.setInterval(() => this.schedule(), 40)
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
  }

  dispose() {
    this.stop()
    this.master.disconnect()
  }

  private schedule() {
    const lookahead = this.ac.currentTime + 0.2
    while (this.nextBeat < lookahead) {
      this.playBeat(this.nextBeat)
      const delayMs = Math.max(0, (this.nextBeat - this.ac.currentTime) * 1000)
      window.setTimeout(() => this.onBeat?.(), delayMs)
      // Lätt respiratorisk sinusarytmi: snabbare puls vid inandning
      const { inhaling } = breathPhase(this.nextBeat - this.startTime, this.breath)
      const bpm = this.bpm * (inhaling ? 1.05 : 0.96)
      this.nextBeat += 60 / bpm
    }
  }

  private playBeat(at: number) {
    const { s1, a2, p2, s3, contact } = this.point
    const dest = this.piece.input
    const k = contact
    const systole = 0.3

    // S1: mitralis + trikuspidalis, lågfrekvent och lite längre
    thump(this.ac, dest, at, { freq: 55, duration: 0.14, gain: 0.9 * s1 * k })
    thump(this.ac, dest, at + 0.018, { freq: 48, duration: 0.11, gain: 0.5 * s1 * k })

    // S2: A2 följt av P2. Klyvningen vidgas vid inandning (ökat venöst återflöde till höger hjärta)
    const { inhaling, progress } = breathPhase(at - this.startTime, this.breath)
    const split = inhaling ? 0.025 + 0.035 * Math.sin(Math.PI * progress) : 0.012
    const s2At = at + systole
    thump(this.ac, dest, s2At, { freq: 75, duration: 0.08, gain: 0.85 * a2 * k, noise: 0.45 })
    thump(this.ac, dest, s2At + split, { freq: 70, duration: 0.07, gain: 0.7 * p2 * k, noise: 0.45 })

    // S3: tidig diastolisk fyllnad, mycket lågfrekvent – hörs främst med klockan
    if (this.hasS3) {
      thump(this.ac, dest, s2At + 0.14, { freq: 34, duration: 0.07, gain: 0.75 * s3 * k, noise: 0.05 })
    }
  }
}

/* ------------------------------------------------------------------ */
/* Lungljud                                                            */
/* ------------------------------------------------------------------ */

export type LungFinding = "normal" | "obstructive"

export class LungSoundEngine {
  private ac: AudioContext
  private piece: ReturnType<typeof createChestPiece>
  readonly analyser: AnalyserNode
  private noise: AudioBufferSourceNode
  private breathGain: GainNode
  private wheezeGain: GainNode
  private wheezeOscs: OscillatorNode[] = []
  private timer: number | null = null
  private startTime = 0
  private contact = 0
  finding: LungFinding
  breath: BreathPattern

  constructor(finding: LungFinding = "normal") {
    this.ac = getAudioContext()
    this.finding = finding
    this.breath = finding === "obstructive" ? OBSTRUCTIVE_BREATH : NORMAL_BREATH
    this.piece = createChestPiece(this.ac)
    this.analyser = this.ac.createAnalyser()
    this.analyser.fftSize = 2048
    this.piece.out.connect(this.analyser).connect(this.ac.destination)
    this.piece.set("membrane")

    // Vesikulärt andningsljud: brus genom bandpass, styrt av andningscykeln
    this.noise = this.ac.createBufferSource()
    this.noise.buffer = getNoise(this.ac)
    this.noise.loop = true
    const bp = this.ac.createBiquadFilter()
    bp.type = "bandpass"
    bp.frequency.value = 320
    bp.Q.value = 0.7
    const lp = this.ac.createBiquadFilter()
    lp.type = "lowpass"
    lp.frequency.value = 700
    this.breathGain = this.ac.createGain()
    this.breathGain.gain.value = 0
    this.noise.connect(bp).connect(lp).connect(this.breathGain).connect(this.piece.input)

    // Ronki: musikaliska, pipande toner under exspirationen
    this.wheezeGain = this.ac.createGain()
    this.wheezeGain.gain.value = 0
    this.wheezeGain.connect(this.piece.input)
    for (const f of [410, 560, 690]) {
      const o = this.ac.createOscillator()
      o.type = "sine"
      o.frequency.value = f
      const g = this.ac.createGain()
      g.gain.value = 0.18
      o.connect(g).connect(this.wheezeGain)
      this.wheezeOscs.push(o)
    }
  }

  setChestPiece(piece: ChestPiece) {
    this.piece.set(piece)
  }

  setContact(contact: number) {
    this.contact = contact
  }

  elapsed() {
    return this.ac.currentTime - this.startTime
  }

  start() {
    if (this.timer !== null) return
    this.startTime = this.ac.currentTime
    this.noise.start()
    this.wheezeOscs.forEach(o => o.start())
    this.timer = window.setInterval(() => this.tick(), 30)
  }

  private tick() {
    const now = this.ac.currentTime
    const { inhaling, progress } = breathPhase(now - this.startTime, this.breath)
    // Inandning hörs tydligt genom hela fasen, utandningen svagare och kortare (normalt)
    const shape = Math.sin(Math.PI * Math.min(1, progress))
    let level = inhaling ? 0.55 * shape : 0.22 * shape * (this.finding === "obstructive" ? 1.2 : 1)
    if (!inhaling && this.finding === "normal" && progress > 0.45) level *= 0.2
    this.breathGain.gain.setTargetAtTime(level * this.contact, now, 0.03)

    const wheeze = this.finding === "obstructive" && !inhaling ? 0.5 * Math.sin(Math.PI * progress) : 0
    this.wheezeGain.gain.setTargetAtTime(wheeze * this.contact, now, 0.04)
    this.wheezeOscs.forEach((o, i) => o.frequency.setTargetAtTime([410, 560, 690][i] * (1 - 0.06 * progress), now, 0.1))
  }

  dispose() {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    try {
      this.noise.stop()
      this.wheezeOscs.forEach(o => o.stop())
    } catch {
      // ej startad
    }
    this.analyser.disconnect()
  }
}

/* ------------------------------------------------------------------ */
/* Korotkoffljud (blodtrycksmätning)                                   */
/* ------------------------------------------------------------------ */

let korotkoffOut: GainNode | null = null

/**
 * Spelar ett Korotkoffljud. phase: 1 = skarpt knackande, 2 = svischande,
 * 3 = krispigt, 4 = dovt/dämpat (strax före de försvinner).
 */
export function playKorotkoff(phase: 1 | 2 | 3 | 4) {
  const ac = getAudioContext()
  if (!korotkoffOut) {
    korotkoffOut = ac.createGain()
    korotkoffOut.gain.value = 1.4
    const lp = ac.createBiquadFilter()
    lp.type = "lowpass"
    lp.frequency.value = 700
    korotkoffOut.connect(lp).connect(ac.destination)
  }
  const at = ac.currentTime + 0.01
  const params = {
    1: { freq: 90, duration: 0.07, gain: 0.8, noise: 0.5 },
    2: { freq: 70, duration: 0.12, gain: 0.55, noise: 1.1 },
    3: { freq: 95, duration: 0.07, gain: 0.85, noise: 0.4 },
    4: { freq: 55, duration: 0.11, gain: 0.35, noise: 0.15 },
  }[phase]
  thump(ac, korotkoffOut, at, params)
}

/** Kort klick när man trycker på pumpbollen */
export function playPumpSqueeze() {
  const ac = getAudioContext()
  thump(ac, ac.destination, ac.currentTime + 0.005, { freq: 160, duration: 0.05, gain: 0.08, noise: 1.5 })
}
