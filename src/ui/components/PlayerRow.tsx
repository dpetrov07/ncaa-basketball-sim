import type { PlayerProfile, Team } from "../../domain/types";
import { PlayerAvatar } from "./Avatar";

export function PlayerRow({ player, team, selected = false, onClick, role, detail = "shooting" }: { player: PlayerProfile; team: Team; selected?: boolean; onClick?: () => void; role?: string; detail?: "shooting" | "defense" | "full" }) {
  const content = <>
    <span className="player-number">{team.roster.findIndex((candidate) => candidate.id === player.id) + 1}</span>
    <PlayerAvatar player={player} team={team} size={46} />
    <div className="player-row-copy"><strong>{player.name}</strong><span>{player.position} · {player.classYear} · {role ?? player.archetype}</span></div>
    <div className="player-row-ratings"><b>{player.ratings.overall}</b><small>OVR</small></div>
    <div className="player-row-detail">{detail === "shooting" && <><span>3PT <b>{player.ratings.threePoint}</b></span><span>FT <b>{player.ratings.freeThrow}</b></span></>}{detail === "defense" && <><span>PER <b>{player.ratings.perimeterDefense}</b></span><span>REB <b>{player.ratings.defensiveRebounding}</b></span></>}{detail === "full" && <><span>ATH <b>{player.ratings.athleticism}</b></span><span>IQ <b>{player.ratings.basketballIQ}</b></span></>}</div>
  </>;
  return onClick ? <button className={`player-row ${selected ? "selected" : ""}`} onClick={onClick}>{content}</button> : <div className="player-row">{content}</div>;
}
