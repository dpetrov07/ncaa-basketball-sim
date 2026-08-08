import type { Strategy, Team } from "../../domain/types";
import { ScreenHeader } from "../components/ScreenHeader";

const offenseFields: { key: keyof Strategy; label: string; options: string[] }[] = [
  { key: "pace", label: "Pace", options: ["very-slow", "slow", "balanced", "fast", "very-fast"] },
  { key: "offensiveStyle", label: "Offensive identity", options: ["balanced", "motion", "pick-and-roll", "isolation", "post-focused", "drive-and-kick", "three-point", "transition", "inside-out"] },
  { key: "shotEmphasis", label: "Shot profile", options: ["rim", "mid-range", "three", "post", "free-throws"] },
];

function title(value: string) { return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

export function GamePlanScreen({ team, strategy, onUpdate, onPregame }: { team: Team; strategy: Strategy; onUpdate: (key: keyof Strategy, value: string | number | boolean) => void; onPregame: () => void }) {
  return <div className="screen-stack"><ScreenHeader eyebrow={`${team.shortName} · ${team.coach.name}`} title="Game plan" subtitle="Set the identity your team will use on every possession" />
    <section className="plan-intro panel-lite"><div><span className="eyebrow">CURRENT IDENTITY</span><h2>{title(strategy.offensiveStyle)}</h2><p>{strategy.shotEmphasis === "three" ? "Stretch the floor and force long closeouts." : strategy.defensiveScheme === "zone" ? "Protect the paint and rebound out of the zone." : "Play with balance and make the defense react."}</p></div><span className="plan-mark">{strategy.pace === "very-fast" || strategy.pace === "fast" ? "FAST" : title(strategy.pace)}</span></section>
    <section className="plan-group"><div className="section-label"><span>OFFENSE</span><span>{title(strategy.offensiveStyle)}</span></div><div className="plan-form">{offenseFields.map(({ key, label, options }) => <label className="plan-field" key={key}><span>{label}</span><select value={String(strategy[key])} onChange={(event) => onUpdate(key, event.target.value)}>{options.map((option) => <option value={option} key={option}>{title(option)}</option>)}</select></label>)}</div></section>
    <section className="plan-group"><div className="section-label"><span>DEFENSE</span><span>{title(strategy.defensiveScheme)}</span></div><div className="plan-form"><label className="plan-field"><span>Defensive scheme</span><select value={strategy.defensiveScheme} onChange={(event) => onUpdate("defensiveScheme", event.target.value)}>{["man", "zone", "switching", "conservative", "aggressive-help", "full-court-press"].map((option) => <option value={option} key={option}>{title(option)}</option>)}</select></label><RangeField label="Press frequency" value={strategy.pressFrequency} suffix="%" onChange={(value) => onUpdate("pressFrequency", value)} /><RangeField label="Help defense" value={strategy.helpDefense} suffix="%" onChange={(value) => onUpdate("helpDefense", value)} /><RangeField label="Crash defensive glass" value={strategy.reboundingAggressiveness} suffix="%" onChange={(value) => onUpdate("reboundingAggressiveness", value)} /></div></section>
    <section className="plan-group"><div className="section-label"><span>ROTATION</span><span>{strategy.rotationSize} players</span></div><div className="plan-form"><RangeField label="Rotation size" value={strategy.rotationSize} min={7} max={11} suffix=" players" onChange={(value) => onUpdate("rotationSize", value)} /><label className="switch-field"><input type="checkbox" checked={strategy.foulTroubleSubstitution} onChange={(event) => onUpdate("foulTroubleSubstitution", event.target.checked)} /><span><b>Protect foul trouble</b><small>Use the bench when a player reaches four fouls.</small></span><i /></label><label className="switch-field"><input type="checkbox" checked={strategy.lateGameFouling} onChange={(event) => onUpdate("lateGameFouling", event.target.checked)} /><span><b>Late-game fouling</b><small>Extend close games from behind with intentional fouls.</small></span><i /></label></div></section>
    <button className="primary-action" onClick={onPregame}>Preview matchup <span>→</span></button>
  </div>;
}

function RangeField({ label, value, suffix, min = 0, max = 100, onChange }: { label: string; value: number; suffix: string; min?: number; max?: number; onChange: (value: number) => void }) {
  return <label className="range-field"><span>{label}<b>{value}{suffix}</b></span><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
