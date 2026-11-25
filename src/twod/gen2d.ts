import { mulberry32 } from "../lib/util";
import { EXPRESSION_LIST, GESTURES, SANDBOX_ACTIONS, STANCES } from "../sandbox/actions";
import type { Appearance, Species } from "./types2d";

/* Generators for the 2D studio. Everything is deterministic: the same index always gives the same look. */

export const SKIN_TONES = ["#fde2c4", "#f5c49c", "#e0a77a", "#c98a5b", "#a86a43", "#7a4a2c", "#5b3720", "#ffd9b8"];
export const HAIR_COLORS = ["#1b1b1f", "#3b2a1a", "#7a4a20", "#d4a24c", "#f5e6b3", "#b33a3a", "#ff6fb5", "#4aa3ff", "#c0c0c0", "#2e8b57"];
export const CLOTH = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#111827", "#f8fafc", "#64748b"];
export const SHOE_COLORS = ["#111827", "#78350f", "#f8fafc", "#dc2626", "#2563eb"];
export const EYE_COLORS = ["#1f2937", "#2563eb", "#16a34a", "#92400e", "#7c3aed", "#0891b2"];
export const HAIR_STYLES = ["Bald", "Short", "Long", "Spiky", "Bun", "Afro", "Ponytail", "Curly", "Dreadlocks", "Bob cut", "Mohawk"];
export const HATS = ["None", "Cap", "Top hat", "Crown", "Beanie", "Cowboy", "Knight Helmet", "Wizard Hat"];

export const OUTFIT_OPTIONS = [
  { value: 0, label: "👕 Casual Separates (Shirt & Pants)" },
  { value: 1, label: "👗 Classic A-Line Dress" },
  { value: 2, label: "👑 Royal Gown / Evening Dress" },
  { value: 3, label: "🎀 Cute Frock & Pleated Skirt" },
  { value: 4, label: "👔 Suit & Tie (Formal / Tuxedo)" },
  { value: 5, label: "🧥 Cozy Hoodie / Streetwear" },
  { value: 6, label: "👘 Kimono / Robe with Obi Sash" },
  { value: 7, label: "🥻 Traditional Kurta / Tunic" },
  { value: 8, label: "🛡️ Superhero / Armor Suit" },
  { value: 9, label: "🥼 Doctor / Lab Coat" },
  { value: 10, label: "⚽ Sports Jersey / Athletic" },
];

export const BOTTOM_OPTIONS = [
  { value: 0, label: "👖 Standard Trousers" },
  { value: 1, label: "🩳 Shorts" },
  { value: 2, label: "👖 Belted Jeans" },
  { value: 3, label: "👗 Pleated Skirt" },
];

export const GLASSES_OPTIONS = [
  { value: 0, label: "None" },
  { value: 1, label: "👓 Round Spectacles" },
  { value: 2, label: "🕶️ Cool Sunglasses" },
  { value: 3, label: "👓 Square Frames" },
];

export const NECKWEAR_OPTIONS = [
  { value: 0, label: "None" },
  { value: 1, label: "👔 Necktie" },
  { value: 2, label: "🎀 Bow-tie" },
  { value: 3, label: "🧣 Cozy Scarf" },
  { value: 4, label: "📿 Necklace / Pendant" },
];
export const BUILDS = [
  { label: "Slim", v: 0.86 },
  { label: "Average", v: 1 },
  { label: "Stocky", v: 1.16 },
];

export const OBJECT_FAMILIES = [
  "Tree", "Pine tree", "Bush", "Flower", "Rock", "Cloud", "Sun", "Moon", "Star", "Heart",
  "House", "Car", "Bus", "Bench", "Table", "Chair", "Lamp", "Book", "Cup", "Ball",
  "Box", "Phone", "Cake", "Apple", "Balloon", "Umbrella", "Mushroom", "Fish", "Signpost", "Crown",
  "Mountain", "Castle", "Tent", "Sofa", "Bed", "TV", "Plant pot", "Gift", "Key", "Pizza",
  "Burger", "Ice cream", "Bike", "Boat", "Plane", "Rocket", "Train", "Traffic light", "Bin", "Fence",
  "Bridge", "Windmill", "Snowman", "Pumpkin", "Rainbow", "Lightning", "Snowflake", "Butterfly", "Bee", "Snail",
];
export const GROUND_FAMILIES = new Set([0, 1, 2, 3, 4, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 23, 26, 27, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58]);

export const OBJECT_PALETTES: [string, string, string][] = [
  ["#22c55e", "#7a4b22", "#fde047"],
  ["#ef4444", "#fca5a5", "#ffffff"],
  ["#3b82f6", "#1e3a8a", "#fde68a"],
  ["#f97316", "#7c2d12", "#fef3c7"],
  ["#a855f7", "#4c1d95", "#f0abfc"],
  ["#ec4899", "#831843", "#fbcfe8"],
  ["#eab308", "#713f12", "#fef08a"],
  ["#14b8a6", "#134e4a", "#99f6e4"],
  ["#64748b", "#334155", "#e2e8f0"],
  ["#f5f5f4", "#a8a29e", "#78716c"],
  ["#38bdf8", "#0c4a6e", "#e0f2fe"],
  ["#84cc16", "#365314", "#ecfccb"],
];
export const OBJECT_VARIANTS = [0.8, 1, 1.25];

export const SCENE_KINDS = ["Park", "Beach", "City", "Room", "Forest", "Space", "Snow", "Desert", "Sunset", "Night"];
/** [sky top, sky bottom, ground, accent] */
export const SCENE_PALETTES: [string, string, string, string][] = [
  ["#4f9cf0", "#c8e9ff", "#6abf4b", "#3f8f2f"],
  ["#29a8e0", "#bdeeff", "#f7e3a1", "#1e88e5"],
  ["#0f172a", "#312e81", "#1f2937", "#f472b6"],
  ["#fef3c7", "#fde68a", "#a16207", "#fb923c"],
  ["#2b5d48", "#a7d3b4", "#24492a", "#14532d"],
  ["#000005", "#1e1b4b", "#4b4b55", "#fcd34d"],
  ["#7aa6d6", "#eaf4ff", "#f5fbff", "#cfe6f5"],
  ["#2f6fb5", "#ffd9a0", "#e0b15c", "#c48a3a"],
  ["#7c3aed", "#fb923c", "#5a3a7a", "#ffb36b"],
  ["#1e1b4b", "#0b1026", "#111827", "#7dd3fc"],
];

/** Each built-in background has a default palette (its kind picks the deco, the palette picks the colors). */
export const DEFAULT_SCENE_PALETTE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export const SPEED_OPTIONS = [0.5, 1, 1.5, 2];
export const INTENSITY_OPTIONS = [0.5, 1, 1.5];
export const PHASE_OPTIONS = [0, 1, 2, 3];

export const ACTION_NAME: Record<string, string> = Object.fromEntries(SANDBOX_ACTIONS.map((a) => [a.id, a.name]));
export const STANCE_OPTIONS = [
  { value: "rest", label: "🌙 Rest (Off-stage)" },
  ...STANCES.map((s) => ({ value: s.id, label: s.name })),
];
export const GESTURE_OPTIONS = GESTURES.map((g) => ({ value: g.id, label: g.id === "none" ? "(no gesture)" : g.name }));
export const EXPRESSION_OPTIONS = EXPRESSION_LIST.map((e) => ({ value: e, label: e[0].toUpperCase() + e.slice(1) }));

export const ANIMAL_STANCE_OPTIONS: { value: string; label: string }[] = [
  { value: "rest", label: "🌙 Rest (Off-stage)" },
  { value: "idle", label: "Idle" },
  { value: "sit", label: "Sit" },
  { value: "sleep", label: "Sleep" },
  { value: "jump", label: "Jump" },
  { value: "wag", label: "Tail wag" },
  { value: "eat", label: "Eat" },
  { value: "play", label: "Play bow" },
  { value: "shake", label: "Shake off" },
  { value: "stretch", label: "Stretch" },
  { value: "dance", label: "Dance" },
  { value: "roll", label: "Roll over" },
  { value: "look", label: "Look around" },
];
export const ANIMAL_EXPRESSION_OPTIONS: { value: string; label: string }[] = [
  { value: "neutral", label: "Neutral" },
  { value: "happy", label: "Happy" },
  { value: "sad", label: "Sad" },
  { value: "surprised", label: "Surprised" },
  { value: "angry", label: "Angry" },
];

export const SPECIES_LIST: { id: Species; label: string; emoji: string }[] = [
  { id: "human", label: "Person", emoji: "🧑" },
  { id: "girl", label: "Girl", emoji: "👧" },
  { id: "cat", label: "Cat", emoji: "🐱" },
  { id: "dog", label: "Dog", emoji: "🐶" },
  { id: "bird", label: "Bird", emoji: "🐦" },
  { id: "rabbit", label: "Rabbit", emoji: "🐰" },
  { id: "fox", label: "Fox", emoji: "🦊" },
  { id: "bear", label: "Bear", emoji: "🐻" },
  { id: "pig", label: "Pig", emoji: "🐷" },
  { id: "panda", label: "Panda", emoji: "🐼" },
];
export const isAnimal = (sp: Species) => sp !== "human" && sp !== "girl";

export function appearanceFromIndex(i: number, species: Species = "human"): Appearance {
  const r = mulberry32(90210 + i * 7919);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(r() * arr.length)];
  const base = {
    skin: pick(SKIN_TONES),
    hair: pick(HAIR_COLORS),
    hairStyle: Math.floor(r() * HAIR_STYLES.length),
    beard: r() < 0.3,
    beardColor: pick(HAIR_COLORS),
    shirt: pick(CLOTH),
    pants: pick(CLOTH),
    shoes: pick(SHOE_COLORS),
    eyes: pick(EYE_COLORS),
    build: BUILDS[Math.floor(r() * BUILDS.length)].v,
    hat: r() < 0.35 ? 1 + Math.floor(r() * (HATS.length - 1)) : 0,
    hatColor: pick(CLOTH),
    dress: false,
    dressColor: pick(CLOTH),
    outfit: 0,
    accentColor: pick(CLOTH),
    bottomCut: 0,
    glasses: r() < 0.2 ? 1 + Math.floor(r() * (GLASSES_OPTIONS.length - 1)) : 0,
    glassesColor: pick(["#1f2937", "#0f172a", "#78350f", "#b45309", "#000000"]),
    neckwear: r() < 0.15 ? 1 + Math.floor(r() * (NECKWEAR_OPTIONS.length - 1)) : 0,
    neckwearColor: pick(CLOTH),
  };
  if (species === "girl") {
    return {
      ...base,
      skin: pick(SKIN_TONES),
      hair: r() < 0.5 ? pick(["#3b2a1a", "#1b1b1f", "#7a4a20", "#d4a24c", "#b33a3a", "#ff6fb5"]) : base.hair,
      hairStyle: r() < 0.6 ? 6 : 2,
      dress: true,
      dressColor: pick(["#ec4899", "#a855f7", "#f472b6", "#22c55e", "#3b82f6"]),
      outfit: pick([1, 2, 3]),
      beard: false,
    };
  }
  if (species === "cat") return { ...base, skin: pick(["#d97706", "#64748b", "#111827", "#f5f5f4"]), hair: "#fef3c7", eyes: "#16a34a", dress: false, hat: 0, beard: false, hairStyle: 0 };
  if (species === "dog") return { ...base, skin: pick(["#a16207", "#64748b", "#1e293b", "#f5f5f4"]), hair: "#fef3c7", eyes: "#1f2937", dress: false, hat: 0, beard: false, hairStyle: 0 };
  if (species === "bird") return { ...base, skin: pick(["#38bdf8", "#fbbf24", "#f472b6", "#22c55e"]), hair: "#ffffff", eyes: "#111827", dress: false, hat: 0, beard: false, hairStyle: 0 };
  if (species === "rabbit") return { ...base, skin: pick(["#f5f5f4", "#c0c0c0", "#e0c19a"]), hair: "#ffffff", eyes: "#7c3aed", dress: false, hat: 0, beard: false, hairStyle: 0 };
  if (species === "fox") return { ...base, skin: pick(["#f97316", "#c2410c", "#7c2d12"]), hair: "#fef3c7", eyes: "#1f2937", dress: false, hat: 0, beard: false, hairStyle: 0 };
  if (species === "bear") return { ...base, skin: pick(["#7c4a1e", "#a16207", "#57534e"]), hair: "#fef3c7", eyes: "#1f2937", dress: false, hat: 0, beard: false, hairStyle: 0 };
  if (species === "pig") return { ...base, skin: pick(["#f9a8d4", "#fbcfe8"]), hair: "#fce7f3", eyes: "#1f2937", dress: false, hat: 0, beard: false, hairStyle: 0 };
  if (species === "panda") return { ...base, skin: pick(["#ffffff"]), hair: "#111827", eyes: "#1f2937", dress: false, hat: 0, beard: false, hairStyle: 0 };
  return base;
}

export function appearanceCombos() {
  return SKIN_TONES.length * HAIR_COLORS.length * HAIR_STYLES.length * CLOTH.length * CLOTH.length * SHOE_COLORS.length * EYE_COLORS.length * BUILDS.length * HATS.length * CLOTH.length;
}

export function motionCombos() {
  const base = SANDBOX_ACTIONS.length;
  return {
    base,
    stances: STANCES.length,
    gestures: GESTURES.length,
    expressions: EXPRESSION_LIST.length,
    total: base * EXPRESSION_LIST.length * SPEED_OPTIONS.length * INTENSITY_OPTIONS.length * 2 * PHASE_OPTIONS.length,
  };
}

export function objectCombos() {
  return OBJECT_FAMILIES.length * OBJECT_PALETTES.length * OBJECT_VARIANTS.length * 2;
}

export function sceneCombos() {
  return SCENE_KINDS.length * SCENE_PALETTES.length;
}
