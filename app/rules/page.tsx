export default function RulesPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Правила тотализатора</h1>

      {/* Групповой этап */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-yellow-400">Групповой этап</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Ситуация</th>
              <th className="text-right py-2">Очки</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            <tr>
              <td className="py-3">Точный счёт (100%)</td>
              <td className="py-3 text-right font-bold text-green-400">11</td>
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
        <p className="text-xs text-gray-400 bg-gray-800 rounded p-3">
          <span className="text-white font-medium">Пример:</span> прогноз 2:1, результат 3:0 → верный исход (победа хозяев),
          погрешность по голам = 2 → 10 − 1 − 1 = <span className="text-green-400 font-bold">8 очков</span>
        </p>
      </section>

      {/* Плей-офф */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-yellow-400">Плей-офф (1/8, 1/4, 1/2, матч за 3-е место)</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Ситуация</th>
              <th className="text-right py-2">Очки</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            <tr>
              <td className="py-3">Точный счёт + верный победитель (100%)</td>
              <td className="py-3 text-right font-bold text-green-400">22</td>
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
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-yellow-400">Финал</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Ситуация</th>
              <th className="text-right py-2">Очки</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            <tr>
              <td className="py-3">Точный счёт + верный победитель (100%)</td>
              <td className="py-3 text-right font-bold text-green-400">32</td>
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
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-yellow-400">Премиальные прогнозы</h2>
        <p className="text-sm text-gray-400">Подаются до старта турнира</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Прогноз</th>
              <th className="text-right py-2">Очки</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            <tr>
              <td className="py-3">Каждый правильный полуфиналист</td>
              <td className="py-3 text-right font-bold text-green-400">+8</td>
            </tr>
            <tr>
              <td className="py-3">Каждый правильный финалист</td>
              <td className="py-3 text-right font-bold text-green-400">+15</td>
            </tr>
            <tr>
              <td className="py-3">Правильный чемпион</td>
              <td className="py-3 text-right font-bold text-green-400">+30</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Победители */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-3">
        <h2 className="text-lg font-semibold text-yellow-400">Определение победителей</h2>
        <p className="text-sm text-gray-300">
          Призовой фонд делится между топ-3 в соотношении <span className="text-white font-semibold">5 : 3 : 2</span>.
        </p>
        <p className="text-sm text-gray-400">
          При равенстве очков: больше 100%-ных прогнозов → больше очков без учёта премиальных → делят поровну.
        </p>
      </section>
    </div>
  )
}
