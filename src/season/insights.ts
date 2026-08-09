import type {
  GameHistorySnapshot,
  GameResult,
  PlayerLeaderboardCategory,
  PlayerLeaderboardEntry,
  PostgameAnalysisItem,
  ScoutingReport,
  SeasonAwards,
  SeasonRecordBook,
  SeasonState,
  ScheduledGame,
  Strategy,
  Team,
  TeamLeaderboardCategory,
  TeamLeaderboardEntry,
} from "../domain/types";
import { defaultLineup, defaultStrategy } from "../data/teams";

export function emptyRecordBook(): SeasonRecordBook {
  return { players: { points: undefined, rebounds: undefined, assists: undefined, threes: undefined, blocks: undefined, steals: undefined }, teamRecords: { highestScore: undefined, lowestAllowed: undefined, largestWin: undefined, largestLoss: undefined, longestWinStreak: undefined, longestLosingStreak: undefined, bestRankedWin: undefined } };
}

function postgameAnalysis(result: GameResult): PostgameAnalysisItem[] {
  const items: PostgameAnalysisItem[] = [];
  const home = result.home.stats; const away = result.away.stats;
  const homeRebounds = home.offensiveRebounds + home.defensiveRebounds; const awayRebounds = away.offensiveRebounds + away.defensiveRebounds;
  if (Math.abs(homeRebounds - awayRebounds) >= 5) { const better = homeRebounds > awayRebounds ? result.home : result.away; const worse = better === result.home ? result.away : result.home; items.push({ category: "rebounding", advantageTeamId: better.team.id, text: `${better.team.shortName} won the rebounding battle ${better.stats.offensiveRebounds + better.stats.defensiveRebounds}–${worse.stats.offensiveRebounds + worse.stats.defensiveRebounds}.` }); }
  if (Math.abs(home.turnovers - away.turnovers) >= 4) { const better = home.turnovers < away.turnovers ? result.home : result.away; const worse = better === result.home ? result.away : result.home; items.push({ category: "turnovers", advantageTeamId: better.team.id, text: `${better.team.shortName} committed ${worse.stats.turnovers - better.stats.turnovers} fewer turnovers.` }); }
  const homeStarters = new Set(result.homeStartingLineup); const awayStarters = new Set(result.awayStartingLineup); const homeBench = result.home.players.filter((player) => !homeStarters.has(player.playerId)).reduce((sum, player) => sum + player.points, 0); const awayBench = result.away.players.filter((player) => !awayStarters.has(player.playerId)).reduce((sum, player) => sum + player.points, 0);
  if (Math.abs(homeBench - awayBench) >= 8) { const better = homeBench > awayBench ? result.home : result.away; items.push({ category: "bench", advantageTeamId: better.team.id, text: `${better.team.shortName}'s bench held a ${Math.abs(homeBench - awayBench)}-point scoring advantage.` }); }
  for (const box of [result.home, result.away]) if (box.stats.threePa >= 8 && box.stats.threePm / box.stats.threePa >= .4) items.push({ category: "shooting", advantageTeamId: box.team.id, text: `${box.team.shortName} shot ${Math.round(box.stats.threePm / box.stats.threePa * 100)}% from three.` });
  for (const box of [result.home, result.away]) {
    const attempts = box.players.reduce((sum, player) => sum + player.fga, 0);
    const primary = [...box.players].sort((a, b) => b.fga - a.fga)[0];
    if (primary && attempts && primary.fga / attempts >= .28) items.push({ category: "usage", advantageTeamId: box.team.id, text: `${box.team.roster.find((player) => player.id === primary.playerId)?.name} generated ${Math.round(primary.fga / attempts * 100)}% of ${box.team.shortName}'s attempts.` });
  }
  return items.slice(0, 4);
}

export function createHistorySnapshot(game: ScheduledGame, result: GameResult, homeRank?: number, awayRank?: number): GameHistorySnapshot {
  const players = [...result.home.players, ...result.away.players];
  const by = (value: (player: typeof players[number]) => number) => [...players].sort((a, b) => value(b) - value(a))[0];
  let homeScore = 0; let awayScore = 0; let largestLead = 0;
  for (const event of result.events) if (event.points) {
    if (event.teamId === result.home.team.id) homeScore += event.points; else if (event.teamId === result.away.team.id) awayScore += event.points;
    largestLead = Math.max(largestLead, Math.abs(homeScore - awayScore));
  }
  return {
    gameType: game.gameType,
    week: Math.ceil(game.day / 7),
    rankings: { homeRank, awayRank },
    highScorerId: by((player) => player.points)?.playerId,
    highRebounderId: by((player) => player.offensiveRebounds + player.defensiveRebounds)?.playerId,
    highAssisterId: by((player) => player.assists)?.playerId,
    largestLead,
    overtimeCount: Math.max(0, result.periods - 2),
    importantEventIds: result.events.filter((event) => event.kind === "shot" && event.result === "made" && event.clock <= 90 || event.kind === "foul" && event.foulType === "intentional").slice(-6).map((event) => event.id),
    analysis: postgameAnalysis(result),
  };
}

export function updateRecordBook(state: SeasonState, game: ScheduledGame, result: GameResult): SeasonRecordBook {
  const book = structuredClone(state.recordBook ?? emptyRecordBook());
  const playerCategories = {
    points: (player: GameResult["home"]["players"][number]) => player.points,
    rebounds: (player: GameResult["home"]["players"][number]) => player.offensiveRebounds + player.defensiveRebounds,
    assists: (player: GameResult["home"]["players"][number]) => player.assists,
    threes: (player: GameResult["home"]["players"][number]) => player.threePm,
    blocks: (player: GameResult["home"]["players"][number]) => player.blocks,
    steals: (player: GameResult["home"]["players"][number]) => player.steals,
  };
  for (const box of [result.home, result.away]) for (const player of box.players) for (const [category, value] of Object.entries(playerCategories) as [keyof typeof playerCategories, typeof playerCategories[keyof typeof playerCategories]][]) {
    const amount = value(player); const current = book.players[category];
    if (!current || amount > current.value) book.players[category] = { playerId: player.playerId, value: amount, gameId: game.id };
  }
  const teams = [[result.home, result.away], [result.away, result.home]] as const;
  for (const [box, opponent] of teams) {
    const margin = box.stats.points - opponent.stats.points;
    const set = (category: keyof SeasonRecordBook["teamRecords"], value: number, better: (value: number, current: number) => boolean) => { const current = book.teamRecords[category]; if (!current || better(value, current.value)) book.teamRecords[category] = { teamId: box.team.id, value, gameId: game.id }; };
    set("highestScore", box.stats.points, (value, current) => value > current);
    set("lowestAllowed", opponent.stats.points, (value, current) => value < current);
    if (margin > 0) set("largestWin", margin, (value, current) => value > current); else set("largestLoss", margin, (value, current) => value < current);
    const ranking = box.team.id === game.homeTeamId ? game.historySnapshot?.rankings.awayRank : game.historySnapshot?.rankings.homeRank;
    if (margin > 0 && ranking) set("bestRankedWin", ranking, (value, current) => value < current);
  }
  for (const record of Object.values(state.records)) {
    if (record.streak > 0) { const current = book.teamRecords.longestWinStreak; if (!current || record.streak > current.value) book.teamRecords.longestWinStreak = { teamId: record.teamId, value: record.streak, gameId: game.id }; }
    if (record.streak < 0) { const value = Math.abs(record.streak); const current = book.teamRecords.longestLosingStreak; if (!current || value > current.value) book.teamRecords.longestLosingStreak = { teamId: record.teamId, value, gameId: game.id }; }
  }
  return book;
}

export function playerLeaderboard(state: SeasonState, category: PlayerLeaderboardCategory, limit = 20): PlayerLeaderboardEntry[] {
  const minimumGames = Math.max(2, Math.floor(Math.max(...Object.values(state.playerStats).map((stats) => stats.gamesPlayed), 1) * .35));
  const entries = Object.values(state.playerStats).filter((stats) => stats.gamesPlayed >= minimumGames).flatMap((stats) => {
    const team = state.teams.find((candidate) => candidate.roster.some((player) => player.id === stats.playerId)); if (!team) return [];
    const attempts = category === "fgPct" ? stats.fga : category === "threePct" ? stats.threePa : stats.fta;
    if ((category === "fgPct" || category === "threePct" || category === "ftPct") && attempts < stats.gamesPlayed * (category === "threePct" ? 1.5 : 2)) return [];
    const value = category === "ppg" ? stats.points / stats.gamesPlayed : category === "rpg" ? stats.rebounds / stats.gamesPlayed : category === "apg" ? stats.assists / stats.gamesPlayed : category === "spg" ? stats.steals / stats.gamesPlayed : category === "bpg" ? stats.blocks / stats.gamesPlayed : category === "fgPct" ? stats.fgm / stats.fga : category === "threePct" ? stats.threePm / stats.threePa : category === "ftPct" ? stats.ftm / stats.fta : category === "points" ? stats.points : category === "rebounds" ? stats.rebounds : stats.threePm;
    return [{ playerId: stats.playerId, teamId: team.id, value }];
  });
  return entries.sort((a, b) => b.value - a.value || a.playerId.localeCompare(b.playerId)).slice(0, limit);
}

export function teamLeaderboard(state: SeasonState, category: TeamLeaderboardCategory): TeamLeaderboardEntry[] {
  const entries = state.teams.map((team) => {
    const games = state.schedule.filter((game) => game.status === "completed" && game.result && (game.homeTeamId === team.id || game.awayTeamId === team.id));
    const boxes = games.map((game) => game.result!.home.team.id === team.id ? game.result!.home : game.result!.away);
    const opponentBoxes = games.map((game) => game.result!.home.team.id === team.id ? game.result!.away : game.result!.home);
    const sum = (field: keyof typeof boxes[number]["stats"]) => boxes.reduce((total, box) => total + Number(box.stats[field]), 0);
    const opponentPoints = opponentBoxes.reduce((total, box) => total + box.stats.points, 0);
    const gameCount = Math.max(1, games.length);
    const value = category === "ppg" ? sum("points") / gameCount : category === "defense" ? opponentPoints / gameCount : category === "threePct" ? sum("threePm") / Math.max(1, sum("threePa")) : category === "rebounding" ? (sum("offensiveRebounds") + sum("defensiveRebounds")) / gameCount : category === "turnoverRate" ? sum("turnovers") / Math.max(1, sum("possessions")) : (sum("points") - opponentPoints) / gameCount;
    return { teamId: team.id, value };
  });
  const ascending = category === "defense" || category === "turnoverRate";
  return entries.sort((a, b) => (ascending ? a.value - b.value : b.value - a.value) || a.teamId.localeCompare(b.teamId));
}

export function generateAwards(state: SeasonState): SeasonAwards {
  const players = state.teams.flatMap((team) => team.roster.map((player) => ({ player, team, stats: state.playerStats[player.id] }))).filter((entry) => entry.stats.gamesPlayed >= 3);
  const teamWinPct = (teamId: string) => { const record = state.records[teamId]; return record.wins / Math.max(1, record.wins + record.losses); };
  const impact = ({ stats, team }: typeof players[number]) => (stats.points * 1.1 + stats.rebounds * .65 + stats.assists * .9 + stats.steals * 1.5 + stats.blocks * 1.4 - stats.turnovers * .45) / stats.gamesPlayed + teamWinPct(team.id) * 5;
  const defense = ({ stats, team }: typeof players[number]) => (stats.steals * 2.2 + stats.blocks * 2.4 + stats.rebounds * .35) / stats.gamesPlayed + (1 - state.records[team.id].pointsAgainst / Math.max(1, state.records[team.id].pointsFor + state.records[team.id].pointsAgainst)) * 5;
  const ordered = [...players].sort((a, b) => impact(b) - impact(a) || a.player.id.localeCompare(b.player.id));
  const defensive = [...players].sort((a, b) => defense(b) - defense(a) || a.player.id.localeCompare(b.player.id));
  const freshmen = players.filter((entry) => entry.player.classYear === "FR").sort((a, b) => impact(b) - impact(a) || a.player.id.localeCompare(b.player.id));
  const coachTeam = [...state.teams].sort((a, b) => { const overachievement = (team: Team) => teamWinPct(team.id) - ({ elite: .72, strong: .62, middle: .5, rebuilding: .38, underdog: .3 }[team.program.tier]); return overachievement(b) - overachievement(a) || (state.rankings.find((rank) => rank.teamId === a.id)?.rank ?? 99) - (state.rankings.find((rank) => rank.teamId === b.id)?.rank ?? 99); })[0];
  return { playerOfYearId: ordered[0].player.id, defensivePlayerOfYearId: defensive[0].player.id, freshmanOfYearId: freshmen[0]?.player.id ?? ordered.find((entry) => entry.player.classYear === "FR")!.player.id, coachOfYearTeamId: coachTeam.id, firstTeamAllNational: ordered.slice(0, 5).map((entry) => entry.player.id), secondTeamAllNational: ordered.slice(5, 10).map((entry) => entry.player.id) };
}

function expectedStrategy(team: Team): Strategy {
  const style = team.coach.style; const identity = team.program.identity;
  return { ...defaultStrategy, pace: style.includes("Fast") || identity === "athleticism" ? "fast" : style.includes("Defensive") ? "slow" : "balanced", offensiveStyle: style.includes("Analytics") || identity === "shooting" ? "three-point" : style.includes("Developer") ? "motion" : identity === "rebounding" ? "inside-out" : "balanced", shotEmphasis: identity === "shooting" ? "three" : identity === "rebounding" ? "post" : "rim", defensiveScheme: style.includes("Defensive") ? "conservative" : identity === "defense" ? "aggressive-help" : "man", pressFrequency: style.includes("Motivator") ? 34 : identity === "athleticism" ? 30 : 20 };
}

export function buildScoutingReport(state: SeasonState, opponent: Team): ScoutingReport {
  const stats = (id: string) => state.playerStats[id];
  const expectedStarterIds = opponent.id === state.userTeamId ? state.userLineup : defaultLineup(opponent);
  const strategy = opponent.id === state.userTeamId ? state.userStrategy : expectedStrategy(opponent);
  const rotationIds = [...opponent.roster].sort((a, b) => { const aStats = stats(a.id); const bStats = stats(b.id); return (bStats.gamesPlayed ? bStats.minutes / bStats.gamesPlayed : b.ratings.overall) - (aStats.gamesPlayed ? aStats.minutes / aStats.gamesPlayed : a.ratings.overall); }).slice(0, strategy.rotationSize).map((player) => player.id);
  const by = (score: (player: Team["roster"][number]) => number) => [...opponent.roster].sort((a, b) => score(b) - score(a))[0].id;
  const games = state.schedule.filter((game) => game.status === "completed" && (game.homeTeamId === opponent.id || game.awayTeamId === opponent.id)).slice(-4);
  const wins = games.filter((game) => game.result?.winnerId === opponent.id).length;
  const recentThrees = games.reduce((sum, game) => { const box = game.result?.home.team.id === opponent.id ? game.result.home : game.result?.away; return sum + (box?.stats.threePa ? box.stats.threePm / box.stats.threePa : 0); }, 0) / Math.max(1, games.length);
  const conclusions = [strategy.pressFrequency >= 40 ? "Protect the ball against their pressure." : "Use patient actions to test their half-court defense.", strategy.shotEmphasis === "three" ? "Run shooters off the three-point line." : strategy.shotEmphasis === "post" ? "Bring timely help against their interior actions." : "Protect the rim without over-helping."];
  const starters = expectedStarterIds.map((id) => opponent.roster.find((player) => player.id === id)!).filter(Boolean);
  const starterOverall = starters.reduce((sum, player) => sum + player.ratings.overall, 0) / Math.max(1, starters.length); const bench = opponent.roster.filter((player) => !expectedStarterIds.includes(player.id)).sort((a, b) => b.ratings.overall - a.ratings.overall).slice(0, 3); const benchOverall = bench.reduce((sum, player) => sum + player.ratings.overall, 0) / Math.max(1, bench.length);
  if (starterOverall - benchOverall >= 8) conclusions.push("Their production drops sharply beyond the starting group.");
  if (starters.some((player) => stats(player.id).gamesPlayed >= 3 && stats(player.id).fouls / stats(player.id).gamesPlayed >= 3)) conclusions.push("Their starting group has shown foul-trouble risk in actual games.");
  return { expectedStarterIds, rotationIds, keyPlayers: { scorerId: by((player) => stats(player.id).gamesPlayed ? stats(player.id).points / stats(player.id).gamesPlayed : player.ratings.insideScoring + player.ratings.threePoint), creatorId: by((player) => stats(player.id).gamesPlayed ? stats(player.id).assists / stats(player.id).gamesPlayed : player.ratings.passing), shooterId: by((player) => player.ratings.threePoint), rebounderId: by((player) => stats(player.id).gamesPlayed ? stats(player.id).rebounds / stats(player.id).gamesPlayed : player.ratings.defensiveRebounding), defenderId: by((player) => player.ratings.perimeterDefense + player.ratings.interiorDefense + player.ratings.steal + player.ratings.block) }, tendencies: [`${strategy.pace.replace("very-", "very ")} pace`, `${strategy.offensiveStyle.replaceAll("-", " ")} offense`, `${strategy.defensiveScheme.replaceAll("-", " ")} defense`, `${strategy.pressFrequency}% press frequency`, `${strategy.rotationSize}-player rotation`], recentTrends: games.length ? [`${wins}–${games.length - wins} over the last ${games.length}`, recentThrees >= .36 ? "Shooting well from three recently" : recentThrees <= .28 ? "Shooting poorly from three recently" : "Steady recent perimeter shooting"] : ["No current-season results yet"], conclusions: conclusions.slice(0, 4) };
}
