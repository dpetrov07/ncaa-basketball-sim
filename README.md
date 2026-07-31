# Courtside

Courtside is a mobile-first fictional college basketball coaching simulator. Choose a program, build a rotation, set a game plan, and follow a deterministic possession-by-possession game through the final box score.

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Play loop

1. Choose one of 20 fictional programs.
2. Review the roster and inspect player ratings, archetypes, personalities, and avatars.
3. Set the starting five and rotation size.
4. Configure pace, offensive identity, shot profile, defensive scheme, pressure, help defense, and rebounding.
5. Review the pregame matchup.
6. Run the seeded game, advance through the play-by-play, and inspect the final box score.

The same seed, rosters, lineups, and strategies produce the same game.

## Project structure

```text
src/
  data/          Fictional teams, coaches, rosters, and defaults
  domain/        Shared TypeScript contracts
  simulation/    Seeded RNG, validation, and basketball engine
  ui/components/ Reusable avatars, player rows, team marks, navigation
  ui/screens/    Program, roster, lineup, plan, pregame, live, and box score views
```

Simulation logic is independent from React and never uses `Math.random()`.

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
