import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { teams } from "../../data/teams";
import { createSeasonState } from "../../season/season";
import { PlayerProfileScreen } from "./PlayerProfileScreen";

describe("PlayerProfileScreen scouting visibility", () => {
  it("does not expose engine-only hidden traits before discovery", () => {
    const team = teams[0];
    const player = team.roster[0];
    const markup = renderToStaticMarkup(createElement(PlayerProfileScreen, { player, team, season: createSeasonState(teams, team.id, 909), onBack: () => undefined }));
    for (const trait of player.hiddenTraits) expect(markup).not.toContain(trait);
    expect(markup).toContain("No traits discovered");
  });

  it("renders only explicitly known traits", () => {
    const team = teams[0];
    const player = { ...team.roster[0], knownTraits: ["High motor" as const], hiddenTraits: ["Clutch" as const] };
    const markup = renderToStaticMarkup(createElement(PlayerProfileScreen, { player, team, season: createSeasonState(teams, team.id, 910), onBack: () => undefined }));
    expect(markup).toContain("High motor");
    expect(markup).not.toContain("Clutch");
  });
});
