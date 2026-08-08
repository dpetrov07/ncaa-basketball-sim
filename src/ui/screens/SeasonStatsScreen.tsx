import { ArrowLeft } from "lucide-react";
import type { SeasonState, Team } from "../../domain/types";
import { seasonPercent } from "../../season/season";
import { PlayerAvatar } from "../components/Avatar";
import { ScreenHeader } from "../components/ScreenHeader";

export function SeasonStatsScreen({ state, team, onBack }: { state: SeasonState; team: Team; onBack: () => void }) {
  const rows = team.roster.map((player) => ({ player, stats: state.playerStats[player.id] })).filter(({ stats }) => stats.gamesPlayed > 0).sort((a, b) => b.stats.points / b.stats.gamesPlayed - a.stats.points / a.stats.gamesPlayed);
  return <div className="screen-stack"><ScreenHeader eyebrow={`${state.seasonYear} SEASON · FINAL STATISTICS`} title="Team statistics" subtitle={`${state.records[team.id].wins}–${state.records[team.id].losses} · per-game averages and shooting`} onBack={onBack} /><section className="season-stats-table"><div className="season-stats-head"><span>PLAYER</span><span>GP</span><span>PPG</span><span>RPG</span><span>APG</span><span>FG%</span><span>3P%</span></div>{rows.map(({ player, stats }) => <div className="season-stats-row" key={player.id}><div><PlayerAvatar player={player} team={team} size={34} /><span><b>{player.name}</b><small>{player.position} · {stats.gamesStarted} starts</small></span></div><span>{stats.gamesPlayed}</span><strong>{(stats.points / stats.gamesPlayed).toFixed(1)}</strong><span>{(stats.rebounds / stats.gamesPlayed).toFixed(1)}</span><span>{(stats.assists / stats.gamesPlayed).toFixed(1)}</span><span>{(seasonPercent(stats, "fg") * 100).toFixed(1)}</span><span>{(seasonPercent(stats, "three") * 100).toFixed(1)}</span></div>)}</section>{!rows.length && <p className="empty-lineup">No player statistics yet.</p>}<button className="back-link" onClick={onBack}><ArrowLeft size={14} /> Back to season summary</button></div>;
}
