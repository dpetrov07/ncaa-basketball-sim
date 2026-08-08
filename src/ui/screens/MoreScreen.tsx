import { BarChart3, ChevronRight, History, LayoutGrid, LogOut } from "lucide-react";
import type { Team, UserCoach } from "../../domain/types";
import { CoachAvatar } from "../components/Avatar";
import { ScreenHeader } from "../components/ScreenHeader";

export function MoreScreen({ team, coach, onLineup, onHistory, onStats, onMainMenu }: { team: Team; coach: UserCoach; onLineup: () => void; onHistory: () => void; onStats: () => void; onMainMenu: () => void }) {
  return <div className="screen-stack more-screen"><ScreenHeader title="More" subtitle="Rotation, career records, and save options" /><section className="more-profile"><CoachAvatar coach={coach} team={team} size={54} /><div><b>{coach.firstName} {coach.lastName}</b><span>Head Coach · {team.shortName}</span></div></section><section className="more-list"><button onClick={onLineup}><LayoutGrid size={19} /><span><b>Lineup & Rotation</b><small>Set starters and rotation size</small></span><ChevronRight size={17} /></button><button onClick={onHistory}><History size={19} /><span><b>Game History</b><small>Review completed results</small></span><ChevronRight size={17} /></button><button onClick={onStats}><BarChart3 size={19} /><span><b>Season Statistics</b><small>Player averages and shooting</small></span><ChevronRight size={17} /></button><button onClick={onMainMenu}><LogOut size={19} /><span><b>Return to Main Menu</b><small>Your career is already saved</small></span><ChevronRight size={17} /></button></section></div>;
}
