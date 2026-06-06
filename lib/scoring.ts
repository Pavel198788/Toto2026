export type Stage = "GROUP" | "R16" | "QUARTERFINAL" | "SEMIFINAL" | "THIRD_PLACE" | "FINAL"

export interface ScoringInput {
  stage: Stage
  predictedHome: number
  predictedAway: number
  actualHome: number
  actualAway: number
  predictedWinner?: string | null
  actualWinner?: string | null
}

type Outcome = "HOME" | "AWAY" | "DRAW"

function getOutcome(home: number, away: number): Outcome {
  if (home > away) return "HOME"
  if (away > home) return "AWAY"
  return "DRAW"
}

function goalError(pH: number, pA: number, aH: number, aA: number): number {
  return Math.abs(pH - aH) + Math.abs(pA - aA)
}

export function calculatePoints(input: ScoringInput): number {
  const { stage, predictedHome, predictedAway, actualHome, actualAway, predictedWinner, actualWinner } = input

  const isExactScore = predictedHome === actualHome && predictedAway === actualAway
  const isCorrectOutcome = getOutcome(predictedHome, predictedAway) === getOutcome(actualHome, actualAway)
  const isCorrectWinner = predictedWinner != null && predictedWinner === actualWinner

  if (stage === "GROUP") {
    if (!isCorrectOutcome) return 0
    if (isExactScore) return 11
    return Math.max(0, 10 - goalError(predictedHome, predictedAway, actualHome, actualAway))
  }

  if (stage === "FINAL") {
    if (isExactScore && isCorrectWinner) return 38
    let pts = 0
    if (isCorrectOutcome) pts += Math.max(0, 15 - goalError(predictedHome, predictedAway, actualHome, actualAway))
    if (isCorrectWinner) pts += 15
    return pts
  }

  // R16, QUARTERFINAL, SEMIFINAL, THIRD_PLACE
  if (isExactScore && isCorrectWinner) return 25
  let pts = 0
  if (isCorrectOutcome) pts += Math.max(0, 10 - goalError(predictedHome, predictedAway, actualHome, actualAway))
  if (isCorrectWinner) pts += 10
  return pts
}
