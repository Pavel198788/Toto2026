interface LeaderboardEntry {
  id: string
  name: string
  total: number
  groupPoints: number
  playoffPoints: number
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
          <tr className="text-[9px] text-gray-600 tracking-widest uppercase border-b border-[#1a1500] text-left">
            <th className="py-3 px-2 w-8">#</th>
            <th className="py-3 px-2">Участник</th>
            <th className="py-3 px-2 text-right font-bold text-gray-300">Итого</th>
            <th className="py-3 px-2 text-right hidden md:table-cell">Группа</th>
            <th className="py-3 px-2 text-right hidden md:table-cell">Плей-офф</th>
            <th className="py-3 px-2 text-right hidden md:table-cell">Бонусы</th>
            <th className="py-3 px-2 text-right hidden md:table-cell">100%</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            const isCurrentUser = entry.id === currentUserId
            return (
              <tr
                key={entry.id}
                className={`border-b border-[#1a1500]/60 ${
                  isCurrentUser ? "bg-[#1a1500] border-l-2 border-l-yellow-400" : "hover:bg-[#111]"
                }`}
              >
                <td className="py-3 px-2 text-gray-400">
                  {MEDALS[index] ?? index + 1}
                </td>
                <td className="py-3 px-2 font-medium">
                  <div>
                    <span>{entry.name}</span>
                    {isCurrentUser && (
                      <span className="ml-2 text-[9px] border border-yellow-900 text-yellow-500 px-1.5 py-0.5 rounded-sm">
                        Вы
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-0.5 text-xs text-gray-500 md:hidden">
                    <span>Гр: {entry.groupPoints}</span>
                    <span>·</span>
                    <span>П/О: {entry.playoffPoints}</span>
                    <span>·</span>
                    <span>Бон: {entry.bonusPoints > 0 ? `+${entry.bonusPoints}` : 0}</span>
                  </div>
                </td>
                <td className={`py-3 px-2 text-right font-black text-base ${isCurrentUser ? "text-yellow-400" : "text-yellow-400"}`}>
                  {entry.total}
                </td>
                <td className="py-3 px-2 text-right text-gray-300 hidden md:table-cell">
                  {entry.groupPoints > 0 ? entry.groupPoints : "—"}
                </td>
                <td className="py-3 px-2 text-right text-gray-300 hidden md:table-cell">
                  {entry.playoffPoints > 0 ? entry.playoffPoints : "—"}
                </td>
                <td className="py-3 px-2 text-right text-gray-300 hidden md:table-cell">
                  {entry.bonusPoints > 0 ? `+${entry.bonusPoints}` : "—"}
                </td>
                <td className="py-3 px-2 text-right text-green-400 hidden md:table-cell">
                  {entry.exactCount > 0 ? entry.exactCount : "—"}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
