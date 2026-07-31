import type { Team } from "../../domain/types";

export function TeamMark({ team, size = "md" }: { team: Team; size?: "sm" | "md" | "lg" }) {
  return <span className={`team-mark team-mark-${size}`} style={{ backgroundColor: team.colors[0], color: team.colors[1] }} aria-label={team.name}>
    <b>{team.logo}</b><span>{team.shortName}</span>
  </span>;
}
