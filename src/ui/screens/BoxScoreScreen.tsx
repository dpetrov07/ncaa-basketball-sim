import { ArrowLeft, Trophy } from "lucide-react";
import type { GameResult } from "../../domain/types";
import { PlayerAvatar } from "../components/Avatar";
import { TeamMark } from "../components/TeamMark";
import { ScreenHeader } from "../components/ScreenHeader";

export function BoxScoreScreen({ result, onBack, backLabel = "Back to live game" }: { result: GameResult; onBack: () => void; backLabel?: string }) {
  const homeWon = result.winnerId === result.home.team.id;
  const order = [result.home, result.away];
  return <div className="screen-stack"><ScreenHeader eyebrow="FINAL" title="Box score" subtitle={result.periods > 2 ? `${result.periods - 2} overtime period${result.periods === 3 ? "" : "s"}` : "40 minutes"} onBack={onBack} />
    <section className="final-score panel-lite"><div><TeamMark team={result.home.team} size="md" /><span>{result.home.team.shortName}</span><b className={homeWon ? "win-score" : ""}>{result.home.stats.points}</b></div><aside><Trophy size={16} /><span>{homeWon ? result.home.team.nickname : result.away.team.nickname}</span></aside><div><TeamMark team={result.away.team} size="md" /><span>{result.away.team.shortName}</span><b className={!homeWon ? "win-score" : ""}>{result.away.stats.points}</b></div></section>
    {order.map((box) => <section className="box-team" key={box.team.id}><div className="section-label"><span><TeamMark team={box.team} size="sm" /> {box.team.name}</span><span>{box.stats.fgm}-{box.stats.fga} FG · {box.stats.threePm}-{box.stats.threePa} 3P</span></div><div className="box-table"><div className="box-table-head"><span>PLAYER</span><span>MIN</span><span>PTS</span><span>REB</span><span>AST</span><span>STL</span><span>BLK</span><span>FG</span><span>3PT</span></div>{box.players.filter((player) => player.minutes > 0).sort((a, b) => b.points - a.points).map((stats) => { const player = box.team.roster.find((candidate) => candidate.id === stats.playerId)!; return <div className="box-row" key={player.id}><div><PlayerAvatar player={player} team={box.team} size={33} /><span><b>{player.name}</b><small>{player.position} · {player.classYear}</small></span></div><span>{stats.minutes.toFixed(1)}</span><strong>{stats.points}</strong><span>{stats.offensiveRebounds + stats.defensiveRebounds}</span><span>{stats.assists}</span><span>{stats.steals}</span><span>{stats.blocks}</span><span>{stats.fgm}-{stats.fga}</span><span>{stats.threePm}-{stats.threePa}</span></div>; })}</div><div className="team-summary"><span>TEAM <b>{box.stats.points} PTS</b></span><span>{box.stats.assists} AST</span><span>{box.stats.turnovers} TO</span><span>{box.stats.fouls} PF</span></div></section>)}
    <button className="back-link" onClick={onBack}><ArrowLeft size={14} /> {backLabel}</button>
  </div>;
}
