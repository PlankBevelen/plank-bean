import type { BeadColor } from '../../types'
import { BEAD_PALETTE } from './palette'

type RgbTuple = [number, number, number]

type LabColor = {
  l: number
  a: number
  b: number
}

const REF_X = 95.047
const REF_Y = 100
const REF_Z = 108.883
const POW_25_7 = 25 ** 7
const labCache = new Map<string, LabColor>()

export function hexToRgb(hex: string): [number, number, number] {
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function srgbToLinear(value: number) {
  const normalized = value / 255
  if (normalized <= 0.04045) {
    return normalized / 12.92
  }

  return ((normalized + 0.055) / 1.055) ** 2.4
}

function labPivot(value: number) {
  return value > 0.008856 ? value ** (1 / 3) : ((7.787 * value) + (16 / 116))
}

export function rgbToLab([r, g, b]: RgbTuple): LabColor {
  const linearR = srgbToLinear(r)
  const linearG = srgbToLinear(g)
  const linearB = srgbToLinear(b)

  const x = ((linearR * 0.4124) + (linearG * 0.3576) + (linearB * 0.1805)) * 100
  const y = ((linearR * 0.2126) + (linearG * 0.7152) + (linearB * 0.0722)) * 100
  const z = ((linearR * 0.0193) + (linearG * 0.1192) + (linearB * 0.9505)) * 100

  const fx = labPivot(x / REF_X)
  const fy = labPivot(y / REF_Y)
  const fz = labPivot(z / REF_Z)

  return {
    l: (116 * fy) - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  }
}

export function deltaE(color1: LabColor, color2: LabColor) {
  const toDegrees = (angle: number) => (angle * 180) / Math.PI
  const toRadians = (angle: number) => (angle * Math.PI) / 180
  const normalizeHue = (angle: number) => {
    if (angle < 0) {
      return angle + 360
    }

    if (angle >= 360) {
      return angle - 360
    }

    return angle
  }

  const l1 = color1.l
  const a1 = color1.a
  const b1 = color1.b
  const l2 = color2.l
  const a2 = color2.a
  const b2 = color2.b

  const c1 = Math.hypot(a1, b1)
  const c2 = Math.hypot(a2, b2)
  const averageChroma = (c1 + c2) / 2
  const averageChromaPower = averageChroma ** 7
  const g = 0.5 * (1 - Math.sqrt(averageChromaPower / (averageChromaPower + POW_25_7)))

  const a1Prime = (1 + g) * a1
  const a2Prime = (1 + g) * a2
  const c1Prime = Math.hypot(a1Prime, b1)
  const c2Prime = Math.hypot(a2Prime, b2)
  const h1Prime = c1Prime === 0 ? 0 : normalizeHue(toDegrees(Math.atan2(b1, a1Prime)))
  const h2Prime = c2Prime === 0 ? 0 : normalizeHue(toDegrees(Math.atan2(b2, a2Prime)))

  const deltaLPrime = l2 - l1
  const deltaCPrime = c2Prime - c1Prime

  let deltaHuePrime = 0
  if (c1Prime !== 0 && c2Prime !== 0) {
    deltaHuePrime = h2Prime - h1Prime

    if (deltaHuePrime > 180) {
      deltaHuePrime -= 360
    } else if (deltaHuePrime < -180) {
      deltaHuePrime += 360
    }
  }

  const deltaHPrime = 2 * Math.sqrt(c1Prime * c2Prime) * Math.sin(toRadians(deltaHuePrime / 2))
  const averageLPrime = (l1 + l2) / 2
  const averageCPrime = (c1Prime + c2Prime) / 2

  let averageHPrime = h1Prime + h2Prime
  if (c1Prime !== 0 && c2Prime !== 0) {
    const hueDifference = Math.abs(h1Prime - h2Prime)
    if (hueDifference > 180) {
      averageHPrime = h1Prime + h2Prime < 360
        ? (h1Prime + h2Prime + 360) / 2
        : (h1Prime + h2Prime - 360) / 2
    } else {
      averageHPrime = (h1Prime + h2Prime) / 2
    }
  }

  const t = 1 -
    (0.17 * Math.cos(toRadians(averageHPrime - 30))) +
    (0.24 * Math.cos(toRadians(averageHPrime * 2))) +
    (0.32 * Math.cos(toRadians((3 * averageHPrime) + 6))) -
    (0.20 * Math.cos(toRadians((4 * averageHPrime) - 63)))
  const averageCPrimePower = averageCPrime ** 7
  const deltaTheta = 30 * Math.exp(-(((averageHPrime - 275) / 25) ** 2))
  const rC = 2 * Math.sqrt(averageCPrimePower / (averageCPrimePower + POW_25_7))
  const lDiff = averageLPrime - 50
  const sL = 1 + ((0.015 * (lDiff ** 2)) / Math.sqrt(20 + (lDiff ** 2)))
  const sC = 1 + (0.045 * averageCPrime)
  const sH = 1 + (0.015 * averageCPrime * t)
  const rT = -Math.sin(toRadians(2 * deltaTheta)) * rC

  const lightnessTerm = deltaLPrime / sL
  const chromaTerm = deltaCPrime / sC
  const hueTerm = deltaHPrime / sH

  return Math.sqrt(
    (lightnessTerm ** 2) +
    (chromaTerm ** 2) +
    (hueTerm ** 2) +
    (rT * chromaTerm * hueTerm),
  )
}

export function hexToLab(hex: string): LabColor {
  const cached = labCache.get(hex)
  if (cached) {
    return cached
  }

  const lab = rgbToLab(hexToRgb(hex))
  labCache.set(hex, lab)
  return lab
}

export function colorDistance(
  [r1, g1, b1]: RgbTuple,
  [r2, g2, b2]: RgbTuple,
) {
  return deltaE(rgbToLab([r1, g1, b1]), rgbToLab([r2, g2, b2]))
}

export function closestColor(
  r: number,
  g: number,
  b: number,
  palette: BeadColor[] = BEAD_PALETTE,
): BeadColor {
  let minDistance = Number.POSITIVE_INFINITY
  let match = palette[0]
  const sourceLab = rgbToLab([r, g, b])

  for (const color of palette) {
    const distance = deltaE(sourceLab, hexToLab(color.hex))
    if (distance < minDistance) {
      minDistance = distance
      match = color
    }
  }

  return match
}
