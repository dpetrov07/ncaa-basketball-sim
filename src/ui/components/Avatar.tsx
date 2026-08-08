import type { PlayerProfile, Team, UserCoach } from "../../domain/types";

export const skinTones = ["#7b432c", "#a86442", "#c9835e", "#e0a47a", "#f1c29d", "#6a3628"];
export const hairColors = ["#171717", "#3b2418", "#754c32", "#b46b3d", "#d09a51", "#e6e6dd"];
export const hairstyles = ["crop", "curl", "fade", "waves", "buzz", "swoop"] as const;
export const facialHairs = ["none", "goatee", "beard", "mustache"] as const;
export const expressions = ["calm", "smile", "focused"] as const;

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
  return <PortraitAvatar avatar={avatar} colors={team.colors} size={size} name={player.name} />;
}

export function CoachAvatar({ coach, team, size = 72 }: { coach: UserCoach; team?: Team; size?: number }) {
  const avatar = {
    skin: skinTones[coach.appearance.skin % skinTones.length],
    hair: hairColors[coach.appearance.hairColor % hairColors.length],
    hairstyle: hairstyles[coach.appearance.hairstyle % hairstyles.length],
    facialHair: facialHairs[coach.appearance.facialHair % facialHairs.length],
    expression: expressions[coach.appearance.expression % expressions.length],
  };
  return <PortraitAvatar avatar={avatar} colors={team?.colors ?? ["#7ed5bd", "#243548"]} size={size} name={`${coach.firstName} ${coach.lastName}`} />;
}

function PortraitAvatar({ avatar, colors, size, name }: { avatar: ReturnType<typeof avatarConfig>; colors: [string, string]; size: number; name: string }) {
  const eyeY = avatar.expression === "focused" ? 47 : 45;
  return <svg className="player-avatar" style={{ width: size, height: size }} viewBox="0 0 100 100" role="img" aria-label={`${name} portrait`}>
    <rect width="100" height="100" rx="18" fill="#273744" />
    <rect width="100" height="100" rx="18" fill={colors[1]} opacity=".18" />
    <path d="M13 100c4-20 18-30 37-30s33 10 37 30" fill={colors[0]} opacity=".84" />
    <path d="M27 80c14 6 32 6 46 0v20H27z" fill="#1c2c38" opacity=".42" />
    <path d="M29 46c0-19 8-31 21-31 15 0 23 12 23 31 0 18-9 31-23 31-13 0-21-13-21-31z" fill={avatar.skin} />
    <path d="M31 52c-5-13-3-28 5-35 5-5 12-7 19-6 12 2 18 11 17 25-10-6-20-7-29-2-5 3-8 10-12 18z" fill="#4c3429" opacity=".12" />
    {avatar.hairstyle === "crop" && <path d="M28 43c-2-16 6-28 21-30 14-1 24 8 24 24-7-5-15-7-24-6-8 1-14 5-21 12z" fill={avatar.hair} />}
    {avatar.hairstyle === "curl" && <><path d="M27 44c-3-18 7-32 23-33 16 0 25 12 23 31-5-6-11-11-23-11-11 0-17 6-23 13z" fill={avatar.hair} /><circle cx="29" cy="29" r="5" fill={avatar.hair} /><circle cx="72" cy="29" r="5" fill={avatar.hair} /></>}
    {avatar.hairstyle === "fade" && <path d="M29 40c0-16 8-27 21-28 15-1 23 10 22 27-7-5-14-7-22-7-8 0-14 3-21 8z" fill={avatar.hair} />}
    {avatar.hairstyle === "waves" && <><path d="M28 43c1-18 10-30 24-30 15 0 23 11 22 29-7-8-14-11-23-11-10 0-16 5-23 12z" fill={avatar.hair} /><path d="M32 26c7-6 14-8 22-8 8 0 14 3 19 8" fill="none" stroke="#a6815b" strokeWidth="2" opacity=".45" /></>}
    {avatar.hairstyle === "buzz" && <path d="M30 38c1-15 8-24 20-25 13 0 21 9 21 24-11-4-29-4-41 1z" fill={avatar.hair} />}
    {avatar.hairstyle === "swoop" && <path d="M29 43c-1-17 8-29 23-30 13-1 22 8 23 20-9-6-17-8-25-5-8 2-14 8-21 15z" fill={avatar.hair} />}
    <ellipse cx="42" cy={eyeY} rx="2" ry="1.5" fill="#1b242b" /><ellipse cx="58" cy={eyeY} rx="2" ry="1.5" fill="#1b242b" />
    <path d={avatar.expression === "focused" ? "M36 39l9-2M55 37l9 2" : "M36 37l9 1M55 38l9-1"} stroke="#36251e" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M50 47l-2 8 4 1" stroke="#9a5d46" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity=".75" />
    <path d={avatar.expression === "smile" ? "M44 62c4 2 8 2 12 0" : "M46 61h8"} stroke="#6c3529" strokeWidth="1.7" strokeLinecap="round" fill="none" />
    {avatar.facialHair === "goatee" && <path d="M44 61c4 3 8 3 12 0v8c-4 3-8 3-12 0z" fill={avatar.hair} opacity=".85" />}
    {avatar.facialHair === "beard" && <path d="M30 55c3 20 12 25 20 25s17-5 20-25c-5 9-12 13-20 13s-15-4-20-13z" fill={avatar.hair} opacity=".78" />}
    {avatar.facialHair === "mustache" && <path d="M42 57c3-3 5-3 8 0 3-3 5-3 8 0-4 5-12 5-16 0z" fill={avatar.hair} opacity=".88" />}
  </svg>;
}
