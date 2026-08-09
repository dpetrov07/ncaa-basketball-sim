import { ArrowLeft, Play, Shield, Sparkles, Zap } from "lucide-react";
import type { ScheduledGame, SeasonState, Strategy, Team, TeamSeasonRecord } from "../../domain/types";
import { buildScoutingReport } from "../../season/insights";
import { PlayerAvatar } from "../components/Avatar";
import { TeamMark } from "../components/TeamMark";
import { ScreenHeader } from "../components/ScreenHeader";

export function PregameScreen({ team, opponent, lineup, strategy, game, season, teamRecord, opponentRecord, error, onBack, onSimulate }: { team: Team; opponent: Team; lineup: string[]; strategy: Strategy; game: ScheduledGame; season: SeasonState; teamRecord: TeamSeasonRecord; opponentRecord: TeamSeasonRecord; error: string | null; onBack: () => void; onSimulate: () => void }) {
  const starters = lineup.map((id) => team.roster.find((player) => player.id === id)).filter((player): player is Team["roster"][number] => Boolean(player));
  const scouting = buildScoutingReport(season, opponent);
  const opponentStarters = scouting.expectedStarterIds.map((id) => opponent.roster.find((player) => player.id === id)).filter((player): player is Team["roster"][number] => Boolean(player));
  const teamRating = starters.length ? Math.round(starters.reduce((sum, player) => sum + player.ratings.overall, 0) / starters.length) : 0;
  const opponentRating = Math.round(opponentStarters.reduce((sum, player) => sum + player.ratings.overall, 0) / opponentStarters.length);
  const userIsHome = game.homeTeamId === team.id;
  const gameLabel = game.gameType === "conference-tournament" ? `CONFERENCE TOURNAMENT · ${game.round?.toUpperCase()}` : game.gameType === "national-postseason" ? `NATIONAL TOURNAMENT · ${game.round?.toUpperCase()}` : game.conferenceGame ? "CONFERENCE" : "NON-CONFERENCE";
  return <div className="screen-stack"><ScreenHeader eyebrow={`DAY ${game.day} · ${gameLabel}`} title="Game preview" subtitle={`${game.neutralSite ? "Neutral site" : userIsHome ? team.city : opponent.city} · ${game.neutralSite ? "Postseason" : userIsHome ? "Home" : "Away"}`} onBack={onBack} />
    <section className="pregame-score panel-lite"><div className="pregame-team"><TeamMark team={team} size="lg" /><strong>{team.shortName}</strong><span>{teamRecord.wins}–{teamRecord.losses} · {userIsHome ? "HOME" : "AWAY"}</span></div><div className="pregame-vs"><span>{userIsHome ? "HOME" : "AWAY"}</span><b>{userIsHome ? "VS" : "AT"}</b><span>DAY {game.day}</span></div><div className="pregame-team"><TeamMark team={opponent} size="lg" /><strong>{opponent.shortName}</strong><span>{opponentRecord.wins}–{opponentRecord.losses} · {userIsHome ? "AWAY" : "HOME"}</span></div></section>
    <section className="matchup-read"><div className="section-label"><span>SCOUTING REPORT</span><span>{teamRating} · {opponentRating}</span></div><div className="matchup-bars"><div><span>Starting five</span><b>{teamRating}</b><i><em style={{ width: `${teamRating}%` }} /></i></div><div><span>Opponent five</span><b>{opponentRating}</b><i><em className="opponent-fill" style={{ width: `${opponentRating}%` }} /></i></div></div><div className="read-points">{scouting.conclusions.slice(0, 3).map((conclusion, index) => <span key={conclusion}>{index === 0 ? <Zap size={15} /> : index === 1 ? <Shield size={15} /> : <Sparkles size={15} />} {conclusion}</span>)}</div></section>
    <div className="section-label"><span>STARTING FIVE</span><span>{starters.length}/5 selected</span></div><section className="pregame-starters">{starters.map((player, index) => <div key={player.id}><span>{index + 1}</span><PlayerAvatar player={player} team={team} size={38} /><b>{player.name}</b><small>{player.position}</small><strong>{player.ratings.overall}</strong></div>)}</section>
    <section className="seed-launch"><div><span className="eyebrow">READY FOR TIP-OFF</span><p>{starters.length} starters selected · {strategy.offensiveStyle.replaceAll("-", " ")}</p></div><button className="primary-action" disabled={lineup.length !== 5} onClick={onSimulate}><Play size={17} fill="currentColor" /> Begin game <span>→</span></button></section>{error && <p className="error-message">{error}</p>}<button className="back-link" onClick={onBack}><ArrowLeft size={14} /> Adjust lineup or plan</button>
  </div>;
}
