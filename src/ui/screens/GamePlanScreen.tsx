import type { Strategy, Team } from "../../domain/types";
import { ScreenHeader } from "../components/ScreenHeader";

const fields: { key: keyof Strategy; label: string; options: string[] }[] = [
  { key: "pace", label: "Pace", options: ["very-slow", "slow", "balanced", "fast", "very-fast"] },
  { key: "offensiveStyle", label: "Offensive identity", options: ["balanced", "motion", "pick-and-roll", "isolation", "post-focused", "drive-and-kick", "three-point", "transition", "inside-out"] },
  { key: "shotEmphasis", label: "Shot profile", options: ["rim", "mid-range", "three", "post", "free-throws"] },
  { key: "defensiveScheme", label: "Defensive scheme", options: ["man", "zone", "switching", "conservative", "aggressive-help", "full-court-press"] },
];

function title(value: string) { return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

export function GamePlanScreen({ team, strategy, onUpdate, onPregame }: { team: Team; strategy: Strategy; onUpdate: (key: keyof Strategy, value: string | number | boolean) => void; onPregame: () => void }) {
  return <div className="screen-stack"><ScreenHeader eyebrow={`${team.coach.style} · ${team.coach.name}`} title="Game plan" subtitle="Every choice creates a tradeoff in the possession engine" />
    <section className="plan-intro panel-lite"><div><span className="eyebrow">COACH'S EMPHASIS</span><h2>{title(strategy.offensiveStyle)}</h2><p>{strategy.shotEmphasis === "three" ? "Stretch the floor and force closeouts." : strategy.defensiveScheme === "zone" ? "Protect the paint, concede some clean threes." : "Balance pressure, spacing, and clean decisions."}</p></div><span className="plan-mark">{strategy.pace === "very-fast" || strategy.pace === "fast" ? "↑" : "→"}</span></section>
    <section className="plan-form">{fields.map(({ key, label, options }) => <label className="plan-field" key={key}><span>{label}</span><select value={String(strategy[key])} onChange={(event) => onUpdate(key, event.target.value)}>{options.map((option) => <option value={option} key={option}>{title(option)}</option>)}</select></label>)}
      <RangeField label="Press frequency" value={strategy.pressFrequency} suffix="%" onChange={(value) => onUpdate("pressFrequency", value)} /><RangeField label="Help defense" value={strategy.helpDefense} suffix="%" onChange={(value) => onUpdate("helpDefense", value)} /><RangeField label="Rebounding crash" value={strategy.reboundingAggressiveness} suffix="%" onChange={(value) => onUpdate("reboundingAggressiveness", value)} /><RangeField label="Rotation size" value={strategy.rotationSize} min={7} max={11} suffix=" players" onChange={(value) => onUpdate("rotationSize", value)} />
    </section>
    <label className="switch-field"><input type="checkbox" checked={strategy.foulTroubleSubstitution} onChange={(event) => onUpdate("foulTroubleSubstitution", event.target.checked)} /><span><b>Protect foul trouble</b><small>Pull a player at four fouls when the rotation allows it.</small></span><i /></label>
    <button className="primary-action" onClick={onPregame}>Preview matchup <span>→</span></button>
  </div>;
}

function RangeField({ label, value, suffix, min = 0, max = 100, onChange }: { label: string; value: number; suffix: string; min?: number; max?: number; onChange: (value: number) => void }) {
  return <label className="range-field"><span>{label}<b>{value}{suffix}</b></span><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
