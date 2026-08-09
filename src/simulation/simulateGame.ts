import type {
  BoxScore,
  Coach,
  GameEvent,
  GameResult,
  GameRuntimePlayer,
  GameRuntimeTeam,
  GameState,
  GameStoppage,
  Lineup,
  PlayerProfile,
  PlayerStats,
  SimulationInput,
  Strategy,
  Team,
  TeamStats,
} from "../domain/types";
import { SeededRandom } from "./rng";
import { validateLineup } from "./validation";
import { simulationConfig } from "./config";

type ShotType = "layup" | "dunk" | "mid-range" | "three" | "post";

const emptyStats = (playerId: string): PlayerStats => ({
  playerId, minutes: 0, points: 0, fgm: 0, fga: 0, twoPm: 0, twoPa: 0, threePm: 0, threePa: 0,
  ftm: 0, fta: 0, offensiveRebounds: 0, defensiveRebounds: 0, assists: 0, steals: 0, blocks: 0,
  turnovers: 0, fouls: 0, plusMinus: 0, dunks: 0, fastBreakPoints: 0, pointsInPaint: 0, offensiveFouls: 0,
});

const emptyTeamStats = (teamId: string): TeamStats => ({
  teamId, points: 0, possessions: 0, fgm: 0, fga: 0, threePm: 0, threePa: 0, ftm: 0, fta: 0,
  offensiveRebounds: 0, defensiveRebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0,
  fouls: 0, fastBreakPoints: 0, pointsInPaint: 0,
});

function cloneState(state: GameState): GameState {
  const copy = JSON.parse(JSON.stringify(state)) as GameState;
  copy.home.team = state.home.team;
  copy.away.team = state.away.team;
  return copy;
}

function makeRuntime(team: Team, lineup: Lineup, strategy: Strategy, coach: Coach): GameRuntimeTeam {
  validateLineup(team, lineup);
  const starters = new Set(lineup.playerIds);
  const players = team.roster.map((profile): GameRuntimePlayer => ({
    playerId: profile.id,
    state: {
      playerId: profile.id, fatigue: 0, stamina: profile.ratings.stamina, fouls: 0, minutes: 0,
      confidence: 50, available: true, role: starters.has(profile.id) ? "starter" : "bench",
    },
    stats: emptyStats(profile.id),
    activeSeconds: 0,
  }));
  return {
    team, coach, strategy: { ...strategy }, players, lineup: [...lineup.playerIds], possessions: 0, score: 0,
    teamFouls: 0, timeoutsRemaining: 4, stats: emptyTeamStats(team.id),
  };
}

function runtimePlayer(runtime: GameRuntimeTeam, playerId: string): GameRuntimePlayer {
  const player = runtime.players.find((candidate) => candidate.playerId === playerId);
  if (!player) throw new Error(`Unknown player ${playerId}.`);
  return player;
}

function profile(runtime: GameRuntimeTeam, player: GameRuntimePlayer): PlayerProfile {
  const found = runtime.team.roster.find((candidate) => candidate.id === player.playerId);
  if (!found) throw new Error(`Unknown player profile ${player.playerId}.`);
  return found;
}

function active(runtime: GameRuntimeTeam): GameRuntimePlayer[] {
  return runtime.lineup.map((id) => runtime.players.find((player) => player.playerId === id)).filter((player): player is GameRuntimePlayer => Boolean(player));
}

function weightedPick<T>(items: readonly T[], weights: number[], rng: SeededRandom): T {
  const total = weights.reduce((sum, weight) => sum + Math.max(0.01, weight), 0);
  let cursor = rng.next() * total;
  for (let index = 0; index < items.length; index += 1) {
    cursor -= Math.max(0.01, weights[index]);
    if (cursor <= 0) return items[index];
  }
  return items[items.length - 1];
}

function coachRating(runtime: GameRuntimeTeam, key: keyof Coach["ratings"]): number {
  return (runtime.coach ?? runtime.team.coach).ratings[key];
}

function philosophyFits(runtime: GameRuntimeTeam): boolean {
  const style = (runtime.coach ?? runtime.team.coach).style.toLowerCase();
  const offense = runtime.strategy.offensiveStyle;
  const defense = runtime.strategy.defensiveScheme;
  return style.includes(offense.replaceAll("-", " ")) ||
    (offense === "motion" && style.includes("motion")) ||
    (offense === "pick-and-roll" && style.includes("pick and roll")) ||
    (offense === "three-point" && (style.includes("perimeter") || style.includes("analytics"))) ||
    (defense === "man" && style.includes("man to man")) || style.includes(defense.replaceAll("-", " "));
}

function homeCourtScale(state: GameState, runtime: GameRuntimeTeam): number {
  if (state.neutralSite || runtime.team.id !== state.home.team.id) return 0;
  return Math.min(simulationConfig.homeCourt.maxProgramMultiplier, 0.7 + runtime.team.program.homeCourtStrength / 10);
}

function chemistry(runtime: GameRuntimeTeam): number {
  const five = active(runtime);
  const ballHandling = five.reduce((sum, player) => sum + profile(runtime, player).ratings.ballHandling, 0) / 5;
  const passing = five.reduce((sum, player) => sum + profile(runtime, player).ratings.passing, 0) / 5;
  const spacing = five.reduce((sum, player) => sum + profile(runtime, player).ratings.threePoint, 0) / 5;
  const size = five.reduce((sum, player) => sum + profile(runtime, player).ratings.strength, 0) / 5;
  const leaders = five.filter((player) => {
    const playerProfile = profile(runtime, player);
    return playerProfile.personality === "Vocal leader" || playerProfile.hiddenTraits.includes("Strong leadership");
  }).length;
  return (ballHandling + passing + spacing + size) / 4 + leaders * 1.5;
}

function chooseScorer(runtime: GameRuntimeTeam, rng: SeededRandom): GameRuntimePlayer {
  const five = active(runtime);
  const preferred = new Set(five.filter((player) => player.state.role === "starter").map((player) => player.playerId));
  const strategyEffect = simulationConfig.strategy[runtime.strategy.offensiveStyle];
  const averageUsageSkill = five.reduce((sum, player) => {
    const ratings = profile(runtime, player).ratings;
    return sum + ratings.insideScoring + ratings.threePoint + ratings.ballHandling;
  }, 0) / Math.max(1, five.length);
  const weights = five.map((player) => {
    const ratings = profile(runtime, player).ratings;
    const usageSkill = ratings.insideScoring + ratings.threePoint + ratings.ballHandling;
    const spreadAdjustment = (averageUsageSkill - usageSkill) * strategyEffect.usageSpread;
    const handlerBonus = runtime.strategy.offensiveStyle === "pick-and-roll" ? (ratings.ballHandling + ratings.passing - 140) * 0.35 : 0;
    return usageSkill + spreadAdjustment + handlerBonus + (preferred.has(player.playerId) ? 18 : 0) + player.state.confidence - player.state.fatigue;
  });
  return weightedPick(five, weights, rng);
}

function pickShot(strategy: Strategy, shooter: PlayerProfile, rng: SeededRandom): ShotType {
  const emphasis = simulationConfig.shotEmphasisWeights;
  const strategyEffect = simulationConfig.strategy[strategy.offensiveStyle];
  const weights: [ShotType, number][] = [
    ["layup", emphasis[strategy.shotEmphasis].layup + strategyEffect.rim],
    ["dunk", (emphasis[strategy.shotEmphasis].dunk ?? 0) + (shooter.ratings.dunking > 78 ? 8 : 0) + (strategy.offensiveStyle === "transition" ? 8 : 0)],
    ["mid-range", (emphasis[strategy.shotEmphasis]["mid-range"] ?? 0) + (strategy.offensiveStyle === "isolation" ? 9 : 0)],
    ["three", emphasis[strategy.shotEmphasis].three + strategyEffect.three + (shooter.ratings.threePoint > 82 ? 8 : 0)],
    ["post", (emphasis[strategy.shotEmphasis].post ?? 0) + (strategy.offensiveStyle === "post-focused" || strategy.offensiveStyle === "inside-out" ? 16 : 0)],
  ];
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = rng.next() * total;
  for (const [type, weight] of weights) {
    cursor -= weight;
    if (cursor <= 0) return type;
  }
  return "layup";
}

function emit(state: GameState, event: Omit<GameEvent, "id">): void {
  state.events.push({ id: state.nextEventId++, ...event });
}

function incrementPlusMinus(scoring: GameRuntimeTeam, defending: GameRuntimeTeam, points: number): void {
  for (const player of active(scoring)) player.stats.plusMinus += points;
  for (const player of active(defending)) player.stats.plusMinus -= points;
}

function updateFatigue(offense: GameRuntimeTeam, defense: GameRuntimeTeam, seconds: number): void {
  const offenseMotivation = 1 - Math.max(-0.05, Math.min(0.05, (coachRating(offense, "motivation") - simulationConfig.coaching.neutralRating) / 100 * simulationConfig.coaching.motivationFatigueMagnitude));
  const defenseMotivation = 1 - Math.max(-0.05, Math.min(0.05, (coachRating(defense, "motivation") - simulationConfig.coaching.neutralRating) / 100 * simulationConfig.coaching.motivationFatigueMagnitude));
  const pressureLoad = 1 + defense.strategy.pressFrequency / 100 * simulationConfig.pressureFatigueMagnitude;
  for (const player of active(offense)) {
    player.activeSeconds += seconds;
    player.state.fatigue = Math.min(96, player.state.fatigue + (seconds / Math.max(30, profile(offense, player).ratings.stamina) * simulationConfig.fatigue.offenseRate + simulationConfig.fatigue.offenseBase) * offenseMotivation);
  }
  for (const player of active(defense)) {
    player.activeSeconds += seconds;
    player.state.fatigue = Math.min(96, player.state.fatigue + (seconds / Math.max(30, profile(defense, player).ratings.stamina) * simulationConfig.fatigue.defenseRate + simulationConfig.fatigue.defenseBase) * defenseMotivation * pressureLoad);
  }
  for (const runtime of [offense, defense]) {
    const activeIds = new Set(runtime.lineup);
    for (const player of runtime.players) if (!activeIds.has(player.playerId)) player.state.fatigue = Math.max(0, player.state.fatigue - seconds / simulationConfig.fatigue.benchRecoveryDivisor);
  }
}

function substituteIfNeeded(state: GameState, runtime: GameRuntimeTeam): void {
  const five = active(runtime);
  if (five.length !== 5) return;
  const usedCount = runtime.players.filter((player) => player.activeSeconds > 0).length;
  const maxBenchPlayers = Math.max(0, runtime.strategy.rotationSize - 5);
  const bench = runtime.players.filter((player) => player.state.available && !runtime.lineup.includes(player.playerId) && player.state.fouls < simulationConfig.fouls.foulOutLimit && (player.activeSeconds > 0 || usedCount < 5 + maxBenchPlayers))
    .sort((a, b) => (profile(runtime, b).ratings.overall - b.state.fatigue) - (profile(runtime, a).ratings.overall - a.state.fatigue));
  if (!bench.length) return;
  const tired = five.filter((player) => player.state.fatigue > (runtime.strategy.pace === "very-fast" ? 48 : 62));
  const foulTrouble = runtime.strategy.foulTroubleSubstitution ? five.filter((player) => player.state.fouls >= simulationConfig.fouls.foulOutLimit - 1) : [];
  const outgoing = [...foulTrouble, ...tired].sort((a, b) => b.state.fatigue - a.state.fatigue)[0];
  if (!outgoing || (state.clock > 1050 && state.period === 1 && outgoing.state.fouls < simulationConfig.fouls.foulOutLimit - 1)) return;
  const incoming = bench[0];
  runtime.lineup[runtime.lineup.indexOf(outgoing.playerId)] = incoming.playerId;
  outgoing.state.role = "bench";
  incoming.state.role = "rotation";
  emit(state, {
    kind: "substitution", period: state.period, clock: state.clock, teamId: runtime.team.id, playerId: incoming.playerId,
    secondaryPlayerId: outgoing.playerId, text: `${runtime.team.shortName} checks in ${profile(runtime, incoming).name} for ${profile(runtime, outgoing).name}.`,
  });
}

function forceValidLineup(runtime: GameRuntimeTeam, state?: GameState): void {
  const previous = [...runtime.lineup];
  runtime.lineup = runtime.lineup.filter((id) => {
    const player = runtime.players.find((candidate) => candidate.playerId === id);
    return player?.state.available && player.state.fouls < simulationConfig.fouls.foulOutLimit;
  });
  const candidates = runtime.players.filter((player) => player.state.available && player.state.fouls < simulationConfig.fouls.foulOutLimit && !runtime.lineup.includes(player.playerId))
    .sort((a, b) => profile(runtime, b).ratings.overall - profile(runtime, a).ratings.overall);
  while (runtime.lineup.length < 5 && candidates.length) runtime.lineup.push(candidates.shift()!.playerId);
  if (state) {
    const incoming = runtime.lineup.filter((id) => !previous.includes(id));
    const outgoing = previous.filter((id) => !runtime.lineup.includes(id));
    incoming.forEach((playerId, index) => emit(state, {
      kind: "substitution", period: state.period, clock: state.clock, teamId: runtime.team.id, playerId, secondaryPlayerId: outgoing[index],
      text: `${runtime.team.shortName} replaces ${outgoing[index] ? profile(runtime, runtimePlayer(runtime, outgoing[index])).name : "an unavailable player"} with ${profile(runtime, runtimePlayer(runtime, playerId)).name}.`,
    }));
  }
}

function teamStats(runtime: GameRuntimeTeam): TeamStats {
  const players = runtime.players.map((player) => player.stats);
  const sum = (key: keyof PlayerStats) => players.reduce((total, player) => total + Number(player[key]), 0);
  return {
    teamId: runtime.team.id, points: sum("points"), possessions: runtime.possessions, fgm: sum("fgm"), fga: sum("fga"),
    threePm: sum("threePm"), threePa: sum("threePa"), ftm: sum("ftm"), fta: sum("fta"), offensiveRebounds: sum("offensiveRebounds"),
    defensiveRebounds: sum("defensiveRebounds"), assists: sum("assists"), steals: sum("steals"), blocks: sum("blocks"), turnovers: sum("turnovers"),
    fouls: sum("fouls"), fastBreakPoints: sum("fastBreakPoints"), pointsInPaint: sum("pointsInPaint"),
  };
}

function refreshRuntime(runtime: GameRuntimeTeam): void {
  runtime.stats = teamStats(runtime);
  runtime.score = runtime.stats.points;
  for (const player of runtime.players) player.state.minutes = Number((player.activeSeconds / 60).toFixed(1));
}

function finishRuntime(runtime: GameRuntimeTeam): BoxScore {
  for (const player of runtime.players) {
    player.stats.minutes = Number((player.activeSeconds / 60).toFixed(1));
    player.state.minutes = player.stats.minutes;
  }
  refreshRuntime(runtime);
  return { team: runtime.team, stats: runtime.stats, players: runtime.players.map((player) => player.stats) };
}

function completeMutable(state: GameState): void {
  const home = finishRuntime(state.home);
  const away = finishRuntime(state.away);
  state.status = "complete";
  state.stoppage = "final";
  emit(state, { kind: "final", period: state.period, clock: 0, text: `Final: ${home.team.shortName} ${home.stats.points}, ${away.team.shortName} ${away.stats.points}.` });
}

function endPeriod(state: GameState, rng: SeededRandom): void {
  emit(state, { kind: "period-end", period: state.period, clock: 0, text: state.period === 1 ? "End of the first half." : `End of period ${state.period}.` });
  refreshRuntime(state.home); refreshRuntime(state.away);
  if (state.period === 1) {
    emit(state, { kind: "halftime", period: 1, clock: 0, text: "Halftime. Both teams reset and recover." });
    for (const runtime of [state.home, state.away]) for (const player of runtime.players) player.state.fatigue = Math.max(0, player.state.fatigue - simulationConfig.fatigue.halftimeRecovery);
    state.period = 2; state.clock = 1200; state.home.teamFouls = 0; state.away.teamFouls = 0; state.stoppage = "halftime";
    state.possessionTeamId = state.openingPossessionTeamId === state.home.team.id ? state.away.team.id : state.home.team.id;
    state.continuationTeamId = undefined;
    emit(state, { kind: "period-start", period: 2, clock: 1200, text: "Period 2 begins." });
    return;
  }
  if (state.home.score !== state.away.score) { completeMutable(state); return; }
  if (state.period >= 8) {
    const tiebreaker = rng.chance(0.5) ? state.home : state.away;
    const player = active(tiebreaker).sort((a, b) => profile(tiebreaker, b).ratings.freeThrow - profile(tiebreaker, a).ratings.freeThrow)[0];
    player.stats.fta += 1; player.stats.ftm += 1; player.stats.points += 1;
    emit(state, { kind: "free-throw", period: state.period, clock: 0, teamId: tiebreaker.team.id, playerId: player.playerId, points: 1, result: "made", text: `${profile(tiebreaker, player).name} sinks the decisive free throw.` });
    completeMutable(state); return;
  }
  state.period += 1; state.clock = 300; state.home.teamFouls = 0; state.away.teamFouls = 0; state.stoppage = "period-end";
  state.possessionTeamId = rng.chance(0.5) ? state.home.team.id : state.away.team.id;
  state.continuationTeamId = undefined;
  emit(state, { kind: "period-start", period: state.period, clock: 300, text: `Overtime ${state.period - 2} begins.` });
}

function endStep(state: GameState, rng: SeededRandom, stoppage: GameStoppage): void {
  state.stoppage = stoppage;
  refreshRuntime(state.home); refreshRuntime(state.away);
  if (state.clock <= 0) endPeriod(state, rng);
  state.rngState = rng.getState();
}

function clampChance(value: number): number { return Math.max(0.01, Math.min(0.98, value)); }

function averageActiveRating(runtime: GameRuntimeTeam, key: keyof PlayerProfile["ratings"]): number {
  const five = active(runtime);
  return five.reduce((sum, player) => sum + profile(runtime, player).ratings[key], 0) / Math.max(1, five.length);
}

function foulOut(state: GameState, runtime: GameRuntimeTeam, player: GameRuntimePlayer): void {
  if (player.state.fouls < simulationConfig.fouls.foulOutLimit) return;
  player.state.available = false;
  forceValidLineup(runtime, state);
}

function chargeFoul(runtime: GameRuntimeTeam, player: GameRuntimePlayer): void {
  player.state.fouls += 1;
  player.stats.fouls += 1;
  runtime.teamFouls += 1;
  player.state.confidence = Math.max(20, player.state.confidence - 1);
  if (player.state.fouls >= simulationConfig.fouls.foulOutLimit) player.state.available = false;
}

function chooseRebounder(runtime: GameRuntimeTeam, offensive: boolean, rng: SeededRandom): GameRuntimePlayer {
  const five = active(runtime);
  return weightedPick(five, five.map((player) => {
    const ratings = profile(runtime, player).ratings;
    const rebound = offensive ? ratings.offensiveRebounding : ratings.defensiveRebounding;
    return rebound * 1.6 + ratings.strength * 0.35 + ratings.athleticism * 0.35 - player.state.fatigue * 0.25;
  }), rng);
}

function resolveRebound(state: GameState, offense: GameRuntimeTeam, defense: GameRuntimeTeam, rng: SeededRandom, adjustment = 0): boolean {
  const offenseRating = averageActiveRating(offense, "offensiveRebounding");
  const defenseRating = averageActiveRating(defense, "defensiveRebounding");
  const aggression = (offense.strategy.reboundingAggressiveness - defense.strategy.reboundingAggressiveness) / 100;
  const chance = clampChance(simulationConfig.rebounds.offensiveBase + aggression * simulationConfig.rebounds.aggressionMagnitude + (offenseRating - defenseRating) / 100 * simulationConfig.rebounds.ratingMagnitude + adjustment);
  const offensive = rng.chance(chance);
  const runtime = offensive ? offense : defense;
  const rebounder = chooseRebounder(runtime, offensive, rng);
  if (offensive) rebounder.stats.offensiveRebounds += 1; else rebounder.stats.defensiveRebounds += 1;
  emit(state, { kind: "rebound", period: state.period, clock: state.clock, teamId: runtime.team.id, playerId: rebounder.playerId, text: `${profile(runtime, rebounder).name} ${offensive ? "grabs the offensive rebound" : "secures the defensive rebound"}.` });
  state.possessionTeamId = runtime.team.id;
  state.continuationTeamId = offensive ? offense.team.id : undefined;
  return offensive;
}

function freeThrowChance(state: GameState, offense: GameRuntimeTeam, shooter: GameRuntimePlayer): number {
  const ratings = profile(offense, shooter).ratings;
  const home = homeCourtScale(state, offense) * simulationConfig.homeCourt.freeThrow;
  const consistency = (ratings.offensiveConsistency - 70) / 2500;
  return clampChance(ratings.freeThrow / 100 - shooter.state.fatigue / 100 * 0.12 + home + consistency);
}

function shootFreeThrows(
  state: GameState,
  offense: GameRuntimeTeam,
  defense: GameRuntimeTeam,
  shooter: GameRuntimePlayer,
  attempts: number,
  rng: SeededRandom,
  oneAndOne = false,
): void {
  let finalMade = false;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    shooter.stats.fta += 1;
    const made = rng.chance(freeThrowChance(state, offense, shooter));
    finalMade = made;
    if (made) { shooter.stats.ftm += 1; shooter.stats.points += 1; incrementPlusMinus(offense, defense, 1); }
    emit(state, { kind: "free-throw", period: state.period, clock: state.clock, teamId: offense.team.id, playerId: shooter.playerId, points: made ? 1 : 0, result: made ? "made" : "missed", text: `${profile(offense, shooter).name} ${made ? "makes" : "misses"} free throw ${attempt} of ${attempts}.` });
    if (oneAndOne && attempt === 1 && !made && simulationConfig.fouls.oneAndOneMakeRequirement) break;
  }
  if (finalMade) {
    state.possessionTeamId = defense.team.id;
    state.continuationTeamId = undefined;
  } else {
    resolveRebound(state, offense, defense, rng, simulationConfig.rebounds.freeThrowOffensiveRecoveryAdjustment);
  }
}

function shotSkill(player: PlayerProfile, shotType: ShotType): number {
  return shotType === "three" ? player.ratings.threePoint : shotType === "mid-range" ? player.ratings.midRange : shotType === "post" ? player.ratings.insideScoring : shotType === "dunk" ? player.ratings.dunking : player.ratings.layupFinishing;
}

function shotMakeChance(state: GameState, offense: GameRuntimeTeam, defense: GameRuntimeTeam, shooter: GameRuntimePlayer, defender: GameRuntimePlayer, shotType: ShotType, rng: SeededRandom): number {
  const shooterProfile = profile(offense, shooter);
  const defenderProfile = profile(defense, defender);
  const strategy = simulationConfig.strategy[offense.strategy.offensiveStyle];
  const scheme = simulationConfig.defense[defense.strategy.defensiveScheme];
  const offenseCoach = (coachRating(offense, "offense") - simulationConfig.coaching.neutralRating) / 20 * simulationConfig.coaching.shotMagnitude;
  const defenseCoach = (coachRating(defense, "defense") - simulationConfig.coaching.neutralRating) / 20 * simulationConfig.coaching.defenseMagnitude;
  const fit = philosophyFits(offense) ? simulationConfig.coaching.philosophyFitBonus : 0;
  const homeShot = homeCourtScale(state, offense) * simulationConfig.homeCourt.shotQuality;
  const homeDefense = homeCourtScale(state, defense) * simulationConfig.homeCourt.defense;
  const defenderRating = shotType === "three" || shotType === "mid-range" ? defenderProfile.ratings.perimeterDefense : defenderProfile.ratings.interiorDefense;
  const consistencyRange = (100 - shooterProfile.ratings.offensiveConsistency) / 100 * simulationConfig.consistency.varianceMagnitude;
  const consistency = (rng.next() * 2 - 1) * consistencyRange;
  const help = defense.strategy.helpDefense / 100;
  const helpEffect = shotType === "three" ? help * simulationConfig.helpDefense.threeExposureMagnitude : -help * simulationConfig.helpDefense.interiorDefenseMagnitude;
  const transitionSpeed = offense.strategy.offensiveStyle === "transition" ? (averageActiveRating(offense, "speed") - 70) / 30 * simulationConfig.transition.speedShotMagnitude : 0;
  return clampChance(simulationConfig.shotBaseChance[shotType] + (shotSkill(shooterProfile, shotType) - 70) / 250 + (chemistry(offense) - 70) / 700 + strategy.shotQuality + offenseCoach + fit + homeShot - (defenderRating - 70) / 380 - defenseCoach - homeDefense - shooter.state.fatigue / 100 * 0.13 - scheme.shot - (shotType === "three" ? scheme.three * 0.25 : 0) + helpEffect + transitionSpeed + consistency);
}

function shouldIntentionallyFoul(state: GameState, defense: GameRuntimeTeam, offense: GameRuntimeTeam): boolean {
  if (!defense.strategy.lateGameFouling || state.period < 2 || state.clock > simulationConfig.lateGame.maxSeconds) return false;
  const margin = offense.score - defense.score;
  return margin >= simulationConfig.lateGame.minMargin && margin <= simulationConfig.lateGame.maxMargin;
}

function stepMutable(state: GameState): void {
  if (state.status === "complete") return;
  const rng = SeededRandom.fromState(state.rngState);
  forceValidLineup(state.home, state); forceValidLineup(state.away, state);
  substituteIfNeeded(state, state.home); substituteIfNeeded(state, state.away);
  const offense = state.possessionTeamId === state.home.team.id ? state.home : state.away;
  const defense = offense === state.home ? state.away : state.home;
  const intentional = shouldIntentionallyFoul(state, defense, offense);
  const seconds = Math.min(state.clock, intentional ? rng.int(simulationConfig.lateGame.foulClockMin, simulationConfig.lateGame.foulClockMax) : rng.int(...simulationConfig.paceSeconds[offense.strategy.pace]));
  const shooter = chooseScorer(offense, rng);
  const shooterProfile = profile(offense, shooter);
  const defender = weightedPick(active(defense), active(defense).map((player) => {
    const ratings = profile(defense, player).ratings;
    return ratings.perimeterDefense + ratings.interiorDefense + ratings.steal * 0.35 - player.state.fatigue * 0.4;
  }), rng);
  const defenderProfile = profile(defense, defender);
  const shotType = pickShot(offense.strategy, shooterProfile, rng);
  if (state.continuationTeamId !== offense.team.id) offense.possessions += 1;
  state.continuationTeamId = undefined;
  const defensiveEffect = simulationConfig.defense[defense.strategy.defensiveScheme];
  const pressure = defense.strategy.pressFrequency / 100 * simulationConfig.turnovers.pressureMagnitude;
  const fatigue = shooter.state.fatigue / 100;
  const offenseCoachTurnovers = (coachRating(offense, "offense") - simulationConfig.coaching.neutralRating) / 20 * simulationConfig.coaching.turnoverMagnitude;
  const defenseCoachTurnovers = (coachRating(defense, "defense") - simulationConfig.coaching.neutralRating) / 20 * simulationConfig.coaching.turnoverMagnitude;
  const handling = shooterProfile.ratings.ballHandling / simulationConfig.turnovers.handlingDivisor + shooterProfile.ratings.basketballIQ / simulationConfig.turnovers.iqDivisor;
  const fit = philosophyFits(offense) ? simulationConfig.coaching.philosophyFitBonus / 2 : 0;
  const turnoverChance = clampChance(simulationConfig.turnovers.base + pressure + defensiveEffect.turnover + defense.strategy.helpDefense / 100 * simulationConfig.helpDefense.turnoverMagnitude + fatigue * simulationConfig.turnovers.fatigueMagnitude + simulationConfig.strategy[offense.strategy.offensiveStyle].turnover - handling - offenseCoachTurnovers - fit + defenseCoachTurnovers - homeCourtScale(state, offense) * simulationConfig.homeCourt.turnoverAvoidance);
  updateFatigue(offense, defense, seconds);
  state.clock -= seconds;
  state.totalSeconds += seconds;

  if (intentional) {
    const fouler = weightedPick(active(defense), active(defense).map((player) => 110 - player.state.fouls * 14 - profile(defense, player).ratings.basketballIQ * 0.2), rng);
    chargeFoul(defense, fouler);
    emit(state, { kind: "foul", foulType: "intentional", period: state.period, clock: state.clock, teamId: defense.team.id, playerId: fouler.playerId, opponentPlayerId: shooter.playerId, text: `${profile(defense, fouler).name} intentionally fouls ${shooterProfile.name}.` });
    foulOut(state, defense, fouler);
    shootFreeThrows(state, offense, defense, shooter, simulationConfig.fouls.intentionalFreeThrows, rng);
    endStep(state, rng, "free-throws"); return;
  }

  if (rng.chance(turnoverChance)) {
    shooter.stats.turnovers += 1;
    shooter.state.confidence = Math.max(20, shooter.state.confidence - 4);
    const stolen = rng.chance(clampChance(0.42 + (defenderProfile.ratings.steal - 60) / 120));
    if (stolen) defender.stats.steals += 1;
    emit(state, { kind: "turnover", period: state.period, clock: state.clock, teamId: offense.team.id, playerId: shooter.playerId, opponentPlayerId: defender.playerId, text: `${shooterProfile.name} turns it over${stolen ? ` — ${defenderProfile.name} jumps the passing lane.` : "."}` });
    state.possessionTeamId = defense.team.id;
    endStep(state, rng, "turnover"); return;
  }

  const foulChance = clampChance(simulationConfig.fouls.base + defense.strategy.helpDefense / 100 * simulationConfig.fouls.helpMagnitude + defensiveEffect.foul + (defense.strategy.defensiveScheme === "full-court-press" ? simulationConfig.fouls.pressExtra : 0) + (offense.strategy.shotEmphasis === "free-throws" ? simulationConfig.fouls.drawFoulsExtra : 0) + (defenderProfile.hiddenTraits.includes("Foul-prone") ? 0.012 : 0) - (coachRating(defense, "discipline") - simulationConfig.coaching.neutralRating) / 2000);
  if (rng.chance(foulChance)) {
    const offensiveFoul = rng.chance(simulationConfig.fouls.offensiveShare + (shooterProfile.hiddenTraits.includes("Turnover-prone") ? simulationConfig.fouls.turnoverProneExtra : 0));
    if (offensiveFoul) {
      chargeFoul(offense, shooter);
      shooter.stats.turnovers += 1; shooter.stats.offensiveFouls += 1;
      emit(state, { kind: "foul", foulType: "offensive", period: state.period, clock: state.clock, teamId: offense.team.id, playerId: shooter.playerId, opponentPlayerId: defender.playerId, text: `${shooterProfile.name} is called for an offensive foul.` });
      foulOut(state, offense, shooter);
      state.possessionTeamId = defense.team.id;
      endStep(state, rng, "foul"); return;
    }
    chargeFoul(defense, defender);
    const shooting = rng.chance(simulationConfig.shootingFoulShare[shotType]);
    if (!shooting) {
      const doubleBonus = defense.teamFouls >= simulationConfig.fouls.doubleBonusThreshold;
      const bonus = defense.teamFouls >= simulationConfig.fouls.bonusThreshold;
      emit(state, { kind: "foul", foulType: bonus ? "bonus" : "defensive-non-shooting", period: state.period, clock: state.clock, teamId: defense.team.id, playerId: defender.playerId, opponentPlayerId: shooter.playerId, text: `${defenderProfile.name} is called for a ${bonus ? "bonus " : "non-shooting "}foul on ${shooterProfile.name}.` });
      foulOut(state, defense, defender);
      if (bonus) shootFreeThrows(state, offense, defense, shooter, 2, rng, !doubleBonus);
      else { state.possessionTeamId = offense.team.id; state.continuationTeamId = offense.team.id; }
      endStep(state, rng, bonus ? "free-throws" : "foul"); return;
    }
    const andOne = rng.chance(simulationConfig.andOneChance[shotType] * shotMakeChance(state, offense, defense, shooter, defender, shotType, rng));
    emit(state, { kind: "foul", foulType: "shooting", period: state.period, clock: state.clock, teamId: defense.team.id, playerId: defender.playerId, opponentPlayerId: shooter.playerId, shotType, text: `${defenderProfile.name} fouls ${shooterProfile.name} on the ${shotType}.` });
    foulOut(state, defense, defender);
    if (andOne) {
      const points = shotType === "three" ? 3 : 2;
      shooter.stats.fga += 1; shooter.stats.fgm += 1; shooter.stats.points += points;
      if (shotType === "three") { shooter.stats.threePa += 1; shooter.stats.threePm += 1; } else { shooter.stats.twoPa += 1; shooter.stats.twoPm += 1; }
      incrementPlusMinus(offense, defense, points);
      emit(state, { kind: "shot", period: state.period, clock: state.clock, teamId: offense.team.id, playerId: shooter.playerId, shotType, result: "made", points, text: `${shooterProfile.name} scores through contact.` });
      shootFreeThrows(state, offense, defense, shooter, 1, rng);
    } else {
      shootFreeThrows(state, offense, defense, shooter, shotType === "three" ? 3 : 2, rng);
    }
    endStep(state, rng, "free-throws"); return;
  }

  shooter.stats.fga += 1;
  if (shotType === "three") shooter.stats.threePa += 1; else shooter.stats.twoPa += 1;
  const makeChance = shotMakeChance(state, offense, defense, shooter, defender, shotType, rng);
  const blocked = shotType !== "three" && rng.chance(clampChance(0.018 + (defenderProfile.ratings.block - 70) / 650 + defenderProfile.ratings.athleticism / 4000 - shooterProfile.ratings.athleticism / 3500));
  if (blocked) {
    defender.stats.blocks += 1;
    emit(state, { kind: "shot", period: state.period, clock: state.clock, teamId: offense.team.id, playerId: shooter.playerId, opponentPlayerId: defender.playerId, shotType, result: "blocked", points: 0, text: `${defenderProfile.name} blocks ${shooterProfile.name}'s ${shotType}.` });
    resolveRebound(state, offense, defense, rng, simulationConfig.rebounds.blockOffensiveRecoveryAdjustment);
    endStep(state, rng, "possession"); return;
  }
  const made = rng.chance(makeChance);
  if (made) {
    const points = shotType === "three" ? 3 : 2;
    shooter.stats.points += points; shooter.stats.fgm += 1;
    if (shotType === "three") shooter.stats.threePm += 1; else shooter.stats.twoPm += 1;
    if (shotType === "dunk") shooter.stats.dunks += 1;
    if (shotType === "layup" || shotType === "dunk" || shotType === "post") shooter.stats.pointsInPaint += 2;
    if (offense.strategy.offensiveStyle === "transition" && rng.chance(clampChance(simulationConfig.transition.fastBreakBase + (averageActiveRating(offense, "speed") - 70) / 30 * simulationConfig.transition.speedFastBreakMagnitude))) shooter.stats.fastBreakPoints += points;
    const passer = active(offense).filter((player) => player.playerId !== shooter.playerId).sort((a, b) => profile(offense, b).ratings.passing - profile(offense, a).ratings.passing)[0];
    const assistEffect = simulationConfig.strategy[offense.strategy.offensiveStyle].assist;
    if (passer && rng.chance(clampChance(0.34 + profile(offense, passer).ratings.passing / 500 + profile(offense, passer).ratings.basketballIQ / 1200 + assistEffect))) passer.stats.assists += 1;
    incrementPlusMinus(offense, defense, points);
    shooter.state.confidence = Math.min(90, shooter.state.confidence + 2);
    emit(state, { kind: "shot", period: state.period, clock: state.clock, teamId: offense.team.id, playerId: shooter.playerId, secondaryPlayerId: passer?.playerId, shotType, result: "made", points, text: `${shooterProfile.name} ${shotType === "three" ? "buries a three" : shotType === "dunk" ? "throws down a dunk" : `hits a ${shotType}`} for ${points}.` });
    state.possessionTeamId = defense.team.id;
    endStep(state, rng, "made-basket"); return;
  }

  shooter.state.confidence = Math.max(20, shooter.state.confidence - 1);
  emit(state, { kind: "shot", period: state.period, clock: state.clock, teamId: offense.team.id, playerId: shooter.playerId, opponentPlayerId: defender.playerId, shotType, result: "missed", points: 0, text: `${shooterProfile.name} misses a ${shotType}.` });
  resolveRebound(state, offense, defense, rng);
  endStep(state, rng, "possession");
}

export function initializeGame(input: SimulationInput): GameState {
  const rng = new SeededRandom(input.seed);
  const home = makeRuntime(input.home, input.homeLineup, input.homeStrategy, input.homeCoach ?? input.home.coach);
  const away = makeRuntime(input.away, input.awayLineup, input.awayStrategy, input.awayCoach ?? input.away.coach);
  const openingPossessionTeamId = rng.chance(0.5) ? home.team.id : away.team.id;
  const state: GameState = {
    seed: input.seed,
    rngState: 0,
    homeStartingLineup: [...input.homeLineup.playerIds],
    awayStartingLineup: [...input.awayLineup.playerIds],
    home,
    away,
    neutralSite: input.neutralSite ?? false,
    openingPossessionTeamId,
    possessionTeamId: openingPossessionTeamId,
    period: 1,
    clock: 1200,
    totalSeconds: 0,
    nextEventId: 1,
    events: [],
    status: "playing",
    stoppage: "game-start",
  };
  if (!state.neutralSite) for (const player of state.home.players) player.state.confidence = Math.min(90, player.state.confidence + homeCourtScale(state, state.home) * simulationConfig.homeCourt.confidence);
  state.rngState = rng.getState();
  emit(state, { kind: "period-start", period: 1, clock: 1200, text: "Period 1 begins." });
  return state;
}

export function simulateOnePossession(state: GameState): GameState {
  const next = cloneState(state);
  stepMutable(next);
  return next;
}

export function simulateToNextStoppage(state: GameState): GameState {
  const next = cloneState(state);
  if (next.status === "complete") return next;
  do stepMutable(next); while (next.status === "playing" && next.stoppage === "possession");
  return next;
}

export function simulateToHalftime(state: GameState): GameState {
  const next = cloneState(state);
  while (next.status === "playing" && next.period === 1) stepMutable(next);
  return next;
}

export function simulateToEnd(state: GameState): GameState {
  const next = cloneState(state);
  while (next.status === "playing") stepMutable(next);
  return next;
}

export function setGameLineup(state: GameState, teamId: string, playerIds: string[]): GameState {
  if (state.status === "complete") throw new Error("The game is already complete.");
  const next = cloneState(state);
  const runtime = teamId === next.home.team.id ? next.home : teamId === next.away.team.id ? next.away : undefined;
  if (!runtime) throw new Error("Team is not part of this game.");
  validateLineup(runtime.team, { playerIds });
  for (const playerId of playerIds) {
    const player = runtimePlayer(runtime, playerId);
    if (!player.state.available) throw new Error(`${profile(runtime, player).name} is unavailable.`);
    if (player.state.fouls >= simulationConfig.fouls.foulOutLimit) throw new Error(`${profile(runtime, player).name} has fouled out.`);
  }
  const previous = [...runtime.lineup];
  runtime.lineup = [...playerIds];
  for (const player of runtime.players) player.state.role = playerIds.includes(player.playerId) ? (player.state.role === "starter" ? "starter" : "rotation") : "bench";
  const incoming = playerIds.filter((id) => !previous.includes(id));
  const outgoing = previous.filter((id) => !playerIds.includes(id));
  incoming.forEach((playerId, index) => emit(next, {
    kind: "substitution", period: next.period, clock: next.clock, teamId, playerId, secondaryPlayerId: outgoing[index],
    text: `${runtime.team.shortName} checks in ${profile(runtime, runtimePlayer(runtime, playerId)).name}${outgoing[index] ? ` for ${profile(runtime, runtimePlayer(runtime, outgoing[index])).name}` : ""}.`,
  }));
  next.stoppage = "possession";
  return next;
}

export function setGameStrategy(state: GameState, teamId: string, strategy: Strategy): GameState {
  if (state.status === "complete") throw new Error("The game is already complete.");
  const next = cloneState(state);
  const runtime = teamId === next.home.team.id ? next.home : teamId === next.away.team.id ? next.away : undefined;
  if (!runtime) throw new Error("Team is not part of this game.");
  const changed = runtime.strategy.offensiveStyle !== strategy.offensiveStyle || runtime.strategy.defensiveScheme !== strategy.defensiveScheme || runtime.strategy.pace !== strategy.pace;
  runtime.strategy = { ...strategy };
  if (changed) {
    const adjustment = (coachRating(runtime, "adaptability") - simulationConfig.coaching.neutralRating) / 30 * simulationConfig.coaching.adaptabilityChangeMagnitude * 100;
    for (const player of active(runtime)) player.state.confidence = Math.max(20, Math.min(90, player.state.confidence + adjustment));
  }
  return next;
}

export function callTimeout(state: GameState, teamId: string): GameState {
  if (state.status === "complete") throw new Error("The game is already complete.");
  const next = cloneState(state);
  const runtime = teamId === next.home.team.id ? next.home : teamId === next.away.team.id ? next.away : undefined;
  if (!runtime) throw new Error("Team is not part of this game.");
  if (runtime.timeoutsRemaining <= 0) throw new Error("No timeouts remaining.");
  runtime.timeoutsRemaining -= 1;
  for (const player of active(runtime)) player.state.fatigue = Math.max(0, player.state.fatigue - simulationConfig.fatigue.timeoutRecovery);
  emit(next, { kind: "timeout", period: next.period, clock: next.clock, teamId, text: `${runtime.team.shortName} calls timeout. ${runtime.timeoutsRemaining} remaining.` });
  next.stoppage = "timeout";
  return next;
}

export function finalizeGame(state: GameState): GameResult {
  if (state.status !== "complete") throw new Error("Cannot finalize a game that is still in progress.");
  const finished = cloneState(state);
  const home = finishRuntime(finished.home);
  const away = finishRuntime(finished.away);
  return {
    seed: finished.seed,
    homeStartingLineup: [...finished.homeStartingLineup],
    awayStartingLineup: [...finished.awayStartingLineup],
    home,
    away,
    events: finished.events,
    winnerId: home.stats.points >= away.stats.points ? home.team.id : away.team.id,
    periods: finished.period,
    durationSeconds: finished.totalSeconds,
  };
}

export function simulateGame(input: SimulationInput): GameResult {
  const state = initializeGame(input);
  while (state.status === "playing") stepMutable(state);
  return finalizeGame(state);
}
