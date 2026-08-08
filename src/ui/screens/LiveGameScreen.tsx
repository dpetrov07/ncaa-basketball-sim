import { ChevronRight, FastForward, Pause, Play, SlidersHorizontal, Timer, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import type { GameRuntimeTeam, GameState, ScheduledGame, Strategy } from "../../domain/types";
import { callTimeout, setGameLineup, setGameStrategy, simulateOnePossession, simulateToEnd, simulateToHalftime, simulateToNextStoppage } from "../../simulation/simulateGame";
import { PlayerAvatar } from "../components/Avatar";
import { TeamMark } from "../components/TeamMark";
import { ScreenHeader } from "../components/ScreenHeader";

function clock(value: number): string { return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`; }

export function LiveGameScreen({ state, userTeamId, game, onStateChange, onBoxScore }: { state: GameState; userTeamId: string; game?: ScheduledGame; onStateChange: (state: GameState) => void; onBoxScore: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [panel, setPanel] = useState<"lineup" | "strategy" | null>(null);
  const userRuntime = state.home.team.id === userTeamId ? state.home : state.away;
  const opponentRuntime = state.home.team.id === userTeamId ? state.away : state.home;
  const [draftLineup, setDraftLineup] = useState<string[]>(userRuntime.lineup);
  const [draftStrategy, setDraftStrategy] = useState<Strategy>(userRuntime.strategy);
  const [error, setError] = useState<string | null>(null);
  const complete = state.status === "complete";

  useEffect(() => { if (complete) setPlaying(false); }, [complete]);
  useEffect(() => {
    if (!playing || complete || panel) return;
    const timer = window.setTimeout(() => onStateChange(simulateToNextStoppage(state)), 450);
    return () => window.clearTimeout(timer);
  }, [complete, onStateChange, panel, playing, state]);

  function run(action: (current: GameState) => GameState) {
    try { setError(null); onStateChange(action(state)); } catch (caught) { setError(caught instanceof Error ? caught.message : "That action is not available."); }
  }

  function openLineup() { setPlaying(false); setDraftLineup([...userRuntime.lineup]); setPanel("lineup"); setError(null); }
  function openStrategy() { setPlaying(false); setDraftStrategy({ ...userRuntime.strategy }); setPanel("strategy"); setError(null); }
  function togglePlayer(playerId: string) {
    setDraftLineup((current) => current.includes(playerId) ? current.filter((id) => id !== playerId) : current.length < 5 ? [...current, playerId] : current);
  }
  function applyLineup() { run((current) => setGameLineup(current, userTeamId, draftLineup)); if (draftLineup.length === 5) setPanel(null); }
  function applyStrategy() { run((current) => setGameStrategy(current, userTeamId, draftStrategy)); setPanel(null); }

  const renderActive = (runtime: GameRuntimeTeam) => <div className="live-lineup">{runtime.lineup.map((id) => {
    const player = runtime.team.roster.find((candidate) => candidate.id === id)!;
    const running = runtime.players.find((candidate) => candidate.playerId === id)!;
    const fatigue = Math.round(running.state.fatigue);
    return <div className="live-player" key={id}><PlayerAvatar player={player} team={runtime.team} size={36} /><div><b>{player.name}</b><span>{player.position} · {running.state.fouls} PF · {(running.activeSeconds / 60).toFixed(1)} MIN</span><i><em className={fatigue > 55 ? "hot-fatigue" : ""} style={{ width: `${fatigue}%` }} /></i></div><strong className={fatigue > 55 ? "fatigue-high" : ""}>{fatigue}%</strong></div>;
  })}</div>;

  return <div className="screen-stack live-screen"><ScreenHeader eyebrow={complete ? "FINAL WHISTLE" : `DAY ${game?.day ?? "—"} · ${state.stoppage.replaceAll("-", " ").toUpperCase()}`} title="Courtside" subtitle={complete ? "Game complete · season result saved" : `${state.period === 1 ? "First half" : state.period > 2 ? `Overtime ${state.period - 2}` : "Second half"} · ${state.possessionTeamId === state.home.team.id ? state.home.team.shortName : state.away.team.shortName} ball`} action={complete ? <button className="text-button" onClick={onBoxScore}>Box score <ChevronRight size={14} /></button> : <span className="live-dot"><i /> LIVE</span>} />
    <section className="live-score panel-lite"><div><TeamMark team={state.home.team} size="sm" /><span>{state.home.team.shortName}</span><strong className={state.home.score >= state.away.score ? "leading" : ""}>{state.home.score}</strong></div><aside><b>{state.clock ? clock(state.clock) : "—"}</b><span>{state.period > 2 ? `OT${state.period - 2}` : state.period === 1 ? "1H" : "2H"}</span></aside><div><TeamMark team={state.away.team} size="sm" /><span>{state.away.team.shortName}</span><strong className={state.away.score > state.home.score ? "leading" : ""}>{state.away.score}</strong></div></section>
    {!complete && <div className="live-controls interactive-controls"><button className="speed-button" onClick={() => setPlaying((current) => !current)}>{playing ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}{playing ? "Pause" : "Resume"}</button><button className="speed-button" onClick={() => run(simulateOnePossession)}><FastForward size={15} /> Possession</button><button className="speed-button" onClick={() => run(simulateToNextStoppage)}>Next stoppage</button><button className="speed-button" onClick={() => run(simulateToHalftime)}>Halftime</button><button className="speed-button" onClick={() => run(simulateToEnd)}>Sim to end</button></div>}
    {error && <p className="error-message">{error}</p>}
    {!complete && <div className="live-action-row coaching-actions"><button onClick={openLineup}><UsersRound size={15} /> Substitutions</button><button onClick={openStrategy}><SlidersHorizontal size={15} /> Strategy</button><button disabled={userRuntime.timeoutsRemaining <= 0} onClick={() => run((current) => callTimeout(current, userTeamId))}><Timer size={15} /> Timeout ({userRuntime.timeoutsRemaining})</button></div>}

    {panel === "lineup" && <section className="coaching-panel"><div className="section-label"><span>CHOOSE ACTIVE FIVE</span><span>{draftLineup.length}/5</span></div><div className="substitution-list">{userRuntime.team.roster.map((player) => { const running = userRuntime.players.find((candidate) => candidate.playerId === player.id)!; const selected = draftLineup.includes(player.id); const unavailable = !running.state.available || running.state.fouls >= 5; return <button className={selected ? "selected" : ""} disabled={unavailable} key={player.id} onClick={() => togglePlayer(player.id)}><PlayerAvatar player={player} team={userRuntime.team} size={32} /><span><b>{player.name}</b><small>{player.position} · {running.state.fouls} PF · {(running.activeSeconds / 60).toFixed(1)} MIN</small></span><strong>{Math.round(running.state.fatigue)}%</strong></button>; })}</div><div className="panel-actions"><button className="quiet-action" onClick={() => setPanel(null)}>Cancel</button><button className="primary-action" disabled={draftLineup.length !== 5} onClick={applyLineup}>Confirm five</button></div></section>}

    {panel === "strategy" && <section className="coaching-panel"><div className="section-label"><span>IN-GAME STRATEGY</span><span>Future possessions</span></div><div className="strategy-grid"><label><span>Pace</span><select value={draftStrategy.pace} onChange={(event) => setDraftStrategy({ ...draftStrategy, pace: event.target.value as Strategy["pace"] })}><option value="very-slow">Very slow</option><option value="slow">Slow</option><option value="balanced">Balanced</option><option value="fast">Fast</option><option value="very-fast">Very fast</option></select></label><label><span>Offense</span><select value={draftStrategy.offensiveStyle} onChange={(event) => setDraftStrategy({ ...draftStrategy, offensiveStyle: event.target.value as Strategy["offensiveStyle"] })}><option value="balanced">Balanced</option><option value="motion">Motion</option><option value="pick-and-roll">Pick and roll</option><option value="transition">Transition</option><option value="three-point">Three-point</option><option value="post-focused">Post-focused</option><option value="drive-and-kick">Drive and kick</option></select></label><label><span>Shot emphasis</span><select value={draftStrategy.shotEmphasis} onChange={(event) => setDraftStrategy({ ...draftStrategy, shotEmphasis: event.target.value as Strategy["shotEmphasis"] })}><option value="rim">Rim</option><option value="mid-range">Mid-range</option><option value="three">Three</option><option value="post">Post</option><option value="free-throws">Draw fouls</option></select></label><label><span>Defense</span><select value={draftStrategy.defensiveScheme} onChange={(event) => setDraftStrategy({ ...draftStrategy, defensiveScheme: event.target.value as Strategy["defensiveScheme"] })}><option value="man">Man</option><option value="zone">Zone</option><option value="switching">Switching</option><option value="conservative">Conservative</option><option value="aggressive-help">Aggressive help</option><option value="full-court-press">Full-court press</option></select></label><label><span>Press {draftStrategy.pressFrequency}%</span><input type="range" min="0" max="100" value={draftStrategy.pressFrequency} onChange={(event) => setDraftStrategy({ ...draftStrategy, pressFrequency: Number(event.target.value) })} /></label><label><span>Rebounding {draftStrategy.reboundingAggressiveness}%</span><input type="range" min="0" max="100" value={draftStrategy.reboundingAggressiveness} onChange={(event) => setDraftStrategy({ ...draftStrategy, reboundingAggressiveness: Number(event.target.value) })} /></label></div><div className="panel-actions"><button className="quiet-action" onClick={() => setPanel(null)}>Cancel</button><button className="primary-action" onClick={applyStrategy}>Apply strategy</button></div></section>}

    <section className="live-grid"><div className="live-main"><div className="section-label"><span>RECENT ACTION</span><span>{state.events.length} events</span></div><div className="live-feed">{state.events.slice(-12).reverse().map((event) => <div className={`live-feed-item ${event.kind}`} key={event.id}><small>{event.clock > 0 ? clock(event.clock) : "—"}</small><span /><p>{event.text}</p></div>)}</div></div><aside className="live-side"><div className="section-label"><span>ON THE FLOOR</span></div><h3>{userRuntime.team.shortName}</h3>{renderActive(userRuntime)}<h3>{opponentRuntime.team.shortName}</h3>{renderActive(opponentRuntime)}<div className="section-label stats-heading"><span>KEY STATS</span></div><div className="live-stat-grid"><LiveStat label="FG" home={`${state.home.stats.fgm}-${state.home.stats.fga}`} away={`${state.away.stats.fgm}-${state.away.stats.fga}`} /><LiveStat label="REB" home={state.home.stats.offensiveRebounds + state.home.stats.defensiveRebounds} away={state.away.stats.offensiveRebounds + state.away.stats.defensiveRebounds} /><LiveStat label="AST" home={state.home.stats.assists} away={state.away.stats.assists} /><LiveStat label="TO" home={state.home.stats.turnovers} away={state.away.stats.turnovers} /></div></aside></section>
    {complete && <button className="primary-action" onClick={onBoxScore}>Open final box score <span>→</span></button>}
  </div>;
}

function LiveStat({ label, home, away }: { label: string; home: string | number; away: string | number }) { return <div><span>{label}</span><b>{home}</b><i>—</i><b>{away}</b></div>; }
