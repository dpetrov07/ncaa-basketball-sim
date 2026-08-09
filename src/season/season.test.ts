import { describe, expect, it } from "vitest";
import { teams } from "../data/teams";
import { createSeasonState, generateSchedule, getNextUserGame, simulateScheduledGame, advanceOneDay, advanceToNextUserGame, validateSchedule } from "./season";

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
    const counts = new Map(teams.map((team) => [team.id, 0]));
    for (const game of first) {
      counts.set(game.homeTeamId, counts.get(game.homeTeamId)! + 1);
      counts.set(game.awayTeamId, counts.get(game.awayTeamId)! + 1);
      const home = teams.find((team) => team.id === game.homeTeamId)!;
      const away = teams.find((team) => team.id === game.awayTeamId)!;
      expect(game.conferenceGame).toBe(home.conference === away.conference);
    }
    expect(new Set(counts.values())).toEqual(new Set([12]));
    expect(new Set(first.map((game) => game.id)).size).toBe(first.length);
  });

  it("rejects invalid schedule references, self-games, duplicates, and imbalanced totals", () => {
    const valid = generateSchedule(teams, 2027);
    expect(() => validateSchedule(valid, teams, 12)).not.toThrow();
    expect(() => validateSchedule([{ ...valid[0], awayTeamId: valid[0].homeTeamId }], teams)).toThrow(/itself/);
    expect(() => validateSchedule([{ ...valid[0], homeTeamId: "missing" }], teams)).toThrow(/unknown/);
    expect(() => validateSchedule([valid[0], { ...valid[0] }], teams)).toThrow(/Duplicate/);
    expect(() => validateSchedule(valid.slice(1), teams, 12)).toThrow(/Every team/);
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

  it("simulates AI games without skipping the user's game on simulate day", () => {
    const initial = createSeasonState(teams, teams[0].id, 101);
    const userGame = initial.schedule.find((game) => game.homeTeamId === initial.userTeamId || game.awayTeamId === initial.userTeamId)!;
    const state = { ...initial, currentDay: Math.max(1, userGame.day - 1) };
    const advanced = advanceOneDay(state);
    const preserved = advanced.schedule.find((game) => game.id === userGame.id)!;
    expect(preserved.status).toBe("scheduled");
    expect(advanced.currentDay).toBe(userGame.day);
    const aiGames = advanced.schedule.filter((game) => game.day <= userGame.day && game.homeTeamId !== state.userTeamId && game.awayTeamId !== state.userTeamId);
    expect(aiGames.length).toBeGreaterThan(0);
    expect(aiGames.every((game) => game.status === "completed")).toBe(true);
    const advancedAgain = advanceOneDay(advanced);
    expect(advancedAgain.currentDay).toBe(userGame.day);
    expect(advancedAgain.history).toEqual(advanced.history);
  });

  it("aggregates starts and every persisted box-score total", () => {
    const state = createSeasonState(teams, teams[0].id, 303);
    const game = state.schedule[0];
    const completed = simulateScheduledGame(state, game.id);
    const result = completed.schedule.find((candidate) => candidate.id === game.id)!.result!;
    const starters = new Set([...result.homeStartingLineup, ...result.awayStartingLineup]);
    for (const box of [result.home, result.away]) for (const player of box.players) {
      const total = completed.playerStats[player.playerId];
      expect(total.gamesPlayed).toBe(player.minutes > 0 ? 1 : 0);
      expect(total.gamesStarted).toBe(starters.has(player.playerId) ? 1 : 0);
      expect(total.minutes).toBe(player.minutes);
      expect(total.points).toBe(player.points);
      expect(total.rebounds).toBe(player.offensiveRebounds + player.defensiveRebounds);
      expect(total.assists).toBe(player.assists);
      expect(total.steals).toBe(player.steals);
      expect(total.blocks).toBe(player.blocks);
      expect(total.turnovers).toBe(player.turnovers);
      expect(total.fouls).toBe(player.fouls);
      expect(total.fgm).toBe(player.fgm);
      expect(total.fga).toBe(player.fga);
      expect(total.twoPm).toBe(player.twoPm);
      expect(total.twoPa).toBe(player.twoPa);
      expect(total.threePm).toBe(player.threePm);
      expect(total.threePa).toBe(player.threePa);
      expect(total.ftm).toBe(player.ftm);
      expect(total.fta).toBe(player.fta);
    }
  });
});
