import { Check, RotateCcw } from "lucide-react";
import type { Strategy, Team } from "../../domain/types";
import { PlayerRow } from "../components/PlayerRow";
import { ScreenHeader } from "../components/ScreenHeader";

export function LineupScreen({ team, lineup, strategy, onToggle, onReset, onPregame }: { team: Team; lineup: string[]; strategy: Strategy; onToggle: (playerId: string) => void; onReset: () => void; onPregame: () => void }) {
  const selected = new Set(lineup);
  const starters = lineup.map((id) => team.roster.find((player) => player.id === id)).filter((player): player is Team["roster"][number] => Boolean(player));
  const bench = team.roster.filter((player) => !selected.has(player.id));
  return <div className="screen-stack"><ScreenHeader eyebrow="ROTATION BOARD" title="Lineup & rotation" subtitle="Five starters, then a rotation that can survive 40 minutes" action={<button className="text-button" onClick={onReset}><RotateCcw size={14} /> Reset</button>} />
    <section className="lineup-status"><div><span className="eyebrow">STARTING FIVE</span><strong className={lineup.length === 5 ? "ready-text" : "warning-text"}>{lineup.length}/5 locked</strong></div><div><span className="eyebrow">ROTATION</span><strong>{strategy.rotationSize} players</strong></div></section>
    <section className="starter-list">{starters.map((player, index) => <div className="starter-row" key={player.id}><span className="starter-number">{index + 1}</span><PlayerRow player={player} team={team} selected detail="full" onClick={() => onToggle(player.id)} /><Check size={16} /></div>)}{lineup.length < 5 && <div className="empty-lineup">Select {5 - lineup.length} more player{lineup.length === 4 ? "" : "s"} below.</div>}</section>
    <div className="section-label roster-label"><span>AVAILABLE PLAYERS</span><span>tap to swap</span></div>
    <section className="roster-list">{bench.map((player) => <PlayerRow key={player.id} player={player} team={team} onClick={() => lineup.length < 5 && onToggle(player.id)} detail="defense" />)}</section>
    <button className="primary-action" disabled={lineup.length !== 5} onClick={onPregame}>Review matchup <span>→</span></button>
  </div>;
}
