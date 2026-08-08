import { CalendarDays, ClipboardList, Ellipsis, Home, Users } from "lucide-react";

export type MainView = "home" | "season" | "roster" | "lineup" | "gameplan" | "more";

export function BottomNav({ active, onNavigate }: { active: MainView; onNavigate: (view: MainView) => void }) {
  const items = [
    { id: "home" as const, label: "Home", Icon: Home },
    { id: "roster" as const, label: "Roster", Icon: Users },
    { id: "gameplan" as const, label: "Game Plan", Icon: ClipboardList },
    { id: "season" as const, label: "Season", Icon: CalendarDays },
    { id: "more" as const, label: "More", Icon: Ellipsis },
  ];
  return <nav className="bottom-nav" aria-label="Main navigation">{items.map(({ id, label, Icon }) => <button key={id} className={active === id ? "active" : ""} onClick={() => onNavigate(id)}><Icon size={18} strokeWidth={active === id ? 2.5 : 1.8} /><span>{label}</span></button>)}</nav>;
}
