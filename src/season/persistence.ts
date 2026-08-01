import type { SeasonState } from "../domain/types";

export const SAVE_KEY = "courtside-season-v1";

export function saveSeason(state: SeasonState): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* Storage can be unavailable in private browsing. */ }
}

export function loadSeason(): SeasonState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SeasonState>;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.teams) || !Array.isArray(parsed.schedule) || !parsed.records || !parsed.playerStats) return null;
    const fallbackTeam = parsed.teams[0];
    if (!fallbackTeam) return null;
    return { ...parsed, userLineup: Array.isArray(parsed.userLineup) ? parsed.userLineup : fallbackTeam.roster.slice(0, 5).map((player) => player.id), userStrategy: parsed.userStrategy ?? { pace: "balanced", offensiveStyle: "motion", shotEmphasis: "rim", defensiveScheme: "man", pressFrequency: 20, helpDefense: 50, reboundingAggressiveness: 55, rotationSize: 9, foulTroubleSubstitution: true, lateGameFouling: true } } as SeasonState;
  } catch { return null; }
}

export function clearSeason(): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* Ignore unavailable storage. */ }
}
