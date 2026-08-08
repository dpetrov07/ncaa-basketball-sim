import type { PlayerProfile, SeasonState, Team } from "../../domain/types";
import { seasonPercent } from "../../season/season";
import { PlayerPortrait } from "../components/Avatar";
import { ScreenHeader } from "../components/ScreenHeader";

const ratingGroups: { title: string; ratings: [keyof PlayerProfile["ratings"], string][] }[] = [
  { title: "Scoring", ratings: [["insideScoring", "Inside"], ["layupFinishing", "Finishing"], ["midRange", "Mid-range"], ["threePoint", "Three-point"], ["freeThrow", "Free throw"]] },
  { title: "Playmaking", ratings: [["passing", "Passing"], ["ballHandling", "Handle"], ["basketballIQ", "Basketball IQ"]] },
  { title: "Defense", ratings: [["perimeterDefense", "Perimeter"], ["interiorDefense", "Interior"], ["steal", "Steal"], ["block", "Block"]] },
  { title: "Physical", ratings: [["speed", "Speed"], ["strength", "Strength"], ["athleticism", "Athleticism"], ["stamina", "Stamina"]] },
];

export function PlayerProfileScreen({ player, team, season, onBack }: { player: PlayerProfile; team: Team; season: SeasonState; onBack: () => void }) {
  const stats = season.playerStats[player.id];
  return <div className="screen-stack player-profile-screen"><ScreenHeader title="Player profile" onBack={onBack} />
    <section className="player-detail"><div className="detail-identity"><PlayerPortrait player={player} team={team} size={82} /><div><span className="eyebrow">{player.position} · {player.classYear}</span><h2>{player.name}</h2><p>{player.height} · {player.weight} lb</p><p>{player.archetype}</p></div><b className="detail-overall">{player.ratings.overall}<small>OVR</small></b></div>
      <div className="trait-row"><span>{player.personality}</span><span>Potential {player.ratings.potential}</span></div>
      <div className="player-season-line"><span>SEASON</span><b>{stats.gamesPlayed ? (stats.points / stats.gamesPlayed).toFixed(1) : "0.0"}<small>PPG</small></b><b>{stats.gamesPlayed ? (stats.rebounds / stats.gamesPlayed).toFixed(1) : "0.0"}<small>RPG</small></b><b>{stats.gamesPlayed ? (stats.assists / stats.gamesPlayed).toFixed(1) : "0.0"}<small>APG</small></b><b>{stats.fga ? `${(seasonPercent(stats, "fg") * 100).toFixed(1)}%` : "—"}<small>FG</small></b><b>{stats.threePa ? `${(seasonPercent(stats, "three") * 100).toFixed(1)}%` : "—"}<small>3PT</small></b></div>
      <div className="rating-sections">{ratingGroups.map((group) => <div className="rating-section" key={group.title}><h3>{group.title}</h3>{group.ratings.map(([key, label]) => <div className="rating-row" key={key}><span>{label}</span><i><em style={{ width: `${player.ratings[key]}%` }} /></i><b>{player.ratings[key]}</b></div>)}</div>)}</div>
      <div className="detail-footer"><span>Scouting notes</span><b>{player.hiddenTraits.join(" · ")}</b></div></section>
  </div>;
}
