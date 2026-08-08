# Courtside data and save architecture

## Static game database

`src/data/teams.ts` is the source database for all 20 fictional programs. It deterministically defines:

- Team IDs, names, nicknames, abbreviations, cities, conferences, colors, and lettermarks.
- Thirteen initial players per team, including permanent profiles and ratings.
- The AI coach assigned to each program, including style and ratings.
- Default lineup and strategy helpers.

This data is code-owned and is not mutable during the current single-season career. Player game state, box scores, and season totals never mutate these initial profiles.

## Generated season data

`src/season/season.ts` creates the deterministic schedule and initial `SeasonState`. The runtime season contains:

- Current day and total days.
- User program ID.
- Scheduled and completed games.
- Seeds and completed results for every game.
- Team records and conference records used for standings.
- Player season statistics aggregated from completed box scores.
- User lineup and strategy preferences.
- Completed-game history IDs.

Standings are derived from the canonical records in `SeasonState`; screens do not maintain separate records. Completed results live on their corresponding scheduled games and are not stored in a second game-history database.

At runtime, `SeasonState.teams` points to the hydrated static database because existing season and UI APIs use team objects. Season copies deliberately preserve those references, including team references in completed box scores. The persistence layer omits the static objects and restores them from `src/data/teams.ts`.

## Canonical career state

`CareerSave` in `src/domain/types.ts` is the single mutable save model. It owns:

- The created user coach and appearance.
- The one accepted program ID.
- Career stage: program selection, season introduction, active season, or season complete.
- Deterministic season objective.
- The entire current `SeasonState`.
- An unfinished resumable game and its scheduled-game ID, when applicable.
- Schema version and save timestamps.

The selected program cannot be changed after the season begins. AI programs remain static database entries and are never user-controllable through the career UI.

## Persistence

`src/season/persistence.ts` exposes the `SaveRepository` interface and the current local-storage implementation.

- Active key: `courtside-career-v2`.
- Legacy key recognized for recovery: `courtside-season-v1`.
- Schema version: `2`.

Serialization is reference-based:

- `SeasonState.teams` is omitted.
- Team objects inside completed box scores are replaced with team IDs. Full play-by-play is retained for user games; AI-only games retain results and box scores but omit replay events to keep a complete season reliable within browser storage limits.
- Team objects inside resumable live-game runtime state are replaced with team IDs.
- On load, all team references are validated and rehydrated from the static database.

The persisted payload includes generated schedules, completed results, records, standings inputs, player totals, history, lineup, strategy, coach, program, career stage, objective, and an unfinished live game. Refreshing during a live game restores its exact RNG state, clock, lineups, fatigue, fouls, events, strategies, and timeouts.

Autosaves occur after coach creation, job acceptance, season start, lineup and strategy edits, schedule advancement, every live-game state update, and game completion.

Malformed or incompatible data produces a recovery message on the start screen instead of being loaded. Deleting the save removes both the current and recognized legacy keys.

## React-only UI state

The following values intentionally remain ephemeral because they do not affect career correctness:

- Current screen/navigation view.
- Currently opened player profile.
- Transient validation/error text.
- The box score currently being displayed; its source result remains persisted on the scheduled game.
- Unconfirmed coach, lineup, or strategy form drafts.

Important career data is not stored only in React component state. React holds the hydrated `CareerSave`, and every meaningful mutation is sent through the save repository.

## Backend replacement boundary

A future backend can implement `SaveRepository` without changing simulation, season, or screen contracts. The repository is responsible for validation, serialization, hydration of static references, loading, saving, and deletion.
