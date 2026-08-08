import { ArrowLeft, ArrowRight, Shield, Sparkles, Star } from "lucide-react";
import { useState } from "react";
import type { Team, UserCoach } from "../../domain/types";
import { teamOverview } from "../../career/career";
import { CoachAvatar, PlayerAvatar } from "../components/Avatar";
import { ScreenHeader } from "../components/ScreenHeader";
import { TeamMark } from "../components/TeamMark";

export function ProgramSelectionScreen({ coach, teams, onBack, onAccept }: { coach: UserCoach; teams: Team[]; onBack: () => void; onAccept: (teamId: string) => void }) {
  const [selectedId, setSelectedId] = useState(teams[0].id);
  const selected = teams.find((team) => team.id === selectedId) ?? teams[0];
  const overview = teamOverview(selected);
  const bestPlayer = selected.roster.find((player) => player.id === overview.bestPlayerId)!;
  return <div className="screen-stack onboarding-screen"><ScreenHeader eyebrow="NEW CAREER · STEP 2 OF 3" title="Choose a program" subtitle={`${coach.firstName} ${coach.lastName}, select the one coaching job you will hold this season.`} onBack={onBack} /><div className="program-choice-layout"><section className="job-list">{teams.map((team) => { const summary = teamOverview(team); return <button className={team.id === selected.id ? "selected" : ""} onClick={() => setSelectedId(team.id)} key={team.id}><TeamMark team={team} size="md" /><span><b>{team.name}</b><small>{team.nickname} · {team.conference}</small></span><strong>{summary.overall}<small>OVR</small></strong></button>; })}</section><aside className="job-detail panel-lite"><div className="job-heading"><TeamMark team={selected} size="lg" /><div><span className="eyebrow">{selected.conference} CONFERENCE</span><h2>{selected.name}</h2><p>{overview.expectedStrength}</p></div></div><div className="job-metrics"><span><b>{overview.overall}</b>Roster overall</span><span><b>{"★".repeat(overview.prestige)}</b>Prestige</span></div><div className="identity-lines"><p><Sparkles size={14} /><span><b>Offense</b>{overview.offensiveIdentity}</span></p><p><Shield size={14} /><span><b>Defense</b>{overview.defensiveIdentity}</span></p><p><Star size={14} /><span><b>Strength</b>{overview.strength}</span></p><p><span className="weakness-mark">!</span><span><b>Concern</b>{overview.weakness}</span></p></div><div className="best-player"><PlayerAvatar player={bestPlayer} team={selected} size={45} /><span><small>BEST PLAYER</small><b>{bestPlayer.name}</b><em>{bestPlayer.position} · {bestPlayer.ratings.overall} OVR</em></span></div><div className="accept-coach"><CoachAvatar coach={coach} team={selected} size={42} /><span>{coach.firstName} {coach.lastName}<small>Candidate for head coach</small></span></div><button className="primary-action" onClick={() => onAccept(selected.id)}>Accept Job <ArrowRight size={17} /></button></aside></div><button className="back-link" onClick={onBack}><ArrowLeft size={14} /> Edit coach</button></div>;
}
