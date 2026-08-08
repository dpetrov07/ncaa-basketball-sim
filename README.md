# Courtside

Courtside is a mobile-first fictional college basketball coaching simulator. Create a coach, accept one of 20 program jobs, and guide that team through a complete deterministic season.

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Play loop

1. Start a career and create your coach identity and portrait.
2. Accept one of 20 fictional program jobs and review the season objective.
3. Review the roster and set the starting five, rotation, and game plan.
4. Prepare for each scheduled matchup while AI programs play their own games.
5. Coach seeded games possession by possession, adjust the active five and strategy at stoppages, and use finite timeouts.
6. Complete the schedule and review the final record, conference finish, leaders, best results, objective, and season grade.

The same seed, rosters, lineups, and strategies produce the same game whether it is simulated automatically, possession by possession, or between stoppages. Running game state is plain serializable data.

## Project structure

```text
src/
  career/        Career lifecycle, program summaries, objectives, season completion
  data/          Fictional teams, coaches, rosters, and defaults
  domain/        Shared TypeScript contracts
  season/        Schedule, records, aggregation, and versioned save repository
  simulation/    Seeded RNG, validation, and basketball engine
  ui/components/ Reusable avatars, player rows, team marks, navigation
  ui/screens/    Program, roster, lineup, plan, pregame, live, and box score views
```

Simulation logic is independent from React and never uses `Math.random()`.

The canonical local save uses `courtside-career-v2`. See [docs/data-and-save-architecture.md](docs/data-and-save-architecture.md) for the static-data, runtime-state, and persistence boundaries.

## Verification

```bash
npm test       # deterministic simulation, lineup, totals, roster, and avatar tests
npm run lint   # ESLint
npm run build  # TypeScript check and production Vite build
```

## Production preview

```bash
npm run build
npm exec vite preview
```
