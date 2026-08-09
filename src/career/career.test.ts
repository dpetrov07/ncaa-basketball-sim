import { describe, expect, it } from "vitest";
import type { StorageAdapter } from "../season/persistence";
import type { UserCoach } from "../domain/types";
import { defaultLineup, defaultStrategy, teams } from "../data/teams";
import { advanceToNextUserGame, completeSeasonGame, getNextUserGame, simulateScheduledGame } from "../season/season";
import { initializeGame, simulateGame, simulateOnePossession } from "../simulation/simulateGame";
import { CAREER_SAVE_KEY, LocalStorageSaveRepository, deserializeCareer, serializeCareer } from "../season/persistence";
import { acceptProgram, createCareer, objectiveMet, seasonObjective, settleCareerStage, startSeason, userCoachToGameCoach, userControlsTeam } from "./career";

const coach: UserCoach = { id: "user-coach", firstName: "Dana", lastName: "Cole", age: 41, archetype: "Player Developer", offensivePhilosophy: "Motion", defensivePhilosophy: "Switching", appearance: { skin: 2, hairstyle: 3, hairColor: 1, facialHair: 0, expression: 2 } };

class MemoryStorage implements StorageAdapter {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe("career lifecycle", () => {
  it("begins with coach creation output and stores exactly one accepted program", () => {
    const draft = createCareer(coach, 100);
    expect(draft.stage).toBe("program-selection");
    expect(draft.coach).toEqual(coach);
    const accepted = acceptProgram(draft, teams[4].id, teams, 55, 101);
    expect(accepted.programId).toBe(teams[4].id);
    expect(accepted.season?.userTeamId).toBe(teams[4].id);
    expect(userControlsTeam(accepted, teams[4].id)).toBe(true);
    expect(userControlsTeam(accepted, teams[3].id)).toBe(false);
    const started = startSeason(accepted, 102);
    expect(() => acceptProgram(started, teams[3].id, teams)).toThrow(/already assigned/);
  });

  it("derives persistent achievable objectives and gameplay defaults from program and coach identity", () => {
    const elite = teams.find((team) => team.program.tier === "elite")!;
    const rebuilding = teams.find((team) => team.program.tier === "rebuilding")!;
    expect(seasonObjective(elite, 12)).toBe("Win the conference");
    expect(seasonObjective(rebuilding, 12)).toBe("Win at least 4 games");
    const accepted = acceptProgram(createCareer(coach, 10), rebuilding.id, teams, 123, 11);
    expect(accepted.seasonObjective).toBe("Win at least 4 games");
    expect(accepted.season?.userStrategy.offensiveStyle).toBe("motion");
    expect(accepted.season?.userStrategy.defensiveScheme).toBe("switching");
    expect(deserializeCareer(serializeCareer(accepted), teams).seasonObjective).toBe(accepted.seasonObjective);
    const gameCoach = userCoachToGameCoach(coach);
    expect(gameCoach.ratings.development).toBeGreaterThan(70);
    expect(gameCoach.ratings.adaptability).toBeGreaterThan(70);
    expect(objectiveMet({ ...accepted, season: { ...accepted.season!, records: { ...accepted.season!.records, [rebuilding.id]: { ...accepted.season!.records[rebuilding.id], wins: 4, losses: 8 } } } })).toBe(true);
  });

  it("ships explicit varied program identities and materially separated roster strength", () => {
    expect(new Set(teams.map((team) => team.program.tier))).toEqual(new Set(["elite", "strong", "middle", "rebuilding", "underdog"]));
    expect(teams.every((team) => team.program.prestige >= 1 && team.program.prestige <= 5 && team.program.facilities >= 1 && team.program.homeCourtStrength >= 1)).toBe(true);
    const rotationOverall = (team: typeof teams[number]) => [...team.roster].sort((a, b) => b.ratings.overall - a.ratings.overall).slice(0, 8).reduce((sum, player) => sum + player.ratings.overall, 0) / 8;
    const eliteAverage = teams.filter((team) => team.program.tier === "elite").reduce((sum, team) => sum + rotationOverall(team), 0) / teams.filter((team) => team.program.tier === "elite").length;
    const underdogAverage = teams.filter((team) => team.program.tier === "underdog").reduce((sum, team) => sum + rotationOverall(team), 0) / teams.filter((team) => team.program.tier === "underdog").length;
    expect(eliteAverage - underdogAverage).toBeGreaterThan(8);
    expect(new Set(teams.map((team) => team.program.identity)).size).toBeGreaterThanOrEqual(5);
  });

  it("serializes mutable career data without copying the static team database", () => {
    const career = startSeason(acceptProgram(createCareer(coach, 200), teams[2].id, teams, 77, 201), 202);
    const serialized = serializeCareer(career);
    expect(serialized).not.toContain('"teams"');
    expect(serialized).not.toContain('"roster"');
    const restored = deserializeCareer(serialized, teams);
    expect(restored.coach).toEqual(coach);
    expect(restored.programId).toBe(teams[2].id);
    expect(restored.season?.schedule).toEqual(career.season?.schedule);
    expect(restored.season?.teams).toBe(teams);
  });

  it("makes a valid save available to Continue and restores an unfinished game", () => {
    const storage = new MemoryStorage();
    const repository = new LocalStorageSaveRepository(storage, teams);
    let career = startSeason(acceptProgram(createCareer(coach, 300), teams[0].id, teams, 88, 301), 302);
    const season = advanceToNextUserGame(career.season!);
    const scheduled = getNextUserGame(season)!;
    const home = teams.find((team) => team.id === scheduled.homeTeamId)!;
    const away = teams.find((team) => team.id === scheduled.awayTeamId)!;
    const state = simulateOnePossession(initializeGame({ home, away, homeLineup: { playerIds: defaultLineup(home) }, awayLineup: { playerIds: defaultLineup(away) }, homeStrategy: { ...defaultStrategy }, awayStrategy: { ...defaultStrategy }, seed: scheduled.seed }));
    career = { ...career, season, liveGame: { gameId: scheduled.id, state } };
    repository.save(career);
    expect(storage.getItem(CAREER_SAVE_KEY)).not.toBeNull();
    const restored = repository.load().save!;
    expect(restored.programId).toBe(teams[0].id);
    expect(restored.coach).toEqual(coach);
    expect(restored.liveGame?.state).toEqual(state);
  });

  it("returns a recovery error for invalid or legacy save data", () => {
    const invalidStorage = new MemoryStorage();
    invalidStorage.setItem(CAREER_SAVE_KEY, "{not-json");
    const invalid = new LocalStorageSaveRepository(invalidStorage, teams).load();
    expect(invalid.save).toBeNull();
    expect(invalid.error).toBeTruthy();
    const legacyStorage = new MemoryStorage();
    legacyStorage.setItem("courtside-season-v1", "{}");
    const legacy = new LocalStorageSaveRepository(legacyStorage, teams).load();
    expect(legacy.save).toBeNull();
    expect(legacy.error).toMatch(/older season save/);
  });

  it("persists a completed result and reload cannot record it twice", () => {
    const storage = new MemoryStorage();
    const repository = new LocalStorageSaveRepository(storage, teams);
    let career = startSeason(acceptProgram(createCareer(coach, 400), teams[0].id, teams, 99, 401), 402);
    const season = advanceToNextUserGame(career.season!);
    const scheduled = getNextUserGame(season)!;
    const home = teams.find((team) => team.id === scheduled.homeTeamId)!;
    const away = teams.find((team) => team.id === scheduled.awayTeamId)!;
    const result = simulateGame({ home, away, homeLineup: { playerIds: defaultLineup(home) }, awayLineup: { playerIds: defaultLineup(away) }, homeStrategy: { ...defaultStrategy }, awayStrategy: { ...defaultStrategy }, seed: scheduled.seed });
    career = { ...career, season: completeSeasonGame(season, scheduled.id, result) };
    repository.save(career);
    const restored = repository.load().save!;
    const historyLength = restored.season!.history.length;
    const duplicated = completeSeasonGame(restored.season!, scheduled.id, result);
    expect(duplicated.history).toHaveLength(historyLength);
    expect(duplicated.schedule.find((game) => game.id === scheduled.id)?.status).toBe("completed");
    expect(duplicated.teams).toBe(restored.season!.teams);
  });

  it("can complete the full generated season and enter end-of-season state", () => {
    let career = startSeason(acceptProgram(createCareer(coach, 500), teams[1].id, teams, 111, 501), 502);
    let season = career.season!;
    for (let guard = 0; guard < 500 && season.phase !== "complete"; guard += 1) {
      const game = season.schedule.find((candidate) => candidate.status === "scheduled");
      if (!game) break;
      season = simulateScheduledGame(season, game.id);
    }
    career = settleCareerStage({ ...career, season }, 503);
    expect(career.stage).toBe("season-complete");
    expect(career.coachEvaluation?.grade).toMatch(/^(A\+|A|B|C|D|F)$/);
    expect(career.season?.schedule.every((game) => game.status === "completed")).toBe(true);
    expect(getNextUserGame(career.season!)).toBeUndefined();
    expect(serializeCareer(career).length).toBeLessThan(4_000_000);
  }, 15_000);
});
