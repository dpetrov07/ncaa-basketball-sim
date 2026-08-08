import { ArrowLeft, ArrowRight, Target } from "lucide-react";
import type { CareerSave, Team } from "../../domain/types";
import { getNextUserGame } from "../../season/season";
import { teamOverview } from "../../career/career";
import { CoachAvatar, PlayerAvatar } from "../components/Avatar";
import { ScreenHeader } from "../components/ScreenHeader";
import { TeamMark } from "../components/TeamMark";

export function SeasonIntroductionScreen({ career, team, onBack, onStart }: { career: CareerSave; team: Team; onBack: () => void; onStart: () => void }) {
  const season = career.season!;
  const overview = teamOverview(team);
  const keyPlayers = [...team.roster].sort((a, b) => b.ratings.overall - a.ratings.overall).slice(0, 3);
  const next = getNextUserGame(season)!;
  const opponentId = next.homeTeamId === team.id ? next.awayTeamId : next.homeTeamId;
  const opponent = season.teams.find((candidate) => candidate.id === opponentId)!;
  return <div className="screen-stack onboarding-screen"><ScreenHeader eyebrow="NEW CAREER · STEP 3 OF 3" title="Your first season" subtitle={`${career.coach.firstName} ${career.coach.lastName} takes over at ${team.name}.`} onBack={onBack} /><section className="season-intro-hero panel-lite" style={{ borderLeftColor: team.colors[0] }}><TeamMark team={team} size="lg" /><div><span className="eyebrow">{season.seasonYear} SEASON</span><h2>{team.name} {team.nickname}</h2><p>{overview.expectedStrength} · {overview.overall} overall · {"★".repeat(overview.prestige)} prestige</p></div><CoachAvatar coach={career.coach} team={team} size={76} /></section><section><div className="section-label"><span>KEY PLAYERS</span><span>{overview.strength}</span></div><div className="intro-players">{keyPlayers.map((player) => <div key={player.id}><PlayerAvatar player={player} team={team} size={42} /><span><b>{player.name}</b><small>{player.position} · {player.archetype}</small></span><strong>{player.ratings.overall}</strong></div>)}</div></section><section className="intro-brief"><div><span>TEAM STRENGTH</span><b>{overview.strength}</b></div><div><span>PRIMARY CONCERN</span><b>{overview.weakness}</b></div><div><span>FIRST OPPONENT</span><b>{next.homeTeamId === team.id ? "vs" : "at"} {opponent.shortName} · Day {next.day}</b></div></section><section className="objective-callout"><Target size={22} /><div><span className="eyebrow">SEASON OBJECTIVE</span><h3>{career.seasonObjective}</h3><p>Your season summary will be evaluated against this goal.</p></div></section><button className="primary-action" onClick={onStart}>Start Season <ArrowRight size={17} /></button><button className="back-link" onClick={onBack}><ArrowLeft size={14} /> Choose another program</button></div>;
}
