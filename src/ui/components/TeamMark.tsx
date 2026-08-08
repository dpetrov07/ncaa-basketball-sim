import type { CSSProperties } from "react";
import type { Team } from "../../domain/types";

export function TeamLogo({ team, size = "md" }: { team: Team; size?: "sm" | "md" | "lg" }) {
  const style = { "--mark-primary": team.colors[0], "--mark-secondary": team.colors[1] } as CSSProperties;
  return <span className={`team-mark team-mark-${size}`} style={style} aria-label={team.name}>
    <b>{team.logo}</b><span>{team.shortName}</span>
  </span>;
}

export const TeamMark = TeamLogo;
