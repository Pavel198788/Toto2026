// lib/bonus-utils.ts
export function computeBonusPoints(
  predictions: { points: number | null }[]
): number | null {
  if (predictions.length === 0) return null
  const hasAny = predictions.some((p) => p.points !== null)
  if (!hasAny) return null
  return predictions.reduce((s, p) => s + (p.points ?? 0), 0)
}
