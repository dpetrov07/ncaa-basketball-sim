import type { PlayerProfile, Team } from "../../domain/types";

const skinTones = ["#7b432c", "#a86442", "#c9835e", "#e0a47a", "#f1c29d", "#6a3628"];
const hairColors = ["#171717", "#3b2418", "#754c32", "#b46b3d", "#d09a51", "#e6e6dd"];
const hairstyles = ["crop", "curl", "fade", "waves", "buzz", "swoop"] as const;
const facialHairs = ["none", "goatee", "beard", "mustache"] as const;
const expressions = ["calm", "smile", "focused"] as const;

function hash(value: string): number {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
}

function pick<T>(items: readonly T[], value: number, offset: number): T {
  return items[(value + offset * 17) % items.length];
}

export function avatarConfig(playerId: string) {
  const value = hash(playerId);
  return {
    skin: pick(skinTones, value, 1), hair: pick(hairColors, value, 2),
    hairstyle: pick(hairstyles, value, 3), facialHair: pick(facialHairs, value, 4),
    expression: pick(expressions, value, 5),
  };
}

export function PlayerAvatar({ player, team, size = 52 }: { player: PlayerProfile; team: Team; size?: number }) {
  const avatar = avatarConfig(player.id);
  const eyeY = avatar.expression === "focused" ? 47 : 45;
  return <svg className="player-avatar" style={{ width: size, height: size }} viewBox="0 0 100 100" role="img" aria-label={`${player.name} portrait`}>
    <rect width="100" height="100" rx="26" fill={team.colors[1]} />
    <circle cx="50" cy="47" r="35" fill={team.colors[0]} opacity=".18" />
    <path d="M17 100c3-20 16-29 33-29s30 9 33 29" fill={team.colors[0]} />
    <path d="M31 76h38v24H31z" fill={team.colors[1]} opacity=".7" />
    <path d="M22 94h56v6H22z" fill={team.colors[0]} opacity=".75" />
    <ellipse cx="50" cy="47" rx="25" ry="29" fill={avatar.skin} />
    {avatar.hairstyle === "crop" && <path d="M25 44c-2-17 7-31 26-32 18-1 28 12 25 31-5-8-13-10-23-10-11 0-19 4-28 11z" fill={avatar.hair} />}
    {avatar.hairstyle === "curl" && <><path d="M25 47c-4-21 8-36 26-36 17 0 28 14 24 36-7-4-9-15-24-16-13-1-18 10-26 16z" fill={avatar.hair} /><circle cx="29" cy="28" r="7" fill={avatar.hair} /><circle cx="72" cy="27" r="7" fill={avatar.hair} /></>}
    {avatar.hairstyle === "fade" && <path d="M26 41c-1-17 9-28 24-29 16-1 25 10 25 29l-8-9c-10 3-20 2-32 9z" fill={avatar.hair} />}
    {avatar.hairstyle === "waves" && <><path d="M25 43c1-20 12-30 26-30 16 0 25 12 24 30-5-10-12-14-23-14-11 0-18 5-27 14z" fill={avatar.hair} /><path d="M29 28c9-8 16-10 24-10 9 0 15 3 21 10" fill="none" stroke="#8b6a4b" strokeWidth="3" opacity=".55" /></>}
    {avatar.hairstyle === "buzz" && <path d="M27 38c0-18 9-27 23-27 15 0 23 10 23 27-12-4-33-4-46 0z" fill={avatar.hair} />}
    {avatar.hairstyle === "swoop" && <path d="M26 42c-2-17 8-30 26-30 13 0 23 8 24 22-9-8-18-11-29-7-8 3-13 10-21 15z" fill={avatar.hair} />}
    <ellipse cx="41" cy={eyeY} rx="3" ry="2" fill="#18202a" /><ellipse cx="59" cy={eyeY} rx="3" ry="2" fill="#18202a" />
    <path d={avatar.expression === "focused" ? "M36 39l9-2M55 37l9 2" : "M36 37l9 1M55 38l9-1"} stroke="#36251e" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d={avatar.expression === "smile" ? "M43 59c5 4 10 4 15 0" : "M44 59h12"} stroke="#6c3529" strokeWidth="2" strokeLinecap="round" fill="none" />
    {avatar.facialHair === "goatee" && <path d="M44 61c4 3 8 3 12 0v8c-4 3-8 3-12 0z" fill={avatar.hair} opacity=".85" />}
    {avatar.facialHair === "beard" && <path d="M30 55c3 20 12 25 20 25s17-5 20-25c-5 9-12 13-20 13s-15-4-20-13z" fill={avatar.hair} opacity=".78" />}
    {avatar.facialHair === "mustache" && <path d="M42 57c3-3 5-3 8 0 3-3 5-3 8 0-4 5-12 5-16 0z" fill={avatar.hair} opacity=".88" />}
  </svg>;
}
