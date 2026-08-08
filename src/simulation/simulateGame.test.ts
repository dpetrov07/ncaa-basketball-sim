import { describe, expect, it } from "vitest";
import { defaultLineup, defaultStrategy, teams } from "../data/teams";
import {
  callTimeout,
  finalizeGame,
  initializeGame,
  setGameLineup,
  setGameStrategy,
  simulateGame,
  simulateOnePossession,
  simulateToEnd,
  simulateToNextStoppage,
} from "./simulateGame";
import { validateLineup } from "./validation";

function game(seed = 42) {
  return simulateGame(input(seed));
}

function input(seed = 42) {
  return {
    home: teams[0], away: teams[1], homeLineup: { playerIds: defaultLineup(teams[0]) }, awayLineup: { playerIds: defaultLineup(teams[1]) },
    homeStrategy: { ...defaultStrategy }, awayStrategy: { ...defaultStrategy, defensiveScheme: "zone" }, seed,
  } as const;
}

describe("possession simulation", () => {
  it("replays exactly with the same seed and inputs", () => {
    const first = game(12345);
    const second = game(12345);
    expect(second).toEqual(first);
  });

  it("rejects invalid lineups", () => {
    expect(() => validateLineup(teams[0], { playerIds: defaultLineup(teams[0]).slice(0, 4) })).toThrow(/exactly five/);
    expect(() => validateLineup(teams[0], { playerIds: [teams[0].roster[0].id, teams[0].roster[0].id, ...teams[0].roster.slice(1, 4).map((player) => player.id)] })).toThrow(/twice/);
    expect(() => validateLineup(teams[0], { playerIds: [...defaultLineup(teams[0]).slice(0, 4), "unknown"] })).toThrow(/roster/);
  });

  it("terminates with a final event and a non-zero game clock budget", () => {
    const result = game(9);
    expect(result.events.at(-1)?.kind).toBe("final");
    expect(result.durationSeconds).toBeGreaterThanOrEqual(2400);
    expect(result.periods).toBeGreaterThanOrEqual(2);
  });

  it("keeps every statistic nonnegative and reconciles team totals", () => {
    const result = game(987);
    for (const box of [result.home, result.away]) {
      const numericStats = box.players.flatMap((player) => Object.entries(player).filter(([key]) => key !== "plusMinus").map(([, value]) => value).filter((value): value is number => typeof value === "number"));
      expect(numericStats.every((value) => value >= 0)).toBe(true);
      expect(box.stats.points).toBe(box.players.reduce((sum, player) => sum + player.points, 0));
      expect(box.stats.fgm).toBe(box.players.reduce((sum, player) => sum + player.fgm, 0));
      expect(box.stats.fga).toBe(box.players.reduce((sum, player) => sum + player.fga, 0));
      expect(box.stats.assists).toBe(box.players.reduce((sum, player) => sum + player.assists, 0));
      expect(box.stats.turnovers).toBe(box.players.reduce((sum, player) => sum + player.turnovers, 0));
      expect(box.stats.fouls).toBe(box.players.reduce((sum, player) => sum + player.fouls, 0));
    }
  });

  it("ships at least twenty teams with deep fictional rosters", () => {
    expect(teams).toHaveLength(20);
    expect(teams.every((team) => team.roster.length >= 12 && team.roster.length <= 15)).toBe(true);
    expect(teams.flatMap((team) => team.roster).every((player) => player.ratings.overall >= 25 && player.ratings.overall <= 99)).toBe(true);
  });

  it("produces the exact full result when stepped one possession at a time", () => {
    const automatic = game(5150);
    let state = initializeGame(input(5150));
    while (state.status === "playing") state = simulateOnePossession(state);
    expect(finalizeGame(state)).toEqual(automatic);
  });

  it("produces the exact full result when stepped between stoppages", () => {
    const automatic = game(6150);
    let state = initializeGame(input(6150));
    while (state.status === "playing") state = simulateToNextStoppage(state);
    expect(finalizeGame(state)).toEqual(automatic);
  });

  it("continues deterministically after a serialized resume", () => {
    let state = initializeGame(input(7150));
    for (let index = 0; index < 37; index += 1) state = simulateOnePossession(state);
    const resumed = JSON.parse(JSON.stringify(state));
    expect(finalizeGame(simulateToEnd(resumed))).toEqual(game(7150));
  });

  it("applies valid substitutions and rejects invalid active lineups", () => {
    const state = initializeGame(input(8150));
    const replacement = teams[0].roster.find((player) => !state.home.lineup.includes(player.id))!;
    const lineup = [...state.home.lineup];
    lineup[0] = replacement.id;
    const changed = setGameLineup(state, teams[0].id, lineup);
    expect(changed.home.lineup).toEqual(lineup);
    expect(state.home.lineup).not.toEqual(lineup);
    expect(changed.events.at(-1)?.kind).toBe("substitution");
    expect(() => setGameLineup(state, teams[0].id, lineup.slice(0, 4))).toThrow(/exactly five/);
    expect(() => setGameLineup(state, teams[0].id, [lineup[0], lineup[0], ...lineup.slice(2)])).toThrow(/twice/);
    const fouledOut = structuredClone(state);
    fouledOut.home.players.find((player) => player.playerId === replacement.id)!.state.fouls = 5;
    expect(() => setGameLineup(fouledOut, teams[0].id, lineup)).toThrow(/fouled out/);
  });

  it("changes only future strategy state and consumes finite timeouts", () => {
    const state = simulateOnePossession(initializeGame(input(9150)));
    const pastEvents = structuredClone(state.events);
    const strategy = { ...state.home.strategy, pace: "very-fast" as const, shotEmphasis: "three" as const };
    const changed = setGameStrategy(state, teams[0].id, strategy);
    expect(changed.home.strategy).toEqual(strategy);
    expect(changed.events).toEqual(pastEvents);
    expect(state.home.strategy).not.toEqual(strategy);
    const baselineFinish = simulateToEnd(state);
    const changedFinish = simulateToEnd(changed);
    expect(changedFinish.events.slice(0, pastEvents.length)).toEqual(pastEvents);
    expect(changedFinish.events.slice(pastEvents.length)).not.toEqual(baselineFinish.events.slice(pastEvents.length));
    let timed = callTimeout(changed, teams[0].id);
    expect(timed.home.timeoutsRemaining).toBe(3);
    expect(timed.events.at(-1)?.kind).toBe("timeout");
    timed = callTimeout(callTimeout(callTimeout(timed, teams[0].id), teams[0].id), teams[0].id);
    expect(timed.home.timeoutsRemaining).toBe(0);
    expect(() => callTimeout(timed, teams[0].id)).toThrow(/No timeouts/);
  });

  it("reconciles final stepped state and player totals", () => {
    const result = finalizeGame(simulateToEnd(initializeGame(input(10150))));
    for (const box of [result.home, result.away]) {
      expect(box.stats.points).toBe(box.players.reduce((sum, player) => sum + player.points, 0));
      expect(box.stats.fgm).toBe(box.players.reduce((sum, player) => sum + player.fgm, 0));
      expect(box.stats.fouls).toBe(box.players.reduce((sum, player) => sum + player.fouls, 0));
      expect(box.stats.possessions).toBeGreaterThan(0);
    }
  });
});
