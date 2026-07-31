import type {
  BoxScore, GameEvent, GameResult, Lineup, PlayerGameState, PlayerProfile, PlayerStats,
  ShotEmphasis, SimulationInput, Strategy, Team, TeamStats,
} from "../domain/types";
import { SeededRandom } from "./rng";
import { validateLineup } from "./validation";

type ShotType = "layup" | "dunk" | "mid-range" | "three" | "post";
type RuntimePlayer = { profile: PlayerProfile; state: PlayerGameState; stats: PlayerStats; activeSeconds: number };
type Runtime = {
  team: Team;
  strategy: Strategy;
  players: Map<string, RuntimePlayer>;
  lineup: string[];
  possessions: number;
};

const emptyStats = (playerId: string): PlayerStats => ({
  playerId, minutes: 0, points: 0, fgm: 0, fga: 0, twoPm: 0, twoPa: 0, threePm: 0, threePa: 0,
  ftm: 0, fta: 0, offensiveRebounds: 0, defensiveRebounds: 0, assists: 0, steals: 0, blocks: 0,
  turnovers: 0, fouls: 0, plusMinus: 0, dunks: 0, fastBreakPoints: 0, pointsInPaint: 0, offensiveFouls: 0,
});

const paceSeconds: Record<Strategy["pace"], [number, number]> = {
  "very-slow": [20, 27], slow: [18, 24], balanced: [15, 21], fast: [12, 18], "very-fast": [9, 15],
};

function makeRuntime(team: Team, lineup: Lineup, strategy: Strategy): Runtime {
  validateLineup(team, lineup);
  const starters = new Set(lineup.playerIds);
  const players = new Map(team.roster.map((profile) => [profile.id, {
    profile,
    state: {
      playerId: profile.id, fatigue: 0, stamina: profile.ratings.stamina, fouls: 0, minutes: 0,
      confidence: 50, available: true, role: starters.has(profile.id) ? "starter" : "bench",
    } as PlayerGameState,
    stats: emptyStats(profile.id), activeSeconds: 0,
  }]));
  return { team, strategy, players, lineup: [...lineup.playerIds], possessions: 0 };
}

function active(runtime: Runtime): RuntimePlayer[] {
  return runtime.lineup.map((id) => runtime.players.get(id)).filter((player): player is RuntimePlayer => Boolean(player));
}

function chemistry(runtime: Runtime): number {
  const five = active(runtime);
  const ballHandling = five.reduce((sum, p) => sum + p.profile.ratings.ballHandling, 0) / 5;
  const passing = five.reduce((sum, p) => sum + p.profile.ratings.passing, 0) / 5;
  const spacing = five.reduce((sum, p) => sum + p.profile.ratings.threePoint, 0) / 5;
  const size = five.reduce((sum, p) => sum + p.profile.ratings.strength, 0) / 5;
  const leaders = five.filter((p) => p.profile.personality === "Vocal leader" || p.profile.hiddenTraits.includes("Strong leadership")).length;
  return (ballHandling + passing + spacing + size) / 4 + leaders * 1.5;
}

function chooseScorer(runtime: Runtime, rng: SeededRandom): ReturnType<typeof active>[number] {
  const five = active(runtime);
  const preferred = new Set(five.filter((p) => p.state.role === "starter").map((p) => p.profile.id));
  const weights = five.map((player) => {
    const rating = player.profile.ratings.insideScoring + player.profile.ratings.threePoint + player.profile.ratings.ballHandling;
    return rating + (preferred.has(player.profile.id) ? 18 : 0) + player.state.confidence - player.state.fatigue;
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

function incrementPlusMinus(scoring: Runtime, defending: Runtime, points: number): void {
  for (const player of active(scoring)) player.stats.plusMinus += points;
  for (const player of active(defending)) player.stats.plusMinus -= points;
}

function emit(events: GameEvent[], nextId: { value: number }, event: Omit<GameEvent, "id">): void {
  events.push({ id: nextId.value++, ...event });
}

function updateFatigue(offense: Runtime, defense: Runtime, seconds: number): void {
  for (const player of active(offense)) {
    player.activeSeconds += seconds;
    player.state.fatigue = Math.min(96, player.state.fatigue + seconds / Math.max(30, player.profile.ratings.stamina) * 2.2 + 0.6);
  }
  for (const player of active(defense)) {
    player.activeSeconds += seconds;
    player.state.fatigue = Math.min(96, player.state.fatigue + seconds / Math.max(30, player.profile.ratings.stamina) * 2.5 + 0.8);
  }
  for (const runtime of [offense, defense]) {
    const activeIds = new Set(runtime.lineup);
    for (const player of runtime.players.values()) {
      if (!activeIds.has(player.profile.id)) player.state.fatigue = Math.max(0, player.state.fatigue - seconds / 24);
    }
  }
}

function substituteIfNeeded(runtime: Runtime, period: number, clock: number, events: GameEvent[], nextId: { value: number }): void {
  const five = active(runtime);
  if (five.length !== 5) return;
  const usedCount = [...runtime.players.values()].filter((player) => player.activeSeconds > 0).length;
  const maxBenchPlayers = Math.max(0, runtime.strategy.rotationSize - 5);
  const bench = [...runtime.players.values()].filter((player) => player.state.available && !runtime.lineup.includes(player.profile.id) && player.state.fouls < 5 && (player.activeSeconds > 0 || usedCount < 5 + maxBenchPlayers))
    .sort((a, b) => (b.profile.ratings.overall - b.state.fatigue) - (a.profile.ratings.overall - a.state.fatigue));
  if (!bench.length) return;
  const tired = five.filter((player) => player.state.fatigue > (runtime.strategy.pace === "very-fast" ? 48 : 62));
  const foulTrouble = runtime.strategy.foulTroubleSubstitution ? five.filter((player) => player.state.fouls >= 4) : [];
  const outgoing = [...foulTrouble, ...tired].sort((a, b) => b.state.fatigue - a.state.fatigue)[0];
  if (!outgoing || (clock > 1050 && period === 1 && outgoing.state.fouls < 4)) return;
  const incoming = bench[0];
  const index = runtime.lineup.indexOf(outgoing.profile.id);
  runtime.lineup[index] = incoming.profile.id;
  outgoing.state.role = "bench";
  incoming.state.role = "rotation";
  emit(events, nextId, {
    kind: "substitution", period, clock, teamId: runtime.team.id, playerId: incoming.profile.id,
    secondaryPlayerId: outgoing.profile.id, text: `${runtime.team.shortName} checks in ${incoming.profile.name} for ${outgoing.profile.name}.`,
  });
}

function forceValidLineup(runtime: Runtime): void {
  runtime.lineup = runtime.lineup.filter((id) => runtime.players.get(id)?.state.available && (runtime.players.get(id)?.state.fouls ?? 0) < 5);
  const candidates = [...runtime.players.values()].filter((player) => player.state.available && player.state.fouls < 5 && !runtime.lineup.includes(player.profile.id))
    .sort((a, b) => b.profile.ratings.overall - a.profile.ratings.overall);
  while (runtime.lineup.length < 5 && candidates.length) runtime.lineup.push(candidates.shift()!.profile.id);
}

function finalizeStats(runtime: Runtime): BoxScore {
  for (const player of runtime.players.values()) {
    player.stats.minutes = Number((player.activeSeconds / 60).toFixed(1));
    player.state.minutes = player.stats.minutes;
  }
  const players = [...runtime.players.values()].map((player) => player.stats);
  const sum = (key: keyof PlayerStats) => players.reduce((total, player) => total + Number(player[key]), 0);
  const stats: TeamStats = {
    teamId: runtime.team.id, points: sum("points"), possessions: runtime.possessions, fgm: sum("fgm"), fga: sum("fga"),
    threePm: sum("threePm"), threePa: sum("threePa"), ftm: sum("ftm"), fta: sum("fta"), offensiveRebounds: sum("offensiveRebounds"),
    defensiveRebounds: sum("defensiveRebounds"), assists: sum("assists"), steals: sum("steals"), blocks: sum("blocks"), turnovers: sum("turnovers"),
    fouls: sum("fouls"), fastBreakPoints: sum("fastBreakPoints"), pointsInPaint: sum("pointsInPaint"),
  };
  return { team: runtime.team, stats, players };
}

function runtimePoints(runtime: Runtime): number {
  return [...runtime.players.values()].reduce((sum, player) => sum + player.stats.points, 0);
}

export function simulateGame(input: SimulationInput): GameResult {
  const rng = new SeededRandom(input.seed);
  const home = makeRuntime(input.home, input.homeLineup, input.homeStrategy);
  const away = makeRuntime(input.away, input.awayLineup, input.awayStrategy);
  const events: GameEvent[] = [];
  const nextId = { value: 1 };
  let possession = rng.chance(0.5) ? home : away;
  let totalSeconds = 0;
  let period = 2;

  const runPeriod = (periodNumber: number, length: number): void => {
    let clock = length;
    emit(events, nextId, { kind: "period-start", period: periodNumber, clock, text: periodNumber <= 2 ? `Period ${periodNumber} begins.` : `Overtime ${periodNumber - 2} begins.` });
    while (clock > 0) {
      forceValidLineup(home); forceValidLineup(away);
      substituteIfNeeded(home, periodNumber, clock, events, nextId);
      substituteIfNeeded(away, periodNumber, clock, events, nextId);
      const offense = possession;
      const defense = offense === home ? away : home;
      const seconds = Math.min(clock, rng.int(...paceSeconds[offense.strategy.pace]));
      const shooter = chooseScorer(offense, rng);
      const defender = rng.pick(active(defense));
      const shotType = pickShot(offense.strategy, shooter.profile, rng);
      offense.possessions += 1;
      const defensiveEffect = schemeModifier(defense.strategy.defensiveScheme);
      const pressure = defense.strategy.pressFrequency / 100 * 0.04;
      const fatigue = shooter.state.fatigue / 100;
      const turnoverChance = 0.065 + pressure + defensiveEffect.turnover + fatigue * 0.09 - shooter.profile.ratings.ballHandling / 1800;
      updateFatigue(offense, defense, seconds);
      clock -= seconds;
      totalSeconds += seconds;
      if (rng.chance(turnoverChance)) {
        shooter.stats.turnovers += 1;
        offense.players.get(shooter.profile.id)!.state.confidence = Math.max(20, shooter.state.confidence - 4);
        const stolen = rng.chance(0.62);
        if (stolen) defender.stats.steals += 1;
        emit(events, nextId, { kind: "turnover", period: periodNumber, clock, teamId: offense.team.id, playerId: shooter.profile.id, opponentPlayerId: defender.profile.id, text: `${shooter.profile.name} turns it over${stolen ? ` — ${defender.profile.name} jumps the passing lane.` : "."}` });
        possession = defense;
        continue;
      }

      const foulChance = 0.045 + defense.strategy.helpDefense / 100 * 0.025 + defensiveEffect.foul + (defense.strategy.defensiveScheme === "full-court-press" ? 0.018 : 0) + (offense.strategy.shotEmphasis === "free-throws" ? 0.018 : 0);
      if (rng.chance(foulChance)) {
        defender.state.fouls += 1; defender.stats.fouls += 1; defense.players.get(defender.profile.id)!.state.confidence = Math.max(20, defender.state.confidence - 1);
        const offensiveFoul = rng.chance(0.14 + (shooter.profile.hiddenTraits.includes("Turnover-prone") ? 0.06 : 0));
        if (offensiveFoul) {
          shooter.stats.turnovers += 1; shooter.stats.offensiveFouls += 1; shooter.stats.fouls += 1; shooter.state.fouls += 1;
          emit(events, nextId, { kind: "foul", period: periodNumber, clock, teamId: offense.team.id, playerId: shooter.profile.id, opponentPlayerId: defender.profile.id, result: "missed", text: `${shooter.profile.name} is called for an offensive foul.` });
          possession = defense; continue;
        }
        emit(events, nextId, { kind: "foul", period: periodNumber, clock, teamId: defense.team.id, playerId: defender.profile.id, opponentPlayerId: shooter.profile.id, text: `${defender.profile.name} fouls ${shooter.profile.name} on the ${shotType}.` });
        const shooting = shotType !== "post" || rng.chance(0.7);
        if (!shooting) { possession = defense; continue; }
        const attempts = shotType === "three" ? 3 : 2;
        for (let attempt = 1; attempt <= attempts; attempt += 1) {
          shooter.stats.fta += 1;
          const made = rng.chance((shooter.profile.ratings.freeThrow / 100) * (1 - fatigue * 0.14));
          if (made) { shooter.stats.ftm += 1; shooter.stats.points += 1; incrementPlusMinus(offense, defense, 1); }
          emit(events, nextId, { kind: "free-throw", period: periodNumber, clock, teamId: offense.team.id, playerId: shooter.profile.id, points: made ? 1 : 0, result: made ? "made" : "missed", text: `${shooter.profile.name} ${made ? "makes" : "misses"} free throw ${attempt} of ${attempts}.` });
        }
        possession = defense; continue;
      }

      shooter.stats.fga += 1;
      if (shotType === "three") shooter.stats.threePa += 1; else shooter.stats.twoPa += 1;
      const skill = shotType === "three" ? shooter.profile.ratings.threePoint : shotType === "mid-range" ? shooter.profile.ratings.midRange : shotType === "post" ? shooter.profile.ratings.insideScoring : shotType === "dunk" ? shooter.profile.ratings.dunking : shooter.profile.ratings.layupFinishing;
      const baseChance = shotType === "three" ? 0.31 : shotType === "mid-range" ? 0.41 : shotType === "dunk" ? 0.69 : shotType === "post" ? 0.48 : 0.56;
      const makeChance = baseChance + (skill - 70) / 250 + (chemistry(offense) - 70) / 700 + offense.team.coach.ratings.offense / 3000 - (defender.profile.ratings.perimeterDefense + defender.profile.ratings.interiorDefense) / 4300 - fatigue * 0.13 - defensiveEffect.shot - (shotType === "three" ? defensiveEffect.three * 0.25 : 0);
      const blocked = shotType !== "three" && rng.chance(Math.max(0.01, (defender.profile.ratings.block - 70) / 350 - shooter.profile.ratings.athleticism / 1500));
      if (blocked) {
        defender.stats.blocks += 1;
        emit(events, nextId, { kind: "shot", period: periodNumber, clock, teamId: offense.team.id, playerId: shooter.profile.id, opponentPlayerId: defender.profile.id, shotType, result: "blocked", points: 0, text: `${defender.profile.name} blocks ${shooter.profile.name}'s ${shotType}.` });
        possession = defense; continue;
      }
      const made = rng.chance(makeChance);
      if (made) {
        const points = shotType === "three" ? 3 : 2;
        shooter.stats.points += points; shooter.stats.fgm += 1;
        if (shotType === "three") shooter.stats.threePm += 1; else shooter.stats.twoPm += 1;
        if (shotType === "dunk") shooter.stats.dunks += 1;
        if (shotType === "layup" || shotType === "dunk" || shotType === "post") shooter.stats.pointsInPaint += 2;
        if (offense.strategy.offensiveStyle === "transition" && rng.chance(0.35)) shooter.stats.fastBreakPoints += points;
        const passer = active(offense).filter((player) => player.profile.id !== shooter.profile.id).sort((a, b) => b.profile.ratings.passing - a.profile.ratings.passing)[0];
        if (passer && rng.chance(0.48 + passer.profile.ratings.passing / 500)) passer.stats.assists += 1;
        incrementPlusMinus(offense, defense, points);
        shooter.state.confidence = Math.min(90, shooter.state.confidence + 2);
        emit(events, nextId, { kind: "shot", period: periodNumber, clock, teamId: offense.team.id, playerId: shooter.profile.id, secondaryPlayerId: passer?.profile.id, shotType, result: "made", points, text: `${shooter.profile.name} ${shotType === "three" ? "buries a three" : shotType === "dunk" ? "throws down a dunk" : `hits a ${shotType}`} for ${points}.` });
        possession = defense;
      } else {
        shooter.state.confidence = Math.max(20, shooter.state.confidence - 1);
        emit(events, nextId, { kind: "shot", period: periodNumber, clock, teamId: offense.team.id, playerId: shooter.profile.id, opponentPlayerId: defender.profile.id, shotType, result: "missed", points: 0, text: `${shooter.profile.name} misses a ${shotType}.` });
        const rebounders = active(offense).filter((player) => player.profile.id !== shooter.profile.id);
        const offensiveReboundChance = 0.17 + offense.strategy.reboundingAggressiveness / 100 * 0.16 + shooter.profile.ratings.offensiveRebounding / 900 - defense.strategy.reboundingAggressiveness / 1600;
        if (rebounders.length && rng.chance(offensiveReboundChance)) {
          const rebounder = [...rebounders].sort((a, b) => b.profile.ratings.offensiveRebounding - a.profile.ratings.offensiveRebounding)[0];
          rebounder.stats.offensiveRebounds += 1;
          emit(events, nextId, { kind: "rebound", period: periodNumber, clock, teamId: offense.team.id, playerId: rebounder.profile.id, text: `${rebounder.profile.name} grabs the offensive rebound.` });
          possession = offense;
        } else {
          const rebounder = [...active(defense)].sort((a, b) => b.profile.ratings.defensiveRebounding - a.profile.ratings.defensiveRebounding)[0];
          rebounder.stats.defensiveRebounds += 1;
          emit(events, nextId, { kind: "rebound", period: periodNumber, clock, teamId: defense.team.id, playerId: rebounder.profile.id, text: `${rebounder.profile.name} secures the defensive rebound.` });
          possession = defense;
        }
      }
    }
    emit(events, nextId, { kind: "period-end", period: periodNumber, clock: 0, text: periodNumber === 1 ? "End of the first half." : `End of period ${periodNumber}.` });
  };

  runPeriod(1, 1200);
  emit(events, nextId, { kind: "halftime", period: 1, clock: 0, text: "Halftime. Both teams reset and recover." });
  for (const runtime of [home, away]) for (const player of runtime.players.values()) player.state.fatigue = Math.max(0, player.state.fatigue - 18);
  runPeriod(period, 1200);
  while (runtimePoints(home) === runtimePoints(away)) {
    if (period >= 8) {
      const tiebreaker = rng.chance(0.5) ? home : away;
      const player = active(tiebreaker).sort((a, b) => b.profile.ratings.freeThrow - a.profile.ratings.freeThrow)[0];
      player.stats.fta += 1; player.stats.ftm += 1; player.stats.points += 1;
      emit(events, nextId, { kind: "free-throw", period, clock: 0, teamId: tiebreaker.team.id, playerId: player.profile.id, points: 1, result: "made", text: `${player.profile.name} sinks the decisive free throw.` });
      break;
    }
    period += 1;
    runPeriod(period, 300);
  }
  const homeBox = finalizeStats(home);
  const awayBox = finalizeStats(away);
  const winnerId = homeBox.stats.points >= awayBox.stats.points ? home.team.id : away.team.id;
  emit(events, nextId, { kind: "final", period, clock: 0, text: `Final: ${home.team.shortName} ${homeBox.stats.points}, ${away.team.shortName} ${awayBox.stats.points}.` });
  return { seed: input.seed, home: homeBox, away: awayBox, events, winnerId, periods: period, durationSeconds: totalSeconds };
}
