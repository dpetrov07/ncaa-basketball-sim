import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function ScreenHeader({ eyebrow, title, subtitle, onBack, action }: { eyebrow?: string; title: string; subtitle?: string; onBack?: () => void; action?: ReactNode }) {
  return <header className="screen-header">{onBack && <button className="icon-button back-button" onClick={onBack} aria-label="Go back"><ArrowLeft size={19} /></button>}<div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action && <div className="screen-header-action">{action}</div>}</header>;
}
