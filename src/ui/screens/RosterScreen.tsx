import { ChevronRight } from "lucide-react";
import type { PlayerProfile, SeasonState, Team } from "../../domain/types";
import { seasonPercent } from "../../season/season";
import { PlayerAvatar } from "../components/Avatar";
import { PlayerRow } from "../components/PlayerRow";
import { ScreenHeader } from "../components/ScreenHeader";

const ratingGroups: { title: string; ratings: [keyof PlayerProfile["ratings"], string][] }[] = [
  { title: "Scoring", ratings: [["insideScoring", "Inside"], ["layupFinishing", "Finishing"], ["midRange", "Mid-range"], ["threePoint", "Three-point"], ["freeThrow", "Free throw"]] },
  { title: "Playmaking", ratings: [["passing", "Passing"], ["ballHandling", "Ball handling"], ["basketballIQ", "Basketball IQ"]] },
  { title: "Defense", ratings: [["perimeterDefense", "Perimeter"], ["interiorDefense", "Interior"], ["steal", "Steal"], ["block", "Block"]] },
  { title: "Physical", ratings: [["speed", "Speed"], ["strength", "Strength"], ["athleticism", "Athleticism"], ["stamina", "Stamina"]] },
];

export function RosterScreen({ team, season, selectedPlayerId, onSelect }: { team: Team; season: SeasonState; selectedPlayerId: string; onSelect: (player: PlayerProfile) => void }) {
  const selected = team.roster.find((player) => player.id === selectedPlayerId) ?? team.roster[0];
  const stats = season.playerStats[selected.id];
  return <div className="screen-stack"><ScreenHeader eyebrow={`${team.shortName} ${team.nickname}`} title="Roster" subtitle={`${team.roster.length} players · ${team.roster.filter((player) => player.classYear === "SR").length} seniors`} action={<span className="screen-count">{Math.round(team.roster.reduce((sum, player) => sum + player.ratings.overall, 0) / team.roster.length)} OVR</span>} />
    <section className="player-detail panel-lite"><div className="detail-identity"><PlayerAvatar player={selected} team={team} size={78} /><div><span className="eyebrow">{selected.position} · {selected.classYear}</span><h2>{selected.name}</h2><p>{selected.height} · {selected.weight} lb · {selected.archetype}</p><div className="trait-row"><span>{selected.personality}</span><span>Potential {selected.ratings.potential}</span></div></div><b className="detail-overall">{selected.ratings.overall}<small>OVR</small></b></div>
      <div className="player-season-line"><span>SEASON</span><b>{stats.gamesPlayed ? (stats.points / stats.gamesPlayed).toFixed(1) : "0.0"}<small>PPG</small></b><b>{stats.gamesPlayed ? (stats.rebounds / stats.gamesPlayed).toFixed(1) : "0.0"}<small>RPG</small></b><b>{stats.gamesPlayed ? (stats.assists / stats.gamesPlayed).toFixed(1) : "0.0"}<small>APG</small></b><b>{stats.fga ? `${(seasonPercent(stats, "fg") * 100).toFixed(1)}%` : "—"}<small>FG</small></b><b>{stats.threePa ? `${(seasonPercent(stats, "three") * 100).toFixed(1)}%` : "—"}<small>3PT</small></b></div>
      <div className="rating-sections">{ratingGroups.map((group) => <div className="rating-section" key={group.title}><h3>{group.title}</h3>{group.ratings.map(([key, label]) => <div className="rating-row" key={key}><span>{label}</span><i><em style={{ width: `${selected.ratings[key]}%` }} /></i><b>{selected.ratings[key]}</b></div>)}</div>)}</div>
      <div className="detail-footer"><span>Scouting notes</span><b>{selected.hiddenTraits.join(" · ")}</b></div></section>
    <div className="section-label roster-label"><span>FULL ROSTER</span><span>tap to inspect</span></div>
    <section className="roster-list">{team.roster.map((player) => <PlayerRow key={player.id} player={player} team={team} selected={player.id === selected.id} onClick={() => onSelect(player)} detail={player.id === selected.id ? "full" : "shooting"} />)}</section>
    <p className="screen-footnote"><ChevronRight size={14} /> Select any player to view ratings and season production.</p>
  </div>;
}
