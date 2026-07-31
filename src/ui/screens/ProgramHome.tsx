import { ArrowUpRight, ChevronRight, Trophy } from "lucide-react";
import type { GameResult, Team } from "../../domain/types";
import { TeamMark } from "../components/TeamMark";
import type { MainView } from "../components/BottomNav";

export function ProgramHome({ team, opponent, result, onNavigate, onPregame }: { team: Team; opponent: Team; result: GameResult | null; onNavigate: (view: MainView) => void; onPregame: () => void }) {
  const won = result?.winnerId === team.id;
  return <div className="screen-stack">
    <section className="program-hero" style={{ background: `linear-gradient(110deg, ${team.colors[1]} 0%, ${team.colors[1]} 45%, ${team.colors[0]} 160%)` }}>
      <div className="program-hero-top"><span className="eyebrow light">YOUR PROGRAM · 2026</span><span className="program-hero-mark">{team.logo}</span></div>
      <div className="program-hero-copy"><TeamMark team={team} size="lg" /><div><h1>{team.name}</h1><p>{team.nickname} · {team.city}</p></div></div>
      <div className="program-hero-bottom"><div><span>HEAD COACH</span><b>{team.coach.name}</b></div><div><span>COACHING IDENTITY</span><b>{team.coach.style}</b></div><div><span>PROGRAM RATING</span><b>{Math.round(team.roster.reduce((sum, player) => sum + player.ratings.overall, 0) / team.roster.length)}</b></div></div>
    </section>
    <section className="section-block"><div className="section-label"><span>UP NEXT</span><button onClick={onPregame}>Pregame hub <ArrowUpRight size={14} /></button></div>
      <button className="matchup-card" onClick={onPregame}><div><span className="eyebrow">EXHIBITION · HOME</span><h2>{opponent.name}</h2><p>{opponent.nickname} · {opponent.coach.style}</p></div><div className="matchup-logos"><TeamMark team={team} size="md" /><span>VS</span><TeamMark team={opponent} size="md" /><ChevronRight size={18} /></div></button>
    </section>
    {result && <section className="section-block"><div className="section-label"><span>LAST RESULT</span><button onClick={() => onNavigate("roster")}>Game book <ArrowUpRight size={14} /></button></div><div className={`result-strip ${won ? "win" : "loss"}`}><div><span className="eyebrow">FINAL</span><strong>{won ? "WIN" : "LOSS"}</strong><p>vs {result.away.team.id === team.id ? result.home.team.name : result.away.team.name}</p></div><b>{result.home.stats.points} <i>—</i> {result.away.stats.points}</b><Trophy size={19} /></div></section>}
    <section className="section-block"><div className="section-label"><span>STAFF NOTES</span></div><div className="staff-note"><div className="coach-initials">{team.coach.name.split(" ").map((part) => part[0]).join("")}</div><div><p>“Our identity starts with the five on the floor. Build a lineup that can defend and share the ball.”</p><span>{team.coach.name} · {team.coach.style}</span></div></div></section>
    <section className="quick-links"><button onClick={() => onNavigate("roster")}><span><span className="quick-icon">01</span><b>Manage roster</b></span><ChevronRight size={17} /></button><button onClick={() => onNavigate("lineup")}><span><span className="quick-icon">02</span><b>Set rotation</b></span><ChevronRight size={17} /></button><button onClick={() => onNavigate("gameplan")}><span><span className="quick-icon">03</span><b>Build game plan</b></span><ChevronRight size={17} /></button></section>
  </div>;
}
