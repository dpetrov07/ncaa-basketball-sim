import type { NationalRanking, SeasonState, Team } from "../domain/types";

function clamp(value: number, min = 0, max = 100): number { return Math.max(min, Math.min(max, value)); }

function rotationStrength(team: Team): number {
  const rotation = [...team.roster].sort((a, b) => b.ratings.overall - a.ratings.overall).slice(0, 8);
  return rotation.reduce((sum, player) => sum + player.ratings.overall, 0) / Math.max(1, rotation.length);
}

export function strengthOfSchedule(state: SeasonState, teamId: string): number {
  const games = state.schedule.filter((game) => game.status === "completed" && (game.homeTeamId === teamId || game.awayTeamId === teamId));
  if (!games.length) {
    const opponents = state.schedule.filter((game) => game.gameType === "regular-season" && (game.homeTeamId === teamId || game.awayTeamId === teamId)).map((game) => state.teams.find((team) => team.id === (game.homeTeamId === teamId ? game.awayTeamId : game.homeTeamId))).filter((team): team is Team => Boolean(team));
    return opponents.length ? Number((opponents.reduce((sum, team) => sum + clamp((rotationStrength(team) - 60) * 2), 0) / opponents.length).toFixed(2)) : 50;
  }
  const values = games.map((game) => {
    const opponentId = game.homeTeamId === teamId ? game.awayTeamId : game.homeTeamId;
    const opponent = state.teams.find((candidate) => candidate.id === opponentId)!;
    const record = state.records[opponentId];
    const played = record.wins + record.losses;
    const winPct = played ? record.wins / played : 0.5;
    return winPct * 70 + clamp((rotationStrength(opponent) - 65) * 1.2, 0, 30);
  });
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

export function calculateRankings(state: SeasonState, previous: NationalRanking[] = state.rankings ?? []): NationalRanking[] {
  const prior = new Map(previous.map((entry) => [entry.teamId, entry]));
  const provisional = state.teams.map((team) => {
    const record = state.records[team.id];
    const played = record.wins + record.losses;
    const winPct = played ? record.wins / played : 0.5;
    const completed = state.schedule.filter((game) => game.status === "completed" && (game.homeTeamId === team.id || game.awayTeamId === team.id));
    const qualityWins = completed.filter((game) => {
      if (game.result?.winnerId !== team.id) return false;
      const opponentRank = game.homeTeamId === team.id ? game.historySnapshot?.rankings.awayRank : game.historySnapshot?.rankings.homeRank;
      return (opponentRank ?? 99) <= 8;
    }).length;
    const roadWins = completed.filter((game) => game.result?.winnerId === team.id && game.awayTeamId === team.id && !game.neutralSite).length;
    const recent = completed.slice(-5);
    const recentWins = recent.filter((game) => game.result?.winnerId === team.id).length;
    const pointDiff = played ? (record.pointsFor - record.pointsAgainst) / played : 0;
    const sos = strengthOfSchedule(state, team.id);
    const conferencePct = record.conferenceWins / Math.max(1, record.conferenceWins + record.conferenceLosses);
    const talentPrior = clamp((rotationStrength(team) - 68) / 22, 0, 1);
    const earlyWeight = Math.max(0, 1 - played / 8);
    const raw = winPct * 42 + sos * 0.2 + clamp(pointDiff, -15, 15) * 0.65 + qualityWins * 2.4 + roadWins * 0.7 + recentWins * 0.8 + conferencePct * 4 + talentPrior * 16 * earlyWeight;
    const priorScore = prior.get(team.id)?.score;
    const score = priorScore === undefined ? raw : raw * 0.78 + priorScore * 0.22;
    return { teamId: team.id, score, strengthOfSchedule: sos, qualityWins, roadWins, recentWins };
  }).sort((a, b) => b.score - a.score || state.teams.findIndex((team) => team.id === a.teamId) - state.teams.findIndex((team) => team.id === b.teamId));

  return provisional.map((entry, index) => {
    const previousRank = prior.get(entry.teamId)?.rank ?? index + 1;
    const team = state.teams.find((candidate) => candidate.id === entry.teamId)!;
    const record = state.records[entry.teamId];
    const reasons = [`${record.wins}–${record.losses} overall`, `SOS ${entry.strengthOfSchedule.toFixed(1)}`];
    if (entry.qualityWins) reasons.push(`${entry.qualityWins} ranked win${entry.qualityWins === 1 ? "" : "s"}`);
    if (entry.recentWins >= 3) reasons.push(`${entry.recentWins} wins in the last five`);
    if (entry.roadWins >= 2) reasons.push(`${entry.roadWins} road wins`);
    const latest = [...state.history].reverse().map((id) => state.schedule.find((game) => game.id === id)).find((game) => game && (game.homeTeamId === entry.teamId || game.awayTeamId === entry.teamId));
    if (latest?.result) {
      const opponentId = latest.homeTeamId === entry.teamId ? latest.awayTeamId : latest.homeTeamId;
      const opponent = state.teams.find((candidate) => candidate.id === opponentId)!;
      const opponentRank = latest.homeTeamId === opponentId ? latest.historySnapshot?.rankings.homeRank : latest.historySnapshot?.rankings.awayRank;
      reasons.unshift(`${latest.result.winnerId === entry.teamId ? "Beat" : "Lost to"} ${opponentRank ? `#${opponentRank} ` : ""}${opponent.shortName}`);
    }
    if (team.program.tier === "elite" && record.wins + record.losses < 4) reasons.push("Elite roster profile");
    return { ...entry, rank: index + 1, previousRank, score: Number(entry.score.toFixed(3)), reasons };
  });
}

export function rankingFor(state: SeasonState, teamId: string): NationalRanking | undefined {
  return state.rankings.find((entry) => entry.teamId === teamId);
}
