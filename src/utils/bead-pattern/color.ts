import type { BeadColor } from '../../types'
import { BEAD_PALETTE } from './palette'

export function hexToRgb(hex: string): [number, number, number] {
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

export function colorDistance(
  [r1, g1, b1]: [number, number, number],
  [r2, g2, b2]: [number, number, number],
) {
  return Math.sqrt(
    (r1 - r2) ** 2 +
    (g1 - g2) ** 2 +
    (b1 - b2) ** 2,
  )
}

export function closestColor(r: number, g: number, b: number): BeadColor {
  let minDistance = Number.POSITIVE_INFINITY
  let match = BEAD_PALETTE[0]

  for (const color of BEAD_PALETTE) {
    const distance = colorDistance([r, g, b], hexToRgb(color.hex))
    if (distance < minDistance) {
      minDistance = distance
      match = color
    }
  }

  return match
}
