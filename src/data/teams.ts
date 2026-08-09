import type {
  Archetype,
  ClassYear,
  Coach,
  HiddenTrait,
  Personality,
  PlayerProfile,
  PlayerRatings,
  Position,
  ProgramProfile,
  Team,
} from "../domain/types";

const teamSeeds = [
  ["Northlake University", "Northlake", "NLU", "Otters", "#55d6be", "#11263d"],
  ["Redwood State", "Redwood", "RWS", "Foxes", "#f25f5c", "#1b1b3a"],
  ["Summit College", "Summit", "SUM", "Ravens", "#f6bd60", "#264653"],
  ["Coastal Carolina", "Coastal", "COA", "Breakers", "#00b4d8", "#03045e"],
  ["Blue Ridge Tech", "Blue Ridge", "BRT", "Mountaineers", "#8ecae6", "#023047"],
  ["Prairie View College", "Prairie View", "PVC", "Bison", "#e9c46a", "#6a040f"],
  ["Ironwood University", "Ironwood", "IRN", "Miners", "#adb5bd", "#343a40"],
  ["Hawthorne College", "Hawthorne", "HAW", "Firebirds", "#ff9f1c", "#2ec4b6"],
  ["Crescent State", "Crescent", "CRS", "Moons", "#cdb4db", "#231942"],
  ["Lakeview University", "Lakeview", "LKU", "Herons", "#90be6d", "#16324f"],
  ["Golden Valley", "Golden Valley", "GVU", "Suns", "#ffd166", "#073b4c"],
  ["Pine Harbor", "Pine Harbor", "PHU", "Lumberjacks", "#80ed99", "#22577a"],
  ["Metro Heights", "Metro Heights", "MHT", "Comets", "#ff70a6", "#3c1642"],
  ["Starlight College", "Starlight", "STL", "Astronauts", "#bde0fe", "#1d3557"],
  ["Westfield A&M", "Westfield", "WAM", "Mustangs", "#f4a261", "#264653"],
  ["Liberty Plains", "Liberty Plains", "LPL", "Sentinels", "#e76f51", "#14213d"],
  ["Orchard State", "Orchard", "ORC", "Grove", "#a7c957", "#386641"],
  ["Canyon Ridge", "Canyon Ridge", "CNR", "Rattlers", "#fb8500", "#023047"],
  ["Harbor Point", "Harbor Point", "HPT", "Tides", "#48cae4", "#03045e"],
  ["Evergreen Polytechnic", "Evergreen", "EVP", "Pioneers", "#52b788", "#081c15"],
] as const;

interface ProgramBlueprint {
  profile: ProgramProfile;
  quality: number;
  depth: number;
  potentialBonus: number;
  starBoost: number;
}

const programBlueprints: ProgramBlueprint[] = [
  { profile: { tier: "elite", prestige: 5, expectations: "Conference championship contender", facilities: 5, developmentReputation: 4, recruitingReach: 5, historicalReputation: 5, homeCourtStrength: 5, identity: "shooting" }, quality: 7, depth: 2, potentialBonus: 1, starBoost: 2 },
  { profile: { tier: "strong", prestige: 4, expectations: "Top-three conference finish", facilities: 4, developmentReputation: 3, recruitingReach: 4, historicalReputation: 4, homeCourtStrength: 4, identity: "athleticism" }, quality: 4, depth: 1, potentialBonus: 1, starBoost: 2 },
  { profile: { tier: "middle", prestige: 3, expectations: "Finish above .500", facilities: 3, developmentReputation: 3, recruitingReach: 3, historicalReputation: 3, homeCourtStrength: 3, identity: "balanced" }, quality: 0, depth: 0, potentialBonus: 2, starBoost: 2 },
  { profile: { tier: "underdog", prestige: 1, expectations: "Avoid the conference cellar", facilities: 1, developmentReputation: 3, recruitingReach: 1, historicalReputation: 1, homeCourtStrength: 3, identity: "shooting" }, quality: -7, depth: -3, potentialBonus: 5, starBoost: 9 },
  { profile: { tier: "elite", prestige: 5, expectations: "Conference championship contender", facilities: 5, developmentReputation: 5, recruitingReach: 5, historicalReputation: 4, homeCourtStrength: 5, identity: "defense" }, quality: 7, depth: 3, potentialBonus: 2, starBoost: 3 },
  { profile: { tier: "rebuilding", prestige: 2, expectations: "Show measurable progress", facilities: 2, developmentReputation: 4, recruitingReach: 2, historicalReputation: 2, homeCourtStrength: 3, identity: "development" }, quality: -4, depth: -3, potentialBonus: 7, starBoost: 4 },
  { profile: { tier: "middle", prestige: 3, expectations: "Compete for a top-half finish", facilities: 3, developmentReputation: 2, recruitingReach: 3, historicalReputation: 3, homeCourtStrength: 4, identity: "rebounding" }, quality: 0, depth: 1, potentialBonus: 1, starBoost: 2 },
  { profile: { tier: "strong", prestige: 4, expectations: "Top-three conference finish", facilities: 4, developmentReputation: 4, recruitingReach: 4, historicalReputation: 3, homeCourtStrength: 4, identity: "defense" }, quality: 4, depth: 1, potentialBonus: 2, starBoost: 2 },
  { profile: { tier: "underdog", prestige: 1, expectations: "Avoid the conference cellar", facilities: 2, developmentReputation: 2, recruitingReach: 1, historicalReputation: 1, homeCourtStrength: 2, identity: "shooting" }, quality: -6, depth: -4, potentialBonus: 4, starBoost: 8 },
  { profile: { tier: "middle", prestige: 3, expectations: "Finish above .500", facilities: 3, developmentReputation: 4, recruitingReach: 3, historicalReputation: 2, homeCourtStrength: 3, identity: "development" }, quality: -1, depth: 0, potentialBonus: 6, starBoost: 3 },
  { profile: { tier: "elite", prestige: 5, expectations: "Conference championship contender", facilities: 5, developmentReputation: 4, recruitingReach: 5, historicalReputation: 5, homeCourtStrength: 5, identity: "shooting" }, quality: 6, depth: 3, potentialBonus: 2, starBoost: 4 },
  { profile: { tier: "strong", prestige: 4, expectations: "Top-three conference finish", facilities: 4, developmentReputation: 3, recruitingReach: 4, historicalReputation: 4, homeCourtStrength: 4, identity: "rebounding" }, quality: 4, depth: 2, potentialBonus: 1, starBoost: 2 },
  { profile: { tier: "middle", prestige: 3, expectations: "Finish above .500", facilities: 3, developmentReputation: 3, recruitingReach: 3, historicalReputation: 3, homeCourtStrength: 3, identity: "athleticism" }, quality: 0, depth: 0, potentialBonus: 2, starBoost: 3 },
  { profile: { tier: "rebuilding", prestige: 2, expectations: "Develop a young core", facilities: 3, developmentReputation: 5, recruitingReach: 2, historicalReputation: 2, homeCourtStrength: 2, identity: "development" }, quality: -4, depth: -3, potentialBonus: 8, starBoost: 3 },
  { profile: { tier: "strong", prestige: 4, expectations: "Top-three conference finish", facilities: 4, developmentReputation: 3, recruitingReach: 4, historicalReputation: 4, homeCourtStrength: 4, identity: "defense" }, quality: 3, depth: 2, potentialBonus: 2, starBoost: 3 },
  { profile: { tier: "middle", prestige: 3, expectations: "Compete for a top-half finish", facilities: 3, developmentReputation: 2, recruitingReach: 3, historicalReputation: 3, homeCourtStrength: 4, identity: "defense" }, quality: -1, depth: 0, potentialBonus: 1, starBoost: 3 },
  { profile: { tier: "rebuilding", prestige: 2, expectations: "Show measurable progress", facilities: 2, developmentReputation: 4, recruitingReach: 2, historicalReputation: 2, homeCourtStrength: 3, identity: "development" }, quality: -5, depth: -3, potentialBonus: 8, starBoost: 4 },
  { profile: { tier: "strong", prestige: 4, expectations: "Top-three conference finish", facilities: 4, developmentReputation: 3, recruitingReach: 4, historicalReputation: 3, homeCourtStrength: 4, identity: "athleticism" }, quality: 3, depth: 1, potentialBonus: 3, starBoost: 4 },
  { profile: { tier: "middle", prestige: 3, expectations: "Finish above .500", facilities: 3, developmentReputation: 3, recruitingReach: 3, historicalReputation: 2, homeCourtStrength: 4, identity: "shooting" }, quality: 0, depth: -1, potentialBonus: 2, starBoost: 4 },
  { profile: { tier: "underdog", prestige: 1, expectations: "Avoid the conference cellar", facilities: 2, developmentReputation: 4, recruitingReach: 1, historicalReputation: 1, homeCourtStrength: 3, identity: "development" }, quality: -6, depth: -4, potentialBonus: 7, starBoost: 8 },
];

const firstNames = [
  "Jordan", "Marcus", "Eli", "Theo", "Darius", "Mason", "Andre", "Kai", "Caleb", "Nico",
  "Isaiah", "Julian", "Malik", "Trevor", "Riley", "Grant", "Devon", "Cameron", "Jalen", "Micah",
];
const lastNames = [
  "Bennett", "Carter", "Hayes", "Brooks", "Ellis", "Foster", "Greer", "Holland", "Ingram", "James",
  "Kendall", "Lawson", "Monroe", "Nash", "Owens", "Parker", "Reed", "Sutton", "Turner", "Vance",
];
const positions: Position[] = ["PG", "SG", "SF", "PF", "C"];
const classYears: ClassYear[] = ["FR", "SO", "JR", "SR"];
const personalities: Personality[] = ["Team-first", "Competitive", "Coachable", "Confident", "Hard-working", "Vocal leader", "Quiet", "Emotional"];
const archetypes: Archetype[] = [
  "Floor-General Point Guard", "Scoring Point Guard", "Three-and-D Wing", "Slashing Wing", "Shot-Creating Guard",
  "Defensive Specialist", "Stretch Forward", "Interior Scorer", "Rim Protector", "Rebounding Center",
  "Point Forward", "Energy Bench Player", "Sixth Man", "Raw High-Upside Prospect",
];
const hiddenTraits: HiddenTrait[] = ["Clutch", "High motor", "Foul-prone", "Turnover-prone", "Strong leadership", "Big-game performer", "Inconsistent"];

function clamp(value: number): number {
  return Math.max(25, Math.min(99, Math.round(value)));
}

function rating(base: number, index: number, offset: number): number {
  return clamp(base + ((index * 7 + offset * 11) % 17) - 8);
}

function makeRatings(seed: number, index: number, position: Position, archetype: Archetype, classYear: ClassYear, program: ProgramBlueprint): PlayerRatings {
  const identity = program.profile.identity;
  const rotationAdjustment = index >= 8 ? program.depth : 0;
  const base = 63 + ((seed * 13 + index * 5) % 19) + program.quality + rotationAdjustment + (index === 0 ? program.starBoost : 0);
  const guard = position === "PG" || position === "SG";
  const big = position === "PF" || position === "C";
  const profileBonus = archetype.includes("Three") ? 8 : archetype.includes("Rim") || archetype.includes("Interior") ? 7 : 0;
  const insideScoring = rating(base + (big ? 8 : 0) + profileBonus + (identity === "athleticism" ? 3 : 0), index, 1);
  const threePoint = rating(base + (guard ? 5 : 0) + (archetype.includes("Three") ? 9 : 0) + (identity === "shooting" ? 6 : 0), index, 2);
  const passing = rating(base + (position === "PG" ? 10 : archetype.includes("Point") ? 7 : 0), index, 3);
  const strength = rating(base + (big ? 11 : 0), index, 4);
  const athleticism = rating(base + (archetype.includes("Slashing") ? 8 : 0), index, 5);
  const ratings: Omit<PlayerRatings, "overall"> = {
    insideScoring,
    dunking: rating(base + (big ? 8 : 2), index, 6),
    layupFinishing: rating(base + (guard ? 5 : 1), index, 7),
    midRange: rating(base + (archetype.includes("Shot") ? 8 : 0), index, 8),
    threePoint,
    freeThrow: rating(base + (guard ? 4 : 0), index, 9),
    passing,
    ballHandling: rating(base + (guard ? 10 : archetype.includes("Point") ? 5 : -2), index, 10),
    offensiveRebounding: rating(base + (big ? 12 : -3) + (identity === "rebounding" ? 7 : 0), index, 11),
    defensiveRebounding: rating(base + (big ? 14 : 0) + (identity === "rebounding" ? 7 : 0), index, 12),
    perimeterDefense: rating(base + (guard ? 8 : 1) + (identity === "defense" ? 6 : 0), index, 13),
    interiorDefense: rating(base + (big ? 13 : -2) + (identity === "defense" ? 6 : 0), index, 14),
    steal: rating(base + (guard ? 7 : 0), index, 15),
    block: rating(base + (big ? 10 : -6), index, 16),
    speed: rating(base + (guard ? 9 : -1) + (identity === "athleticism" ? 6 : 0), index, 17),
    strength,
    athleticism: rating(athleticism + (identity === "athleticism" ? 5 : 0), index, 0),
    stamina: rating(base + 8, index, 18),
    basketballIQ: rating(base + (position === "PG" ? 8 : 2), index, 19),
    offensiveConsistency: rating(base + 2, index, 20),
    defensiveConsistency: rating(base + 2, index, 21),
    potential: rating(base + (classYear === "FR" ? 10 : classYear === "SO" ? 5 : 1) + program.potentialBonus, index, 22),
  };
  const weighted = insideScoring * 0.11 + threePoint * 0.12 + passing * 0.09 + strength * 0.07 + ratings.athleticism * 0.08 +
    ratings.ballHandling * 0.08 + ratings.perimeterDefense * 0.1 + ratings.interiorDefense * 0.1 +
    ratings.defensiveRebounding * 0.06 + ratings.stamina * 0.05 + ratings.basketballIQ * 0.08 +
    ratings.offensiveConsistency * 0.03 + ratings.defensiveConsistency * 0.03;
  return { ...ratings, overall: clamp(weighted) };
}

function makePlayer(teamIndex: number, playerIndex: number): PlayerProfile {
  const position = positions[playerIndex % positions.length];
  const archetype = archetypes[(teamIndex * 3 + playerIndex) % archetypes.length];
  const program = programBlueprints[teamIndex];
  const youthYears: ClassYear[] = ["FR", "SO", "FR", "SO", "JR", "FR", "SO", "JR", "SR", "FR", "SO", "JR", "SR"];
  const classYear = program.profile.tier === "rebuilding" || program.profile.tier === "underdog" ? youthYears[(playerIndex + teamIndex) % youthYears.length] : classYears[(playerIndex + teamIndex) % classYears.length];
  const seed = teamIndex + 3;
  return {
    id: `p-${teamIndex + 1}-${playerIndex + 1}`,
    name: `${firstNames[(teamIndex * 3 + playerIndex) % firstNames.length]} ${lastNames[(teamIndex + playerIndex * 2) % lastNames.length]}`,
    position,
    height: position === "C" ? "6'10\"" : position === "PF" ? "6'8\"" : position === "SF" ? "6'6\"" : position === "SG" ? "6'4\"" : "6'2\"",
    weight: position === "C" ? 235 + (playerIndex % 4) * 5 : 175 + ((teamIndex + playerIndex) % 9) * 7,
    classYear,
    archetype,
    personality: personalities[(teamIndex + playerIndex) % personalities.length],
    hiddenTraits: [hiddenTraits[(teamIndex + playerIndex * 2) % hiddenTraits.length]],
    ratings: makeRatings(seed, playerIndex, position, archetype, classYear, program),
  };
}

function makeCoach(teamIndex: number): Coach {
  const styles = ["Fast-Paced Innovator", "Analytics Coach", "Defensive Traditionalist", "Player Developer", "Motivator"];
  const names = ["Avery Holloway", "Marlon Price", "Samira Wells", "Drew Callahan", "Quincy Rhodes"];
  const base = 68 + ((teamIndex * 5) % 12);
  return {
    id: `coach-${teamIndex + 1}`,
    name: names[teamIndex % names.length],
    style: styles[teamIndex % styles.length],
    ratings: {
      offense: clamp(base + 3), defense: clamp(base + ((teamIndex + 2) % 8)), development: clamp(base + 5),
      adaptability: clamp(base + 1), rotation: clamp(base + 2), motivation: clamp(base + 4), discipline: clamp(base),
    },
  };
}

export const teams: Team[] = teamSeeds.map(([name, city, shortName, nickname, primary, secondary], teamIndex) => ({
  id: `team-${teamIndex + 1}`,
  name,
  nickname,
  shortName,
  city,
  conference: ["North", "North", "North", "North", "North", "South", "South", "South", "South", "South", "East", "East", "East", "East", "East", "West", "West", "West", "West", "West"][teamIndex],
  colors: [primary, secondary],
  logo: shortName.slice(0, 1),
  program: programBlueprints[teamIndex].profile,
  coach: makeCoach(teamIndex),
  roster: Array.from({ length: 13 }, (_, playerIndex) => makePlayer(teamIndex, playerIndex)),
}));

export const defaultStrategy = {
  pace: "balanced",
  offensiveStyle: "motion",
  shotEmphasis: "rim",
  defensiveScheme: "man",
  pressFrequency: 20,
  helpDefense: 50,
  reboundingAggressiveness: 55,
  rotationSize: 9,
  foulTroubleSubstitution: true,
  lateGameFouling: true,
} as const;

export function defaultLineup(team: Team): string[] {
  const priority = ["PG", "SG", "SF", "PF", "C"];
  const selected: string[] = [];
  for (const position of priority) {
    const player = team.roster.filter((candidate) => candidate.position === position && !selected.includes(candidate.id))
      .sort((a, b) => b.ratings.overall - a.ratings.overall)[0];
    if (player) selected.push(player.id);
  }
  return selected.length === 5 ? selected : team.roster.slice(0, 5).map((player) => player.id);
}
