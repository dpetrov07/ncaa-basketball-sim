import { ArrowLeft, Play, Shield, Sparkles, Zap } from "lucide-react";
import type { Strategy, Team } from "../../domain/types";
import { PlayerAvatar } from "../components/Avatar";
import { TeamMark } from "../components/TeamMark";
import { ScreenHeader } from "../components/ScreenHeader";

export function PregameScreen({ team, opponent, lineup, strategy, seed, error, onSeedChange, onBack, onSimulate }: { team: Team; opponent: Team; lineup: string[]; strategy: Strategy; seed: number; error: string | null; onSeedChange: (seed: number) => void; onBack: () => void; onSimulate: () => void }) {
  const starters = lineup.map((id) => team.roster.find((player) => player.id === id)).filter((player): player is Team["roster"][number] => Boolean(player));
  const opponentStarters = opponent.roster.slice(0, 5);
  const teamRating = starters.length ? Math.round(starters.reduce((sum, player) => sum + player.ratings.overall, 0) / starters.length) : 0;
  const opponentRating = Math.round(opponentStarters.reduce((sum, player) => sum + player.ratings.overall, 0) / opponentStarters.length);
  return <div className="screen-stack"><ScreenHeader eyebrow="TONIGHT · EXHIBITION" title="Pregame" subtitle={`${team.city} · 40 minutes · seed ${seed}`} onBack={onBack} />
    <section className="pregame-score panel-lite"><div className="pregame-team"><TeamMark team={team} size="lg" /><strong>{team.shortName}</strong><span>{team.name}</span></div><div className="pregame-vs"><span>HOME</span><b>VS</b><span>TIP 7:00</span></div><div className="pregame-team"><TeamMark team={opponent} size="lg" /><strong>{opponent.shortName}</strong><span>{opponent.name}</span></div></section>
    <section className="matchup-read"><div className="section-label"><span>SCOUTING REPORT</span><span>{teamRating} · {opponentRating}</span></div><div className="matchup-bars"><div><span>Starting five</span><b>{teamRating}</b><i><em style={{ width: `${teamRating}%` }} /></i></div><div><span>Opponent five</span><b>{opponentRating}</b><i><em className="opponent-fill" style={{ width: `${opponentRating}%` }} /></i></div></div><div className="read-points"><span><Zap size={15} /> {strategy.pace === "fast" || strategy.pace === "very-fast" ? "Push the tempo" : "Control the tempo"}</span><span><Shield size={15} /> {strategy.defensiveScheme === "zone" ? "Protect the paint" : "Stay attached on defense"}</span><span><Sparkles size={15} /> {strategy.shotEmphasis === "three" ? "Hunt threes" : `Attack the ${strategy.shotEmphasis}`}</span></div></section>
    <div className="section-label"><span>STARTING FIVE</span><span>{starters.length}/5 selected</span></div><section className="pregame-starters">{starters.map((player, index) => <div key={player.id}><span>{index + 1}</span><PlayerAvatar player={player} team={team} size={38} /><b>{player.name}</b><small>{player.position}</small><strong>{player.ratings.overall}</strong></div>)}</section>
    <section className="seed-launch"><label><span>Replay seed</span><input type="number" value={seed} onChange={(event) => onSeedChange(Number(event.target.value) || 1)} /></label><button className="primary-action" disabled={lineup.length !== 5} onClick={onSimulate}><Play size={17} fill="currentColor" /> Tip off <span>→</span></button></section>{error && <p className="error-message">{error}</p>}<button className="back-link" onClick={onBack}><ArrowLeft size={14} /> Adjust lineup or plan</button>
  </div>;
}
