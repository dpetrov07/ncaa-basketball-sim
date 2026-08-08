import { useEffect, useState } from "react";
import type { PlayerProfile, Team, UserCoach } from "../../domain/types";

export const skinTones = ["614335", "7c4a35", "ae5d29", "d08b5b", "edb98a", "ffdbb4"];
export const hairColors = ["0e0e0e", "2c1b18", "4a312c", "724133", "a55728", "b58143"];
export const hairstyles = ["Close crop", "Short curls", "Taper", "Textured", "Short waves", "Natural"] as const;
export const facialHairs = ["Clean shaven", "Short beard", "Full beard"] as const;
export const expressions = ["Focused", "Calm", "Confident"] as const;

const portraitCache = new Map<string, string>();
let portraitEnginePromise: ReturnType<typeof loadPortraitEngine> | undefined;
const hairVariants = ["variant02", "variant05", "variant09", "variant12", "variant18", "variant25"] as const;
const mouthVariants = ["happy02", "happy08", "happy14"] as const;

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
    skin: pick(skinTones, value, 1),
    hair: pick(hairColors, value, 2),
    hairstyle: pick(hairVariants, value, 3),
    facialHair: value % 4 === 0 ? "variant01" : value % 7 === 0 ? "variant02" : "none",
    expression: pick(mouthVariants, value, 5),
  } as const;
}

async function loadPortraitEngine() {
  const [{ Avatar, Style }, { default: definition }] = await Promise.all([
    import("@dicebear/core"),
    import("@dicebear/styles/lorelei.json"),
  ]);
  return { Avatar, style: new Style(definition) };
}

function portraitKey(key: string, name: string, colors: [string, string], config: ReturnType<typeof avatarConfig>): string {
  return `${key}:${name}:${colors.join(":")}:${JSON.stringify(config)}`;
}

async function portraitUri(cacheKey: string, key: string, name: string, config: ReturnType<typeof avatarConfig>): Promise<string> {
  const cached = portraitCache.get(cacheKey);
  if (cached) return cached;
  portraitEnginePromise ??= loadPortraitEngine();
  const { Avatar, style } = await portraitEnginePromise;
  const avatar = new Avatar(style, {
    seed: key,
    size: 128,
    scale: 0.92,
    backgroundColor: ["f1f2f3"],
    skinColor: [config.skin],
    hairColor: [config.hair],
    hairVariant: config.hairstyle,
    beardProbability: config.facialHair === "none" ? 0 : 100,
    beardVariant: config.facialHair === "none" ? "variant01" : config.facialHair,
    earringsProbability: 0,
    frecklesProbability: 0,
    glassesProbability: 0,
    hairAccessoriesProbability: 0,
    mouthVariant: config.expression,
    title: `${name} portrait`,
  });
  const uri = avatar.toDataUri();
  portraitCache.set(cacheKey, uri);
  return uri;
}

export function PlayerAvatar({ player, team, size = 52 }: { player: PlayerProfile; team: Team; size?: number }) {
  return <PortraitImage avatarKey={player.id} name={player.name} colors={team.colors} config={avatarConfig(player.id)} size={size} />;
}

export const PlayerPortrait = PlayerAvatar;

export function CoachAvatar({ coach, team, size = 72 }: { coach: UserCoach; team?: Team; size?: number }) {
  const config = {
    skin: skinTones[coach.appearance.skin % skinTones.length],
    hair: hairColors[coach.appearance.hairColor % hairColors.length],
    hairstyle: hairVariants[coach.appearance.hairstyle % hairVariants.length],
    facialHair: coach.appearance.facialHair % facialHairs.length === 0 ? "none" : coach.appearance.facialHair % facialHairs.length === 1 ? "variant01" : "variant02",
    expression: mouthVariants[coach.appearance.expression % mouthVariants.length],
  } as ReturnType<typeof avatarConfig>;
  const colors = team?.colors ?? ["#243b64", "#dfe4eb"];
  return <PortraitImage avatarKey={`coach:${coach.id}`} name={`${coach.firstName} ${coach.lastName}`} colors={colors} config={config} size={size} />;
}

function PortraitImage({ avatarKey, name, colors, config, size }: { avatarKey: string; name: string; colors: [string, string]; config: ReturnType<typeof avatarConfig>; size: number }) {
  const cacheKey = portraitKey(avatarKey, name, colors, config);
  const [image, setImage] = useState<{ key: string; src: string } | null>(() => {
    const src = portraitCache.get(cacheKey);
    return src ? { key: cacheKey, src } : null;
  });
  const src = image?.key === cacheKey ? image.src : undefined;

  useEffect(() => {
    if (src) return;
    let active = true;
    void portraitUri(cacheKey, avatarKey, name, config).then((next) => { if (active) setImage({ key: cacheKey, src: next }); });
    return () => { active = false; };
  }, [avatarKey, cacheKey, config, name, src]);

  if (src) return <img className="player-avatar" src={src} width={size} height={size} alt={`${name} portrait`} />;
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("");
  return <span className="player-avatar avatar-placeholder" style={{ width: size, height: size, color: colors[0], backgroundColor: `${colors[1]}22` }} aria-label={`${name} portrait`}>{initials}</span>;
}
