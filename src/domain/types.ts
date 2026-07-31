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
  hiddenTraits: HiddenTrait[];
  ratings: PlayerRatings;
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
  colors: [string, string];
  logo: string;
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
  text: string;
}

export interface BoxScore {
  team: Team;
  stats: TeamStats;
  players: PlayerStats[];
}

export interface GameResult {
  seed: number;
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
  seed: number;
}
