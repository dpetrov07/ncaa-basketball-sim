# Simulation rules and calibration

`config.ts` is the balancing boundary. Possession resolution should not introduce new probability constants outside that module.

## Foul and possession rules

- Team fouls reset at halftime and before each overtime.
- Fouls 7–9 in a half produce a one-and-one. Fouls 10+ produce two free throws.
- Offensive fouls charge only the offensive player, record a turnover, and change possession.
- Defensive non-shooting fouls retain the current possession until the bonus applies.
- Shooting fouls produce two or three attempts; made-basket continuation produces one.
- An intentional late-game foul produces two attempts.
- A missed final free throw remains live and resolves through the same seeded rebound model as a missed field goal.
- Blocks are missed field-goal attempts. They always resolve a rebound, and an offensive recovery continues the existing possession rather than adding a new one.
- The second half uses the alternating-possession arrow opposite the opening possession. Overtime possession is seeded.

## Strategy identities

- **Balanced:** neutral usage, shot profile, assist, and turnover modifiers.
- **Motion:** spreads usage, rewards passing/IQ through assist creation and shot quality, and slightly reduces turnovers.
- **Pick-and-roll:** concentrates creation in capable handlers, increases rim and kick-out three attempts, and accepts more turnover risk.
- **Isolation:** concentrates usage and reduces assists in exchange for individual rim/mid-range creation.
- **Post-focused:** emphasizes interior creation and suppresses threes.
- **Drive-and-kick:** increases rim attempts, threes, and assists with added turnover risk.
- **Three-point:** strongly increases perimeter volume with a small shot-quality cost.
- **Transition:** increases rim attempts and fast-break production, especially for fast lineups, with more turnovers.
- **Inside-out:** combines post pressure with assisted perimeter chances.

Pressing raises turnovers, fatigue, and fouls. Help defense improves interior contests and turnover creation while conceding more perimeter quality. Rebounding aggression changes live-ball recovery odds.

## Rating and coach mappings

- Shooting/finishing ratings determine shot-type efficiency; offensive consistency controls seeded variance.
- Passing and IQ create assists; handling and IQ reduce turnovers.
- Perimeter/interior defense and defensive coaching reduce matching shot quality.
- Steal affects whether a turnover is credited as a steal. Block and athleticism affect blocks.
- Offensive/defensive rebounding, strength, athleticism, and fatigue determine rebound ownership.
- Speed improves transition efficiency and fast-break production. Stamina and coach motivation affect fatigue.
- Potential is not used by the in-game engine.
- Coach offense/defense, discipline, motivation, adaptability, and philosophy fit apply modest probability or execution modifiers without changing player ratings.

## August 2026 deterministic audit

The post-change audit used hundreds of standard/strategy games plus 1,900 neutral-site cross-program games. Standard balanced output was approximately 62 points, 59 possessions, 46.7% FG, 27.4% three-point attempt rate, 23.2% free-throw rate, 12.7% turnovers per possession, 19.6% offensive rebound rate, and 10.8 fouls per team. Home teams won 58% of mirrored games.

Neutral-site win rates by tier were: Elite 74.4%, Strong 70.2%, Middle 45.8%, Rebuilding 27.7%, and Underdog 22.6%. These are cross-tier aggregate rates rather than projected season records. The calibration suite deliberately uses ranges and directional comparisons so it protects basketball behavior without becoming seed-fragile.
