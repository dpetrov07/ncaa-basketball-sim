import type { BoxScore, CareerSave, GameResult, GameRuntimeTeam, GameState, ScheduledGame, SeasonState, Team } from "../domain/types";

const LEGACY_SAVE_KEY = "courtside-season-v1";
export const CAREER_SAVE_KEY = "courtside-career-v2";

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface CareerLoadResult {
  save: CareerSave | null;
  error?: string;
}

export interface SaveRepository {
  load(): CareerLoadResult;
  save(career: CareerSave): void;
  delete(): void;
}

type SavedBoxScore = Omit<BoxScore, "team"> & { teamId: string };
type SavedGameResult = Omit<GameResult, "home" | "away"> & { home: SavedBoxScore; away: SavedBoxScore };
type SavedScheduledGame = Omit<ScheduledGame, "result"> & { result?: SavedGameResult };
type SavedSeason = Omit<SeasonState, "teams" | "schedule"> & { schedule: SavedScheduledGame[] };
type SavedRuntimeTeam = Omit<GameRuntimeTeam, "team"> & { teamId: string };
type SavedGameState = Omit<GameState, "home" | "away"> & { home: SavedRuntimeTeam; away: SavedRuntimeTeam };
type CareerPayload = Omit<CareerSave, "season" | "liveGame"> & { season?: SavedSeason; liveGame?: { gameId: string; state: SavedGameState } };

function teamById(database: Team[], teamId: string): Team {
  const team = database.find((candidate) => candidate.id === teamId);
  if (!team) throw new Error(`Save references unknown team ${teamId}.`);
  return team;
}

function saveResult(result: GameResult, keepEvents = true): SavedGameResult {
  const { team: homeTeam, ...home } = result.home;
  const { team: awayTeam, ...away } = result.away;
  return { ...result, events: keepEvents ? result.events : [], home: { ...home, teamId: homeTeam.id }, away: { ...away, teamId: awayTeam.id } };
}

function loadResult(result: SavedGameResult, database: Team[]): GameResult {
  const { teamId: homeTeamId, ...home } = result.home;
  const { teamId: awayTeamId, ...away } = result.away;
  return { ...result, home: { ...home, team: teamById(database, homeTeamId) }, away: { ...away, team: teamById(database, awayTeamId) } };
}

function saveRuntime(runtime: GameRuntimeTeam): SavedRuntimeTeam {
  const { team, ...mutable } = runtime;
  return { ...mutable, teamId: team.id };
}

function loadRuntime(runtime: SavedRuntimeTeam, database: Team[]): GameRuntimeTeam {
  const { teamId, ...mutable } = runtime;
  return { ...mutable, team: teamById(database, teamId) };
}

export function serializeCareer(career: CareerSave): string {
  const payload: CareerPayload = {
    ...career,
    season: career.season ? {
      ...career.season,
      teams: undefined,
      schedule: career.season.schedule.map((game) => ({ ...game, result: game.result ? saveResult(game.result, game.homeTeamId === career.season?.userTeamId || game.awayTeamId === career.season?.userTeamId) : undefined })),
    } as SavedSeason : undefined,
    liveGame: career.liveGame ? { gameId: career.liveGame.gameId, state: { ...career.liveGame.state, home: saveRuntime(career.liveGame.state.home), away: saveRuntime(career.liveGame.state.away) } } : undefined,
  };
  return JSON.stringify(payload);
}

export function deserializeCareer(raw: string, database: Team[]): CareerSave {
  const payload = JSON.parse(raw) as Partial<CareerPayload>;
  const stages = ["program-selection", "season-introduction", "season", "season-complete"];
  if (payload.schemaVersion !== 2 || !payload.careerId || !payload.coach || !payload.stage || !stages.includes(payload.stage)) throw new Error("Save is incompatible or incomplete.");
  if (payload.programId) teamById(database, payload.programId);
  const season = payload.season ? {
    ...payload.season,
    teams: database,
    schedule: payload.season.schedule.map((game) => ({ ...game, result: game.result ? loadResult(game.result, database) : undefined })),
  } as SeasonState : undefined;
  if (season && (!Array.isArray(season.schedule) || !season.records || !season.playerStats || season.userTeamId !== payload.programId)) throw new Error("Save season data is invalid.");
  const liveGame = payload.liveGame ? { gameId: payload.liveGame.gameId, state: { ...payload.liveGame.state, home: loadRuntime(payload.liveGame.state.home, database), away: loadRuntime(payload.liveGame.state.away, database) } } : undefined;
  if (payload.stage !== "program-selection" && (!payload.programId || !season)) throw new Error("Career is missing its selected program or season.");
  if (liveGame && (!season?.schedule.some((game) => game.id === liveGame.gameId) || (liveGame.state.home.team.id !== payload.programId && liveGame.state.away.team.id !== payload.programId))) throw new Error("Live game data is invalid.");
  return { ...payload, schemaVersion: 2, season, liveGame } as CareerSave;
}

export class LocalStorageSaveRepository implements SaveRepository {
  constructor(private readonly storage: StorageAdapter, private readonly database: Team[]) {}

  load(): CareerLoadResult {
    try {
      const raw = this.storage.getItem(CAREER_SAVE_KEY);
      if (!raw) return this.storage.getItem(LEGACY_SAVE_KEY) ? { save: null, error: "An older season save was found. Start a new career to use the current save format." } : { save: null };
      return { save: deserializeCareer(raw, this.database) };
    } catch (caught) {
      return { save: null, error: caught instanceof Error ? caught.message : "The career save could not be loaded." };
    }
  }

  save(career: CareerSave): void { try { this.storage.setItem(CAREER_SAVE_KEY, serializeCareer(career)); } catch { /* Storage may be unavailable. */ } }
  delete(): void { try { this.storage.removeItem(CAREER_SAVE_KEY); this.storage.removeItem(LEGACY_SAVE_KEY); } catch { /* Storage may be unavailable. */ } }
}

export function browserSaveRepository(database: Team[]): SaveRepository | null {
  if (typeof window === "undefined") return null;
  try { return new LocalStorageSaveRepository(window.localStorage, database); } catch { return null; }
}
