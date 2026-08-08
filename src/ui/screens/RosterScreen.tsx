import { ChevronRight } from "lucide-react";
import type { PlayerProfile, Team } from "../../domain/types";
import { PlayerRow } from "../components/PlayerRow";
import { ScreenHeader } from "../components/ScreenHeader";

export function RosterScreen({ team, onSelect }: { team: Team; onSelect: (player: PlayerProfile) => void }) {
  const averageOverall = Math.round(team.roster.reduce((sum, player) => sum + player.ratings.overall, 0) / team.roster.length);
  return <div className="screen-stack roster-screen"><ScreenHeader eyebrow={`${team.shortName} ${team.nickname}`} title="Roster" subtitle={`${team.roster.length} players · ${team.roster.filter((player) => player.classYear === "SR").length} seniors`} action={<span className="screen-count">{averageOverall} OVR</span>} />
    <div className="roster-columns"><span>#</span><span>PLAYER</span><span>POS</span><span>OVR</span></div>
    <section className="roster-list">{team.roster.map((player) => <PlayerRow key={player.id} player={player} team={team} onClick={() => onSelect(player)} detail="shooting" />)}</section>
    <p className="screen-footnote"><ChevronRight size={14} /> Select a player for ratings, scouting notes, and season production.</p>
  </div>;
}
