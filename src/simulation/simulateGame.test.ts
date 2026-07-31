import { describe, expect, it } from "vitest";
import { defaultLineup, defaultStrategy, teams } from "../data/teams";
import { simulateGame } from "./simulateGame";
import { validateLineup } from "./validation";

function game(seed = 42) {
  return simulateGame({
    home: teams[0], away: teams[1], homeLineup: { playerIds: defaultLineup(teams[0]) }, awayLineup: { playerIds: defaultLineup(teams[1]) },
    homeStrategy: { ...defaultStrategy }, awayStrategy: { ...defaultStrategy, defensiveScheme: "zone" }, seed,
  });
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
});
