# UI foundations

Courtside uses a compact white sports-editorial interface. Screens should prefer one continuous surface, thin dividers, short rows, and team-color accents over stacked cards or decorative hero areas. Mobile layouts are reviewed at 375px, 390px, and 430px widths.

## Portraits

Player and coach portraits use DiceBear 10 with the Lorelei style through `@dicebear/core` and `@dicebear/styles`. The engine renders SVG locally in the browser from a stable seed, so no remote image service or runtime network access is required. DiceBear's engine is MIT-licensed; Lorelei is CC0 1.0. Lorelei was selected over Avataaars, Adventurer, Dylan, Open Peeps, and Boring Avatars because its restrained linework reads most naturally as an editorial sports headshot at small sizes.

All generation remains centralized in `src/ui/components/Avatar.tsx`. A player ID always produces the same face. Skin tone, hair color, hairstyle, facial hair, and expression are deterministic, and coach appearance choices map to the same generator. Generated data URIs are cached in memory.

## Icons

Lucide React remains the sole interface icon library. It is ISC-licensed, tree-shakable, TypeScript-friendly, and already covers every navigation and status symbol used by the app. Icons use restrained strokes and are omitted when text communicates the state more clearly.

## Team marks

Fictional programs use CSS-rendered collegiate lettermarks from their existing logo character and team colors. This avoids real NCAA trademarks, a new logo dependency, and inconsistent mascot art. Lettermarks stay simple and scalable; team identity remains centralized in `TeamLogo` / `TeamMark`.
