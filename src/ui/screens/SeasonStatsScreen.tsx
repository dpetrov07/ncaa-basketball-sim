import { ArrowLeft, Trophy } from "lucide-react";
import type { SeasonState, Team } from "../../domain/types";
import { seasonPercent } from "../../season/season";
import { playerLeaderboard } from "../../season/insights";
import { PlayerAvatar } from "../components/Avatar";
import { ScreenHeader } from "../components/ScreenHeader";

export function SeasonStatsScreen({ state, team, onBack }: { state: SeasonState; team: Team; onBack: () => void }) {
  const rows = team.roster.map((player) => ({ player, stats: state.playerStats[player.id] })).filter(({ stats }) => stats.gamesPlayed > 0).sort((a, b) => b.stats.points / b.stats.gamesPlayed - a.stats.points / a.stats.gamesPlayed);
  const nationalScorers = playerLeaderboard(state, "ppg", 3);
  const playerName = (id: string) => state.teams.flatMap((candidate) => candidate.roster).find((player) => player.id === id)?.name ?? "—";
  const awards = state.awards;
  return <div className="screen-stack"><ScreenHeader eyebrow={`${state.seasonYear} SEASON · ${state.phase === "complete" ? "FINAL" : "CURRENT"} STATISTICS`} title="Team statistics" subtitle={`${state.records[team.id].wins}–${state.records[team.id].losses} · per-game averages and shooting`} onBack={onBack} />
    <section className="season-stats-table"><div className="season-stats-head"><span>PLAYER</span><span>GP</span><span>PPG</span><span>RPG</span><span>APG</span><span>FG%</span><span>3P%</span></div>{rows.map(({ player, stats }) => <div className="season-stats-row" key={player.id}><div><PlayerAvatar player={player} team={team} size={34} /><span><b>{player.name}</b><small>{player.position} · {stats.gamesStarted} starts</small></span></div><span>{stats.gamesPlayed}</span><strong>{(stats.points / stats.gamesPlayed).toFixed(1)}</strong><span>{(stats.rebounds / stats.gamesPlayed).toFixed(1)}</span><span>{(stats.assists / stats.gamesPlayed).toFixed(1)}</span><span>{(seasonPercent(stats, "fg") * 100).toFixed(1)}</span><span>{(seasonPercent(stats, "three") * 100).toFixed(1)}</span></div>)}</section>
    {!rows.length && <p className="empty-lineup">No player statistics yet.</p>}
    {nationalScorers.length > 0 && <section><div className="section-label"><span>NATIONAL SCORING LEADERS</span><span>MINIMUM GAMES APPLIED</span></div><div className="season-leaders">{nationalScorers.map((entry, index) => <div key={entry.playerId}><span><b>#{index + 1} {playerName(entry.playerId)}</b><small>{state.teams.find((candidate) => candidate.id === entry.teamId)?.shortName}</small></span><strong>{entry.value.toFixed(1)}<small>PPG</small></strong></div>)}</div></section>}
    {awards && <div className="season-seal"><Trophy size={17} /> Player of the Year: {playerName(awards.playerOfYearId)} · Defensive Player: {playerName(awards.defensivePlayerOfYearId)} · Freshman: {playerName(awards.freshmanOfYearId)}</div>}
    <button className="back-link" onClick={onBack}><ArrowLeft size={14} /> Back to season summary</button>
  </div>;
}
