import { ClipboardList, Home, LayoutGrid, Users } from "lucide-react";

export type MainView = "home" | "roster" | "lineup" | "gameplan";

export function BottomNav({ active, onNavigate }: { active: MainView; onNavigate: (view: MainView) => void }) {
  const items = [
    { id: "home" as const, label: "Home", Icon: Home },
    { id: "roster" as const, label: "Roster", Icon: Users },
    { id: "lineup" as const, label: "Lineup", Icon: LayoutGrid },
    { id: "gameplan" as const, label: "Plan", Icon: ClipboardList },
  ];
  return <nav className="bottom-nav" aria-label="Main navigation">{items.map(({ id, label, Icon }) => <button key={id} className={active === id ? "active" : ""} onClick={() => onNavigate(id)}><Icon size={18} strokeWidth={active === id ? 2.5 : 1.8} /><span>{label}</span></button>)}</nav>;
}
