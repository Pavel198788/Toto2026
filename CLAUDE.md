@AGENTS.md

# Toto 2026

Футбольный тотализатор ЧМ-2026 для закрытой группы из 14 участников. Сайт на русском, мобильный first. Участники ставят прогнозы на матчи, очки считаются автоматически.

**Стек:** Next.js 16 · Prisma 7 + PostgreSQL (Neon) · NextAuth v5 (Credentials) · Tailwind · Vitest · Vercel

**Деплой:** `toto-2026.vercel.app` · DB: Neon `ep-red-scene-aqh8s2tq-pooler.c-8.us-east-1.aws.neon.tech`

## Commands

```bash
npm run dev          # dev-сервер :3000
npm test             # vitest run (все тесты)
npm run build        # prisma generate + next build (проверка перед PR)
npx vercel --prod    # деплой в production
env -u HTTPS_PROXY -u HTTP_PROXY git push origin main  # git push (proxy обход)
```

## Architecture

```
app/
  matches/          # список матчей + детальная страница [id]
  leaderboard/      # рейтинг участников
  analytics/        # аналитика (Гонка, Близнецы, Снайпер, Бомбардир, Горячая рука, Самый смелый, Матч тура)
  profile/          # личный профиль участника
  grid/             # турнирная сетка плей-офф
  standings/        # групповой этап — таблицы
  bonus/            # бонусные вопросы
  rules/            # правила
  admin/            # панель синка матчей (только isAdmin)
  api/
    admin/trigger-sync   # POST — ручной синк (требует NextAuth session isAdmin)
    cron/sync-scores     # GET — автосинк (требует CRON_SECRET Bearer header)
    auth/                # NextAuth endpoints
    predictions/         # CRUD прогнозов
    leaderboard/         # агрегированный рейтинг

lib/
  auth.ts / auth.config.ts   # NextAuth v5 Credentials provider
  db.ts                      # Prisma client singleton
  scoring.ts                 # calculatePoints() — единственный источник правды по очкам
  sync-matches.ts            # runSync("all" | "today") — синхронизация с sstats.net
  analytics-stats.ts         # calcSniper, calcBombardier, calcTwins и др.
  profile-stats.ts           # статистика профиля участника

prisma/schema.prisma         # User, Match, Prediction, BonusPrediction, Stage enum
```

## Key Patterns

**Auth:** NextAuth v5 Credentials. Сессия через `auth()` в Server Components / API routes. Admin-эндпоинты проверяют `session.user.isAdmin`.

**Scoring:** `calculatePoints(input: ScoringInput)` в `lib/scoring.ts`. Не дублировать логику очков нигде — только эта функция. Очки зависят от stage (GROUP / ROUND_OF_32 / R16 и т.д.).

**Prisma:** использовать `prisma db push` вместо `prisma migrate` — БД имеет drift. Никогда не запускать `prisma migrate reset`.

**Cron auth:** `/api/cron/sync-scores` проверяет `Authorization: Bearer <CRON_SECRET>`. Переменная только в Vercel production env (зашифрована, не вытягивается локально).

**Синк матчей:** источник — sstats.net API (без ключа). `runSync("all")` — все матчи, `runSync("today")` — только сегодня.

**Git push:** всегда `env -u HTTPS_PROXY -u HTTP_PROXY git push origin main` — proxy в settings.json ломает прямой push.

**Admin:** `admin@toto2026.ru` / `admin123`. Trigger-sync доступен через POST `/api/admin/trigger-sync` с сессионной cookie.

## Workflow Rules

1. **Plan before code.** Для любой новой фичи или UI-изменения — сначала уточни задачу и предложи подход. Не начинай писать код до подтверждения.

2. **Verify before done.** Перед финальным сообщением "готово": запусти `npm run build` (если менял код), опиши что увидел. UI-изменение = готово только после `npm run build` без ошибок.

3. **Scope discipline.** Правь только файлы из scope задачи. Если видишь другой баг — сообщи, не правь молча.

4. **Invoke brainstorming skill** перед реализацией новой фичи.

5. **Invoke verification-before-completion skill** перед тем как написать "задеплоено" / "готово".

## Off-Limits (без явного запроса не трогать)

- `prisma/schema.prisma` — только при явном "обнови схему"
- `lib/scoring.ts` — система очков согласована с участниками, изменения только по ТЗ
- `vercel.json` — cron расписание менять только при явном запросе
- `lib/auth.ts` и `lib/auth.config.ts` — auth flow стабилен
- Навигационный порядок вкладок — только при явном "поменяй вкладки"
- `__tests__/` — не добавлять тесты без запроса (5 существующих упавших тестов — известная проблема, не трогать)

## Tests

```bash
npm test                          # все тесты
npm test -- scoring               # один файл
npm test -- --reporter=verbose    # подробный вывод
```

Тесты в `__tests__/`: scoring, bonus-utils, analytics-stats, profile-stats. Известно: в scoring.test.ts и profile-stats.test.ts 5 упавших теста (pre-existing, не регрессия этой сессии).
