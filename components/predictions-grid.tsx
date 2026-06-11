"use client"

interface GridMatch {
  id: string
  homeTeam: string
  awayTeam: string
  stage: string
  group?: string | null
  homeScore?: number | null
  awayScore?: number | null
  status: string
  predictionsClosed: boolean
  submittedUserIds: string[]
  predictions: {
    userId: string
    userName: string
    homeScore: number
    awayScore: number
    winner?: string | null
    points?: number | null
  }[]
}

interface PredictionsGridProps {
  matches: GridMatch[]
  participants: { id: string; name: string }[]
  currentUserId: string
}

export function PredictionsGrid({ matches, participants, currentUserId }: PredictionsGridProps) {
  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 bg-gray-950 z-10 min-w-[120px] text-left py-2 px-3 border-b border-r border-gray-800 text-gray-400">
              Участник
            </th>
            <th className="min-w-[60px] text-center py-2 px-2 border-b border-gray-800 text-gray-400">
              Итого
            </th>
            {matches.map((match) => (
              <th
                key={match.id}
                className="min-w-[72px] text-center py-2 px-2 border-b border-gray-800 border-l border-gray-800/50"
              >
                <div className="text-gray-400 text-xs leading-tight">
                  <div>{match.homeTeam.slice(0, 3).toUpperCase()}</div>
                  <div className="text-gray-600">vs</div>
                  <div>{match.awayTeam.slice(0, 3).toUpperCase()}</div>
                  {match.status === "FINISHED" ? (
                    <div className="text-yellow-400 font-bold mt-1">
                      {match.homeScore}:{match.awayScore}
                    </div>
                  ) : match.predictionsClosed ? (
                    <div className="text-gray-600 mt-1 text-[9px]">🔒</div>
                  ) : null}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {participants.map((participant) => {
            const totalPoints = matches.reduce((sum, match) => {
              const pred = match.predictions.find((p) => p.userId === participant.id)
              return sum + (pred?.points ?? 0)
            }, 0)

            return (
              <tr
                key={participant.id}
                className={`border-b border-gray-800/50 ${
                  participant.id === currentUserId ? "bg-yellow-900/10" : "hover:bg-gray-900/30"
                }`}
              >
                <td className="sticky left-0 bg-gray-950 z-10 py-2 px-3 border-r border-gray-800 font-medium whitespace-nowrap">
                  {participant.name}
                  {participant.id === currentUserId && (
                    <span className="text-yellow-500 ml-1 text-xs">★</span>
                  )}
                </td>
                <td className="py-2 px-2 text-center font-bold text-yellow-400">
                  {totalPoints || "—"}
                </td>
                {matches.map((match) => {
                  const pred = match.predictions.find((p) => p.userId === participant.id)
                  const isOwn = participant.id === currentUserId
                  const showPred = pred && (isOwn || match.predictionsClosed)
                  const hasSubmitted = !!pred || match.submittedUserIds.includes(participant.id)

                  return (
                    <td
                      key={match.id}
                      className="py-2 px-2 text-center border-l border-gray-800/50"
                    >
                      {showPred ? (
                        <div>
                          <div className="font-medium">
                            {pred.homeScore}:{pred.awayScore}
                          </div>
                          {pred.points != null && (
                            <div
                              className={`text-xs font-bold ${
                                pred.points > 0 ? "text-green-400" : "text-gray-600"
                              }`}
                            >
                              {pred.points > 0 ? `+${pred.points}` : pred.points}
                            </div>
                          )}
                        </div>
                      ) : hasSubmitted ? (
                        <span className="text-gray-600 text-[10px]">🔒</span>
                      ) : (
                        <span className="text-gray-800">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
