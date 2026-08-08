import type { GameResult, SeasonPlayerStats, SeasonState, ScheduledGame, Strategy, Team, TeamSeasonRecord } from "../domain/types";
import { defaultLineup, defaultStrategy } from "../data/teams";
import { simulateGame } from "../simulation/simulateGame";

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
        games.push(addGameToCalendar(calendar, { day: 8 + (ordinal % 18), homeTeamId: first.id, awayTeamId: second.id, conferenceGame: true }, ordinal++, seed));
        games.push(addGameToCalendar(calendar, { day: 8 + (ordinal % 18), homeTeamId: second.id, awayTeamId: first.id, conferenceGame: true }, ordinal++, seed));
      }
    }
  }
  const crossConferencePairs = teams.flatMap((team, index) => teams.slice(index + 1).filter((opponent) => opponent.conference !== team.conference).map((opponent) => ({ team, opponent, score: hash(`${seed}:${team.id}:${opponent.id}`) })));
  crossConferencePairs.sort((a, b) => a.score - b.score);
  const nonConferenceCount = new Map(teams.map((team) => [team.id, 0]));
  for (const pair of crossConferencePairs) {
    const firstCount = nonConferenceCount.get(pair.team.id) ?? 0;
    const secondCount = nonConferenceCount.get(pair.opponent.id) ?? 0;
    if (firstCount >= 4 || secondCount >= 4) continue;
    if (pair.score % 3 !== 0 && firstCount >= 2 && secondCount >= 2) continue;
    nonConferenceCount.set(pair.team.id, firstCount + 1); nonConferenceCount.set(pair.opponent.id, secondCount + 1);
    const homeFirst = pair.score % 2 === 0;
    games.push(addGameToCalendar(calendar, { day: 1 + (ordinal % 7), homeTeamId: homeFirst ? pair.team.id : pair.opponent.id, awayTeamId: homeFirst ? pair.opponent.id : pair.team.id, conferenceGame: false }, ordinal++, seed));
  }
  return games.sort((a, b) => a.day - b.day || a.id.localeCompare(b.id));
}

export function createSeasonState(teams: Team[], userTeamId: string, seed = 20260730): SeasonState {
  const records = Object.fromEntries(teams.map((team) => [team.id, emptyRecord(team.id)]));
  const playerStats = Object.fromEntries(teams.flatMap((team) => team.roster.map((player) => [player.id, emptyPlayerStats(player.id)])));
  const schedule = generateSchedule(teams, seed);
  return { schemaVersion: 1, seasonYear: SEASON_YEAR, seed, currentDay: 1, totalDays: Math.max(...schedule.map((game) => game.day), 1), userTeamId, userLineup: defaultLineup(teams.find((team) => team.id === userTeamId) ?? teams[0]), userStrategy: { ...defaultStrategy }, teams, schedule, records, playerStats, history: [] };
}

function copyState(state: SeasonState): SeasonState {
  return JSON.parse(JSON.stringify(state)) as SeasonState;
}

export function getNextUserGame(state: SeasonState): ScheduledGame | undefined {
  return state.schedule.find((game) => game.status === "scheduled" && (game.homeTeamId === state.userTeamId || game.awayTeamId === state.userTeamId));
}

export function getStandings(state: SeasonState, conference?: string): TeamSeasonRecord[] {
  return Object.values(state.records).filter((record) => !conference || state.teams.find((team) => team.id === record.teamId)?.conference === conference).sort((a, b) => {
    const winPercentage = (record: TeamSeasonRecord) => record.wins / Math.max(1, record.wins + record.losses);
    return winPercentage(b) - winPercentage(a) || (b.conferenceWins - b.conferenceLosses) - (a.conferenceWins - a.conferenceLosses) || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst);
  });
}

export function teamStrategy(team: Team): Strategy {
  const style = team.coach.style;
  return { ...defaultStrategy, pace: style === "Fast-Paced Innovator" ? "fast" : style === "Defensive Traditionalist" ? "slow" : "balanced", offensiveStyle: style === "Analytics Coach" ? "three-point" : style === "Player Developer" ? "motion" : "balanced", defensiveScheme: style === "Defensive Traditionalist" ? "conservative" : "man", pressFrequency: style === "Motivator" ? 34 : defaultStrategy.pressFrequency };
}

export function completeSeasonGame(state: SeasonState, gameId: string, result: GameResult): SeasonState {
  const next = copyState(state);
  const scheduled = next.schedule.find((game) => game.id === gameId);
  if (!scheduled || scheduled.status === "completed") return next;
  scheduled.status = "completed"; scheduled.result = result;
  next.history = [...next.history, gameId];
  const homeRecord = next.records[scheduled.homeTeamId];
  const awayRecord = next.records[scheduled.awayTeamId];
  const homePoints = result.home.stats.points; const awayPoints = result.away.stats.points;
  homeRecord.pointsFor += homePoints; homeRecord.pointsAgainst += awayPoints; awayRecord.pointsFor += awayPoints; awayRecord.pointsAgainst += homePoints;
  const homeWon = result.winnerId === scheduled.homeTeamId;
  if (homeWon) { homeRecord.wins += 1; homeRecord.streak = Math.max(1, homeRecord.streak + 1); awayRecord.losses += 1; awayRecord.streak = Math.min(-1, awayRecord.streak - 1); }
  else { awayRecord.wins += 1; awayRecord.streak = Math.max(1, awayRecord.streak + 1); homeRecord.losses += 1; homeRecord.streak = Math.min(-1, homeRecord.streak - 1); }
  if (scheduled.conferenceGame) {
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
  return next;
}

export function simulateScheduledGame(state: SeasonState, gameId: string): SeasonState {
  const scheduled = state.schedule.find((game) => game.id === gameId);
  if (!scheduled || scheduled.status === "completed") return state;
  const home = state.teams.find((team) => team.id === scheduled.homeTeamId);
  const away = state.teams.find((team) => team.id === scheduled.awayTeamId);
  if (!home || !away) return state;
  const result = simulateGame({ home, away, homeLineup: { playerIds: defaultLineup(home) }, awayLineup: { playerIds: defaultLineup(away) }, homeStrategy: teamStrategy(home), awayStrategy: teamStrategy(away), seed: scheduled.seed });
  return completeSeasonGame(state, gameId, result);
}

export function advanceOneDay(state: SeasonState): SeasonState {
  let next = copyState(state);
  const nextUserGame = getNextUserGame(state);
  const targetDay = Math.min(state.totalDays, state.currentDay + 1, nextUserGame?.day ?? state.totalDays);
  for (const game of state.schedule.filter((candidate) => candidate.status === "scheduled" && candidate.day <= targetDay && candidate.homeTeamId !== state.userTeamId && candidate.awayTeamId !== state.userTeamId)) next = simulateScheduledGame(next, game.id);
  next.currentDay = targetDay;
  return next;
}

export function advanceToNextUserGame(state: SeasonState): SeasonState {
  const nextGame = getNextUserGame(state);
  if (!nextGame) return state;
  let next = copyState(state);
  for (const game of state.schedule.filter((candidate) => candidate.status === "scheduled" && candidate.day <= nextGame.day && candidate.id !== nextGame.id)) next = simulateScheduledGame(next, game.id);
  next.currentDay = nextGame.day;
  return next;
}

export function seasonPercent(stats: SeasonPlayerStats, field: "fg" | "two" | "three" | "ft"): number {
  const attempts = field === "fg" ? stats.fga : field === "two" ? stats.twoPa : field === "three" ? stats.threePa : stats.fta;
  const made = field === "fg" ? stats.fgm : field === "two" ? stats.twoPm : field === "three" ? stats.threePm : stats.ftm;
  return attempts ? made / attempts : 0;
}
