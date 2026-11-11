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
function createChestPiece(ac: AudioContext, membraneLp = 900) {
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
      lp.frequency.setTargetAtTime(membraneLp, now, 0.05)
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

/**
 * Andningsljudets karaktär beror på var stetoskopet ligger:
 * trakealt (halsen) – högt, skarpt, in- och utandning lika långa med paus emellan;
 * bronkiellt (manubrium, övre bröstryggen) – högt, högfrekvent, utandningen längre och starkare;
 * bronkovesikulärt (I1–I2 parasternalt, mellan skulderbladen) – mellanting, in ≈ ut;
 * vesikulärt (lungfälten) – mjukt, lågfrekvent prasslande, inandningen hörs hela vägen och
 * utandningen bara svagt i början; ingen lunga under (lever, buk) – nästan tyst.
 */
export type BreathSoundType = "tracheal" | "bronchial" | "bronchovesicular" | "vesicular" | "none"

interface BreathSoundProfile {
  hp: number
  lp: number
  insp: number
  exp: number
  /** Hur stor del av utandningen som hörs (vesikulärt: bara början) */
  expFade: number
  /** Tyst paus mellan in- och utandning (andel av utandningen) */
  pause: number
  /** Hur tydligt ronkierna hörs här vid obstruktivitet */
  wheeze: number
}

const BREATH_SOUNDS: Record<BreathSoundType, BreathSoundProfile> = {
  tracheal: { hp: 230, lp: 2100, insp: 0.95, exp: 0.95, expFade: 0.8, pause: 0.12, wheeze: 1 },
  bronchial: { hp: 200, lp: 1500, insp: 0.5, exp: 0.75, expFade: 0.85, pause: 0.12, wheeze: 1 },
  bronchovesicular: { hp: 140, lp: 850, insp: 0.5, exp: 0.42, expFade: 0.7, pause: 0, wheeze: 0.9 },
  vesicular: { hp: 100, lp: 430, insp: 0.55, exp: 0.16, expFade: 0.33, pause: 0, wheeze: 0.7 },
  none: { hp: 90, lp: 240, insp: 0.05, exp: 0.02, expFade: 0.3, pause: 0, wheeze: 0.12 },
}

export interface BreathListenPoint {
  type: BreathSoundType
  /** 0–1: dämpning av muskler/skulderblad eller avstånd till lungan */
  gain: number
  /** 0–1: hur tydligt hjärtat hörs genom bröstkorgen här */
  heart: number
}

export class LungSoundEngine {
  private ac: AudioContext
  private piece: ReturnType<typeof createChestPiece>
  readonly analyser: AnalyserNode
  private noise: AudioBufferSourceNode
  private hp: BiquadFilterNode
  private lp: BiquadFilterNode
  private lp2: BiquadFilterNode
  private breathGain: GainNode
  private wheezeGain: GainNode
  private wheezeOscs: OscillatorNode[] = []
  private extraOscs: OscillatorNode[] = []
  private heartOut: GainNode
  private timer: number | null = null
  private startTime = 0
  private contact = 0
  private point: BreathListenPoint = { type: "vesicular", gain: 1, heart: 0.1 }
  private cycle = -1
  private depth = 1
  private nextBeat = 0
  finding: LungFinding
  breath: BreathPattern

  constructor(finding: LungFinding = "normal") {
    this.ac = getAudioContext()
    this.finding = finding
    this.breath = finding === "obstructive" ? OBSTRUCTIVE_BREATH : NORMAL_BREATH
    // Membranet släpper igenom högre frekvenser än för hjärtljud, annars försvinner det bronkiella ljudet
    this.piece = createChestPiece(this.ac, 1700)
    this.analyser = this.ac.createAnalyser()
    this.analyser.fftSize = 2048
    this.piece.out.connect(this.analyser).connect(this.ac.destination)
    this.piece.set("membrane")

    // Andningsljud: brus genom filter som följer läget på bröstkorgen
    this.noise = this.ac.createBufferSource()
    this.noise.buffer = getNoise(this.ac)
    this.noise.loop = true
    this.hp = this.ac.createBiquadFilter()
    this.hp.type = "highpass"
    this.lp = this.ac.createBiquadFilter()
    this.lp.type = "lowpass"
    this.lp2 = this.ac.createBiquadFilter()
    this.lp2.type = "lowpass"
    this.breathGain = this.ac.createGain()
    this.breathGain.gain.value = 0
    this.noise.connect(this.hp).connect(this.lp).connect(this.lp2).connect(this.breathGain).connect(this.piece.input)
    this.applyFilters(true)

    // Ronki: pipande, musikaliska toner (trånga luftvägar) och ett lågt snarkande inslag
    this.wheezeGain = this.ac.createGain()
    this.wheezeGain.gain.value = 0
    this.wheezeGain.connect(this.piece.input)
    const vibrato = this.ac.createOscillator()
    vibrato.frequency.value = 5.5
    const vibratoDepth = this.ac.createGain()
    vibratoDepth.gain.value = 6
    vibrato.connect(vibratoDepth)
    const tones: [number, number][] = [
      [420, 0.16],
      [575, 0.12],
      [710, 0.08],
    ]
    for (const [f, g] of tones) {
      const o = this.ac.createOscillator()
      o.type = "sine"
      o.frequency.value = f
      vibratoDepth.connect(o.frequency)
      const gain = this.ac.createGain()
      gain.gain.value = g
      o.connect(gain).connect(this.wheezeGain)
      this.wheezeOscs.push(o)
    }
    const rhonchus = this.ac.createOscillator()
    rhonchus.type = "sawtooth"
    rhonchus.frequency.value = 150
    const rhLp = this.ac.createBiquadFilter()
    rhLp.type = "lowpass"
    rhLp.frequency.value = 380
    const rhGain = this.ac.createGain()
    rhGain.gain.value = 0.05
    rhonchus.connect(rhLp).connect(rhGain).connect(this.wheezeGain)
    this.extraOscs.push(vibrato, rhonchus)

    // Hjärtat hörs svagt genom bröstkorgen, tydligast till vänster om sternum
    this.heartOut = this.ac.createGain()
    this.heartOut.gain.value = 0
    this.heartOut.connect(this.piece.input)
  }

  private applyFilters(immediate = false) {
    const prof = BREATH_SOUNDS[this.point.type]
    const now = this.ac.currentTime
    const tc = immediate ? 0.001 : 0.08
    this.hp.frequency.setTargetAtTime(prof.hp, now, tc)
    this.lp.frequency.setTargetAtTime(prof.lp, now, tc)
    this.lp2.frequency.setTargetAtTime(prof.lp * 1.4, now, tc)
  }

  setChestPiece(piece: ChestPiece) {
    this.piece.set(piece)
  }

  setContact(contact: number) {
    this.contact = contact
  }

  /** Var stetoskopet ligger: avgör vilket andningsljud som hörs */
  setPoint(point: BreathListenPoint) {
    const changed = point.type !== this.point.type
    this.point = point
    if (changed) this.applyFilters()
  }

  elapsed() {
    return this.ac.currentTime - this.startTime
  }

  start() {
    if (this.timer !== null) return
    this.startTime = this.ac.currentTime
    this.nextBeat = this.startTime + 0.3
    this.noise.start()
    this.wheezeOscs.forEach(o => o.start())
    this.extraOscs.forEach(o => o.start())
    this.timer = window.setInterval(() => this.tick(), 30)
  }

  private envelope(inhaling: boolean, progress: number, prof: BreathSoundProfile) {
    if (inhaling) {
      // Inandningen hörs genom hela fasen och tilltar något mot slutet
      return prof.insp * Math.pow(Math.sin(Math.PI * Math.min(1, progress)), 0.7) * (0.8 + 0.2 * progress)
    }
    if (progress < prof.pause) return 0
    const q = (progress - prof.pause) / (1 - prof.pause)
    const obstructive = this.finding === "obstructive"
    // Vid obstruktivitet hörs den förlängda utandningen hela vägen
    const fade = obstructive ? 1 : prof.expFade
    if (q > fade) return 0
    const level = obstructive ? Math.max(prof.exp * 1.3, prof.insp * 0.6) : prof.exp
    if (fade < 0.5) return level * Math.min(1, q * 12) * Math.pow(1 - q / fade, 1.4)
    return level * Math.pow(Math.sin(Math.PI * Math.min(1, q / fade)), 0.8)
  }

  private tick() {
    const now = this.ac.currentTime
    const t = now - this.startTime
    const { inhaling, progress, cycle } = breathPhase(t, this.breath)
    // Varje andetag är lite olika djupt
    const n = Math.floor(t / cycle)
    if (n !== this.cycle) {
      this.cycle = n
      this.depth = 0.85 + Math.random() * 0.25
    }
    const prof = BREATH_SOUNDS[this.point.type]
    const level = this.envelope(inhaling, progress, prof) * this.depth * this.point.gain
    this.breathGain.gain.setTargetAtTime(level * this.contact, now, 0.035)

    const wheeze = this.finding === "obstructive" && !inhaling ? Math.sin(Math.PI * Math.min(1, progress * 1.1)) * prof.wheeze : 0
    this.wheezeGain.gain.setTargetAtTime(wheeze * this.contact, now, 0.05)
    this.wheezeOscs.forEach((o, i) => o.frequency.setTargetAtTime([420, 575, 710][i] * (1 - 0.07 * progress), now, 0.1))

    // Svaga hjärtslag (ca 72/min) i bakgrunden
    this.heartOut.gain.setTargetAtTime(this.point.heart * this.contact, now, 0.05)
    while (this.nextBeat < now + 0.15) {
      thump(this.ac, this.heartOut, this.nextBeat, { freq: 52, duration: 0.11, gain: 0.5, noise: 0.15 })
      thump(this.ac, this.heartOut, this.nextBeat + 0.31, { freq: 68, duration: 0.08, gain: 0.4, noise: 0.15 })
      this.nextBeat += 60 / 72
    }
  }

  dispose() {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    try {
      this.noise.stop()
      this.wheezeOscs.forEach(o => o.stop())
      this.extraOscs.forEach(o => o.stop())
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
