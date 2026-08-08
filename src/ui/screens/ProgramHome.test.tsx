import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { teams } from "../../data/teams";
import { createSeasonState, getNextUserGame } from "../../season/season";
import { ProgramHome } from "./ProgramHome";

describe("ProgramHome", () => {
  it("renders the record and opponent from season state", () => {
    const season = createSeasonState(teams, teams[0].id, 404);
    season.records[teams[0].id].wins = 7;
    season.records[teams[0].id].losses = 2;
    season.records[teams[0].id].conferenceWins = 3;
    season.records[teams[0].id].conferenceLosses = 1;
    const nextGame = getNextUserGame(season)!;
    const opponentId = nextGame.homeTeamId === teams[0].id ? nextGame.awayTeamId : nextGame.homeTeamId;
    const opponent = teams.find((team) => team.id === opponentId)!;
    const markup = renderToStaticMarkup(createElement(ProgramHome, {
      team: teams[0], opponent, result: null, season, nextGame, onNavigate: () => undefined, onPregame: () => undefined,
    }));
    expect(markup).toContain("7–2");
    expect(markup).toContain("3–1");
    expect(markup).toContain(opponent.name);
    expect(markup).not.toContain("EXHIBITION");
  });
});
