import type {
  BoxScore,
  GameEvent,
  GameResult,
  GameRuntimePlayer,
  GameRuntimeTeam,
  GameState,
  GameStoppage,
  Lineup,
  PlayerProfile,
  PlayerStats,
  ShotEmphasis,
  SimulationInput,
  Strategy,
  Team,
  TeamStats,
} from "../domain/types";
import { SeededRandom } from "./rng";
import { validateLineup } from "./validation";

type ShotType = "layup" | "dunk" | "mid-range" | "three" | "post";

const paceSeconds: Record<Strategy["pace"], [number, number]> = {
  "very-slow": [20, 27], slow: [18, 24], balanced: [15, 21], fast: [12, 18], "very-fast": [9, 15],
};

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

function makeRuntime(team: Team, lineup: Lineup, strategy: Strategy): GameRuntimeTeam {
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
    team, strategy: { ...strategy }, players, lineup: [...lineup.playerIds], possessions: 0, score: 0,
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
  const weights = five.map((player) => {
    const ratings = profile(runtime, player).ratings;
    return ratings.insideScoring + ratings.threePoint + ratings.ballHandling + (preferred.has(player.playerId) ? 18 : 0) + player.state.confidence - player.state.fatigue;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = rng.next() * total;
  for (let index = 0; index < five.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) return five[index];
  }
  return five[five.length - 1];
}

function pickShot(strategy: Strategy, shooter: PlayerProfile, rng: SeededRandom): ShotType {
  const emphasis: Record<ShotEmphasis, Partial<Record<ShotType, number>>> = {
    rim: { layup: 42, dunk: 10, post: 10, "mid-range": 13, three: 25 },
    "mid-range": { layup: 20, dunk: 3, post: 15, "mid-range": 40, three: 22 },
    three: { layup: 14, dunk: 3, post: 8, "mid-range": 18, three: 57 },
    post: { layup: 20, dunk: 8, post: 44, "mid-range": 18, three: 10 },
    "free-throws": { layup: 35, dunk: 8, post: 18, "mid-range": 18, three: 21 },
  };
  const weights: [ShotType, number][] = [
    ["layup", (emphasis[strategy.shotEmphasis].layup ?? 0) + (strategy.offensiveStyle === "transition" || strategy.offensiveStyle === "drive-and-kick" ? 12 : 0)],
    ["dunk", (emphasis[strategy.shotEmphasis].dunk ?? 0) + (shooter.ratings.dunking > 78 ? 8 : 0) + (strategy.offensiveStyle === "transition" ? 8 : 0)],
    ["mid-range", (emphasis[strategy.shotEmphasis]["mid-range"] ?? 0) + (strategy.offensiveStyle === "isolation" ? 9 : 0)],
    ["three", (emphasis[strategy.shotEmphasis].three ?? 0) + (shooter.ratings.threePoint > 82 ? 8 : 0) + (strategy.offensiveStyle === "three-point" || strategy.offensiveStyle === "drive-and-kick" ? 13 : 0)],
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

function schemeModifier(scheme: Strategy["defensiveScheme"]): { turnover: number; shot: number; foul: number; three: number } {
  return {
    man: { turnover: 0.01, shot: 0, foul: 0, three: 0 },
    zone: { turnover: -0.01, shot: -0.01, foul: -0.01, three: 0.08 },
    switching: { turnover: 0.01, shot: -0.015, foul: 0.01, three: 0.01 },
    conservative: { turnover: -0.02, shot: 0.025, foul: -0.02, three: 0.01 },
    "aggressive-help": { turnover: 0.045, shot: -0.02, foul: 0.035, three: 0.08 },
    "full-court-press": { turnover: 0.07, shot: 0.01, foul: 0.03, three: -0.01 },
  }[scheme];
}

function emit(state: GameState, event: Omit<GameEvent, "id">): void {
  state.events.push({ id: state.nextEventId++, ...event });
}

function incrementPlusMinus(scoring: GameRuntimeTeam, defending: GameRuntimeTeam, points: number): void {
  for (const player of active(scoring)) player.stats.plusMinus += points;
  for (const player of active(defending)) player.stats.plusMinus -= points;
}

function updateFatigue(offense: GameRuntimeTeam, defense: GameRuntimeTeam, seconds: number): void {
  for (const player of active(offense)) {
    player.activeSeconds += seconds;
    player.state.fatigue = Math.min(96, player.state.fatigue + seconds / Math.max(30, profile(offense, player).ratings.stamina) * 2.2 + 0.6);
  }
  for (const player of active(defense)) {
    player.activeSeconds += seconds;
    player.state.fatigue = Math.min(96, player.state.fatigue + seconds / Math.max(30, profile(defense, player).ratings.stamina) * 2.5 + 0.8);
  }
  for (const runtime of [offense, defense]) {
    const activeIds = new Set(runtime.lineup);
    for (const player of runtime.players) if (!activeIds.has(player.playerId)) player.state.fatigue = Math.max(0, player.state.fatigue - seconds / 24);
  }
}

function substituteIfNeeded(state: GameState, runtime: GameRuntimeTeam): void {
  const five = active(runtime);
  if (five.length !== 5) return;
  const usedCount = runtime.players.filter((player) => player.activeSeconds > 0).length;
  const maxBenchPlayers = Math.max(0, runtime.strategy.rotationSize - 5);
  const bench = runtime.players.filter((player) => player.state.available && !runtime.lineup.includes(player.playerId) && player.state.fouls < 5 && (player.activeSeconds > 0 || usedCount < 5 + maxBenchPlayers))
    .sort((a, b) => (profile(runtime, b).ratings.overall - b.state.fatigue) - (profile(runtime, a).ratings.overall - a.state.fatigue));
  if (!bench.length) return;
  const tired = five.filter((player) => player.state.fatigue > (runtime.strategy.pace === "very-fast" ? 48 : 62));
  const foulTrouble = runtime.strategy.foulTroubleSubstitution ? five.filter((player) => player.state.fouls >= 4) : [];
  const outgoing = [...foulTrouble, ...tired].sort((a, b) => b.state.fatigue - a.state.fatigue)[0];
  if (!outgoing || (state.clock > 1050 && state.period === 1 && outgoing.state.fouls < 4)) return;
  const incoming = bench[0];
  runtime.lineup[runtime.lineup.indexOf(outgoing.playerId)] = incoming.playerId;
  outgoing.state.role = "bench";
  incoming.state.role = "rotation";
  emit(state, {
    kind: "substitution", period: state.period, clock: state.clock, teamId: runtime.team.id, playerId: incoming.playerId,
    secondaryPlayerId: outgoing.playerId, text: `${runtime.team.shortName} checks in ${profile(runtime, incoming).name} for ${profile(runtime, outgoing).name}.`,
  });
}

function forceValidLineup(runtime: GameRuntimeTeam): void {
  runtime.lineup = runtime.lineup.filter((id) => {
    const player = runtime.players.find((candidate) => candidate.playerId === id);
    return player?.state.available && player.state.fouls < 5;
  });
  const candidates = runtime.players.filter((player) => player.state.available && player.state.fouls < 5 && !runtime.lineup.includes(player.playerId))
    .sort((a, b) => profile(runtime, b).ratings.overall - profile(runtime, a).ratings.overall);
  while (runtime.lineup.length < 5 && candidates.length) runtime.lineup.push(candidates.shift()!.playerId);
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
    for (const runtime of [state.home, state.away]) for (const player of runtime.players) player.state.fatigue = Math.max(0, player.state.fatigue - 18);
    state.period = 2; state.clock = 1200; state.home.teamFouls = 0; state.away.teamFouls = 0; state.stoppage = "halftime";
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
  emit(state, { kind: "period-start", period: state.period, clock: 300, text: `Overtime ${state.period - 2} begins.` });
}

function endStep(state: GameState, rng: SeededRandom, stoppage: GameStoppage): void {
  state.stoppage = stoppage;
  refreshRuntime(state.home); refreshRuntime(state.away);
  if (state.clock <= 0) endPeriod(state, rng);
  state.rngState = rng.getState();
}

function stepMutable(state: GameState): void {
  if (state.status === "complete") return;
  const rng = SeededRandom.fromState(state.rngState);
  forceValidLineup(state.home); forceValidLineup(state.away);
  substituteIfNeeded(state, state.home); substituteIfNeeded(state, state.away);
  const offense = state.possessionTeamId === state.home.team.id ? state.home : state.away;
  const defense = offense === state.home ? state.away : state.home;
  const seconds = Math.min(state.clock, rng.int(...paceSeconds[offense.strategy.pace]));
  const shooter = chooseScorer(offense, rng);
  const shooterProfile = profile(offense, shooter);
  const defender = rng.pick(active(defense));
  const defenderProfile = profile(defense, defender);
  const shotType = pickShot(offense.strategy, shooterProfile, rng);
  offense.possessions += 1;
  const defensiveEffect = schemeModifier(defense.strategy.defensiveScheme);
  const pressure = defense.strategy.pressFrequency / 100 * 0.04;
  const fatigue = shooter.state.fatigue / 100;
  const turnoverChance = 0.065 + pressure + defensiveEffect.turnover + fatigue * 0.09 - shooterProfile.ratings.ballHandling / 1800;
  updateFatigue(offense, defense, seconds);
  state.clock -= seconds;
  state.totalSeconds += seconds;
  if (rng.chance(turnoverChance)) {
    shooter.stats.turnovers += 1;
    shooter.state.confidence = Math.max(20, shooter.state.confidence - 4);
    const stolen = rng.chance(0.62);
    if (stolen) defender.stats.steals += 1;
    emit(state, { kind: "turnover", period: state.period, clock: state.clock, teamId: offense.team.id, playerId: shooter.playerId, opponentPlayerId: defender.playerId, text: `${shooterProfile.name} turns it over${stolen ? ` — ${defenderProfile.name} jumps the passing lane.` : "."}` });
    state.possessionTeamId = defense.team.id;
    endStep(state, rng, "turnover"); return;
  }

  const foulChance = 0.045 + defense.strategy.helpDefense / 100 * 0.025 + defensiveEffect.foul + (defense.strategy.defensiveScheme === "full-court-press" ? 0.018 : 0) + (offense.strategy.shotEmphasis === "free-throws" ? 0.018 : 0);
  if (rng.chance(foulChance)) {
    defender.state.fouls += 1; defender.stats.fouls += 1; defender.state.confidence = Math.max(20, defender.state.confidence - 1); defense.teamFouls += 1;
    const offensiveFoul = rng.chance(0.14 + (shooterProfile.hiddenTraits.includes("Turnover-prone") ? 0.06 : 0));
    if (offensiveFoul) {
      shooter.stats.turnovers += 1; shooter.stats.offensiveFouls += 1; shooter.stats.fouls += 1; shooter.state.fouls += 1; offense.teamFouls += 1;
      emit(state, { kind: "foul", period: state.period, clock: state.clock, teamId: offense.team.id, playerId: shooter.playerId, opponentPlayerId: defender.playerId, result: "missed", text: `${shooterProfile.name} is called for an offensive foul.` });
      state.possessionTeamId = defense.team.id;
      endStep(state, rng, "foul"); return;
    }
    emit(state, { kind: "foul", period: state.period, clock: state.clock, teamId: defense.team.id, playerId: defender.playerId, opponentPlayerId: shooter.playerId, text: `${defenderProfile.name} fouls ${shooterProfile.name} on the ${shotType}.` });
    const shooting = shotType !== "post" || rng.chance(0.7);
    if (!shooting) {
      state.possessionTeamId = defense.team.id;
      endStep(state, rng, "foul"); return;
    }
    const attempts = shotType === "three" ? 3 : 2;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      shooter.stats.fta += 1;
      const made = rng.chance((shooterProfile.ratings.freeThrow / 100) * (1 - fatigue * 0.14));
      if (made) { shooter.stats.ftm += 1; shooter.stats.points += 1; incrementPlusMinus(offense, defense, 1); }
      emit(state, { kind: "free-throw", period: state.period, clock: state.clock, teamId: offense.team.id, playerId: shooter.playerId, points: made ? 1 : 0, result: made ? "made" : "missed", text: `${shooterProfile.name} ${made ? "makes" : "misses"} free throw ${attempt} of ${attempts}.` });
    }
    state.possessionTeamId = defense.team.id;
    endStep(state, rng, "free-throws"); return;
  }

  shooter.stats.fga += 1;
  if (shotType === "three") shooter.stats.threePa += 1; else shooter.stats.twoPa += 1;
  const skill = shotType === "three" ? shooterProfile.ratings.threePoint : shotType === "mid-range" ? shooterProfile.ratings.midRange : shotType === "post" ? shooterProfile.ratings.insideScoring : shotType === "dunk" ? shooterProfile.ratings.dunking : shooterProfile.ratings.layupFinishing;
  const baseChance = shotType === "three" ? 0.31 : shotType === "mid-range" ? 0.41 : shotType === "dunk" ? 0.69 : shotType === "post" ? 0.48 : 0.56;
  const makeChance = baseChance + (skill - 70) / 250 + (chemistry(offense) - 70) / 700 + offense.team.coach.ratings.offense / 3000 - (defenderProfile.ratings.perimeterDefense + defenderProfile.ratings.interiorDefense) / 4300 - fatigue * 0.13 - defensiveEffect.shot - (shotType === "three" ? defensiveEffect.three * 0.25 : 0);
  const blocked = shotType !== "three" && rng.chance(Math.max(0.01, (defenderProfile.ratings.block - 70) / 350 - shooterProfile.ratings.athleticism / 1500));
  if (blocked) {
    defender.stats.blocks += 1;
    emit(state, { kind: "shot", period: state.period, clock: state.clock, teamId: offense.team.id, playerId: shooter.playerId, opponentPlayerId: defender.playerId, shotType, result: "blocked", points: 0, text: `${defenderProfile.name} blocks ${shooterProfile.name}'s ${shotType}.` });
    state.possessionTeamId = defense.team.id;
    endStep(state, rng, "possession"); return;
  }
  const made = rng.chance(makeChance);
  if (made) {
    const points = shotType === "three" ? 3 : 2;
    shooter.stats.points += points; shooter.stats.fgm += 1;
    if (shotType === "three") shooter.stats.threePm += 1; else shooter.stats.twoPm += 1;
    if (shotType === "dunk") shooter.stats.dunks += 1;
    if (shotType === "layup" || shotType === "dunk" || shotType === "post") shooter.stats.pointsInPaint += 2;
    if (offense.strategy.offensiveStyle === "transition" && rng.chance(0.35)) shooter.stats.fastBreakPoints += points;
    const passer = active(offense).filter((player) => player.playerId !== shooter.playerId).sort((a, b) => profile(offense, b).ratings.passing - profile(offense, a).ratings.passing)[0];
    if (passer && rng.chance(0.48 + profile(offense, passer).ratings.passing / 500)) passer.stats.assists += 1;
    incrementPlusMinus(offense, defense, points);
    shooter.state.confidence = Math.min(90, shooter.state.confidence + 2);
    emit(state, { kind: "shot", period: state.period, clock: state.clock, teamId: offense.team.id, playerId: shooter.playerId, secondaryPlayerId: passer?.playerId, shotType, result: "made", points, text: `${shooterProfile.name} ${shotType === "three" ? "buries a three" : shotType === "dunk" ? "throws down a dunk" : `hits a ${shotType}`} for ${points}.` });
    state.possessionTeamId = defense.team.id;
    endStep(state, rng, "made-basket"); return;
  }

  shooter.state.confidence = Math.max(20, shooter.state.confidence - 1);
  emit(state, { kind: "shot", period: state.period, clock: state.clock, teamId: offense.team.id, playerId: shooter.playerId, opponentPlayerId: defender.playerId, shotType, result: "missed", points: 0, text: `${shooterProfile.name} misses a ${shotType}.` });
  const rebounders = active(offense).filter((player) => player.playerId !== shooter.playerId);
  const offensiveReboundChance = 0.17 + offense.strategy.reboundingAggressiveness / 100 * 0.16 + shooterProfile.ratings.offensiveRebounding / 900 - defense.strategy.reboundingAggressiveness / 1600;
  if (rebounders.length && rng.chance(offensiveReboundChance)) {
    const rebounder = [...rebounders].sort((a, b) => profile(offense, b).ratings.offensiveRebounding - profile(offense, a).ratings.offensiveRebounding)[0];
    rebounder.stats.offensiveRebounds += 1;
    emit(state, { kind: "rebound", period: state.period, clock: state.clock, teamId: offense.team.id, playerId: rebounder.playerId, text: `${profile(offense, rebounder).name} grabs the offensive rebound.` });
    state.possessionTeamId = offense.team.id;
  } else {
    const rebounder = [...active(defense)].sort((a, b) => profile(defense, b).ratings.defensiveRebounding - profile(defense, a).ratings.defensiveRebounding)[0];
    rebounder.stats.defensiveRebounds += 1;
    emit(state, { kind: "rebound", period: state.period, clock: state.clock, teamId: defense.team.id, playerId: rebounder.playerId, text: `${profile(defense, rebounder).name} secures the defensive rebound.` });
    state.possessionTeamId = defense.team.id;
  }
  endStep(state, rng, "possession");
}

export function initializeGame(input: SimulationInput): GameState {
  const rng = new SeededRandom(input.seed);
  const home = makeRuntime(input.home, input.homeLineup, input.homeStrategy);
  const away = makeRuntime(input.away, input.awayLineup, input.awayStrategy);
  const state: GameState = {
    seed: input.seed,
    rngState: 0,
    homeStartingLineup: [...input.homeLineup.playerIds],
    awayStartingLineup: [...input.awayLineup.playerIds],
    home,
    away,
    possessionTeamId: rng.chance(0.5) ? home.team.id : away.team.id,
    period: 1,
    clock: 1200,
    totalSeconds: 0,
    nextEventId: 1,
    events: [],
    status: "playing",
    stoppage: "game-start",
  };
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
    if (player.state.fouls >= 5) throw new Error(`${profile(runtime, player).name} has fouled out.`);
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
  runtime.strategy = { ...strategy };
  return next;
}

export function callTimeout(state: GameState, teamId: string): GameState {
  if (state.status === "complete") throw new Error("The game is already complete.");
  const next = cloneState(state);
  const runtime = teamId === next.home.team.id ? next.home : teamId === next.away.team.id ? next.away : undefined;
  if (!runtime) throw new Error("Team is not part of this game.");
  if (runtime.timeoutsRemaining <= 0) throw new Error("No timeouts remaining.");
  runtime.timeoutsRemaining -= 1;
  for (const player of active(runtime)) player.state.fatigue = Math.max(0, player.state.fatigue - 8);
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
