You are the lead game developer and systems designer for a mobile-first college basketball coaching simulation game.

Your goal is to build a playable first version of a fictional college basketball coaching simulator centered around roster management, strategy, substitutions, player development, and a numbers-based live game simulation.

This is not a 2D or 3D basketball game. Do not build animated players moving around a court. Games should be simulated through structured basketball events, statistics, probabilities, and readable play-by-play text.

The experience should feel like a mobile sports-management game where the player controls a college basketball program, prepares for opponents, manages rotations, chooses strategies, and watches those decisions influence simulated games.

## Primary Goal

Build a functional vertical slice that allows the user to:

1. Select one college basketball program.
2. View its roster and player ratings.
3. Configure a starting lineup and rotation.
4. Choose a coaching game plan.
5. Simulate a complete basketball game.
6. Watch text-based play-by-play events appear during the simulation.
7. Make substitutions and basic strategic changes.
8. View a complete player and team box score after the game.

Focus first on creating a strong simulation foundation rather than building every dynasty feature immediately.

## Mobile-First Design

The game should be designed primarily for mobile devices.

The interface should:

* Work well on narrow phone screens.
* Use large, clear touch controls.
* Avoid dense desktop-style tables where possible.
* Use horizontally scrollable stat sections when necessary.
* Present players as compact roster rows or cards.
* Keep important game information visible without excessive scrolling.
* Make lineup changes, substitutions, and strategy adjustments easy with taps.
* Feel like a sports-management game rather than a generic business dashboard.

The application can also support desktop screens, but mobile usability is the priority.

## Game Simulation System

Create a deterministic, possession-based basketball simulation engine.

Do not generate a final score directly from team overall ratings. Simulate the game possession by possession and calculate the score from actual basketball events.

A game should contain:

* Two 20-minute halves.
* A running game clock.
* Possessions.
* Team fouls.
* Player fouls.
* Timeouts.
* Substitutions.
* Halftime.
* Late-game strategy.
* Overtime when the score is tied.

The same teams, strategies, lineups, and random seed should always produce the same result.

All randomness must come from an injected seeded random-number generator. Do not use uncontrolled randomness inside the simulation.

## Possession Flow

Each possession should follow a structured process:

1. Determine which team has possession.
2. Validate that both teams have five active players.
3. Determine possession length based on pace and game situation.
4. Select the offensive action.
5. Select the primary offensive player.
6. Determine which teammates and defenders are involved.
7. Apply lineup, matchup, fatigue, chemistry, strategy, and coaching effects.
8. Resolve whether the possession produces:

   * A shot attempt.
   * A turnover.
   * A foul.
   * A timeout or tactical decision opportunity.
9. Resolve the outcome.
10. Update the score, clock, fatigue, fouls, possession, and statistics.
11. Emit structured game events.
12. Convert those structured events into readable play-by-play text.

The engine should produce machine-readable events first. The text commentary should be generated from those events rather than being the source of the basketball logic.

## Offensive Events

Support these scoring and offensive outcomes:

* Layups.
* Dunks.
* Other shots at the rim.
* Mid-range jump shots.
* Post shots.
* Three-point shots.
* Free throws.
* Offensive rebounds.
* Assists.
* Turnovers.
* Bad passes.
* Lost-ball turnovers.
* Offensive fouls.
* Shot-clock violations.
* Fast-break opportunities.
* Second-chance possessions.

Shot results should depend on the shooter, shot type, defender, offensive action, spacing, fatigue, confidence, chemistry, and coaching strategy.

A made basket should award the correct number of points:

* Two points for layups, dunks, post shots, and mid-range shots.
* Three points for three-point shots.
* One point for free throws.

## Defensive Events

Support defensive outcomes including:

* Steals.
* Blocks.
* Defensive rebounds.
* Contested shots.
* Forced turnovers.
* Deflections.
* Shooting fouls.
* Non-shooting fouls.
* Charges.
* Help defense.
* Double teams.
* Transition defense.

Defensive schemes should create tradeoffs rather than simply increasing every defensive probability.

For example:

* Zone defense can protect the paint but allow more open three-point attempts.
* Aggressive help defense can create turnovers but leave shooters open.
* Full-court pressure can force turnovers but increase fatigue and allow transition chances.
* Switching can defend pick-and-roll actions but create size mismatches.
* Conservative defense can reduce fouls but create fewer steals and blocks.

## Player Ratings

Each player should have an overall rating and individual basketball ratings.

Use a rating scale such as 25 to 99.

Include at least:

* Overall.
* Inside scoring.
* Dunking.
* Layup finishing.
* Mid-range shooting.
* Three-point shooting.
* Free-throw shooting.
* Passing.
* Ball handling.
* Offensive rebounding.
* Defensive rebounding.
* Perimeter defense.
* Interior defense.
* Steal ability.
* Block ability.
* Speed.
* Strength.
* Athleticism.
* Stamina.
* Basketball IQ.
* Offensive consistency.
* Defensive consistency.
* Potential.

The overall rating should be calculated from the player’s skills, position, and archetype rather than assigned independently with no connection to the underlying ratings.

Permanent player data must remain separate from mutable in-game state.

Permanent data includes:

* Name.
* Position.
* Height.
* Weight.
* Class year.
* Ratings.
* Potential.
* Archetype.
* Personality.
* Hidden traits.

In-game state includes:

* Current stamina.
* Fatigue.
* Fouls.
* Minutes played.
* Confidence.
* Hot or cold status.
* Current role.
* Availability.
* Plus-minus.
* Current matchup.

Do not permanently change a player’s ratings during a single game.

## Player Archetypes

Give players recognizable archetypes, such as:

* Floor-General Point Guard.
* Scoring Point Guard.
* Three-and-D Wing.
* Slashing Wing.
* Shot-Creating Guard.
* Defensive Specialist.
* Stretch Forward.
* Interior Scorer.
* Rim Protector.
* Rebounding Center.
* Point Forward.
* Energy Bench Player.
* Sixth Man.
* Raw High-Upside Prospect.

Archetypes should affect tendencies and role suitability but should not completely override individual ratings.

## Personalities and Hidden Traits

Add personality and hidden-trait systems that can eventually influence development, morale, chemistry, playing time, and transfer decisions.

Possible personality traits:

* Team-first.
* Competitive.
* Confident.
* Quiet.
* Vocal leader.
* Emotional.
* Selfish.
* Loyal.
* Impatient.
* Coachable.
* Hard-working.
* Laid-back.

Possible hidden traits:

* Clutch.
* Inconsistent.
* Injury-prone.
* Big-game performer.
* Fast learner.
* Slow developer.
* High motor.
* Low effort.
* Foul-prone.
* Turnover-prone.
* Transfer risk.
* Strong leadership.
* Poor locker-room influence.

Do not reveal every hidden trait immediately. Design the data structure so traits could later be discovered through scouting, practices, statistics, or experience.

## Chemistry and Lineup Fit

Players should not perform only as a sum of their individual overall ratings.

Calculate lineup fit using factors such as:

* Ball handling.
* Passing.
* Shooting and spacing.
* Interior size.
* Rebounding.
* Perimeter defense.
* Rim protection.
* Athleticism.
* Experience.
* Player roles.
* Personalities.
* Familiarity.
* Leadership.
* Position balance.

A lineup with five individually talented players should still have weaknesses if it lacks spacing, defense, ball handling, or rebounding.

Chemistry should influence performance moderately without making ratings irrelevant.

## Stamina and Fatigue

Every player should have stamina and fatigue.

Fatigue should increase based on:

* Minutes played.
* Game pace.
* Defensive pressure.
* Full-court pressing.
* Player stamina.
* Offensive usage.
* Rebounding effort.
* Athletic actions.
* Short rest periods.

Fatigue should negatively affect:

* Shooting.
* Finishing.
* Defense.
* Ball handling.
* Rebounding.
* Foul probability.
* Turnover probability.
* Speed.
* Consistency.

Players should recover stamina while on the bench, during timeouts, and at halftime.

## Substitutions and Rotations

Support:

* Exactly five active players per team.
* Starting lineups.
* Bench players.
* Depth charts.
* Rotation size.
* Target minutes.
* Bench order.
* Fatigue-based substitutions.
* Foul-trouble substitutions.
* Tactical substitutions.
* Small-ball lineups.
* Defensive lineups.
* Shooting lineups.
* Closing lineups.

The user should be able to substitute players manually during legal game windows.

AI-controlled teams should make substitutions based on:

* Fatigue.
* Fouls.
* Player performance.
* Matchups.
* Coach tendencies.
* Score margin.
* Time remaining.
* Rotation plan.

Reject invalid lineups, including:

* Duplicate players.
* More or fewer than five players.
* Players not on the roster.
* Fouled-out players.
* Injured or unavailable players.

## Player Statistics

Track complete player box-score statistics:

* Minutes.
* Points.
* Field goals made.
* Field goals attempted.
* Two-point field goals made.
* Two-point field goals attempted.
* Three-point field goals made.
* Three-point field goals attempted.
* Free throws made.
* Free throws attempted.
* Offensive rebounds.
* Defensive rebounds.
* Total rebounds.
* Assists.
* Steals.
* Blocks.
* Turnovers.
* Personal fouls.
* Plus-minus.
* Dunks.
* Fast-break points.
* Points in the paint.

Team totals must reconcile with player totals.

Statistics must never become negative.

## Coaching Game Plans

Before the game, allow the user to configure a coaching game plan.

Include:

### Pace

* Very slow.
* Slow.
* Balanced.
* Fast.
* Very fast.

Faster pace should produce more possessions, more transition opportunities, more fatigue, and possibly more turnovers.

### Offensive Style

* Balanced.
* Motion offense.
* Pick-and-roll heavy.
* Isolation.
* Post-focused.
* Drive-and-kick.
* Three-point focused.
* Transition offense.
* Inside-out offense.

### Shot Profile

Allow the coach to emphasize:

* Shots at the rim.
* Dunks and layups.
* Mid-range shots.
* Three-point shots.
* Post touches.
* Free-throw generation.

### Primary Options

Allow the user to select:

* First scoring option.
* Second scoring option.
* Primary ball handler.
* Primary post player.
* Preferred late-game scorer.

Higher usage should create more scoring opportunities but also more fatigue, defensive attention, and turnover risk.

### Defensive Style

* Man-to-man.
* Zone.
* Switching.
* Conservative man defense.
* Aggressive help defense.
* Full-court press.

### Additional Settings

* Help-defense aggressiveness.
* Press frequency.
* Rebounding aggressiveness.
* Double-team preference.
* Foul-trouble substitution preference.
* Rotation size.
* Bench usage.
* Timeout behavior.
* Late-game fouling.
* Protect-the-lead strategy.

Every strategy should affect probabilities and tradeoffs. Strategies should not directly force outcomes.

## Coaching Styles

Create fictional coaches with styles and personalities.

Possible coach archetypes:

* Elite Recruiter.
* Player Developer.
* Analytics Coach.
* Defensive Traditionalist.
* Fast-Paced Innovator.
* High-Variance Gambler.
* Transfer Specialist.
* Veteran-Focused Coach.
* Motivator.
* Tactical Adjuster.

Each coach should have ratings such as:

* Offensive coaching.
* Defensive coaching.
* Player development.
* Recruiting.
* Scouting.
* Adaptability.
* Rotation management.
* Motivation.
* Discipline.
* Risk tolerance.

Coaching ratings and styles should influence:

* Strategy selection.
* Rotation decisions.
* Player development.
* In-game adjustments.
* Recruiting preferences.
* Team consistency.
* Player morale.
* Style of play.

For the first version, use explainable rule-based coaching decisions rather than neural networks.

## In-Game Coaching Decisions

During the game, create decision windows where the user or AI coach can:

* Call a timeout.
* Make substitutions.
* Change pace.
* Change offensive style.
* Change defensive scheme.
* Increase or decrease pressure.
* Emphasize a player.
* Protect a player in foul trouble.
* Use a smaller or larger lineup.
* Intentionally foul late.
* Hold for the final shot.

The mobile interface should support:

* Advance one possession.
* Simulate until the next stoppage.
* Simulate until the next timeout.
* Simulate to halftime.
* Simulate to the end.
* Pause for important coaching decisions.

## Play-by-Play

Display readable text events throughout the game.

Examples:

* “Marcus Reed drives past his defender and finishes the layup.”
* “Darius Cole blocks the shot at the rim.”
* “Evan Brooks grabs the offensive rebound.”
* “Jaylen Carter finds Malik Evans open in the corner.”
* “Malik Evans makes the three-pointer.”
* “Westbridge switches to a 2-3 zone.”
* “North Valley substitutes Liam Grant for Noah Price.”
* “Carter commits his fourth foul and heads to the bench.”

Play-by-play should be generated from structured events containing information such as:

* Event ID.
* Possession number.
* Half.
* Game clock.
* Offensive team.
* Defensive team.
* Event type.
* Players involved.
* Offensive action.
* Shot type.
* Shot quality.
* Result.
* Score after the event.
* Fatigue changes.
* Foul changes.
* Strategy tags.

## Teams and Rosters

Create at least 20 fictional college basketball programs.

Do not use real NCAA team names or real player likenesses unless explicitly requested and legally appropriate.

Each team should include:

* Team ID.
* School name.
* Team nickname.
* Abbreviation.
* Primary and secondary colors.
* Conference.
* Prestige rating.
* Team overall.
* Offensive identity.
* Defensive identity.
* Coaching staff.
* Full roster.
* Starting lineup.
* Depth chart.
* Team strengths.
* Team weaknesses.

Create approximately 12 to 15 players per team.

Each roster should include a believable mix of:

* Point guards.
* Shooting guards.
* Small forwards.
* Power forwards.
* Centers.
* Freshmen.
* Sophomores.
* Juniors.
* Seniors.
* Starters.
* Bench players.
* Development prospects.

Do not make every team equally strong.

Include:

* Elite programs.
* Strong tournament teams.
* Average teams.
* Rebuilding teams.
* Small programs with one or two standout players.

Team styles should vary significantly.

Examples:

* Fast, guard-heavy shooting team.
* Slow defensive team.
* Interior-focused rebounding team.
* Deep pressing team.
* Star-driven isolation team.
* Balanced veteran team.
* Young high-potential team.
* Undersized analytics team.

Store teams and players in structured data files so that more teams can be added later without rewriting the simulation.

## Initial Screens

Build these mobile-first screens:

### Team Selection

* Show all 20 teams.
* Display team overall, prestige, style, strengths, and weaknesses.
* Allow the user to choose one program.

### Program Home

* Team record.
* Upcoming opponent.
* Recent result.
* Team strengths and weaknesses.
* Starting lineup.
* Fatigue or availability concerns.
* Quick links to roster, strategy, and next game.

### Roster

* Player name.
* Position.
* Class.
* Overall.
* Key ratings.
* Role.
* Minutes.
* Fatigue.
* Morale or availability if supported.

### Player Profile

* Full ratings.
* Archetype.
* Personality.
* Season statistics.
* Strengths.
* Weaknesses.
* Potential.
* Scouting or trait information.

### Lineup and Rotation

* Select five starters.
* Reorder the depth chart.
* Assign target minutes.
* Choose rotation size.
* Select a closing lineup.
* Display lineup strengths and weaknesses.

### Game Plan

* Configure offensive and defensive strategies.
* Select primary scoring options.
* Adjust pace and rotation preferences.
* Explain the tradeoffs of each choice.

### Live Game

* Score.
* Clock.
* Half.
* Possession.
* Team fouls.
* Active lineups.
* Player fatigue.
* Play-by-play.
* Recent team statistics.
* Simulation controls.
* Coaching decision controls.

### Box Score

* Final score.
* Player statistics.
* Team statistics.
* Shooting percentages.
* Rebounds.
* Turnovers.
* Fouls.
* Bench points.
* Points in the paint.
* Fast-break points.

## Architecture

Keep the simulation engine independent from the user interface.

The simulation should:

* Not depend on React.
* Not depend on browser APIs.
* Accept typed game state and strategy inputs.
* Return structured simulation events and results.
* Support simulating one possession.
* Support simulating one full game.
* Support simulating many games for testing and balancing.
* Be deterministic when given the same seed and inputs.

Keep balancing constants in centralized configuration files.

Do not scatter unexplained probability values throughout the code.

Create clear domain models for:

* Player.
* PlayerRatings.
* PlayerTraits.
* PlayerGameState.
* Team.
* TeamRoster.
* Coach.
* CoachStyle.
* Lineup.
* RotationPlan.
* TeamStrategy.
* GameState.
* PossessionState.
* PlayerBoxScore.
* TeamBoxScore.
* GameEvent.
* SimulationResult.
* SeededRandom.
* SimulationConfig.

## Testing

Add tests for:

* The same seed producing the same game.
* Different seeds usually producing different games.
* Games always terminating.
* Scores never decreasing.
* Statistics never becoming negative.
* Team totals matching player totals.
* Five active players remaining on the court.
* Invalid lineups being rejected.
* Fouled-out players being unavailable.
* Faster pace producing more possessions in aggregate.
* Three-point emphasis producing more three-point attempts.
* Pressing increasing fatigue and affecting turnovers.
* Stronger teams winning more often across many simulations without winning every game.
* Fatigued players performing worse in aggregate.
* Offensive rebounds extending possessions.
* Fouls and free throws updating correctly.
* Substitutions updating active lineups and minutes correctly.

Run large batches of deterministic simulations and inspect:

* Average team scores.
* Average possessions.
* Shooting percentages.
* Two-point and three-point attempt rates.
* Turnover rates.
* Rebounding rates.
* Foul totals.
* Player minutes.
* Upset frequency.

Results do not need to perfectly match real college basketball immediately, but they should be believable.

## Development Priorities

Implement the project in this order:

### Phase 1

* Core data models.
* Seeded random-number generator.
* 20 teams and complete fictional rosters.
* Basic player ratings.
* Possession-based simulation.
* Layups, dunks, mid-range shots, three-pointers, rebounds, turnovers, steals, blocks, fouls, and free throws.
* Player and team statistics.
* Complete game simulation.
* Basic text play-by-play.

### Phase 2

* Mobile team selection.
* Roster and player profile screens.
* Starting lineup and rotation management.
* Game-plan configuration.
* Live simulation screen.
* Box score screen.

### Phase 3

* Fatigue-based substitutions.
* Foul trouble.
* Coaching adjustments.
* Chemistry and lineup fit.
* Player personalities and hidden traits.
* More detailed offensive actions and defensive schemes.

### Phase 4

* Schedule and standings.
* Season simulation.
* Player progression.
* Recruiting.
* Transfer portal.
* Morale.
* Injuries.
* Coach careers.
* Rivalries.
* Multi-season dynasty saves.

Do not begin by implementing every dynasty feature. First create one polished, complete flow:

Select a team → review the roster → set the lineup and strategy → simulate a full game → view the final box score.

Use clean architecture, explicit types, reusable data structures, deterministic simulation logic, and tests. Avoid fake controls that do not affect the game. Every visible strategy or coaching option must connect to the underlying simulation.
