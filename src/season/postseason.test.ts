import { describe, expect, it } from "vitest";
import { createCareer } from "../career/career";
import { defaultLineup, teams } from "../data/teams";
import type { CareerSave, UserCoach } from "../domain/types";
import { deserializeCareer, serializeCareer } from "./persistence";
import { buildScoutingReport, generateAwards, playerLeaderboard, teamLeaderboard } from "./insights";
import { calculateRankings, strengthOfSchedule } from "./rankings";
import { createSeasonState, generateConferenceTournament, generateNationalTournament, getStandings, simulateScheduledGame } from "./season";

const coach: UserCoach = { id: "postseason-coach", firstName: "Casey", lastName: "Jones", age: 40, archetype: "Balanced", offensivePhilosophy: "Balanced", defensivePhilosophy: "Man to Man", appearance: { skin: 1, hairstyle: 1, hairColor: 1, facialHair: 0, expression: 1 } };

function completedRegular(seed = 600) {
  const state = createSeasonState(teams, teams[0].id, seed);
  for (const game of state.schedule) game.status = "completed";
  for (let index = 0; index < teams.length; index += 1) {
    const conferenceIndex = index % 5;
    state.records[teams[index].id] = { ...state.records[teams[index].id], wins: 10 - conferenceIndex, losses: 2 + conferenceIndex, conferenceWins: 8 - conferenceIndex, conferenceLosses: conferenceIndex, pointsFor: 800 - conferenceIndex * 20, pointsAgainst: 650 + conferenceIndex * 20 };
  }
  state.rankings = calculateRankings(state, state.rankings);
  return state;
}

describe("rankings and postseason", () => {
  it("calculates deterministic rankings and rewards a stronger schedule", () => {
    const state = createSeasonState(teams, teams[0].id, 601);
    const target = teams[0].id; const strong = teams[4].id; const weak = teams[19].id;
    const targetGames = state.schedule.filter((game) => game.homeTeamId === target || game.awayTeamId === target);
    for (const game of state.schedule) game.status = "scheduled";
    targetGames[0].status = "completed"; targetGames[0].homeTeamId = target; targetGames[0].awayTeamId = strong;
    state.records[strong] = { ...state.records[strong], wins: 10, losses: 2 };
    const strongSos = strengthOfSchedule(state, target);
    targetGames[0].awayTeamId = weak; state.records[weak] = { ...state.records[weak], wins: 2, losses: 10 };
    const weakSos = strengthOfSchedule(state, target);
    expect(strongSos).toBeGreaterThan(weakSos + 25);
    expect(calculateRankings(state, [])).toEqual(calculateRankings(structuredClone(state), []));

    const comparison = createSeasonState(teams, target, 611); const other = teams[10].id;
    for (const game of comparison.schedule) game.status = "scheduled";
    const strongGame = comparison.schedule.find((game) => game.homeTeamId === target || game.awayTeamId === target)!; strongGame.status = "completed"; strongGame.homeTeamId = target; strongGame.awayTeamId = strong;
    const weakGame = comparison.schedule.find((game) => game.id !== strongGame.id && (game.homeTeamId === other || game.awayTeamId === other))!; weakGame.status = "completed"; weakGame.homeTeamId = other; weakGame.awayTeamId = weak;
    comparison.records[target] = { ...comparison.records[target], wins: 4, losses: 0, pointsFor: 280, pointsAgainst: 240 }; comparison.records[other] = { ...comparison.records[other], wins: 4, losses: 0, pointsFor: 280, pointsAgainst: 240 }; comparison.records[strong] = { ...comparison.records[strong], wins: 10, losses: 2 }; comparison.records[weak] = { ...comparison.records[weak], wins: 2, losses: 10 };
    const ranked = calculateRankings(comparison, []);
    expect(ranked.find((entry) => entry.teamId === target)!.rank).toBeLessThan(ranked.find((entry) => entry.teamId === other)!.rank);
  });

  it("seeds each conference from frozen standings and cannot generate twice", () => {
    const regular = completedRegular(602);
    const generated = generateConferenceTournament(regular);
    expect(generated.phase).toBe("conference-tournament");
    expect(generated.postseason.conferences).toHaveLength(4);
    for (const bracket of generated.postseason.conferences) {
      expect(bracket.seeds).toEqual(getStandings(regular, bracket.conference).map((entry) => entry.teamId));
      const playIn = generated.schedule.find((game) => game.id === bracket.gameIds[0])!;
      expect([playIn.homeTeamId, playIn.awayTeamId]).toEqual([bracket.seeds[3], bracket.seeds[4]]);
      expect(playIn.neutralSite).toBe(true);
    }
    expect(generateConferenceTournament(generated)).toBe(generated);
  });

  it("selects the national field deterministically with every conference champion", () => {
    const state = generateConferenceTournament(completedRegular(603));
    state.postseason.conferences.forEach((bracket) => { bracket.championId = bracket.seeds[2]; });
    const first = generateNationalTournament(state);
    const second = generateNationalTournament(structuredClone(state));
    expect(first.postseason.national?.seeds).toEqual(second.postseason.national?.seeds);
    for (const bracket of state.postseason.conferences) expect(first.postseason.national?.seeds).toContain(bracket.championId);
    expect(first.postseason.national?.seeds).toHaveLength(8);
    expect(first.schedule.filter((game) => game.gameType === "national-postseason" && game.round === "quarterfinal")).toHaveLength(4);
  });

  it("enforces award eligibility, shooting minimums, and actual expected scouting lineups", () => {
    const state = createSeasonState(teams, teams[0].id, 604);
    for (const player of Object.values(state.playerStats)) { player.gamesPlayed = 10; player.minutes = 250; player.points = 80; player.fga = 80; player.fgm = 35; player.threePa = 30; player.threePm = 10; player.fta = 25; player.ftm = 18; }
    const senior = teams.flatMap((team) => team.roster).find((player) => player.classYear === "SR")!;
    const freshman = teams.flatMap((team) => team.roster).find((player) => player.classYear === "FR")!;
    state.playerStats[senior.id].points = 500; state.playerStats[freshman.id].points = 300;
    const oneForOne = teams[0].roster.find((player) => player.id !== freshman.id)!; state.playerStats[oneForOne.id].threePa = 1; state.playerStats[oneForOne.id].threePm = 1;
    const awards = generateAwards(state);
    expect(teams.flatMap((team) => team.roster).find((player) => player.id === awards.freshmanOfYearId)?.classYear).toBe("FR");
    expect(awards.firstTeamAllNational).toHaveLength(5); expect(awards.secondTeamAllNational).toHaveLength(5);
    expect(playerLeaderboard(state, "threePct").map((entry) => entry.playerId)).not.toContain(oneForOne.id);
    expect(teamLeaderboard(state, "pointDifferential")).toHaveLength(20);
    expect(buildScoutingReport(state, teams[1]).expectedStarterIds).toEqual(defaultLineup(teams[1]));
  });

  it("completes the canonical regular season and both tournaments with one immutable champion", () => {
    let season = createSeasonState(teams, teams[0].id, 605);
    for (let guard = 0; guard < 500 && season.phase !== "complete"; guard += 1) {
      const game = season.schedule.find((candidate) => candidate.status === "scheduled");
      expect(game).toBeDefined();
      season = simulateScheduledGame(season, game!.id);
    }
    expect(season.phase).toBe("complete");
    expect(season.postseason.conferences.every((bracket) => Boolean(bracket.championId))).toBe(true);
    expect(season.postseason.national?.championId).toBeTruthy();
    expect(season.postseason.national?.runnerUpId).toBeTruthy();
    expect(season.awards?.freshmanOfYearId).toBeTruthy();
    expect(season.schedule.filter((game) => game.round === "championship" && game.status === "completed")).toHaveLength(1);
    expect(season.schedule.every((game) => game.status === "completed")).toBe(true);
    const postseasonConferenceWins = Object.values(season.records).reduce((sum, record) => sum + record.conferenceWins, 0);
    expect(postseasonConferenceWins).toBe(80);
    const snapshot = season.schedule.find((game) => game.status === "completed")!.historySnapshot!;
    const frozenRankings = structuredClone(snapshot.rankings);
    season.rankings.reverse();
    expect(snapshot.rankings).toEqual(frozenRankings);
    expect(season.recordBook.players.points?.value).toBeGreaterThan(0);
    const eliminated = season.postseason.national!.seeds.find((teamId) => teamId !== season.postseason.national!.championId)!;
    const games = season.schedule.filter((game) => game.gameType === "national-postseason" && (game.homeTeamId === eliminated || game.awayTeamId === eliminated));
    const firstLossIndex = games.findIndex((game) => game.result?.winnerId !== eliminated);
    if (firstLossIndex >= 0) expect(games.slice(firstLossIndex + 1)).toHaveLength(0);

    const base = createCareer(coach, 1);
    const career: CareerSave = { ...base, stage: "season-complete", programId: teams[0].id, seasonObjective: "Finish above .500", season, updatedAt: 2 };
    const restored = deserializeCareer(serializeCareer(career), teams);
    expect(restored.season?.phase).toBe("complete");
    expect(restored.season?.postseason).toEqual(season.postseason);
    expect(restored.season?.awards).toEqual(season.awards);
  }, 20_000);
});
