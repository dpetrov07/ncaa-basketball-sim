import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StartScreen } from "./StartScreen";
import { CoachCreationScreen } from "./CoachCreationScreen";
import App from "../../App";

describe("career entry screens", () => {
  it("opens on the start screen instead of the team sandbox", () => {
    const markup = renderToStaticMarkup(createElement(App));
    expect(markup).toContain("College Basketball Coaching Simulator");
    expect(markup).toContain("New Career");
    expect(markup).not.toContain("PROGRAM</span><select");
  });

  it("starts a new game at the career menu and only shows Continue for a valid save", () => {
    const callbacks = { onNewCareer: () => undefined, onContinue: () => undefined, onDelete: () => undefined };
    const fresh = renderToStaticMarkup(createElement(StartScreen, { hasSave: false, ...callbacks }));
    expect(fresh).toContain("New Career");
    expect(fresh).not.toContain("Continue");
    const saved = renderToStaticMarkup(createElement(StartScreen, { hasSave: true, ...callbacks }));
    expect(saved).toContain("Continue");
  });

  it("new-career onboarding begins with coach creation", () => {
    const markup = renderToStaticMarkup(createElement(CoachCreationScreen, { onBack: () => undefined, onComplete: () => undefined }));
    expect(markup).toContain("Create your coach");
    expect(markup).toContain("Continue to programs");
    expect(markup).toContain("Offensive philosophy");
    expect(markup).toContain("Defensive philosophy");
  });
});
