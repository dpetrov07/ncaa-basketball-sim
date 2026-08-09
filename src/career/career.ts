import type { CareerSave, Coach, SeasonPlayerStats, SeasonState, Strategy, Team, UserCoach } from "../domain/types";
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
  return {
    overall,
    prestige: team.program.prestige,
    expectedStrength: team.program.expectations,
    offensiveIdentity: team.coach.style.includes("Fast") ? "Transition" : team.coach.style.includes("Analytics") ? "Perimeter" : interior > shooting ? "Inside scoring" : "Balanced spacing",
    defensiveIdentity: team.coach.style.includes("Defensive") ? "Half-court pressure" : defense >= 73 ? "Versatile" : "Conservative",
    bestPlayerId: rotation[0].id,
    strength: shooting >= 74 ? "Perimeter shooting" : interior >= 74 ? "Interior scoring" : rebounding >= 145 ? "Rebounding" : "Lineup balance",
    weakness: defense < 69 ? "Defensive consistency" : shooting < 68 ? "Floor spacing" : rebounding < 135 ? "Defensive glass" : "Bench depth",
  };
}

export function seasonObjective(team: Team, scheduledGames = 12): string {
  if (team.program.tier === "elite") return "Win the conference";
  if (team.program.tier === "strong") return "Finish in the top 3 of the conference";
  if (team.program.tier === "middle") return "Finish above .500";
  if (team.program.tier === "rebuilding") return `Win at least ${Math.max(3, Math.floor(scheduledGames * 0.4))} games`;
  return "Avoid last place in the conference";
}

export function userCoachToGameCoach(user: UserCoach): Coach {
  const ratings = { offense: 70, defense: 70, development: 70, adaptability: 70, rotation: 70, motivation: 70, discipline: 70 };
  if (user.archetype === "Offensive Mind" || user.archetype === "Analytics Coach") ratings.offense += 7;
  if (user.archetype === "Defensive Specialist") { ratings.defense += 8; ratings.offense -= 2; }
  if (user.archetype === "Player Developer") ratings.development += 9;
  if (user.archetype === "Motivator") ratings.motivation += 9;
  if (user.archetype === "Fast-Paced Coach") { ratings.offense += 3; ratings.motivation += 5; }
  if (user.offensivePhilosophy === "Motion" || user.offensivePhilosophy === "Pick and Roll") ratings.offense += 2;
  if (user.defensivePhilosophy === "Pressure" || user.defensivePhilosophy === "Switching") ratings.adaptability += 3;
  return {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    style: `${user.archetype}|${user.offensivePhilosophy}|${user.defensivePhilosophy}`,
    ratings,
  };
}

function userCoachDefaultStrategy(user: UserCoach, current: Strategy): Strategy {
  const offense: Record<UserCoach["offensivePhilosophy"], Strategy["offensiveStyle"]> = {
    Balanced: "balanced", Motion: "motion", "Pick and Roll": "pick-and-roll", "Inside Out": "inside-out", Perimeter: "three-point", Transition: "transition",
  };
  const defense: Record<UserCoach["defensivePhilosophy"], Strategy["defensiveScheme"]> = {
    "Man to Man": "man", Zone: "zone", Switching: "switching", Pressure: "full-court-press", Conservative: "conservative",
  };
  return {
    ...current,
    offensiveStyle: offense[user.offensivePhilosophy],
    defensiveScheme: defense[user.defensivePhilosophy],
    pace: user.archetype === "Fast-Paced Coach" || user.offensivePhilosophy === "Transition" ? "fast" : current.pace,
    pressFrequency: user.defensivePhilosophy === "Pressure" ? 55 : current.pressFrequency,
  };
}

export function createCareer(coach: UserCoach, now = Date.now()): CareerSave {
  return { schemaVersion: 2, careerId: `career-${now}`, stage: "program-selection", coach, createdAt: now, updatedAt: now };
}

export function acceptProgram(save: CareerSave, programId: string, teams: Team[], seed = 20260730, now = Date.now()): CareerSave {
  if ((save.stage === "season" || save.stage === "season-complete") && save.programId !== programId) throw new Error("This career is already assigned to a program.");
  const team = teams.find((candidate) => candidate.id === programId);
  if (!team) throw new Error("Program does not exist.");
  const season = createSeasonState(teams, programId, seed);
  season.userStrategy = userCoachDefaultStrategy(save.coach, season.userStrategy);
  const scheduledGames = season.schedule.filter((game) => game.homeTeamId === programId || game.awayTeamId === programId).length;
  return { ...save, stage: "season-introduction", programId, seasonObjective: seasonObjective(team, scheduledGames), season, liveGame: undefined, updatedAt: now };
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
  if (objective === "Win the conference") return standing === 1;
  if (objective === "Finish in the top 3 of the conference") return standing <= 3;
  if (objective === "Finish above .500") return record.wins > record.losses;
  if (objective.startsWith("Win at least ")) return record.wins >= Number(objective.match(/\d+/)?.[0] ?? 0);
  if (objective === "Avoid last place in the conference") return standing < getStandings(save.season, save.season.teams.find((team) => team.id === save.programId)?.conference).length;
  // Continue evaluating objectives stored by earlier compatible v2 saves.
  if (objective.includes("conference title")) return standing === 1;
  if (objective.includes("top half")) return standing <= Math.ceil(getStandings(save.season, save.season.teams.find((team) => team.id === save.programId)?.conference).length / 2);
  if (objective.includes("15 wins")) return record.wins >= Math.min(15, save.season.schedule.filter((game) => game.homeTeamId === save.programId || game.awayTeamId === save.programId).length);
  return record.wins >= record.losses;
}
