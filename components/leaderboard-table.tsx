import { Badge } from "@/components/ui/badge"

interface LeaderboardEntry {
  id: string
  name: string
  total: number
  matchPoints: number
  groupPoints: number
  bonusPoints: number
  exactCount: number
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  currentUserId?: string
}

const MEDALS = ["🥇", "🥈", "🥉"]

export function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-gray-400 text-left">
            <th className="py-3 px-2 w-8">#</th>
            <th className="py-3 px-2">Участник</th>
            <th className="py-3 px-2 text-right">Итого</th>
            <th className="py-3 px-2 text-right hidden md:table-cell">Матчи</th>
            <th className="py-3 px-2 text-right hidden md:table-cell">Бонусы</th>
            <th className="py-3 px-2 text-right hidden sm:table-cell">100%</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            const isCurrentUser = entry.id === currentUserId
            return (
              <tr
                key={entry.id}
                className={`border-b border-gray-800/50 ${
                  isCurrentUser ? "bg-yellow-900/10" : "hover:bg-gray-900/50"
                }`}
              >
                <td className="py-3 px-2 text-gray-400">
                  {MEDALS[index] ?? index + 1}
                </td>
                <td className="py-3 px-2 font-medium">
                  {entry.name}
                  {isCurrentUser && (
                    <Badge variant="outline" className="ml-2 text-xs border-yellow-700 text-yellow-500">
                      Вы
                    </Badge>
                  )}
                </td>
                <td className="py-3 px-2 text-right font-bold text-yellow-400 text-base">
                  {entry.total}
                </td>
                <td className="py-3 px-2 text-right text-gray-300 hidden md:table-cell">
                  {entry.matchPoints}
                </td>
                <td className="py-3 px-2 text-right text-gray-300 hidden md:table-cell">
                  {entry.bonusPoints > 0 ? `+${entry.bonusPoints}` : "—"}
                </td>
                <td className="py-3 px-2 text-right text-green-400 hidden sm:table-cell">
                  {entry.exactCount}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
