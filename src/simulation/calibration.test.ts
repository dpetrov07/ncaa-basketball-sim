import { describe, expect, it } from "vitest";
import type { Coach, GameResult, Strategy, Team } from "../domain/types";
import { defaultLineup, defaultStrategy, teams } from "../data/teams";
import { simulateGame } from "./simulateGame";

function play(home: Team, away: Team, seed: number, homeStrategy: Strategy = { ...defaultStrategy }, awayStrategy: Strategy = { ...defaultStrategy }, homeCoach?: Coach, awayCoach?: Coach, neutralSite = false): GameResult {
  return simulateGame({ home, away, homeLineup: { playerIds: defaultLineup(home) }, awayLineup: { playerIds: defaultLineup(away) }, homeStrategy, awayStrategy, homeCoach, awayCoach, neutralSite, seed });
}

function aggregate(results: GameResult[]) {
  const boxes = results.flatMap((result) => [result.home, result.away]);
  const sum = (field: keyof GameResult["home"]["stats"]) => boxes.reduce((total, box) => total + Number(box.stats[field]), 0);
  const fga = sum("fga");
  const missed = fga - sum("fgm");
  return {
    points: sum("points") / boxes.length,
    possessions: sum("possessions") / boxes.length,
    fg: sum("fgm") / Math.max(1, fga),
    threeRate: sum("threePa") / Math.max(1, fga),
    freeThrowRate: sum("fta") / Math.max(1, fga),
    turnoverRate: sum("turnovers") / Math.max(1, sum("possessions")),
    offensiveReboundRate: sum("offensiveRebounds") / Math.max(1, missed),
    fouls: sum("fouls") / boxes.length,
    assistRate: sum("assists") / Math.max(1, sum("fgm")),
  };
}

function batch(count: number, home = teams[2], away = teams[12], homeStrategy: Strategy = { ...defaultStrategy }, awayStrategy: Strategy = homeStrategy): GameResult[] {
  return Array.from({ length: count }, (_, seed) => play(home, away, 50_000 + seed, homeStrategy, awayStrategy));
}

function ratedTeam(label: string, changes: Partial<Team["roster"][number]["ratings"]>): Team {
  const source = teams[2];
  return { ...structuredClone(source), id: `rated-${label}`, shortName: label.slice(0, 3).toUpperCase(), roster: source.roster.map((player) => ({ ...structuredClone(player), id: `${label}-${player.id}`, ratings: { ...player.ratings, ...changes } })) };
}

describe("deterministic basketball calibration", () => {
  it("makes stronger programs favored without eliminating upsets", () => {
    const elite = teams.find((team) => team.program.tier === "elite")!;
    const underdog = teams.find((team) => team.program.tier === "underdog")!;
    let eliteWins = 0;
    const games = 100;
    for (let seed = 0; seed < games; seed += 1) {
      const eliteHome = seed % 2 === 0;
      const result = play(eliteHome ? elite : underdog, eliteHome ? underdog : elite, 10_000 + seed, { ...defaultStrategy }, { ...defaultStrategy }, undefined, undefined, true);
      if (result.winnerId === elite.id) eliteWins += 1;
    }
    expect(eliteWins / games).toBeGreaterThan(0.62);
    expect(eliteWins / games).toBeLessThan(0.98);
  });

  it("makes pace and shot emphasis change aggregate game shape", () => {
    const veryFast = aggregate(batch(40, teams[2], teams[12], { ...defaultStrategy, pace: "very-fast" }));
    const verySlow = aggregate(batch(40, teams[2], teams[12], { ...defaultStrategy, pace: "very-slow" }));
    const threes = aggregate(batch(40, teams[2], teams[12], { ...defaultStrategy, shotEmphasis: "three" }));
    const rim = aggregate(batch(40, teams[2], teams[12], { ...defaultStrategy, shotEmphasis: "rim" }));
    expect(veryFast.possessions).toBeGreaterThan(verySlow.possessions * 1.35);
    expect(threes.threeRate).toBeGreaterThan(rim.threeRate + 0.18);
  });

  it("gives motion and pick-and-roll distinct roster-dependent outputs", () => {
    const balanced = aggregate(batch(60, teams[2], teams[12], { ...defaultStrategy, offensiveStyle: "balanced" }));
    const motion = aggregate(batch(60, teams[2], teams[12], { ...defaultStrategy, offensiveStyle: "motion" }));
    const pickAndRoll = aggregate(batch(60, teams[2], teams[12], { ...defaultStrategy, offensiveStyle: "pick-and-roll" }));
    expect(motion.assistRate).toBeGreaterThan(balanced.assistRate + 0.035);
    expect(motion.assistRate).toBeGreaterThan(pickAndRoll.assistRate + 0.02);
    expect(pickAndRoll.threeRate).toBeGreaterThan(balanced.threeRate);
    expect(pickAndRoll.turnoverRate).toBeGreaterThan(motion.turnoverRate);
  });

  it("makes pressure create turnovers with a fatigue-and-foul tradeoff", () => {
    const press = aggregate(batch(60, teams[2], teams[12], { ...defaultStrategy, defensiveScheme: "full-court-press", pressFrequency: 100 }));
    const conservative = aggregate(batch(60, teams[2], teams[12], { ...defaultStrategy, defensiveScheme: "conservative", pressFrequency: 0 }));
    expect(press.turnoverRate).toBeGreaterThan(conservative.turnoverRate + 0.04);
    expect(press.fouls).toBeGreaterThan(conservative.fouls);
  });

  it("provides a modest home and coach advantage across mirrored games", () => {
    const base = teams[2];
    const mirror: Team = { ...structuredClone(base), id: "calibration-mirror", shortName: "MIR", roster: structuredClone(base.roster).map((player) => ({ ...player, id: `mirror-${player.id}` })) };
    const strongCoach: Coach = { ...base.coach, id: "strong-coach", ratings: { offense: 88, defense: 88, development: 70, adaptability: 82, rotation: 80, motivation: 84, discipline: 84 } };
    const weakCoach: Coach = { ...base.coach, id: "weak-coach", ratings: { offense: 55, defense: 55, development: 70, adaptability: 55, rotation: 55, motivation: 55, discipline: 55 } };
    let homeWins = 0;
    let strongWins = 0;
    const games = 200;
    for (let seed = 0; seed < games; seed += 1) {
      const result = play(base, mirror, 20_000 + seed);
      if (result.winnerId === base.id) homeWins += 1;
      const coachedHome = play(base, mirror, 30_000 + seed, { ...defaultStrategy }, { ...defaultStrategy }, strongCoach, weakCoach, true);
      const coachedAway = play(base, mirror, 40_000 + seed, { ...defaultStrategy }, { ...defaultStrategy }, weakCoach, strongCoach, true);
      if (coachedHome.winnerId === base.id) strongWins += 1;
      if (coachedAway.winnerId === mirror.id) strongWins += 1;
    }
    expect(homeWins / games).toBeGreaterThan(0.51);
    expect(homeWins / games).toBeLessThan(0.72);
    expect(strongWins / (games * 2)).toBeGreaterThan(0.53);
    expect(strongWins / (games * 2)).toBeLessThan(0.78);
  });

  it("keeps broad game rates plausible and internally coherent", () => {
    const rates = aggregate(batch(100));
    expect(rates.points).toBeGreaterThan(45);
    expect(rates.points).toBeLessThan(105);
    expect(rates.possessions).toBeGreaterThan(50);
    expect(rates.possessions).toBeLessThan(100);
    expect(rates.fg).toBeGreaterThan(0.32);
    expect(rates.fg).toBeLessThan(0.62);
    expect(rates.freeThrowRate).toBeGreaterThan(0.08);
    expect(rates.freeThrowRate).toBeLessThan(0.55);
    expect(rates.turnoverRate).toBeGreaterThan(0.06);
    expect(rates.turnoverRate).toBeLessThan(0.28);
    expect(rates.offensiveReboundRate).toBeGreaterThan(0.12);
    expect(rates.offensiveReboundRate).toBeLessThan(0.42);
    expect(rates.fouls).toBeGreaterThan(5);
    expect(rates.fouls).toBeLessThan(28);
  });

  it("responds in the expected direction to shooting, handling, rebounding, defense, and block ratings", () => {
    const opponent = teams[12];
    const collect = (team: Team, strategy: Strategy = { ...defaultStrategy }) => Array.from({ length: 60 }, (_, seed) => play(team, opponent, 80_000 + seed, strategy, { ...defaultStrategy }, undefined, undefined, true));
    const highThree = collect(ratedTeam("high-three", { threePoint: 95 }), { ...defaultStrategy, shotEmphasis: "three" });
    const lowThree = collect(ratedTeam("low-three", { threePoint: 45 }), { ...defaultStrategy, shotEmphasis: "three" });
    expect(highThree.reduce((sum, result) => sum + result.home.stats.threePm, 0)).toBeGreaterThan(lowThree.reduce((sum, result) => sum + result.home.stats.threePm, 0) * 1.35);

    const highHandle = collect(ratedTeam("high-handle", { ballHandling: 95, basketballIQ: 90 }));
    const lowHandle = collect(ratedTeam("low-handle", { ballHandling: 45, basketballIQ: 50 }));
    expect(highHandle.reduce((sum, result) => sum + result.home.stats.turnovers, 0)).toBeLessThan(lowHandle.reduce((sum, result) => sum + result.home.stats.turnovers, 0));

    const highRebound = collect(ratedTeam("high-rebound", { offensiveRebounding: 95, defensiveRebounding: 95, strength: 90 }));
    const lowRebound = collect(ratedTeam("low-rebound", { offensiveRebounding: 45, defensiveRebounding: 45, strength: 50 }));
    expect(highRebound.reduce((sum, result) => sum + result.home.stats.offensiveRebounds, 0)).toBeGreaterThan(lowRebound.reduce((sum, result) => sum + result.home.stats.offensiveRebounds, 0));

    const highDefense = collect(ratedTeam("high-defense", { perimeterDefense: 95, interiorDefense: 95, defensiveConsistency: 90 }));
    const lowDefense = collect(ratedTeam("low-defense", { perimeterDefense: 45, interiorDefense: 45, defensiveConsistency: 50 }));
    const opponentEfficiency = (results: GameResult[]) => results.reduce((sum, result) => sum + result.away.stats.points / result.away.stats.possessions, 0) / results.length;
    expect(opponentEfficiency(highDefense)).toBeLessThan(opponentEfficiency(lowDefense));

    const highBlock = collect(ratedTeam("high-block", { block: 95, athleticism: 90 }));
    const lowBlock = collect(ratedTeam("low-block", { block: 45, athleticism: 50 }));
    expect(highBlock.reduce((sum, result) => sum + result.home.stats.blocks, 0)).toBeGreaterThan(lowBlock.reduce((sum, result) => sum + result.home.stats.blocks, 0));
  });
});
