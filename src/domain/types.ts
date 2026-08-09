export type Position = "PG" | "SG" | "SF" | "PF" | "C";
export type ClassYear = "FR" | "SO" | "JR" | "SR";
export type Archetype =
  | "Floor-General Point Guard"
  | "Scoring Point Guard"
  | "Three-and-D Wing"
  | "Slashing Wing"
  | "Shot-Creating Guard"
  | "Defensive Specialist"
  | "Stretch Forward"
  | "Interior Scorer"
  | "Rim Protector"
  | "Rebounding Center"
  | "Point Forward"
  | "Energy Bench Player"
  | "Sixth Man"
  | "Raw High-Upside Prospect";

export type Personality =
  | "Team-first"
  | "Competitive"
  | "Confident"
  | "Quiet"
  | "Vocal leader"
  | "Emotional"
  | "Selfish"
  | "Loyal"
  | "Impatient"
  | "Coachable"
  | "Hard-working"
  | "Laid-back";

export type HiddenTrait =
  | "Clutch"
  | "Inconsistent"
  | "Big-game performer"
  | "High motor"
  | "Low effort"
  | "Foul-prone"
  | "Turnover-prone"
  | "Strong leadership"
  | "Poor locker-room influence"
  | "Fast learner"
  | "Transfer risk";

export interface PlayerRatings {
  overall: number;
  insideScoring: number;
  dunking: number;
  layupFinishing: number;
  midRange: number;
  threePoint: number;
  freeThrow: number;
  passing: number;
  ballHandling: number;
  offensiveRebounding: number;
  defensiveRebounding: number;
  perimeterDefense: number;
  interiorDefense: number;
  steal: number;
  block: number;
  speed: number;
  strength: number;
  athleticism: number;
  stamina: number;
  basketballIQ: number;
  offensiveConsistency: number;
  defensiveConsistency: number;
  potential: number;
}

export interface PlayerProfile {
  id: string;
  name: string;
  position: Position;
  height: string;
  weight: number;
  classYear: ClassYear;
  archetype: Archetype;
  personality: Personality;
  /** Traits the player-facing scouting layer is allowed to reveal. */
  knownTraits?: HiddenTrait[];
  /** Engine-only traits. These are never presentation data. */
  hiddenTraits: HiddenTrait[];
  ratings: PlayerRatings;
}

export type ProgramTier = "elite" | "strong" | "middle" | "rebuilding" | "underdog";

export interface ProgramProfile {
  tier: ProgramTier;
  prestige: number;
  expectations: string;
  facilities: number;
  developmentReputation: number;
  recruitingReach: number;
  historicalReputation: number;
  homeCourtStrength: number;
  identity: "balanced" | "shooting" | "defense" | "rebounding" | "athleticism" | "development";
}

export interface PlayerGameState {
  playerId: string;
  fatigue: number;
  stamina: number;
  fouls: number;
  minutes: number;
  confidence: number;
  available: boolean;
  role: "starter" | "rotation" | "bench";
}

export interface Team {
  id: string;
  name: string;
  nickname: string;
  shortName: string;
  city: string;
  conference: string;
  colors: [string, string];
  logo: string;
  program: ProgramProfile;
  coach: Coach;
  roster: PlayerProfile[];
}

export type Pace = "very-slow" | "slow" | "balanced" | "fast" | "very-fast";
export type OffensiveStyle =
  | "balanced"
  | "motion"
  | "pick-and-roll"
  | "isolation"
  | "post-focused"
  | "drive-and-kick"
  | "three-point"
  | "transition"
  | "inside-out";
export type ShotEmphasis = "rim" | "mid-range" | "three" | "post" | "free-throws";
export type DefensiveScheme =
  | "man"
  | "zone"
  | "switching"
  | "conservative"
  | "aggressive-help"
  | "full-court-press";

export interface Strategy {
  pace: Pace;
  offensiveStyle: OffensiveStyle;
  shotEmphasis: ShotEmphasis;
  defensiveScheme: DefensiveScheme;
  pressFrequency: number;
  helpDefense: number;
  reboundingAggressiveness: number;
  rotationSize: number;
  foulTroubleSubstitution: boolean;
  lateGameFouling: boolean;
}

export interface Lineup {
  playerIds: string[];
}

export interface Coach {
  id: string;
  name: string;
  style: string;
  ratings: {
    offense: number;
    defense: number;
    development: number;
    adaptability: number;
    rotation: number;
    motivation: number;
    discipline: number;
  };
}

export interface PlayerStats {
  playerId: string;
  minutes: number;
  points: number;
  fgm: number;
  fga: number;
  twoPm: number;
  twoPa: number;
  threePm: number;
  threePa: number;
  ftm: number;
  fta: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  plusMinus: number;
  dunks: number;
  fastBreakPoints: number;
  pointsInPaint: number;
  offensiveFouls: number;
}

export interface TeamStats {
  teamId: string;
  points: number;
  possessions: number;
  fgm: number;
  fga: number;
  threePm: number;
  threePa: number;
  ftm: number;
  fta: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  fastBreakPoints: number;
  pointsInPaint: number;
}

export type EventKind =
  | "period-start"
  | "period-end"
  | "halftime"
  | "shot"
  | "free-throw"
  | "rebound"
  | "turnover"
  | "foul"
  | "substitution"
  | "timeout"
  | "final";

export interface GameEvent {
  id: number;
  kind: EventKind;
  period: number;
  clock: number;
  teamId?: string;
  playerId?: string;
  secondaryPlayerId?: string;
  opponentPlayerId?: string;
  points?: number;
  shotType?: "layup" | "dunk" | "mid-range" | "three" | "post";
  result?: "made" | "missed" | "blocked";
  foulType?: "offensive" | "defensive-non-shooting" | "shooting" | "intentional" | "bonus";
  text: string;
}

export interface BoxScore {
  team: Team;
  stats: TeamStats;
  players: PlayerStats[];
}

export interface GameResult {
  seed: number;
  homeStartingLineup: string[];
  awayStartingLineup: string[];
  home: BoxScore;
  away: BoxScore;
  events: GameEvent[];
  winnerId: string;
  periods: number;
  durationSeconds: number;
}

export interface SimulationInput {
  home: Team;
  away: Team;
  homeLineup: Lineup;
  awayLineup: Lineup;
  homeStrategy: Strategy;
  awayStrategy: Strategy;
  homeCoach?: Coach;
  awayCoach?: Coach;
  neutralSite?: boolean;
  seed: number;
}

export type GameStoppage =
  | "game-start"
  | "possession"
  | "made-basket"
  | "foul"
  | "free-throws"
  | "turnover"
  | "halftime"
  | "period-end"
  | "timeout"
  | "final";

export interface GameRuntimePlayer {
  playerId: string;
  state: PlayerGameState;
  stats: PlayerStats;
  activeSeconds: number;
}

export interface GameRuntimeTeam {
  team: Team;
  coach: Coach;
  strategy: Strategy;
  players: GameRuntimePlayer[];
  lineup: string[];
  possessions: number;
  score: number;
  teamFouls: number;
  timeoutsRemaining: number;
  stats: TeamStats;
}

export interface GameState {
  seed: number;
  rngState: number;
  homeStartingLineup: string[];
  awayStartingLineup: string[];
  home: GameRuntimeTeam;
  away: GameRuntimeTeam;
  neutralSite: boolean;
  openingPossessionTeamId: string;
  possessionTeamId: string;
  /** Set after an offensive rebound so a second-chance action is not counted as a new possession. */
  continuationTeamId?: string;
  period: number;
  clock: number;
  totalSeconds: number;
  nextEventId: number;
  events: GameEvent[];
  status: "playing" | "complete";
  stoppage: GameStoppage;
}

export type ScheduledGameStatus = "scheduled" | "completed";
export type SeasonPhase = "preseason" | "regular-season" | "conference-tournament" | "national-postseason" | "complete";
export type GameType = "regular-season" | "conference-tournament" | "national-postseason";

export interface GameRankingSnapshot {
  homeRank?: number;
  awayRank?: number;
}

export interface PostgameAnalysisItem {
  category: "rebounding" | "shooting" | "turnovers" | "bench" | "usage" | "pace";
  text: string;
  advantageTeamId?: string;
}

export interface GameHistorySnapshot {
  gameType: GameType;
  week: number;
  rankings: GameRankingSnapshot;
  highScorerId?: string;
  highRebounderId?: string;
  highAssisterId?: string;
  largestLead: number;
  overtimeCount: number;
  importantEventIds: number[];
  analysis: PostgameAnalysisItem[];
}

export interface ScheduledGame {
  id: string;
  seasonYear: number;
  day: number;
  homeTeamId: string;
  awayTeamId: string;
  conferenceGame: boolean;
  gameType: GameType;
  round?: "play-in" | "semifinal" | "final" | "quarterfinal" | "championship";
  neutralSite?: boolean;
  seed: number;
  status: ScheduledGameStatus;
  result?: GameResult;
  historySnapshot?: GameHistorySnapshot;
}

export interface NationalRanking {
  rank: number;
  previousRank: number;
  teamId: string;
  score: number;
  strengthOfSchedule: number;
  qualityWins: number;
  roadWins: number;
  recentWins: number;
  reasons: string[];
}

export interface ConferenceTournamentState {
  conference: string;
  seeds: string[];
  gameIds: string[];
  championId?: string;
}

export interface NationalTournamentState {
  seeds: string[];
  gameIds: string[];
  championId?: string;
  runnerUpId?: string;
}

export interface PostseasonState {
  conferenceGenerated: boolean;
  conferences: ConferenceTournamentState[];
  nationalGenerated: boolean;
  national?: NationalTournamentState;
}

export interface PlayerSeasonRecord {
  playerId: string;
  value: number;
  gameId: string;
}

export interface TeamSeasonRecordBookEntry {
  teamId: string;
  value: number;
  gameId?: string;
}

export interface SeasonRecordBook {
  players: Record<"points" | "rebounds" | "assists" | "threes" | "blocks" | "steals", PlayerSeasonRecord | undefined>;
  teamRecords: Record<"highestScore" | "lowestAllowed" | "largestWin" | "largestLoss" | "longestWinStreak" | "longestLosingStreak" | "bestRankedWin", TeamSeasonRecordBookEntry | undefined>;
}

export interface SeasonAwards {
  playerOfYearId: string;
  defensivePlayerOfYearId: string;
  freshmanOfYearId: string;
  coachOfYearTeamId: string;
  firstTeamAllNational: string[];
  secondTeamAllNational: string[];
}

export interface TeamSeasonRecord {
  teamId: string;
  wins: number;
  losses: number;
  conferenceWins: number;
  conferenceLosses: number;
  pointsFor: number;
  pointsAgainst: number;
  streak: number;
}

export interface SeasonPlayerStats {
  playerId: string;
  gamesPlayed: number;
  gamesStarted: number;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  fgm: number;
  fga: number;
  twoPm: number;
  twoPa: number;
  threePm: number;
  threePa: number;
  ftm: number;
  fta: number;
  plusMinus: number;
  seasonHighPoints: number;
  recentPoints: number[];
}

export interface SeasonState {
  schemaVersion: 1;
  seasonYear: number;
  seed: number;
  currentDay: number;
  totalDays: number;
  phase: SeasonPhase;
  userTeamId: string;
  userLineup: string[];
  userStrategy: Strategy;
  teams: Team[];
  schedule: ScheduledGame[];
  records: Record<string, TeamSeasonRecord>;
  playerStats: Record<string, SeasonPlayerStats>;
  history: string[];
  rankings: NationalRanking[];
  finalConferenceStandings?: Record<string, string[]>;
  postseason: PostseasonState;
  awards?: SeasonAwards;
  recordBook: SeasonRecordBook;
}

export interface PlayerLeaderboardEntry {
  playerId: string;
  teamId: string;
  value: number;
}

export type PlayerLeaderboardCategory = "ppg" | "rpg" | "apg" | "spg" | "bpg" | "fgPct" | "threePct" | "ftPct" | "points" | "rebounds" | "threePm";
export type TeamLeaderboardCategory = "ppg" | "defense" | "threePct" | "rebounding" | "turnoverRate" | "pointDifferential";

export interface TeamLeaderboardEntry {
  teamId: string;
  value: number;
}

export interface CoachSeasonEvaluation {
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  explanation: string;
}

export interface ScoutingReport {
  expectedStarterIds: string[];
  rotationIds: string[];
  keyPlayers: { scorerId: string; creatorId: string; shooterId: string; rebounderId: string; defenderId: string };
  tendencies: string[];
  recentTrends: string[];
  conclusions: string[];
}

export type UserCoachArchetype = "Balanced" | "Offensive Mind" | "Defensive Specialist" | "Player Developer" | "Analytics Coach" | "Motivator" | "Fast-Paced Coach";
export type CoachOffensivePhilosophy = "Balanced" | "Motion" | "Pick and Roll" | "Inside Out" | "Perimeter" | "Transition";
export type CoachDefensivePhilosophy = "Man to Man" | "Zone" | "Switching" | "Pressure" | "Conservative";

export interface CoachAppearance {
  skin: number;
  hairstyle: number;
  hairColor: number;
  facialHair: number;
  expression: number;
}

export interface UserCoach {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  archetype: UserCoachArchetype;
  offensivePhilosophy: CoachOffensivePhilosophy;
  defensivePhilosophy: CoachDefensivePhilosophy;
  appearance: CoachAppearance;
}

export type CareerStage = "program-selection" | "season-introduction" | "season" | "season-complete";

export interface CareerSave {
  schemaVersion: 2;
  careerId: string;
  stage: CareerStage;
  coach: UserCoach;
  programId?: string;
  seasonObjective?: string;
  season?: SeasonState;
  coachEvaluation?: CoachSeasonEvaluation;
  liveGame?: {
    gameId: string;
    state: GameState;
  };
  createdAt: number;
  updatedAt: number;
}
