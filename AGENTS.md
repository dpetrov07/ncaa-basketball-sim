# Courtside Development Guide

Courtside is a mobile-first fictional college basketball coaching and dynasty game. The user manages a program, builds lineups, sets strategy, simulates games through structured basketball events, and eventually guides the program through seasons, recruiting, development, and roster movement.

This is a sports-management simulation, not a 2D or 3D basketball game. Do not build animated players on a court. Games are represented by deterministic events, statistics, probabilities, readable play-by-play, and coaching decisions.

## Current product state

The first playable vertical slice is complete and working.

### Simulation foundation

Implemented in `src/simulation/`:

- Seeded random-number generation with no `Math.random()` in simulation code.
- Possession-by-possession games with two 20-minute halves and overtime.
- Layups, dunks, mid-range shots, post shots, three-pointers, misses, blocks, rebounds, assists, turnovers, steals, fouls, free throws, offensive fouls, and second chances.
- Running clock, possessions, fatigue, fouls, player minutes, substitutions, confidence, plus-minus, player statistics, team statistics, and structured play-by-play events.
- Lineup validation and automatic fatigue/foul-trouble substitutions.
- Strategy effects for pace, offensive identity, shot emphasis, defensive scheme, pressure, help defense, rebounding aggression, and rotation size.
- Deterministic overtime tie resolution so every game terminates.

Simulation logic must remain independent of React and browser APIs. Structured events are the source of truth; text commentary is a presentation layer.

### Data and domain models

Implemented in `src/domain/` and `src/data/`:

- Explicit TypeScript contracts for players, ratings, mutable game state, teams, coaches, lineups, strategies, events, box scores, and game results.
- Twenty fictional teams with thirteen players each.
- Player overall ratings derived from individual ratings, position, and archetype.
- Position, class year, height, weight, archetype, personality, potential, hidden traits, stamina, and basketball skill ratings.
- Fictional coaches with coaching attributes and styles.
- Team names, nicknames, abbreviations, colors, and lettermark logos.

Permanent player data must remain separate from mutable in-game state. Do not permanently change player ratings during one game.

### Frontend experience

Implemented in `src/ui/`:

- Program Home.
- Roster and player profile view.
- Lineup and rotation management.
- Game Plan configuration.
- Pregame matchup screen.
- Live simulation screen with play controls, score, clock, recent action, lineups, fatigue estimates, fouls, and key statistics.
- Final box score.
- Compact mobile bottom navigation and deeper-screen back actions.
- Responsive mobile and desktop layouts.
- Deterministic layered SVG portraits derived from player IDs. The same player must always receive the same portrait.
- Restrained sports-editorial visual system: neutral surfaces, thin dividers, compact typography, and team colors used as accents.
- Season hub with team schedule, next-game actions, conference standings, record summary, and season scoring leaders.

Visible controls must either affect the underlying simulation or navigate to the real screen where that decision is made. Avoid fake controls and placeholder panels.

### Season foundation

Implemented in `src/season/`:

- Deterministic conference and non-conference schedule generation for all teams.
- Home/away scheduled games with reproducible seeds and conflict-free calendar dates.
- Completed/upcoming game state, team records, conference records, point differential, streaks, standings, and season leaders.
- AI-versus-AI simulation for advancing one day or advancing to the user's next scheduled game.
- Season player totals derived directly from completed box scores.
- Game history references and completed results stored on scheduled games.
- Versioned local-storage persistence with safe loading, autosave after meaningful actions, and new-save reset behavior.
- User lineup and strategy preferences included in the saved season state.

This is the first season/dynasty milestone. The live screen still replays a completed game result; it is not yet a resumable possession state with mid-game decisions.

### Verification already in place

Tests cover:

- Same seed and inputs producing the same game.
- Invalid lineups being rejected.
- Game termination and overtime handling.
- Nonnegative statistics and player/team total reconciliation.
- Twenty teams with valid roster depth.
- Stable and varied player avatar configuration.

Run:

```bash
npm test
npm run lint
npm run build
```

## Design and engineering rules

### Determinism

- All simulation randomness must come from an injected seeded RNG.
- A save state, seed, teams, lineups, strategies, and schedule must reproduce the same result.
- Do not use `Math.random()` inside the engine, season systems, recruiting, development, or AI decisions.
- Centralize balancing constants in configuration modules instead of scattering unexplained probability values.

### Basketball integrity

- Always validate that exactly five eligible players are active for each team.
- Fouled-out or unavailable players cannot return to a lineup.
- Statistics cannot become negative.
- Team totals must reconcile with player totals.
- Strategy, player ratings, fatigue, lineups, chemistry, coaching, and matchups should influence outcomes through explainable tradeoffs.
- Faster pace should generally create more possessions, transition opportunities, fatigue, and turnover risk.
- Zone, pressing, aggressive help, switching, and conservative defense must create different strengths and weaknesses rather than simply improving every outcome.

### Product experience

- Mobile usability is the priority; desktop layouts are a secondary enhancement.
- Prefer compact rows, editorial sections, and thin dividers over dense tables and card grids.
- Use team colors as accents rather than large page backgrounds.
- Keep important actions near the top or in a sticky mobile control area.
- Do not add a control until its effect is connected to real state or the simulation.
- Keep simulation logic separate from React presentation code.
- Use reusable components, but avoid unnecessary abstraction and large frontend rewrites.

## Future roadmap

The following systems are intentionally not complete yet. They are the next major phases and must be added incrementally without regressing the current playable flow.

### Phase 4 — Season structure, schedules, and standings (foundation complete)

- The reproducible schedule, conferences, home/away games, completed/upcoming status, records, standings, schedule navigation, AI simulation, and persistence boundary are implemented.
- Future work: basic national rankings, richer end-of-season results, conference tournaments, postseason brackets, and better schedule balance/strength-of-schedule logic.

### Phase 5 — Truly interactive live games

The current live screen controls playback of a completed deterministic result. Future work must make decision windows affect future possessions through the real engine, not only change displayed text.

- Expose a resumable game state and one-possession/next-stoppage simulation APIs.
- Pause at legal decision windows and support substitutions, timeouts, pace changes, offensive style, shot emphasis, defensive scheme, pressing, rebounding aggression, foul-trouble protection, primary scoring options, lineup packages, intentional fouls, hold-for-final-shot, halftime, and late-game decisions.
- Support advance one possession, next stoppage, next timeout, halftime, and end-of-game controls.
- Show active five, bench, position warnings, minutes, fatigue, fouls, timeout state, and possession clearly on mobile.
- Make all in-game strategy and substitution controls affect future simulation state.

### Phase 6 — Season statistics and game history (aggregation foundation complete)

- Player and team record aggregation, scoring leaders, game history references, scores, box scores, opponents, home/away results, and streaks are now sourced from completed results.
- Future work: starts, minutes-per-game, shooting percentage views, complete player/team game logs, conference/national leaders across categories, season highs, ranked wins, and largest wins/losses.
- Derive all future totals from completed game results; never generate separate fake season totals.

### Phase 7 — Player development and progression

- Add deterministic offseason and in-season development.
- Account for potential, class year, age, playing time, performance, coach development ability, work ethic, coachability, personality, practice focus, injuries when implemented, and current skill level.
- Add development focus options: shooting, finishing, playmaking, defense, rebounding, athleticism, conditioning, and balanced.
- Support gradual improvement, plateaus, inconsistency, and decline without making every player elite.
- Keep development reproducible from the same save state and seed.

### Phase 8 — Recruiting

- Add fictional high-school and junior-college prospects with positions, archetypes, estimated ratings, potential, skill estimates, scouting confidence, personality indicators, preferences, and competing schools.
- Add a recruiting board with search/filter, scouting, targets, resource spending, scholarship offers, removals, competing schools, commitments, and signed classes.
- Keep hidden ratings hidden until sufficient scouting.
- Add meaningful limits and tradeoffs so the user cannot recruit every prospect.
- Use coach recruiting ability, program prestige, success, system fit, location, academics, position need, and staff relationships.

### Phase 9 — Transfers and roster movement

- Add an offseason transfer portal and available-player recruiting.
- Model transfer decisions using playing time, role, success, coach relationship, competition, personality, distance when modeled, prestige, usage, and broken promises if added later.
- Handle graduates, early departures, eligibility, scholarship limits, roster limits, incoming recruits, and walk-ons.
- Model transfer chemistry, role expectations, and development timelines.

### Phase 10 — Persistent coaches and AI programs

- Expand coach profiles with age, experience, career record, archetype, preferences, recruiting, development, scouting, adaptability, risk tolerance, personality, and career history.
- Have AI teams set lineups, rotations, game plans, substitutions, adjustments, recruiting boards, transfer priorities, development plans, scholarships, and roster needs.
- Use understandable rule-based behavior first. Do not add neural networks or opaque learning systems.
- Make AI teams follow the same basketball, roster, recruiting, scholarship, and eligibility rules as the user.

### Phase 11 — Opponent scouting and pregame reports

- Use actual opponent ratings, strategies, coach behavior, and season results to show record, ranking, recent results, expected starters, key bench players, strengths, weaknesses, styles, pace, shot profile, rebounding, turnovers, fouls, injuries, and tactical trends.
- Generate useful suggested concerns such as protecting the paint, defending the three, slowing the pace, attacking a weak interior defender, pressuring an inexperienced point guard, or limiting transition chances.
- Do not expose hidden AI policies or exact probability formulas.

### Phase 12 — Dynasty persistence and program records (local save foundation complete)

- Versioned local persistence now stores the current season, schedule, results, standings, rosters, player ratings, season totals, user lineup, strategy, and deterministic seeds.
- Future work: multiple save slots, corrupted-save recovery UI, backend/cloud replacement, roster movement, development, recruiting, transfers, coach careers, rivalries, morale, injuries, multi-season progression, and complete dynasty saves.

## Recommended implementation order

1. Add the season state model and deterministic schedule generator.
2. Add game completion hooks that update records and season aggregates.
3. Add standings, schedule navigation, and AI-versus-AI day advancement.
4. Refactor the simulation into resumable possession/decision-window state for interactive live coaching.
5. Add season statistics and history views.
6. Add progression, recruiting, transfers, coaches, scouting, and dynasty persistence in separate increments.

At every phase, preserve the existing flow:

```text
Choose a team → inspect roster → set lineup → configure plan → review matchup → simulate game → follow events → view box score
```

Do not start a later phase by rebuilding working simulation or frontend systems. Add explicit types, deterministic tests, and a user-visible path for each completed feature.
