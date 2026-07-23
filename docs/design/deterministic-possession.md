# Deterministic Possession Design

## Goal

Build the smallest useful basketball simulation slice: one possession resolved
from a human plan and an AI-selected legal plan. The core should be reusable by
a future web, mobile, desktop, or server application.

## First-Slice Scope

The slice should:

- accept two teams and valid five-player lineups
- accept a human-selected lineup and tactical plan
- let an AI coach choose among legal plans
- record why the AI selected its plan
- pass both plans through the same validation and simulation rules
- resolve exactly one possession
- return structured possession events and updated game state
- reproduce the same result from the same inputs and seed

This is a logic-first slice. It does not include a frontend.

## Core Data Concepts

Use explicit TypeScript types for:

- player and team identifiers
- player ratings needed by the first possession model
- team rosters
- five-player lineups
- tactical plans
- legal coach actions
- AI decision context and explanation
- score and possession state
- possession input, result, outcome, and events
- seeded random state where persistence or replay requires it

Public data should be serializable and treated as immutable. Validate external
inputs at the application boundary.

Ratings should use one documented scale. Lineups must contain exactly five
unique players belonging to the selected team. Invalid input must fail before
randomness is consumed.

## Determinism Requirement

All simulation randomness must come from an injected seeded random source.
Simulation and AI code must not call `Math.random()`, wall-clock time, browser
randomness, or crypto randomness for gameplay decisions.

For identical:

- teams and player data
- lineups and tactical plans
- initial game state
- AI inputs
- random seed

the AI decision, event sequence, updated state, and random state should be
deeply equal.

Different seeds may produce different valid outcomes while preserving all
invariants. Tests should cover repeatability, seed variation, and validation
before random draws.

## Human And AI Flow

The human and AI should use the same action shape and legal-action validation.
The AI receives a decision context and a non-empty set of legal candidate
plans. It returns:

- the selected candidate
- scores or reasons used to compare candidates
- a concise explanation tied to the actual selection

The AI does not receive hidden basketball rules or a mechanical advantage. For
the first slice, deterministic scoring is sufficient; exploration and learning
can be added later through separately injected randomness.

## Simulation Boundary

Keep four practical layers:

1. Domain: serializable types and pure validation.
2. Simulation: seeded possession resolution only.
3. AI: selection among legal plans; no possession resolution.
4. Application: validates human and AI actions, invokes the AI once, then
   invokes the simulation once.

Dependencies should point inward:

```text
domain <- simulation
domain <- ai
domain + simulation + ai <- application
```

The simulation must not depend on React, the DOM, browser APIs, persistence, or
presentation code. A future UI should consume the application result through a
small public API.

The possession resolver should:

1. validate teams, state, lineups, and plans
2. identify offense and defense
3. derive bounded probabilities from ratings and tactics
4. resolve the outcome using only the injected random source
5. emit ordered structured events
6. return a new game state without mutating caller-owned data

The initial outcome model may be deliberately small: turnover, made two-point
shot, made three-point shot, or missed shot with defensive rebound. Event
sequence numbers should be contiguous, and score changes must agree with shot
events.

## Explicit Non-Goals

The first task does not include:

- full games, periods, clocks, timeouts, substitutions, fatigue, or injuries
- complete box scores or advanced statistical tuning
- persistence or save migration
- recruiting, transfers, scholarships, schedules, or seasons
- player development
- adaptive or persistent AI learning
- frontend, mobile, or desktop UI
- production deployment

## Open Implementation Choices

The implementation session may choose reasonable, compatible tools and details,
including:

- supported Node.js and TypeScript versions
- test runner and lint configuration
- seeded PRNG implementation
- file layout and naming
- rating formulas and bounded first-slice probabilities
- error representation
- public export structure

Prefer a minimal TypeScript setup with no runtime dependency unless a dependency
solves a concrete problem. Do not pin exact patch versions without a repository
compatibility reason. Document consequential choices in code or the short
implementation handoff rather than creating a large approval document.
