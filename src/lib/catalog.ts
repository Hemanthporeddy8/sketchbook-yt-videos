import type { CharacterConfig, RigType } from "./types";
import { mulberry32 } from "./util";

export type CatalogCategory = "People" | "Memeoji" | "Animals" | "Creatures";

export interface CatalogEntry {
  id: string;
  name: string;
  category: CatalogCategory;
  emoji: string;
  tags: string[];
  config: CharacterConfig;
}

export function defaultConfig(rig: RigType = "human"): CharacterConfig {
  return {
    rig,
    species: "",
    skin: "#f1c27d",
    hair: "#3b2a1a",
    hairStyle: 1,
    top: "#3b82f6",
    bottom: "#1e293b",
    shoes: "#111827",
    hat: 0,
    hatColor: "#ef4444",
    accessory: 0,
    accessoryColor: "#facc15",
    wings: false,
    tail: false,
    horns: false,
    bodyColor: "#f59e0b",
    bellyColor: "#fde68a",
    earStyle: 0,
    tailStyle: 1,
    snout: 0.4,
    spots: false,
    blobEyes: 2,
    spikes: false,
    eyeColor: "#1f2937",
    height: 0.9,
    build: 1,
    headScale: 1,
  };
}

const SKIN = ["#f9d7b8", "#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#5c3a21", "#ffdbac"];
const HAIR = ["#1b1b1b", "#3b2a1a", "#7a4a20", "#d4a24c", "#f5e6b3", "#b33a3a", "#ff6fb5", "#4aa3ff", "#c0c0c0", "#2e8b57"];
const CLOTH = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#111827", "#f8fafc", "#64748b", "#84cc16", "#14b8a6", "#fb7185", "#0ea5e9"];
const SHOES = ["#111827", "#78350f", "#f8fafc", "#dc2626", "#2563eb", "#facc15"];
const ANIMAL = ["#f59e0b", "#d97706", "#a16207", "#78350f", "#f5f5f4", "#94a3b8", "#475569", "#1f2937", "#fb923c", "#fdba74", "#22c55e", "#8b5cf6", "#f472b6", "#38bdf8", "#e11d48"];
const BELLY = ["#fde68a", "#ffffff", "#fef3c7", "#e7e5e4", "#fecaca", "#bae6fd"];
const EYES = ["#1f2937", "#2563eb", "#16a34a", "#92400e", "#7c3aed", "#0891b2"];

const FIRST = ["Alex", "Sam", "Maya", "Leo", "Nina", "Omar", "Ivy", "Zara", "Kai", "Luna", "Ravi", "Mia", "Eli", "Aria", "Jin", "Noor", "Theo", "Yara", "Finn", "Lila", "Diego", "Amara", "Hugo", "Sofia", "Ken", "Priya", "Milo", "Hana", "Ezra", "Tara"];
const ROLES = ["Explorer", "Chef", "Gamer", "Coder", "Pilot", "Artist", "Ninja", "Doctor", "Singer", "Farmer", "Wizard", "Surfer", "Coach", "Scientist", "Vlogger", "Detective", "Dancer", "Runner", "Teacher", "Mechanic", "Astronaut", "Baker", "Hiker", "Boxer", "Painter", "Pirate", "Viking", "Samurai", "Cowboy", "Ranger"];
const MEME_ADJ = ["Sad", "Hyped", "Confused", "Smug", "Cringe", "Wholesome", "Lazy", "Chaotic", "Shook", "Sleepy", "Dramatic", "Goofy", "Angry", "Blessed", "Unbothered", "Crying", "Nervous", "Epic", "Happy", "Vibing"];
const MEME_NOUN = ["Potato", "Toast", "Noodle", "Burrito", "Waffle", "Goblin", "Pickle", "Nugget", "Pigeon", "Dumpling", "Muffin", "Llama", "Gremlin", "Sloth", "Taco", "Penguin", "Donut", "Cactus", "Ghost", "Bean"];
const ANIMAL_NAMES = ["Biscuit", "Mochi", "Pepper", "Nugget", "Waffles", "Luna", "Sir Fluff", "Noodle", "Clover", "Olive", "Ziggy", "Bean", "Maple", "Pickles", "Sunny", "Tofu", "Boba", "Miso"];
const SLIME_NAMES = ["Blorp", "Gloop", "Jello", "Splat", "Bubbles", "Goo", "Plasma", "Mint", "Lava", "Sour Apple"];
const DRAGON_NAMES = ["Ember", "Frost", "Storm", "Sparky", "Vortex", "Scale", "Thunder", "Nova"];
const FANTASY = ["Orc", "Elf", "Robo", "Wizard", "Goblin", "Alien", "Mech", "Ninja", "Vampire", "Pirate"];

const SPECIES = [
  { id: "Cat", ear: 0, tail: 1, snout: 0.25, spots: false, emoji: "🐱" },
  { id: "Dog", ear: 2, tail: 2, snout: 0.45, spots: false, emoji: "🐶" },
  { id: "Bear", ear: 1, tail: 3, snout: 0.4, spots: false, emoji: "🐻" },
  { id: "Fox", ear: 0, tail: 4, snout: 0.6, spots: false, emoji: "🦊" },
  { id: "Bunny", ear: 3, tail: 3, snout: 0.15, spots: false, emoji: "🐰" },
  { id: "Pig", ear: 1, tail: 5, snout: 0.35, spots: false, emoji: "🐷" },
  { id: "Wolf", ear: 0, tail: 4, snout: 0.7, spots: false, emoji: "🐺" },
  { id: "Tiger", ear: 0, tail: 1, snout: 0.4, spots: true, emoji: "🐯" },
];

function buildCatalog(): CatalogEntry[] {
  const r = mulberry32(20250611);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(r() * arr.length)];
  const range = (a: number, b: number) => a + r() * (b - a);
  const chance = (p: number) => r() < p;
  const out: CatalogEntry[] = [];

  // 180 people (human rig)
  for (let i = 0; i < 180; i++) {
    const c = defaultConfig("human");
    c.skin = pick(SKIN);
    c.hair = pick(HAIR);
    c.hairStyle = Math.floor(r() * 6);
    c.top = pick(CLOTH);
    c.bottom = pick(CLOTH);
    c.shoes = pick(SHOES);
    c.hat = chance(0.35) ? pick([1, 2, 3, 4, 5, 6]) : 0;
    c.hatColor = pick(CLOTH);
    c.accessory = chance(0.35) ? 1 + Math.floor(r() * 6) : 0;
    c.accessoryColor = pick(CLOTH);
    c.height = range(0.8, 0.95);
    c.build = range(0.85, 1.2);
    c.headScale = range(0.95, 1.08);
    c.eyeColor = pick(EYES);
    out.push({
      id: `p${i}`,
      name: `${pick(FIRST)} the ${pick(ROLES)}`,
      category: "People",
      emoji: pick(["🧑", "👩", "👨", "🧔", "👱", "🧑‍🎤", "🧑‍🍳", "🧑‍🚀"]),
      tags: ["human", "people"],
      config: c,
    });
  }

  // 100 memeoji (oversized heads, exaggerated proportions)
  for (let i = 0; i < 100; i++) {
    const c = defaultConfig("human");
    c.skin = pick(SKIN.concat(["#ffd54a", "#a8e6a1", "#9fc5ff"]));
    c.hair = pick(HAIR);
    c.hairStyle = Math.floor(r() * 6);
    c.top = pick(CLOTH);
    c.bottom = pick(CLOTH);
    c.shoes = pick(SHOES);
    c.hat = chance(0.4) ? pick([1, 2, 4, 5, 6, 7, 9]) : 0;
    c.hatColor = pick(CLOTH);
    c.accessory = chance(0.4) ? 1 + Math.floor(r() * 6) : 0;
    c.accessoryColor = pick(CLOTH);
    c.height = range(0.7, 0.85);
    c.build = range(0.8, 1.0);
    c.headScale = range(1.7, 2.3);
    c.eyeColor = pick(EYES);
    out.push({
      id: `m${i}`,
      name: `${pick(MEME_ADJ)} ${pick(MEME_NOUN)}`,
      category: "Memeoji",
      emoji: pick(["😂", "🤪", "😭", "🥹", "😎", "🤡", "🫠", "😤", "🥶", "🤯"]),
      tags: ["memeoji", "big head", "reaction"],
      config: c,
    });
  }

  // 160 animals (quadruped rig, 8 species x colour/size variants)
  for (let i = 0; i < 160; i++) {
    const sp = SPECIES[i % SPECIES.length];
    const c = defaultConfig("quadruped");
    c.species = sp.id;
    c.earStyle = sp.ear;
    c.tailStyle = sp.tail;
    c.snout = sp.snout * range(0.85, 1.15);
    c.spots = sp.spots || chance(0.1);
    c.bodyColor = pick(ANIMAL);
    c.bellyColor = pick(BELLY);
    c.eyeColor = pick(EYES);
    c.height = range(0.85, 1.1);
    c.build = range(0.85, 1.25);
    out.push({
      id: `a${i}`,
      name: `${pick(ANIMAL_NAMES)} the ${sp.id}`,
      category: "Animals",
      emoji: sp.emoji,
      tags: ["animal", sp.id.toLowerCase()],
      config: c,
    });
  }

  // 60 creatures: 25 slimes (blob), 15 dragons (quadruped), 20 fantasy humanoids
  for (let i = 0; i < 25; i++) {
    const c = defaultConfig("blob");
    c.bodyColor = pick(CLOTH);
    c.blobEyes = 1 + Math.floor(r() * 3);
    c.spikes = chance(0.3);
    c.eyeColor = "#111827";
    c.height = range(0.7, 1.0);
    c.build = range(0.9, 1.3);
    out.push({
      id: `s${i}`,
      name: `${pick(SLIME_NAMES)} Slime ${i + 1}`,
      category: "Creatures",
      emoji: "🟢",
      tags: ["creature", "slime", "blob"],
      config: c,
    });
  }
  for (let i = 0; i < 15; i++) {
    const c = defaultConfig("quadruped");
    c.species = "Dragon";
    c.earStyle = 0;
    c.tailStyle = 1;
    c.wings = true;
    c.horns = true;
    c.bodyColor = pick(["#22c55e", "#dc2626", "#2563eb", "#7c3aed", "#f59e0b", "#14b8a6"]);
    c.bellyColor = "#fef3c7";
    c.snout = 0.5;
    c.height = range(1.0, 1.3);
    c.build = range(1.0, 1.4);
    out.push({
      id: `d${i}`,
      name: `${pick(DRAGON_NAMES)} the Dragon`,
      category: "Creatures",
      emoji: "🐉",
      tags: ["creature", "dragon", "fantasy"],
      config: c,
    });
  }
  for (let i = 0; i < 20; i++) {
    const c = defaultConfig("human");
    c.skin = pick(["#9bd17a", "#7dd3fc", "#c4b5fd", "#a8d8a8", "#8a6e5a", "#f0abfc"]);
    c.hair = pick(HAIR);
    c.hairStyle = Math.floor(r() * 6);
    c.top = pick(CLOTH);
    c.bottom = pick(CLOTH);
    c.shoes = pick(SHOES);
    c.hat = pick([0, 7, 8, 5, 3]);
    c.hatColor = pick(CLOTH);
    c.accessory = pick([0, 3, 4, 5]);
    c.accessoryColor = pick(CLOTH);
    c.horns = chance(0.6);
    c.wings = chance(0.3);
    c.tail = chance(0.3);
    c.height = range(0.85, 1.0);
    c.build = range(0.9, 1.2);
    c.headScale = range(1.0, 1.15);
    c.eyeColor = pick(EYES);
    out.push({
      id: `f${i}`,
      name: `${pick(FANTASY)} ${pick(FIRST)}`,
      category: "Creatures",
      emoji: pick(["🧙", "👽", "🤖", "🧝", "👹", "🧛"]),
      tags: ["creature", "fantasy", "humanoid"],
      config: c,
    });
  }
  return out;
}

export const CATALOG: CatalogEntry[] = buildCatalog();

export const CATALOG_CATEGORIES: CatalogCategory[] = ["People", "Memeoji", "Animals", "Creatures"];

export function catalogById(id: string) {
  return CATALOG.find((c) => c.id === id);
}
