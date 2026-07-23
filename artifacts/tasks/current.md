# Current Task: Deterministic Single Possession

Status: READY

## Goal

Implement the logic-first slice described in
`docs/design/deterministic-possession.md`.

A human supplies a valid lineup and tactical plan. An AI coach chooses and
explains one legal plan for the opponent. The application passes both plans
through the same validation and resolves one seeded possession into structured
events and updated game state.

## Requirements

- Use explicit TypeScript contracts for the first-slice domain.
- Keep simulation and AI logic independent of React and browser APIs.
- Inject all gameplay randomness through a seeded source.
- Reject invalid lineups before consuming randomness.
- Do not mutate caller-owned data.
- Return an explainable AI decision and ordered possession events.
- Add focused tests for validation, determinism, seed variation, AI legality,
  human/AI parity, and state/event consistency.
- Choose compatible routine tooling and dependency versions as needed.
- Run relevant installation, type checking, linting, tests, and build checks.

## Non-Goals

Do not implement full games, persistence, recruiting, player development,
adaptive learning, or frontend work.

## Completion

Commit working implementation and tests to `agent/implementation`. Keep
`artifacts/handoffs/implementation.md` under 30 lines and include only the
summary, validation results, and unresolved issues.
