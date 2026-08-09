import type { GameResult, SeasonPlayerStats, SeasonState, ScheduledGame, Strategy, Team, TeamSeasonRecord } from "../domain/types";
import { defaultLineup, defaultStrategy } from "../data/teams";
import { simulateGame } from "../simulation/simulateGame";
import { createHistorySnapshot, emptyRecordBook, generateAwards, updateRecordBook } from "./insights";
import { calculateRankings } from "./rankings";

const SEASON_YEAR = 2026;

function hash(value: string): number {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
}

function emptyRecord(teamId: string): TeamSeasonRecord {
  return { teamId, wins: 0, losses: 0, conferenceWins: 0, conferenceLosses: 0, pointsFor: 0, pointsAgainst: 0, streak: 0 };
}

function emptyPlayerStats(playerId: string): SeasonPlayerStats {
  return { playerId, gamesPlayed: 0, gamesStarted: 0, minutes: 0, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0, fgm: 0, fga: 0, twoPm: 0, twoPa: 0, threePm: 0, threePa: 0, ftm: 0, fta: 0, plusMinus: 0, seasonHighPoints: 0, recentPoints: [] };
}

function addGameToCalendar(calendar: Map<number, Set<string>>, game: Omit<ScheduledGame, "id" | "status" | "seed" | "seasonYear" | "result">, ordinal: number, seed: number): ScheduledGame {
  let day = game.day;
  while ([game.homeTeamId, game.awayTeamId].some((teamId) => calendar.get(day)?.has(teamId))) day += 1;
  const users = calendar.get(day) ?? new Set<string>();
  users.add(game.homeTeamId); users.add(game.awayTeamId); calendar.set(day, users);
  const id = `s${SEASON_YEAR}-g${ordinal}`;
  return { ...game, id, day, seasonYear: SEASON_YEAR, seed: (seed + hash(id)) >>> 0, status: "scheduled" };
}

export function generateSchedule(teams: Team[], seed: number): ScheduledGame[] {
  const calendar = new Map<number, Set<string>>();
  const games: ScheduledGame[] = [];
  let ordinal = 1;
  const byConference = new Map<string, Team[]>();
  teams.forEach((team) => byConference.set(team.conference, [...(byConference.get(team.conference) ?? []), team]));
  for (const conferenceTeams of byConference.values()) {
    for (let index = 0; index < conferenceTeams.length; index += 1) {
      for (let opponentIndex = index + 1; opponentIndex < conferenceTeams.length; opponentIndex += 1) {
        const first = conferenceTeams[index];
        const second = conferenceTeams[opponentIndex];
        games.push(addGameToCalendar(calendar, { day: 8 + (ordinal % 18), homeTeamId: first.id, awayTeamId: second.id, conferenceGame: true, gameType: "regular-season" }, ordinal++, seed));
        games.push(addGameToCalendar(calendar, { day: 8 + (ordinal % 18), homeTeamId: second.id, awayTeamId: first.id, conferenceGame: true, gameType: "regular-season" }, ordinal++, seed));
      }
    }
  }
  const conferenceGroups = [...byConference.values()];
  if (conferenceGroups.length % 2 !== 0 || conferenceGroups.some((group) => group.length !== conferenceGroups[0]?.length)) throw new Error("Balanced scheduling requires an even number of equally sized conferences.");
  const addMatching = (first: Team[], second: Team[], offset: number) => {
    for (let index = 0; index < first.length; index += 1) {
      const opponent = second[(index + offset) % second.length];
      const homeFirst = hash(`${seed}:home:${first[index].id}:${opponent.id}`) % 2 === 0;
      games.push(addGameToCalendar(calendar, { day: 1 + (ordinal % 7), homeTeamId: homeFirst ? first[index].id : opponent.id, awayTeamId: homeFirst ? opponent.id : first[index].id, conferenceGame: false, gameType: "regular-season" }, ordinal++, seed));
    }
  };
  for (let firstIndex = 0; firstIndex < conferenceGroups.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < conferenceGroups.length; secondIndex += 1) {
      const offset = hash(`${seed}:matching:${firstIndex}:${secondIndex}`) % conferenceGroups[firstIndex].length;
      addMatching(conferenceGroups[firstIndex], conferenceGroups[secondIndex], offset);
      if (secondIndex === firstIndex + 1 && firstIndex % 2 === 0) addMatching(conferenceGroups[firstIndex], conferenceGroups[secondIndex], (offset + 1) % conferenceGroups[firstIndex].length);
    }
  }
  const schedule = games.sort((a, b) => a.day - b.day || a.id.localeCompare(b.id));
  validateSchedule(schedule, teams, 12);
  return schedule;
}

export function validateSchedule(schedule: ScheduledGame[], teams: Team[], expectedGamesPerTeam?: number): void {
  const teamIds = new Set(teams.map((team) => team.id));
  const gameIds = new Set<string>();
  const counts = new Map(teams.map((team) => [team.id, 0]));
  const calendar = new Set<string>();
  for (const game of schedule) {
    if (gameIds.has(game.id)) throw new Error(`Duplicate scheduled game ID ${game.id}.`);
    if (!teamIds.has(game.homeTeamId) || !teamIds.has(game.awayTeamId)) throw new Error("Schedule references an unknown team.");
    if (game.homeTeamId === game.awayTeamId) throw new Error("A team cannot play itself.");
    for (const teamId of [game.homeTeamId, game.awayTeamId]) {
      const calendarKey = `${game.day}:${teamId}`;
      if (calendar.has(calendarKey)) throw new Error(`${teamId} is scheduled twice on day ${game.day}.`);
      calendar.add(calendarKey);
      counts.set(teamId, (counts.get(teamId) ?? 0) + 1);
    }
    gameIds.add(game.id);
  }
  if (expectedGamesPerTeam && [...counts.values()].some((count) => count !== expectedGamesPerTeam)) throw new Error(`Every team must play ${expectedGamesPerTeam} games.`);
}

export function createSeasonState(teams: Team[], userTeamId: string, seed = 20260730): SeasonState {
  const records = Object.fromEntries(teams.map((team) => [team.id, emptyRecord(team.id)]));
  const playerStats = Object.fromEntries(teams.flatMap((team) => team.roster.map((player) => [player.id, emptyPlayerStats(player.id)])));
  const schedule = generateSchedule(teams, seed);
  const state: SeasonState = { schemaVersion: 1, seasonYear: SEASON_YEAR, seed, currentDay: 1, totalDays: Math.max(...schedule.map((game) => game.day), 1), phase: "preseason", userTeamId, userLineup: defaultLineup(teams.find((team) => team.id === userTeamId) ?? teams[0]), userStrategy: { ...defaultStrategy }, teams, schedule, records, playerStats, history: [], rankings: [], postseason: { conferenceGenerated: false, conferences: [], nationalGenerated: false }, recordBook: emptyRecordBook() };
  state.rankings = calculateRankings(state, []);
  return state;
}

function copyState(state: SeasonState): SeasonState {
  const { teams, ...mutable } = state;
  const copy = { ...JSON.parse(JSON.stringify(mutable)), teams } as SeasonState;
  for (const game of copy.schedule) if (game.result) {
    game.result.home.team = teams.find((team) => team.id === game.result?.home.team.id) ?? game.result.home.team;
    game.result.away.team = teams.find((team) => team.id === game.result?.away.team.id) ?? game.result.away.team;
  }
  return copy;
}

export function getNextUserGame(state: SeasonState): ScheduledGame | undefined {
  return [...state.schedule].filter((game) => game.status === "scheduled" && (game.homeTeamId === state.userTeamId || game.awayTeamId === state.userTeamId)).sort((a, b) => a.day - b.day || a.id.localeCompare(b.id))[0];
}

export function getStandings(state: SeasonState, conference?: string): TeamSeasonRecord[] {
  const records = Object.values(state.records).filter((record) => !conference || state.teams.find((team) => team.id === record.teamId)?.conference === conference);
  const frozen = conference ? state.finalConferenceStandings?.[conference] : undefined;
  if (frozen) return records.sort((a, b) => frozen.indexOf(a.teamId) - frozen.indexOf(b.teamId));
  return records.sort((a, b) => {
    const winPercentage = (record: TeamSeasonRecord) => record.wins / Math.max(1, record.wins + record.losses);
    return winPercentage(b) - winPercentage(a) || (b.conferenceWins - b.conferenceLosses) - (a.conferenceWins - a.conferenceLosses) || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst);
  });
}

export function teamStrategy(team: Team): Strategy {
  const style = team.coach.style;
  const identity = team.program.identity;
  return {
    ...defaultStrategy,
    pace: style === "Fast-Paced Innovator" ? "fast" : style === "Defensive Traditionalist" ? "slow" : identity === "athleticism" ? "fast" : "balanced",
    offensiveStyle: style === "Analytics Coach" || identity === "shooting" ? "three-point" : style === "Player Developer" ? "motion" : identity === "rebounding" ? "inside-out" : "balanced",
    shotEmphasis: identity === "shooting" ? "three" : identity === "rebounding" ? "post" : "rim",
    defensiveScheme: style === "Defensive Traditionalist" ? "conservative" : identity === "defense" ? "aggressive-help" : "man",
    pressFrequency: style === "Motivator" ? 34 : identity === "athleticism" ? 30 : defaultStrategy.pressFrequency,
  };
}

function tournamentStrategy(team: Team): Strategy {
  const strategy = teamStrategy(team);
  return { ...strategy, rotationSize: Math.min(8, strategy.rotationSize), lateGameFouling: true, foulTroubleSubstitution: true, reboundingAggressiveness: Math.max(55, strategy.reboundingAggressiveness) };
}

function postseasonGame(state: SeasonState, id: string, day: number, homeTeamId: string, awayTeamId: string, gameType: "conference-tournament" | "national-postseason", round: ScheduledGame["round"]): ScheduledGame {
  return { id, seasonYear: state.seasonYear, day, homeTeamId, awayTeamId, conferenceGame: false, gameType, round, neutralSite: true, seed: (state.seed + hash(id)) >>> 0, status: "scheduled" };
}

export function generateConferenceTournament(state: SeasonState): SeasonState {
  if (state.postseason.conferenceGenerated) return state;
  if (state.schedule.some((game) => game.gameType === "regular-season" && game.status !== "completed")) throw new Error("The regular season must finish before the conference tournament.");
  const next = copyState(state);
  const conferences = [...new Set(next.teams.map((team) => team.conference))];
  next.finalConferenceStandings = Object.fromEntries(conferences.map((conference) => [conference, getStandings(next, conference).map((entry) => entry.teamId)]));
  next.phase = "conference-tournament";
  next.postseason = { ...next.postseason, conferenceGenerated: true, conferences: conferences.map((conference) => ({ conference, seeds: next.finalConferenceStandings![conference], gameIds: [] })) };
  const day = next.totalDays + 1;
  for (const bracket of next.postseason.conferences) {
    const id = `ct-${bracket.conference.toLowerCase()}-play-in`;
    next.schedule.push(postseasonGame(next, id, day, bracket.seeds[3], bracket.seeds[4], "conference-tournament", "play-in"));
    bracket.gameIds.push(id);
  }
  next.totalDays = day + 5;
  next.currentDay = Math.min(next.currentDay, day);
  return next;
}

function winner(state: SeasonState, gameId: string): string | undefined { return state.schedule.find((game) => game.id === gameId)?.result?.winnerId; }
function roundGames(state: SeasonState, ids: string[], round: ScheduledGame["round"]): ScheduledGame[] { return ids.map((id) => state.schedule.find((game) => game.id === id)!).filter((game) => game?.round === round); }

function progressConferenceTournament(state: SeasonState): SeasonState {
  let next = state;
  const allPlayIns = next.postseason.conferences.flatMap((bracket) => roundGames(next, bracket.gameIds, "play-in"));
  if (allPlayIns.some((game) => game.status !== "completed")) return next;
  if (next.postseason.conferences.some((bracket) => !roundGames(next, bracket.gameIds, "semifinal").length)) {
    next = copyState(next); const day = Math.max(...allPlayIns.map((game) => game.day)) + 1;
    for (const bracket of next.postseason.conferences) {
      const playInWinner = winner(next, roundGames(next, bracket.gameIds, "play-in")[0].id)!;
      const matchups: [string, string][] = [[bracket.seeds[0], playInWinner], [bracket.seeds[1], bracket.seeds[2]]];
      matchups.forEach(([home, away], index) => { const id = `ct-${bracket.conference.toLowerCase()}-semi-${index + 1}`; next.schedule.push(postseasonGame(next, id, day, home, away, "conference-tournament", "semifinal")); bracket.gameIds.push(id); });
    }
    return next;
  }
  const allSemis = next.postseason.conferences.flatMap((bracket) => roundGames(next, bracket.gameIds, "semifinal"));
  if (allSemis.some((game) => game.status !== "completed")) return next;
  if (next.postseason.conferences.some((bracket) => !roundGames(next, bracket.gameIds, "final").length)) {
    next = copyState(next); const day = Math.max(...allSemis.map((game) => game.day)) + 1;
    for (const bracket of next.postseason.conferences) {
      const semifinalWinners = roundGames(next, bracket.gameIds, "semifinal").map((game) => winner(next, game.id)!);
      const id = `ct-${bracket.conference.toLowerCase()}-final`; next.schedule.push(postseasonGame(next, id, day, semifinalWinners[0], semifinalWinners[1], "conference-tournament", "final")); bracket.gameIds.push(id);
    }
    return next;
  }
  const allFinals = next.postseason.conferences.flatMap((bracket) => roundGames(next, bracket.gameIds, "final"));
  if (allFinals.some((game) => game.status !== "completed")) return next;
  next = copyState(next);
  for (const bracket of next.postseason.conferences) bracket.championId = winner(next, roundGames(next, bracket.gameIds, "final")[0].id);
  return generateNationalTournament(next);
}

export function generateNationalTournament(state: SeasonState): SeasonState {
  if (state.postseason.nationalGenerated) return state;
  if (!state.postseason.conferences.length || state.postseason.conferences.some((bracket) => !bracket.championId)) throw new Error("Conference champions must be determined before national selection.");
  const next = copyState(state);
  const automatic = next.postseason.conferences.map((bracket) => bracket.championId!);
  const field = [...automatic, ...next.rankings.map((entry) => entry.teamId).filter((teamId) => !automatic.includes(teamId)).slice(0, 8 - automatic.length)];
  const ranking = new Map(next.rankings.map((entry) => [entry.teamId, entry.rank]));
  field.sort((a, b) => (ranking.get(a) ?? 99) - (ranking.get(b) ?? 99));
  next.phase = "national-postseason";
  next.postseason = { ...next.postseason, nationalGenerated: true, national: { seeds: field, gameIds: [] } };
  const day = Math.max(...next.schedule.map((game) => game.day)) + 2;
  const matchups: [string, string][] = [[field[0], field[7]], [field[3], field[4]], [field[1], field[6]], [field[2], field[5]]];
  matchups.forEach(([home, away], index) => { const id = `nt-quarterfinal-${index + 1}`; next.schedule.push(postseasonGame(next, id, day, home, away, "national-postseason", "quarterfinal")); next.postseason.national!.gameIds.push(id); });
  next.totalDays = day + 6;
  return next;
}

function progressNationalTournament(state: SeasonState): SeasonState {
  const bracket = state.postseason.national;
  if (!bracket) return state;
  const quarters = roundGames(state, bracket.gameIds, "quarterfinal");
  if (quarters.some((game) => game.status !== "completed")) return state;
  if (!roundGames(state, bracket.gameIds, "semifinal").length) {
    const next = copyState(state); const nextBracket = next.postseason.national!; const winners = quarters.map((game) => winner(next, game.id)!); const day = Math.max(...quarters.map((game) => game.day)) + 2;
    [[winners[0], winners[1]], [winners[2], winners[3]]].forEach(([home, away], index) => { const id = `nt-semifinal-${index + 1}`; next.schedule.push(postseasonGame(next, id, day, home, away, "national-postseason", "semifinal")); nextBracket.gameIds.push(id); });
    return next;
  }
  const semis = roundGames(state, bracket.gameIds, "semifinal");
  if (semis.some((game) => game.status !== "completed")) return state;
  if (!roundGames(state, bracket.gameIds, "championship").length) {
    const next = copyState(state); const winners = semis.map((game) => winner(next, game.id)!); const id = "nt-championship"; next.schedule.push(postseasonGame(next, id, Math.max(...semis.map((game) => game.day)) + 2, winners[0], winners[1], "national-postseason", "championship")); next.postseason.national!.gameIds.push(id); return next;
  }
  const championship = roundGames(state, bracket.gameIds, "championship")[0];
  if (championship.status !== "completed") return state;
  const next = copyState(state); const championId = winner(next, championship.id)!; next.postseason.national!.championId = championId; next.postseason.national!.runnerUpId = championship.homeTeamId === championId ? championship.awayTeamId : championship.homeTeamId; next.phase = "complete"; next.currentDay = next.totalDays; next.awards = generateAwards(next); return next;
}

export function progressSeason(state: SeasonState): SeasonState {
  if (state.phase === "preseason") return { ...state, phase: "regular-season" };
  if (state.phase === "regular-season" && state.schedule.filter((game) => game.gameType === "regular-season").every((game) => game.status === "completed")) return generateConferenceTournament(state);
  if (state.phase === "conference-tournament") return progressConferenceTournament(state);
  if (state.phase === "national-postseason") return progressNationalTournament(state);
  return state;
}

export function completeSeasonGame(state: SeasonState, gameId: string, result: GameResult): SeasonState {
  const next = copyState(state);
  const scheduled = next.schedule.find((game) => game.id === gameId);
  if (!scheduled || scheduled.status === "completed") return next;
  const homeRank = next.rankings.find((entry) => entry.teamId === scheduled.homeTeamId)?.rank;
  const awayRank = next.rankings.find((entry) => entry.teamId === scheduled.awayTeamId)?.rank;
  scheduled.status = "completed"; scheduled.result = result; scheduled.historySnapshot = createHistorySnapshot(scheduled, result, homeRank, awayRank);
  next.history = [...next.history, gameId];
  const homeRecord = next.records[scheduled.homeTeamId];
  const awayRecord = next.records[scheduled.awayTeamId];
  const homePoints = result.home.stats.points; const awayPoints = result.away.stats.points;
  homeRecord.pointsFor += homePoints; homeRecord.pointsAgainst += awayPoints; awayRecord.pointsFor += awayPoints; awayRecord.pointsAgainst += homePoints;
  const homeWon = result.winnerId === scheduled.homeTeamId;
  if (homeWon) { homeRecord.wins += 1; homeRecord.streak = Math.max(1, homeRecord.streak + 1); awayRecord.losses += 1; awayRecord.streak = Math.min(-1, awayRecord.streak - 1); }
  else { awayRecord.wins += 1; awayRecord.streak = Math.max(1, awayRecord.streak + 1); homeRecord.losses += 1; homeRecord.streak = Math.min(-1, homeRecord.streak - 1); }
  if (scheduled.gameType === "regular-season" && scheduled.conferenceGame) {
    if (homeWon) { homeRecord.conferenceWins += 1; awayRecord.conferenceLosses += 1; }
    else { awayRecord.conferenceWins += 1; homeRecord.conferenceLosses += 1; }
  }
  for (const box of [result.home, result.away]) for (const player of box.players) {
    const season = next.playerStats[player.playerId] ?? emptyPlayerStats(player.playerId);
    if (player.minutes > 0) season.gamesPlayed += 1;
    const starters = box.team.id === result.home.team.id ? result.homeStartingLineup : result.awayStartingLineup;
    if (starters?.includes(player.playerId)) season.gamesStarted += 1;
    season.minutes += player.minutes; season.points += player.points; season.rebounds += player.offensiveRebounds + player.defensiveRebounds; season.assists += player.assists; season.steals += player.steals; season.blocks += player.blocks; season.turnovers += player.turnovers; season.fouls += player.fouls; season.fgm += player.fgm; season.fga += player.fga; season.twoPm += player.twoPm; season.twoPa += player.twoPa; season.threePm += player.threePm; season.threePa += player.threePa; season.ftm += player.ftm; season.fta += player.fta; season.plusMinus += player.plusMinus; season.seasonHighPoints = Math.max(season.seasonHighPoints, player.points); season.recentPoints = [...season.recentPoints, player.points].slice(-5); next.playerStats[player.playerId] = season;
  }
  next.recordBook = updateRecordBook(next, scheduled, result);
  next.rankings = calculateRankings(next, state.rankings);
  return progressSeason(next);
}

export function simulateScheduledGame(state: SeasonState, gameId: string): SeasonState {
  const scheduled = state.schedule.find((game) => game.id === gameId);
  if (!scheduled || scheduled.status === "completed") return state;
  const home = state.teams.find((team) => team.id === scheduled.homeTeamId);
  const away = state.teams.find((team) => team.id === scheduled.awayTeamId);
  if (!home || !away) return state;
  const highStakes = scheduled.gameType !== "regular-season";
  const result = simulateGame({ home, away, homeLineup: { playerIds: defaultLineup(home) }, awayLineup: { playerIds: defaultLineup(away) }, homeStrategy: highStakes ? tournamentStrategy(home) : teamStrategy(home), awayStrategy: highStakes ? tournamentStrategy(away) : teamStrategy(away), homeCoach: home.coach, awayCoach: away.coach, neutralSite: scheduled.neutralSite, seed: scheduled.seed });
  return completeSeasonGame(state, gameId, result);
}

export function advanceOneDay(state: SeasonState): SeasonState {
  let next = progressSeason(copyState(state));
  if (next.phase === "complete") return next;
  const nextUserGame = getNextUserGame(next);
  const targetDay = Math.min(next.totalDays, next.currentDay + 1, nextUserGame?.day ?? next.totalDays);
  for (const game of [...next.schedule].filter((candidate) => candidate.status === "scheduled" && candidate.day <= targetDay && candidate.homeTeamId !== next.userTeamId && candidate.awayTeamId !== next.userTeamId).sort((a, b) => a.day - b.day || a.id.localeCompare(b.id))) next = simulateScheduledGame(next, game.id);
  next.currentDay = Math.min(targetDay, next.totalDays);
  return progressSeason(next);
}

export function advanceToNextUserGame(state: SeasonState): SeasonState {
  let next = progressSeason(copyState(state));
  for (let guard = 0; guard < 500 && next.phase !== "complete"; guard += 1) {
    const userGame = getNextUserGame(next);
    const aiGame = [...next.schedule].filter((game) => game.status === "scheduled" && game.homeTeamId !== next.userTeamId && game.awayTeamId !== next.userTeamId && (!userGame || game.day <= userGame.day)).sort((a, b) => a.day - b.day || a.id.localeCompare(b.id))[0];
    if (aiGame) { next = simulateScheduledGame(next, aiGame.id); continue; }
    if (userGame) { next.currentDay = userGame.day; return next; }
    const progressed = progressSeason(next);
    if (progressed === next || JSON.stringify(progressed.postseason) === JSON.stringify(next.postseason)) {
      const anyAi = [...next.schedule].filter((game) => game.status === "scheduled" && game.homeTeamId !== next.userTeamId && game.awayTeamId !== next.userTeamId).sort((a, b) => a.day - b.day || a.id.localeCompare(b.id))[0];
      if (!anyAi) return next;
      next = simulateScheduledGame(next, anyAi.id);
    } else next = progressed;
  }
  return next;
}

export function seasonPercent(stats: SeasonPlayerStats, field: "fg" | "two" | "three" | "ft"): number {
  const attempts = field === "fg" ? stats.fga : field === "two" ? stats.twoPa : field === "three" ? stats.threePa : stats.fta;
  const made = field === "fg" ? stats.fgm : field === "two" ? stats.twoPm : field === "three" ? stats.threePm : stats.ftm;
  return attempts ? made / attempts : 0;
}
