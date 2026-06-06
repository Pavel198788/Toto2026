export default function RulesPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Правила тотализатора</h1>

      {/* Приём ставок */}
      <section className="bg-[#111] border border-[#1a1500] rounded-sm px-5 py-4 flex items-center gap-3">
        <span className="text-2xl">⏱️</span>
        <p className="text-sm text-gray-400">
          Приём прогнозов на матч <span className="text-white font-semibold">закрывается за 3 часа до начала</span>. После этого прогноз поставить нельзя.
        </p>
      </section>

      {/* Групповой этап */}
      <section className="bg-[#111] border border-[#1a1500] rounded-sm p-6 space-y-4" style={{ borderTop: "2px solid #facc15" }}>
        <h2 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Групповой этап</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-600 text-[9px] tracking-widest border-b border-[#1a1500]">
              <th className="text-left py-2">Ситуация</th>
              <th className="text-right py-2">Очки</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1500]">
            <tr>
              <td className="py-3">Точный счёт (100%)</td>
              <td className="py-3 text-right font-bold text-green-400">12</td>
            </tr>
            <tr>
              <td className="py-3">
                Верный исход
                <p className="text-gray-400 text-xs mt-1">
                  10 − N, где N = количество неверно угаданных голов
                </p>
              </td>
              <td className="py-3 text-right font-bold text-green-400">до 10</td>
            </tr>
            <tr>
              <td className="py-3">Неверный исход</td>
              <td className="py-3 text-right text-gray-500">0</td>
            </tr>
            <tr>
              <td className="py-3">Нет прогноза</td>
              <td className="py-3 text-right text-gray-500">0</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-gray-500 bg-[#0d0d0d] border border-[#1a1500] rounded-sm p-3">
          <span className="text-white font-medium">Примеры:</span> прогноз 2:1, результат 2:1 → точный счёт → <span className="text-green-400 font-bold">12 очков</span>.
          Прогноз 2:1, результат 3:0 → верный исход, погрешность = 2 → 10 − 1 − 1 = <span className="text-green-400 font-bold">8 очков</span>
        </p>
      </section>

      {/* Плей-офф */}
      <section className="bg-[#111] border border-[#1a1500] rounded-sm p-6 space-y-4" style={{ borderTop: "2px solid #facc15" }}>
        <h2 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Плей-офф (1/8, 1/4, 1/2, матч за 3-е место)</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-600 text-[9px] tracking-widest border-b border-[#1a1500]">
              <th className="text-left py-2">Ситуация</th>
              <th className="text-right py-2">Очки</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1500]">
            <tr>
              <td className="py-3">Точный счёт + верный победитель (100%)</td>
              <td className="py-3 text-right font-bold text-green-400">25</td>
            </tr>
            <tr>
              <td className="py-3">Верный исход основного/доп. времени</td>
              <td className="py-3 text-right font-bold text-green-400">до 10</td>
            </tr>
            <tr>
              <td className="py-3">Верный победитель (в т.ч. по пенальти)</td>
              <td className="py-3 text-right font-bold text-green-400">+10</td>
            </tr>
            <tr>
              <td className="py-3">Неверный исход и победитель</td>
              <td className="py-3 text-right text-gray-500">0</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Финал */}
      <section className="bg-[#111] border border-[#1a1500] rounded-sm p-6 space-y-4" style={{ borderTop: "2px solid #facc15" }}>
        <h2 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Финал</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-600 text-[9px] tracking-widest border-b border-[#1a1500]">
              <th className="text-left py-2">Ситуация</th>
              <th className="text-right py-2">Очки</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1500]">
            <tr>
              <td className="py-3">Точный счёт + верный победитель (100%)</td>
              <td className="py-3 text-right font-bold text-green-400">35</td>
            </tr>
            <tr>
              <td className="py-3">Верный исход основного/доп. времени</td>
              <td className="py-3 text-right font-bold text-green-400">до 15</td>
            </tr>
            <tr>
              <td className="py-3">Верный победитель</td>
              <td className="py-3 text-right font-bold text-green-400">+15</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Премиальные */}
      <section className="bg-[#111] border border-[#1a1500] rounded-sm p-6 space-y-4" style={{ borderTop: "2px solid #facc15" }}>
        <h2 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Премиальные прогнозы</h2>
        <p className="text-sm text-gray-400">Подаются до старта турнира</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-600 text-[9px] tracking-widest border-b border-[#1a1500]">
              <th className="text-left py-2">Прогноз</th>
              <th className="text-right py-2">Очки</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1500]">
            <tr>
              <td className="py-3">Каждый правильный полуфиналист</td>
              <td className="py-3 text-right font-bold text-green-400">+10</td>
            </tr>
            <tr>
              <td className="py-3">Каждый правильный финалист</td>
              <td className="py-3 text-right font-bold text-green-400">+20</td>
            </tr>
            <tr>
              <td className="py-3">Правильный чемпион</td>
              <td className="py-3 text-right font-bold text-green-400">+40</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Победители */}
      <section className="bg-[#111] border border-[#1a1500] rounded-sm p-6 space-y-4" style={{ borderTop: "2px solid #facc15" }}>
        <h2 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Призовой фонд</h2>
        <div className="space-y-3">
          {[
            { place: "🥇 1-е место", pct: "55%", color: "text-yellow-400" },
            { place: "🥈 2-е место", pct: "25%", color: "text-gray-300" },
            { place: "🥉 3-е место", pct: "10%", color: "text-orange-400" },
            { place: "🎯 Лучший в плей-офф", pct: "10%", color: "text-green-400" },
          ].map(({ place, pct, color }) => (
            <div key={place} className="flex items-center justify-between">
              <span className="text-sm text-gray-300">{place}</span>
              <span className={`text-lg font-bold ${color}`}>{pct}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 bg-[#0d0d0d] border border-[#1a1500] rounded-sm p-3">
          <span className="text-gray-300 font-medium">Лучший в плей-офф</span> — участник, угадавший наибольшее количество матчей на стадии плей-офф (1/8, 1/4, 1/2, финал). При равенстве — больше точных счётов.
        </p>
        <p className="text-sm text-gray-400">
          При равенстве очков в общем зачёте: больше 100%-ных прогнозов → больше очков без учёта премиальных → делят поровну.
        </p>
      </section>
    </div>
  )
}
