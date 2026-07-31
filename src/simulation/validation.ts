import type { Lineup, Team } from "../domain/types";

export function validateLineup(team: Team, lineup: Lineup): void {
  if (lineup.playerIds.length !== 5) throw new Error(`${team.shortName} needs exactly five starters.`);
  if (new Set(lineup.playerIds).size !== 5) throw new Error("A player cannot appear twice in a lineup.");
  const rosterIds = new Set(team.roster.map((player) => player.id));
  const missing = lineup.playerIds.find((id) => !rosterIds.has(id));
  if (missing) throw new Error("Every starter must be on the selected team's roster.");
}
