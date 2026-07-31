import { ChevronRight, FastForward, Pause, Play, SlidersHorizontal, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { GameEvent, GameResult, Team } from "../../domain/types";
import { PlayerAvatar } from "../components/Avatar";
import { TeamMark } from "../components/TeamMark";
import { ScreenHeader } from "../components/ScreenHeader";

function scoreAt(events: GameEvent[], cursor: number, teamId: string): number { return events.slice(0, cursor).reduce((sum, event) => sum + (event.teamId === teamId && (event.kind === "shot" || event.kind === "free-throw") && event.result === "made" ? event.points ?? 0 : 0), 0); }
function currentLineup(starting: string[], events: GameEvent[], cursor: number, teamId: string): string[] {
  const lineup = [...starting];
  events.slice(0, cursor).filter((event) => event.kind === "substitution" && event.teamId === teamId).forEach((event) => { const index = lineup.indexOf(event.secondaryPlayerId ?? ""); if (index >= 0 && event.playerId) lineup[index] = event.playerId; });
  return lineup;
}
function eventFouls(events: GameEvent[], cursor: number, playerId: string): number { return events.slice(0, cursor).filter((event) => event.kind === "foul" && event.playerId === playerId).length; }
function gameStats(events: GameEvent[], cursor: number, teamId: string) {
  const relevant = events.slice(0, cursor).filter((event) => event.teamId === teamId);
  return { fga: relevant.filter((event) => event.kind === "shot").length, fgm: relevant.filter((event) => event.kind === "shot" && event.result === "made").length, threes: relevant.filter((event) => event.kind === "shot" && event.shotType === "three" && event.result === "made").length, rebounds: relevant.filter((event) => event.kind === "rebound").length, assists: relevant.filter((event) => event.kind === "shot" && event.secondaryPlayerId).length, turnovers: relevant.filter((event) => event.kind === "turnover").length, fouls: relevant.filter((event) => event.kind === "foul").length };
}

export function LiveGameScreen({ result, team, opponent, homeLineup, awayLineup, onAdjustLineup, onAdjustPlan, onBoxScore }: { result: GameResult; team: Team; opponent: Team; homeLineup: string[]; awayLineup: string[]; onAdjustLineup: () => void; onAdjustPlan: () => void; onBoxScore: () => void }) {
  const [cursor, setCursor] = useState(Math.min(14, result.events.length));
  const [speed, setSpeed] = useState<0 | 1 | 2 | 4>(0);
  useEffect(() => { setCursor(Math.min(14, result.events.length)); setSpeed(0); }, [result]);
  useEffect(() => { if (!speed || cursor >= result.events.length) return; const timer = window.setInterval(() => setCursor((current) => Math.min(result.events.length, current + speed)), speed === 1 ? 850 : speed === 2 ? 430 : 190); return () => window.clearInterval(timer); }, [cursor, result.events.length, speed]);
  const visible = result.events.slice(0, cursor);
  const last = visible.at(-1);
  const homeScore = scoreAt(result.events, cursor, team.id);
  const awayScore = scoreAt(result.events, cursor, opponent.id);
  const homeActive = currentLineup(homeLineup, result.events, cursor, team.id);
  const awayActive = currentLineup(awayLineup, result.events, cursor, opponent.id);
  const homeStats = gameStats(result.events, cursor, team.id);
  const awayStats = gameStats(result.events, cursor, opponent.id);
  const complete = cursor >= result.events.length;
  const periodNumber = last?.period ?? 1;
  const gameClock = last?.clock ?? 0;
  const allPlayers = useMemo(() => new Map([...team.roster, ...opponent.roster].map((player) => [player.id, player])), [team, opponent]);
  const renderLineup = (ids: string[], lineupTeam: Team) => <div className="live-lineup">{ids.map((id) => { const player = allPlayers.get(id); if (!player) return null; const foulCount = eventFouls(result.events, cursor, id); const activeProgress = Math.min(1, cursor / result.events.length); const fatigue = Math.round(Math.max(8, activeProgress * (lineupTeam.id === team.id ? 68 : 62) - player.ratings.stamina / 8)); return <div className="live-player" key={id}><PlayerAvatar player={player} team={lineupTeam} size={36} /><div><b>{player.name}</b><span>{player.position} · {foulCount} PF</span><i><em className={fatigue > 55 ? "hot-fatigue" : ""} style={{ width: `${fatigue}%` }} /></i></div><strong className={fatigue > 55 ? "fatigue-high" : ""}>{fatigue}%</strong></div>; })}</div>;
  return <div className="screen-stack live-screen"><ScreenHeader eyebrow={complete ? "FINAL WHISTLE" : "LIVE SIMULATION"} title="Courtside" subtitle={complete ? "Game complete · review the final book" : `${periodNumber === 1 ? "First half" : periodNumber > 2 ? `Overtime ${periodNumber - 2}` : "Second half"} · seed ${result.seed}`} action={complete ? <button className="text-button" onClick={onBoxScore}>Box score <ChevronRight size={14} /></button> : <span className="live-dot"><i /> LIVE</span>} />
    <section className="live-score panel-lite"><div><TeamMark team={team} size="sm" /><span>{team.shortName}</span><strong className={homeScore >= awayScore ? "leading" : ""}>{homeScore}</strong></div><aside><b>{gameClock ? `${Math.floor(gameClock / 60)}:${String(gameClock % 60).padStart(2, "0")}` : "—"}</b><span>{periodNumber > 2 ? `OT${periodNumber - 2}` : periodNumber === 1 ? "1H" : "2H"}</span></aside><div><TeamMark team={opponent} size="sm" /><span>{opponent.shortName}</span><strong className={awayScore > homeScore ? "leading" : ""}>{awayScore}</strong></div></section>
    <div className="live-controls"><button className="speed-button" onClick={() => setSpeed(speed === 0 ? 1 : 0)}>{speed === 0 ? <Play size={15} fill="currentColor" /> : <Pause size={15} />}{speed === 0 ? "Play" : "Pause"}</button><button className="speed-button" onClick={() => setCursor((current) => Math.min(result.events.length, current + 1))}><FastForward size={15} /> Advance</button><label><span>Speed</span><select value={speed} onChange={(event) => setSpeed(Number(event.target.value) as 0 | 1 | 2 | 4)}><option value={0}>Paused</option><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option></select></label><div className="progress-track"><i style={{ width: `${(cursor / result.events.length) * 100}%` }} /></div></div>
    <section className="live-grid"><div className="live-main"><div className="section-label"><span>RECENT ACTION</span><span>{visible.length}/{result.events.length}</span></div><div className="live-feed">{visible.slice(-9).reverse().map((event) => <div className={`live-feed-item ${event.kind}`} key={event.id}><small>{event.clock > 0 ? `${Math.floor(event.clock / 60)}:${String(event.clock % 60).padStart(2, "0")}` : "—"}</small><span /><p>{event.text}</p></div>)}</div><div className="live-action-row"><button onClick={onAdjustLineup}><UsersRound size={15} /> Adjust substitutions</button><button onClick={onAdjustPlan}><SlidersHorizontal size={15} /> Change strategy</button></div></div><aside className="live-side"><div className="section-label"><span>ON THE FLOOR</span></div><h3>{team.shortName}</h3>{renderLineup(homeActive, team)}<h3>{opponent.shortName}</h3>{renderLineup(awayActive, opponent)}<div className="section-label stats-heading"><span>KEY STATS</span></div><div className="live-stat-grid"><LiveStat label="FG" home={`${homeStats.fgm}-${homeStats.fga}`} away={`${awayStats.fgm}-${awayStats.fga}`} /><LiveStat label="REB" home={homeStats.rebounds} away={awayStats.rebounds} /><LiveStat label="AST" home={homeStats.assists} away={awayStats.assists} /><LiveStat label="TO" home={homeStats.turnovers} away={awayStats.turnovers} /></div></aside></section>
    {complete && <button className="primary-action" onClick={onBoxScore}>Open final box score <span>→</span></button>}
  </div>;
}

function LiveStat({ label, home, away }: { label: string; home: string | number; away: string | number }) { return <div><span>{label}</span><b>{home}</b><i>—</i><b>{away}</b></div>; }
