"use client"

import { forwardRef, useCallback, type ReactNode, type PointerEvent as ReactPointerEvent } from "react"
import { cn } from "@/lib/utils"
import { LINES, MIDLINE, STERNUM, VIEW, icsY, ribY, type Point } from "@/lib/osce/anatomy"

// Den virtuella patienten: en övningsdocka sedd framifrån.
// "Röntgen" visar skelett, lungor och hjärta genom huden.

const SKIN = "#e8dccd"
const SKIN_EDGE = "#c9b8a4"

/** Bålens halva bredd på en viss höjd (för revben och silhuett) */
function halfWidth(y: number) {
  if (y < 110) return 150
  if (y < 330) return 146 - (y - 110) * 0.04
  return 137 - (y - 330) * 0.12
}

function ribPath(n: number, side: 1 | -1) {
  const start =
    n <= 7
      ? { x: MIDLINE + side * (STERNUM.halfWidth + 1), y: ribY(n) }
      : { x: MIDLINE + side * (STERNUM.halfWidth + 6 + (n - 7) * 18), y: ribY(7) + (n - 7) * 22 }
  const reach = Math.min(halfWidth(start.y) - 8, 70 + n * 9)
  const endY = start.y + 18 + n * 1.5
  return `M ${start.x} ${start.y} C ${start.x + side * reach * 0.4} ${start.y - 16}, ${MIDLINE + side * reach * 0.9} ${start.y - 10}, ${MIDLINE + side * (halfWidth(endY) - 4)} ${endY}`
}

const BODY_PATH = (() => {
  // Höger halva (patientens höger = vänster i bilden), speglas sedan
  const pts = [
    [MIDLINE - 30, 0],
    [MIDLINE - 34, 70],
    [MIDLINE - 70, 92],
    [MIDLINE - 150, 102],
    [MIDLINE - 182, 135],
    [MIDLINE - 186, 330],
    [MIDLINE - 160, 335],
    [MIDLINE - 150, 170],
    [MIDLINE - 146, 300],
    [MIDLINE - 128, 420],
    [MIDLINE - 135, 540],
  ]
  const right = pts.map(([x, y]) => `${x},${y}`).join(" L ")
  const left = [...pts].reverse().map(([x, y]) => `${2 * MIDLINE - x},${y}`).join(" L ")
  return `M ${right} L ${left} Z`
})()

const TORSO_CLIP = `M ${MIDLINE - 150} 100 L ${MIDLINE - 146} 300 L ${MIDLINE - 128} 420 L ${MIDLINE - 135} 540 L ${MIDLINE + 135} 540 L ${MIDLINE + 128} 420 L ${MIDLINE + 146} 300 L ${MIDLINE + 150} 100 L ${MIDLINE + 70} 92 L ${MIDLINE - 70} 92 Z`

const RIGHT_LUNG = `M ${MIDLINE - 30} 112 C ${MIDLINE - 70} 100, ${MIDLINE - 120} 120, ${MIDLINE - 130} 200 C ${MIDLINE - 138} 270, ${MIDLINE - 135} 330, ${MIDLINE - 128} 360 C ${MIDLINE - 100} 345, ${MIDLINE - 60} 330, ${MIDLINE - 30} 318 C ${MIDLINE - 22} 250, ${MIDLINE - 18} 160, ${MIDLINE - 30} 112 Z`
const LEFT_LUNG = `M ${MIDLINE + 28} 112 C ${MIDLINE + 70} 100, ${MIDLINE + 120} 120, ${MIDLINE + 130} 200 C ${MIDLINE + 138} 270, ${MIDLINE + 135} 330, ${MIDLINE + 128} 365 C ${MIDLINE + 105} 352, ${MIDLINE + 85} 340, ${MIDLINE + 72} 300 C ${MIDLINE + 60} 268, ${MIDLINE + 35} 250, ${MIDLINE + 30} 220 C ${MIDLINE + 24} 180, ${MIDLINE + 22} 140, ${MIDLINE + 28} 112 Z`
const HEART = `M ${MIDLINE - 22} 150 C ${MIDLINE - 36} 175, ${MIDLINE - 38} 230, ${MIDLINE - 26} 268 C ${MIDLINE + 10} 285, ${MIDLINE + 50} 280, ${MIDLINE + LINES.mcl + 2} ${icsY(5) + 8} C ${MIDLINE + 70} 220, ${MIDLINE + 45} 185, ${MIDLINE + 22} 152 C ${MIDLINE + 8} 140, ${MIDLINE - 10} 140, ${MIDLINE - 22} 150 Z`

export interface TorsoProps {
  xray?: boolean
  children?: ReactNode
  className?: string
  /** Visa nivålinjer och etiketter för interkostalrum */
  guides?: boolean
  onPointerDown?: (p: Point, e: ReactPointerEvent<SVGSVGElement>) => void
  onPointerMove?: (p: Point, e: ReactPointerEvent<SVGSVGElement>) => void
  onPointerUp?: (p: Point, e: ReactPointerEvent<SVGSVGElement>) => void
  ariaLabel?: string
}

export function toSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const m = svg.getScreenCTM()
  if (!m) return { x: 0, y: 0 }
  const p = pt.matrixTransform(m.inverse())
  return { x: p.x, y: p.y }
}

export const Torso = forwardRef<SVGSVGElement, TorsoProps>(function Torso(
  { xray = false, children, className, guides = false, onPointerDown, onPointerMove, onPointerUp, ariaLabel },
  ref,
) {
  const wrap = useCallback(
    (fn?: (p: Point, e: ReactPointerEvent<SVGSVGElement>) => void) =>
      fn ? (e: ReactPointerEvent<SVGSVGElement>) => fn(toSvgPoint(e.currentTarget, e.clientX, e.clientY), e) : undefined,
    [],
  )

  const bone = xray ? "rgba(235,240,245,0.9)" : "rgba(120,95,70,0.16)"
  const ribs = Array.from({ length: 10 }, (_, i) => i + 1)

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      className={cn("h-full w-full touch-none select-none", className)}
      onPointerDown={wrap(onPointerDown)}
      onPointerMove={wrap(onPointerMove)}
      onPointerUp={wrap(onPointerUp)}
      role="img"
      aria-label={ariaLabel ?? "Virtuell patient sedd framifrån"}
    >
      <defs>
        <clipPath id="torso-clip">
          <path d={TORSO_CLIP} />
        </clipPath>
        <radialGradient id="skin-shade" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#f3eadf" />
          <stop offset="100%" stopColor={SKIN} />
        </radialGradient>
        <radialGradient id="xray-lung" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#0b1118" />
          <stop offset="100%" stopColor="#1d2a36" />
        </radialGradient>
      </defs>

      {/* Huvud och kropp */}
      <ellipse cx={MIDLINE} cy={-14} rx={56} ry={52} fill={xray ? "#2a3440" : "url(#skin-shade)"} stroke={xray ? "#3a4652" : SKIN_EDGE} />
      <path d={BODY_PATH} fill={xray ? "#33404c" : "url(#skin-shade)"} stroke={xray ? "#4a5866" : SKIN_EDGE} strokeWidth={1.5} />

      {xray && (
        <g clipPath="url(#torso-clip)">
          <rect x={MIDLINE - 10} y={92} width={20} height={448} fill="rgba(220,228,236,0.18)" rx={4} />
          <path d={RIGHT_LUNG} fill="url(#xray-lung)" />
          <path d={LEFT_LUNG} fill="url(#xray-lung)" />
          <path d={HEART} fill="rgba(200,212,224,0.42)" stroke="rgba(230,236,242,0.5)" />
          <path
            d={`M ${MIDLINE - 135} 365 Q ${MIDLINE - 70} 320, ${MIDLINE} 345 Q ${MIDLINE + 70} 322, ${MIDLINE + 135} 370`}
            fill="none"
            stroke="rgba(220,228,236,0.35)"
            strokeWidth={2}
          />
        </g>
      )}

      {/* Revben */}
      <g clipPath="url(#torso-clip)" fill="none" stroke={bone} strokeLinecap="round">
        {ribs.map(n => (
          <g key={n} strokeWidth={xray ? 5 : 2.2}>
            <path d={ribPath(n, -1)} />
            <path d={ribPath(n, 1)} />
          </g>
        ))}
      </g>

      {/* Nyckelben och sternum */}
      <g fill="none" stroke={bone} strokeWidth={xray ? 7 : 3} strokeLinecap="round">
        <path d={`M ${MIDLINE - 14} ${STERNUM.top} C ${MIDLINE - 60} 96, ${MIDLINE - 100} 112, ${MIDLINE - 145} 100`} />
        <path d={`M ${MIDLINE + 14} ${STERNUM.top} C ${MIDLINE + 60} 96, ${MIDLINE + 100} 112, ${MIDLINE + 145} 100`} />
      </g>
      <path
        d={`M ${MIDLINE - 15} ${STERNUM.top} L ${MIDLINE + 15} ${STERNUM.top} L ${MIDLINE + 13} ${STERNUM.bottom} L ${MIDLINE} ${STERNUM.xiphoid} L ${MIDLINE - 13} ${STERNUM.bottom} Z`}
        fill={xray ? "rgba(225,232,240,0.55)" : "rgba(120,95,70,0.07)"}
        stroke={bone}
        strokeWidth={xray ? 2 : 1.2}
      />
      <line x1={MIDLINE - 15} x2={MIDLINE + 15} y1={STERNUM.angle} y2={STERNUM.angle} stroke={bone} strokeWidth={xray ? 2 : 1.2} />

      {/* Bröstvårtor och navel som landmärken */}
      {!xray && (
        <g fill="#c8a48c">
          <circle cx={MIDLINE - LINES.mcl} cy={icsY(4)} r={4.5} />
          <circle cx={MIDLINE + LINES.mcl} cy={icsY(4)} r={4.5} />
          <ellipse cx={MIDLINE} cy={455} rx={3.5} ry={5} fill="#b9967e" />
        </g>
      )}

      {guides && (
        <g fontSize={9} fill={xray ? "#9fb0c0" : "#8a7865"}>
          {[1, 2, 3, 4, 5, 6].map(n => (
            <text key={n} x={MIDLINE - 44} y={icsY(n) + 3} textAnchor="end">
              I{n}
            </text>
          ))}
          <line x1={MIDLINE + LINES.mcl} x2={MIDLINE + LINES.mcl} y1={105} y2={330} stroke="currentColor" strokeDasharray="3 4" opacity={0.5} />
          <text x={MIDLINE + LINES.mcl} y={340} textAnchor="middle">MCL</text>
        </g>
      )}

      {children}

      <g fontSize={11} fill={xray ? "#9fb0c0" : "#8a7865"} fontWeight={600}>
        <text x={14} y={528}>Patientens höger</text>
        <text x={VIEW.width - 14} y={528} textAnchor="end">Patientens vänster</text>
      </g>
    </svg>
  )
})
