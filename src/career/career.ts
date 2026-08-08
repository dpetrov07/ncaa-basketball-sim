import type { CareerSave, SeasonPlayerStats, SeasonState, Team, UserCoach } from "../domain/types";
import { createSeasonState, getNextUserGame, getStandings, simulateScheduledGame } from "../season/season";

export interface TeamOverview {
  overall: number;
  prestige: number;
  expectedStrength: string;
  offensiveIdentity: string;
  defensiveIdentity: string;
  bestPlayerId: string;
  strength: string;
  weakness: string;
}

function average(values: number[]): number { return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length); }

export function teamOverview(team: Team): TeamOverview {
  const rotation = [...team.roster].sort((a, b) => b.ratings.overall - a.ratings.overall).slice(0, 8);
  const overall = Math.round(average(rotation.map((player) => player.ratings.overall)));
  const shooting = average(rotation.map((player) => player.ratings.threePoint));
  const interior = average(rotation.map((player) => player.ratings.insideScoring));
  const defense = average(rotation.map((player) => (player.ratings.perimeterDefense + player.ratings.interiorDefense) / 2));
  const rebounding = average(rotation.map((player) => player.ratings.offensiveRebounding + player.ratings.defensiveRebounding));
  const prestige = Math.max(1, Math.min(5, Math.round((overall - 58) / 5)));
  return {
    overall,
    prestige,
    expectedStrength: overall >= 77 ? "Conference contender" : overall >= 72 ? "Top-half contender" : overall >= 67 ? "Competitive" : "Rebuilding",
    offensiveIdentity: team.coach.style.includes("Fast") ? "Transition" : team.coach.style.includes("Analytics") ? "Perimeter" : interior > shooting ? "Inside scoring" : "Balanced spacing",
    defensiveIdentity: team.coach.style.includes("Defensive") ? "Half-court pressure" : defense >= 73 ? "Versatile" : "Conservative",
    bestPlayerId: rotation[0].id,
    strength: shooting >= 74 ? "Perimeter shooting" : interior >= 74 ? "Interior scoring" : rebounding >= 145 ? "Rebounding" : "Lineup balance",
    weakness: defense < 69 ? "Defensive consistency" : shooting < 68 ? "Floor spacing" : rebounding < 135 ? "Defensive glass" : "Bench depth",
  };
}

export function seasonObjective(team: Team): string {
  const overview = teamOverview(team);
  const underclassmen = team.roster.filter((player) => player.classYear === "FR" || player.classYear === "SO").length;
  if (overview.overall >= 77) return "Compete for the conference title";
  if (overview.overall >= 73) return "Finish in the top half of the conference";
  if (underclassmen >= 7) return "Develop a young roster and avoid a losing season";
  if (overview.overall >= 68) return "Reach 15 wins";
  return "Avoid a losing season";
}

export function createCareer(coach: UserCoach, now = Date.now()): CareerSave {
  return { schemaVersion: 2, careerId: `career-${now}`, stage: "program-selection", coach, createdAt: now, updatedAt: now };
}

export function acceptProgram(save: CareerSave, programId: string, teams: Team[], seed = 20260730, now = Date.now()): CareerSave {
  if ((save.stage === "season" || save.stage === "season-complete") && save.programId !== programId) throw new Error("This career is already assigned to a program.");
  const team = teams.find((candidate) => candidate.id === programId);
  if (!team) throw new Error("Program does not exist.");
  return { ...save, stage: "season-introduction", programId, seasonObjective: seasonObjective(team), season: createSeasonState(teams, programId, seed), liveGame: undefined, updatedAt: now };
}

export function startSeason(save: CareerSave, now = Date.now()): CareerSave {
  if (!save.programId || !save.season) throw new Error("Accept a coaching job before starting the season.");
  return { ...save, stage: "season", updatedAt: now };
}

export function userControlsTeam(save: CareerSave, teamId: string): boolean { return save.programId === teamId; }

export function finishRemainingAiGames(state: SeasonState): SeasonState {
  let next = state;
  for (const game of state.schedule.filter((candidate) => candidate.status === "scheduled")) {
    if (game.homeTeamId === state.userTeamId || game.awayTeamId === state.userTeamId) continue;
    next = simulateScheduledGame(next, game.id);
  }
  return { ...next, currentDay: next.totalDays };
}

export function settleCareerStage(save: CareerSave, now = Date.now()): CareerSave {
  if (!save.season || getNextUserGame(save.season)) return { ...save, updatedAt: now };
  const season = finishRemainingAiGames(save.season);
  return { ...save, stage: "season-complete", season, liveGame: undefined, updatedAt: now };
}

export function seasonLeaders(state: SeasonState, teamId?: string) {
  const teamPlayerIds = teamId ? new Set(state.teams.find((team) => team.id === teamId)?.roster.map((player) => player.id) ?? []) : undefined;
  const played = Object.values(state.playerStats).filter((stats) => stats.gamesPlayed > 0 && (!teamPlayerIds || teamPlayerIds.has(stats.playerId)));
  const perGame = (stats: SeasonPlayerStats, value: number) => value / Math.max(1, stats.gamesPlayed);
  return {
    scorer: [...played].sort((a, b) => perGame(b, b.points) - perGame(a, a.points))[0],
    rebounder: [...played].sort((a, b) => perGame(b, b.rebounds) - perGame(a, a.rebounds))[0],
    assister: [...played].sort((a, b) => perGame(b, b.assists) - perGame(a, a.assists))[0],
  };
}

export function objectiveMet(save: CareerSave): boolean {
  if (!save.season || !save.programId) return false;
  const record = save.season.records[save.programId];
  const standing = getStandings(save.season, save.season.teams.find((team) => team.id === save.programId)?.conference).findIndex((entry) => entry.teamId === save.programId) + 1;
  const objective = save.seasonObjective ?? "";
  if (objective.includes("conference title")) return standing === 1;
  if (objective.includes("top half")) return standing <= Math.ceil(getStandings(save.season, save.season.teams.find((team) => team.id === save.programId)?.conference).length / 2);
  if (objective.includes("15 wins")) return record.wins >= 15;
  return record.wins >= record.losses;
}
