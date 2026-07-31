import { ChevronRight } from "lucide-react";
import type { PlayerProfile, Team } from "../../domain/types";
import { PlayerAvatar } from "../components/Avatar";
import { PlayerRow } from "../components/PlayerRow";
import { ScreenHeader } from "../components/ScreenHeader";

const ratingLabels: [keyof PlayerProfile["ratings"], string][] = [
  ["insideScoring", "Inside"], ["threePoint", "3PT"], ["passing", "Pass"], ["ballHandling", "Handle"],
  ["perimeterDefense", "Perimeter"], ["interiorDefense", "Interior"], ["defensiveRebounding", "D-Reb"], ["stamina", "Stamina"],
];

export function RosterScreen({ team, selectedPlayerId, onSelect }: { team: Team; selectedPlayerId: string; onSelect: (player: PlayerProfile) => void }) {
  const selected = team.roster.find((player) => player.id === selectedPlayerId) ?? team.roster[0];
  return <div className="screen-stack"><ScreenHeader eyebrow={`${team.shortName} · ${team.nickname}`} title="Roster" subtitle={`${team.roster.length} players · tap a player for the scouting card`} action={<span className="screen-count">{Math.round(team.roster.reduce((sum, player) => sum + player.ratings.overall, 0) / team.roster.length)} OVR</span>} />
    <section className="player-detail panel-lite"><div className="detail-identity"><PlayerAvatar player={selected} team={team} size={72} /><div><span className="eyebrow">{selected.position} · {selected.classYear}</span><h2>{selected.name}</h2><p>{selected.archetype}</p><div className="trait-row"><span>{selected.personality}</span><span>{selected.height}</span></div></div><b className="detail-overall">{selected.ratings.overall}<small>OVR</small></b></div><div className="rating-grid">{ratingLabels.map(([key, text]) => <div key={key}><span>{text}</span><b>{selected.ratings[key]}</b><i><em style={{ width: `${selected.ratings[key]}%` }} /></i></div>)}</div><div className="detail-footer"><span>Potential <b>{selected.ratings.potential}</b></span><span>Traits <b>{selected.hiddenTraits.join(" · ")}</b></span></div></section>
    <div className="section-label roster-label"><span>FULL ROSTER</span><span>{team.roster.filter((player) => player.classYear === "SR").length} seniors</span></div>
    <section className="roster-list">{team.roster.map((player) => <PlayerRow key={player.id} player={player} team={team} selected={player.id === selected.id} onClick={() => onSelect(player)} detail={player.id === selected.id ? "full" : "shooting"} />)}</section>
    <p className="screen-footnote"><ChevronRight size={14} /> Tap a row to inspect full ratings, personality, archetype, and hidden scouting traits.</p>
  </div>;
}
