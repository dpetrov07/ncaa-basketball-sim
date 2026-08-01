import { describe, expect, it } from "vitest";
import { teams } from "../data/teams";
import { createSeasonState, generateSchedule, getNextUserGame, simulateScheduledGame, advanceToNextUserGame } from "./season";

describe("season foundation", () => {
  it("creates a deterministic valid schedule without team conflicts", () => {
    const first = generateSchedule(teams, 2026);
    const second = generateSchedule(teams, 2026);
    expect(second).toEqual(first);
    expect(first.length).toBeGreaterThan(100);
    const gamesByDay = new Map<number, Set<string>>();
    for (const game of first) {
      const teamsOnDay = gamesByDay.get(game.day) ?? new Set<string>();
      expect(teamsOnDay.has(game.homeTeamId)).toBe(false);
      expect(teamsOnDay.has(game.awayTeamId)).toBe(false);
      teamsOnDay.add(game.homeTeamId); teamsOnDay.add(game.awayTeamId); gamesByDay.set(game.day, teamsOnDay);
    }
    expect(first.some((game) => game.conferenceGame)).toBe(true);
    expect(first.some((game) => !game.conferenceGame)).toBe(true);
  });

  it("advances AI games and never processes a completed game twice", () => {
    const state = createSeasonState(teams, teams[0].id, 99);
    const next = advanceToNextUserGame(state);
    expect(next.currentDay).toBeGreaterThanOrEqual(state.currentDay);
    expect(next.history.length).toBe(next.schedule.filter((game) => game.status === "completed").length);
    const completed = next.schedule.find((game) => game.status === "completed");
    expect(completed).toBeDefined();
    const again = simulateScheduledGame(next, completed!.id);
    expect(again.history).toEqual(next.history);
    expect(getNextUserGame(next)?.status).toBe("scheduled");
  });

  it("updates records and player season totals from a completed game", () => {
    const state = createSeasonState(teams, teams[0].id, 7);
    const game = state.schedule[0];
    const completed = simulateScheduledGame(state, game.id);
    expect(completed.history).toContain(game.id);
    const homeRecord = completed.records[game.homeTeamId];
    const awayRecord = completed.records[game.awayTeamId];
    expect(homeRecord.wins + homeRecord.losses).toBe(1);
    expect(awayRecord.wins + awayRecord.losses).toBe(1);
    const activePlayers = Object.values(completed.playerStats).filter((player) => player.gamesPlayed > 0);
    expect(activePlayers.length).toBeGreaterThan(0);
    expect(activePlayers.every((player) => player.points >= 0 && player.minutes >= 0 && player.recentPoints.length <= 5)).toBe(true);
  });
});
