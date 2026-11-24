import { ASSET_MAP, shapeOf, type VehicleKind } from "./assets";
import type { SObject } from "./sandboxStore";

/*
 * Sandbox physics: walkers (player and NPCs), vehicles, carried/thrown items and object mechanics.
 */

export const GRAVITY = -22;

/** Shared locomotion speeds: the player and every NPC use exactly these values. */
export const WALK_SPEED = 3.6;
export const RUN_SPEED = 7.2;
/** Metres travelled per gait cycle, so the legs step at the same rate the body moves (no foot sliding). */
export const WALK_CYCLE = 1.8;
export const RUN_CYCLE = 4.5;
const STEP = 0.6;
const WALK_R = 0.35;
const WALK_H = 1.8;

export const keys = new Set<string>();
const down = (k: string) => keys.has(k);

export interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch?: number;
  roll?: number;
}

export interface Live extends Pose {
  id: string;
  kind: VehicleKind;
  v: number;
  vy: number;
  pitch: number;
  roll: number;
}

export interface Walker {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  vy: number;
  grounded: boolean;
  speed: number;
  inVehicle: string | null;
  held: string | null;
}

/** A free object that is being carried (holder set) or is falling / thrown (holder null). */
export interface Loose {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  vx: number;
  vy: number;
  vz: number;
  holder: string | null;
}

export interface Landed {
  id: string;
  pose: Pose;
}

export interface Ctx {
  objs: SObject[];
  blocks: Record<string, string>;
  t: number;
}

export const sim = {
  t: 0,
  walkers: new Map<string, Walker>(),
  live: new Map<string, Live>(),
  loose: new Map<string, Loose>(),
  gait: new Map<string, { g: number; t: number }>(),
};

const GRAB_IDS = new Set([
  "prop-crate", "prop-boxes", "prop-barrel", "prop-ball", "prop-chair", "road-cone", "bin", "mush-0", "mush-1",
  "shape-cube", "shape-sphere", "shape-cylinder", "shape-cone", "shape-pyramid", "shape-capsule", "shape-torus",
]);
export const canGrab = (assetId: string) => GRAB_IDS.has(assetId);

const wrap = (a: number) => {
  let x = a;
  while (x > Math.PI) x -= 2 * Math.PI;
  while (x < -Math.PI) x += 2 * Math.PI;
  return x;
};

interface VSpec {
  maxSpeed: number;
  accel: number;
  brake: number;
  turn: number;
  drag: number;
  radius: number;
  height: number;
  fly: boolean;
  climb: number;
  stall: number;
  hover: number;
}

export const VEH: Record<VehicleKind, VSpec> = {
  car: { maxSpeed: 18, accel: 12, brake: 18, turn: 2.0, drag: 1.2, radius: 1.1, height: 1.5, fly: false, climb: 0, stall: 0, hover: 0 },
  truck: { maxSpeed: 12, accel: 7, brake: 12, turn: 1.3, drag: 1.0, radius: 1.3, height: 2.4, fly: false, climb: 0, stall: 0, hover: 0 },
  bike: { maxSpeed: 20, accel: 14, brake: 18, turn: 2.6, drag: 1.0, radius: 0.6, height: 1.4, fly: false, climb: 0, stall: 0, hover: 0 },
  tank: { maxSpeed: 8, accel: 6, brake: 8, turn: 1.4, drag: 1.5, radius: 1.5, height: 1.6, fly: false, climb: 0, stall: 0, hover: 0 },
  tractor: { maxSpeed: 8, accel: 5, brake: 8, turn: 1.6, drag: 1.5, radius: 1.2, height: 1.8, fly: false, climb: 0, stall: 0, hover: 0 },
  hover: { maxSpeed: 26, accel: 10, brake: 12, turn: 2.2, drag: 0.6, radius: 1.5, height: 1.2, fly: false, climb: 0, stall: 0, hover: 0.9 },
  heli: { maxSpeed: 16, accel: 9, brake: 10, turn: 1.8, drag: 1.4, radius: 1.5, height: 2.8, fly: true, climb: 7, stall: 0, hover: 0 },
  plane: { maxSpeed: 40, accel: 14, brake: 10, turn: 1.1, drag: 0.3, radius: 2, height: 2.2, fly: true, climb: 6, stall: 14, hover: 0 },
};

export function ensureWalker(id: string, x: number, z: number, yaw: number): Walker {
  let w = sim.walkers.get(id);
  if (!w) {
    w = { id, x, y: 0, z, yaw, vy: 0, grounded: true, speed: 0, inVehicle: null, held: null };
    sim.walkers.set(id, w);
  }
  return w;
}

/** Object pose including its built-in mechanic (spin, sway, bounce, moving platform). */
export function objectPose(o: SObject, t: number): Pose {
  let x = o.position[0];
  let y = o.position[1];
  let z = o.position[2];
  let yaw = o.rotationY;
  const m = o.mech;
  if (m && m.type !== "none") {
    const s = m.speed;
    const a = m.amount;
    switch (m.type) {
      case "spin":
        yaw += ((a * Math.PI) / 180) * s * t;
        break;
      case "oscillate": {
        const off = Math.sin(t * s * Math.PI) * a;
        if (m.axis === "x") x += off;
        else if (m.axis === "z") z += off;
        else y += off;
        break;
      }
      case "bounce":
        y += Math.abs(Math.sin(t * s * Math.PI)) * a;
        break;
      case "forward": {
        const d = (t * s) % Math.max(0.1, a);
        x += Math.sin(yaw) * d;
        z += Math.cos(yaw) * d;
        break;
      }
    }
  }
  return { x, y, z, yaw };
}

/** Current pose of an object: carried/falling item, driven vehicle, or its stored / mechanic pose. */
export function poseOf(o: SObject, t: number): Pose {
  const lo = sim.loose.get(o.id);
  if (lo) return { x: lo.x, y: lo.y, z: lo.z, yaw: lo.yaw };
  const L = sim.live.get(o.id);
  if (L) return L;
  return objectPose(o, t);
}

function skipObj(id: string, ignore: string | null) {
  return id === ignore || sim.loose.has(id);
}

/** Highest standable surface under (x,z) that is no higher than prevY + step. */
export function surfaceAt(x: number, z: number, prevY: number, ctx: Ctx, ignore: string | null) {
  const bound = prevY + STEP;
  let best = { y: 0, id: null as string | null, pad: false };
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  for (let yy = Math.floor(bound - 1); yy >= 0; yy--) {
    if (ctx.blocks[`${cx},${yy},${cz}`]) {
      const top = yy + 1;
      if (top > best.y) best = { y: top, id: null, pad: false };
      break;
    }
  }
  for (const o of ctx.objs) {
    if (skipObj(o.id, ignore)) continue;
    const s = shapeOf(o.assetId);
    if (!s || !s.stand) continue;
    const p = poseOf(o, ctx.t);
    const c = Math.cos(p.yaw);
    const sn = Math.sin(p.yaw);
    const dx = x - p.x;
    const dz = z - p.z;
    const rx = dx * c - dz * sn - s.cx;
    const rz = dx * sn + dz * c - s.cz;
    if (Math.abs(rx) > s.hx || Math.abs(rz) > s.hz) continue;
    const top = s.ramp ? p.y + ((rz + s.hz) / (2 * s.hz)) * s.maxY : p.y + s.maxY;
    if (top <= bound && top > best.y) best = { y: top, id: o.id, pad: s.pad };
  }
  return best;
}

/** True if a vertical cylinder (radius r, height h) at (x,y,z) overlaps any solid. */
export function blocked(x: number, y: number, z: number, r: number, h: number, ctx: Ctx, ignore: string | null): boolean {
  const x0 = Math.floor(x - r);
  const x1 = Math.floor(x + r);
  const z0 = Math.floor(z - r);
  const z1 = Math.floor(z + r);
  const y0 = Math.floor(y + 0.2);
  const y1 = Math.floor(y + h - 0.1);
  for (let cx = x0; cx <= x1; cx++)
    for (let cz = z0; cz <= z1; cz++)
      for (let cy = y0; cy <= y1; cy++) {
        if (!ctx.blocks[`${cx},${cy},${cz}`]) continue;
        const nx = Math.min(Math.max(x, cx), cx + 1) - x;
        const nz = Math.min(Math.max(z, cz), cz + 1) - z;
        if (nx * nx + nz * nz < r * r) return true;
      }
  for (const o of ctx.objs) {
    if (skipObj(o.id, ignore)) continue;
    const s = shapeOf(o.assetId);
    if (!s || !s.solid) continue;
    const p = poseOf(o, ctx.t);
    if (p.y + s.maxY < y + 0.2 || p.y + s.minY > y + h) continue;
    const c = Math.cos(p.yaw);
    const sn = Math.sin(p.yaw);
    const dx = x - p.x;
    const dz = z - p.z;
    const rx = dx * c - dz * sn - s.cx;
    const rz = dx * sn + dz * c - s.cz;
    if (Math.abs(rx) < s.hx + r && Math.abs(rz) < s.hz + r) return true;
  }
  return false;
}

/**
 * Moves a walker toward a world-space direction (dx, dz) at `speed` m/s and turns it to face that way.
 * Pass speed 0 with a zero direction to stand still (gravity still applies).
 */
export function stepWalker(w: Walker, dt: number, ctx: Ctx, dx: number, dz: number, speed: number, jump: boolean, noTurn = false) {
  const mag = Math.hypot(dx, dz);
  const moving = mag > 0.01 && speed > 0;
  if (moving && !noTurn) {
    const ty = Math.atan2(dx, dz);
    w.yaw = wrap(w.yaw + wrap(ty - w.yaw) * Math.min(1, dt * 10));
  }
  const d = moving ? speed * dt : 0;
  const nx = w.x + (moving ? (dx / mag) * d : 0);
  const nz = w.z + (moving ? (dz / mag) * d : 0);
  let x = w.x;
  let z = w.z;
  if (d > 0) {
    if (!blocked(nx, w.y, nz, WALK_R, WALK_H, ctx, null)) {
      x = nx;
      z = nz;
    } else if (!blocked(nx, w.y, z, WALK_R, WALK_H, ctx, null)) {
      x = nx;
    } else if (!blocked(x, w.y, nz, WALK_R, WALK_H, ctx, null)) {
      z = nz;
    }
  }
  if (jump && w.grounded) {
    w.vy = 8.5;
    w.grounded = false;
  }
  w.vy = Math.max(-40, w.vy + GRAVITY * dt);
  let y = w.y + w.vy * dt;
  const s = surfaceAt(x, z, w.y, ctx, null);
  if (y <= s.y) {
    y = s.y;
    if (s.pad) {
      w.vy = 15;
      w.grounded = false;
    } else {
      w.vy = 0;
      w.grounded = true;
    }
  } else {
    w.grounded = false;
  }
  w.speed = Math.hypot(x - w.x, z - w.z) / Math.max(dt, 1e-3);
  w.x = x;
  w.z = z;
  w.y = y;
}

function stepVehicle(dt: number, ctx: Ctx, L: Live) {
  const sp = VEH[L.kind];
  const fwd = down("w");
  const back = down("s");
  const steer = (down("a") ? 1 : 0) - (down("d") ? 1 : 0);
  const brakeKey = down("space");
  const upKey = down("space");
  const downKey = down("control") || down("c");

  if (!sp.fly) {
    if (fwd) L.v = Math.min(sp.maxSpeed, L.v + sp.accel * dt);
    else if (back) L.v = L.v > 0.5 ? L.v - sp.brake * dt : Math.max(-sp.maxSpeed * 0.4, L.v - sp.accel * dt);
    else L.v *= Math.max(0, 1 - sp.drag * dt);
    if (brakeKey) L.v *= Math.max(0, 1 - 5 * dt);
    const tr = sp.turn * Math.min(1, Math.abs(L.v) / 4) * (L.v < 0 ? -1 : 1);
    L.yaw += steer * tr * dt;
    const nx = L.x + Math.sin(L.yaw) * L.v * dt;
    const nz = L.z + Math.cos(L.yaw) * L.v * dt;
    if (blocked(nx, L.y + 0.1, nz, sp.radius, sp.height, ctx, L.id)) L.v *= -0.2;
    else {
      L.x = nx;
      L.z = nz;
    }
    const s = surfaceAt(L.x, L.z, L.y, ctx, L.id);
    const target = s.y + sp.hover;
    L.vy += GRAVITY * dt;
    L.y += L.vy * dt;
    if (L.y <= target) {
      L.y = target;
      L.vy = s.pad ? 14 : 0;
    }
    L.roll = -steer * Math.min(1, Math.abs(L.v) / 12) * (L.kind === "bike" ? 0.35 : 0.1);
    L.pitch = 0;
    return;
  }

  if (fwd) L.v = Math.min(sp.maxSpeed, L.v + sp.accel * dt);
  else if (back) L.v = Math.max(L.kind === "plane" ? 0 : -sp.maxSpeed * 0.3, L.v - sp.brake * dt);
  else L.v *= Math.max(0, 1 - sp.drag * dt);
  L.yaw += steer * sp.turn * Math.min(1, Math.abs(L.v) / 8 + 0.35) * dt;
  const nx = L.x + Math.sin(L.yaw) * L.v * dt;
  const nz = L.z + Math.cos(L.yaw) * L.v * dt;
  if (!blocked(nx, L.y, nz, sp.radius, sp.height, ctx, L.id)) {
    L.x = nx;
    L.z = nz;
  }
  let desired: number;
  if (L.kind === "heli") {
    desired = upKey ? sp.climb : downKey ? -sp.climb : 0;
  } else {
    const lift = L.v > sp.stall ? (L.v - sp.stall) * 0.35 : -4;
    desired = lift + (upKey ? sp.climb : 0) - (downKey ? sp.climb : 0);
  }
  L.vy += (desired - L.vy) * Math.min(1, dt * 2.5);
  L.y += L.vy * dt;
  const s = surfaceAt(L.x, L.z, L.y, ctx, L.id);
  if (L.y < s.y) {
    L.y = s.y;
    L.vy = Math.max(0, L.vy);
  }
  if (L.kind === "heli") {
    L.pitch = fwd ? 0.25 : back ? -0.25 : 0;
    L.roll = -steer * 0.25;
  } else {
    L.pitch = -Math.max(-0.35, Math.min(0.35, L.vy * 0.06));
    L.roll = -steer * 0.5 * Math.min(1, L.v / 20);
  }
}

/** Steps the player's walker (or the vehicle they drive). `dir` is the camera-relative move direction. */
export function updateSim(
  dt: number,
  objs: SObject[],
  blocks: Record<string, string>,
  playerId: string | null,
  dir: { dx: number; dz: number; run: boolean; jump: boolean; noTurn?: boolean },
) {
  if (!playerId) return;
  const w = sim.walkers.get(playerId);
  if (!w) return;
  const ctx: Ctx = { objs, blocks, t: sim.t };
  if (w.inVehicle) {
    const L = sim.live.get(w.inVehicle);
    if (!L) {
      w.inVehicle = null;
      return;
    }
    stepVehicle(dt, ctx, L);
    w.x = L.x;
    w.y = L.y;
    w.z = L.z;
    w.yaw = L.yaw;
    return;
  }
  stepWalker(w, dt, ctx, dir.dx, dir.dz, dir.run ? RUN_SPEED : WALK_SPEED, dir.jump, !!dir.noTurn);
}

/** Carried items follow their holder; released items fall, land and are returned for saving. */
export function stepLoose(dt: number, ctx: Ctx): Landed[] {
  const out: Landed[] = [];
  for (const L of sim.loose.values()) {
    if (L.holder) {
      const h = sim.walkers.get(L.holder);
      if (h) {
        L.x = h.x + Math.sin(h.yaw) * 0.6;
        L.z = h.z + Math.cos(h.yaw) * 0.6;
        L.y = h.y + 1.0;
        L.yaw = h.yaw;
      }
      continue;
    }
    L.vy += GRAVITY * dt;
    L.x += L.vx * dt;
    L.z += L.vz * dt;
    L.y += L.vy * dt;
    const drag = Math.max(0, 1 - 1.5 * dt);
    L.vx *= drag;
    L.vz *= drag;
    const s = surfaceAt(L.x, L.z, L.y, ctx, L.id);
    if (L.y <= s.y || L.y < -40) {
      const y = L.y < -40 ? 0 : s.y;
      out.push({ id: L.id, pose: { x: L.x, y, z: L.z, yaw: L.yaw } });
    }
  }
  for (const l of out) sim.loose.delete(l.id);
  return out;
}

/** Picks up an object for a holder (player or NPC). */
export function grabObject(holderId: string, obj: SObject): boolean {
  const w = sim.walkers.get(holderId);
  if (!w || w.held || w.inVehicle || !canGrab(obj.assetId) || sim.loose.has(obj.id) || sim.live.has(obj.id)) return false;
  const p = poseOf(obj, sim.t);
  sim.loose.set(obj.id, { id: obj.id, x: p.x, y: p.y, z: p.z, yaw: p.yaw, vx: 0, vy: 0, vz: 0, holder: holderId });
  w.held = obj.id;
  return true;
}

/** Lets go of the held item: drops it in front of the holder, or throws it forward. */
export function releaseHeld(holderId: string, throwIt: boolean) {
  const w = sim.walkers.get(holderId);
  if (!w || !w.held) return;
  const L = sim.loose.get(w.held);
  w.held = null;
  if (!L) return;
  const k = throwIt ? 12 : 1.2;
  L.holder = null;
  L.vx = Math.sin(w.yaw) * k;
  L.vz = Math.cos(w.yaw) * k;
  L.vy = throwIt ? 6 : 0;
}

export function nearestGrabbable(objs: SObject[], x: number, z: number, maxD: number): SObject | null {
  let best: SObject | null = null;
  let bd = maxD;
  for (const o of objs) {
    if (!canGrab(o.assetId) || sim.loose.has(o.id) || sim.live.has(o.id)) continue;
    const p = poseOf(o, sim.t);
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  return best;
}

/** Enter the nearest vehicle (within 4.5 m), or leave the current one (returns the pose to save). */
export function enterOrExit(objs: SObject[], playerId: string | null): Landed | null {
  if (!playerId) return null;
  const w = sim.walkers.get(playerId);
  if (!w) return null;
  if (w.inVehicle) return exitVehicle(playerId);
  let best: { o: SObject; p: Pose } | null = null;
  let bd = 4.5;
  for (const o of objs) {
    const a = ASSET_MAP[o.assetId];
    if (!a?.vehicle || sim.loose.has(o.id)) continue;
    const p = poseOf(o, sim.t);
    const d = Math.hypot(p.x - w.x, p.z - w.z);
    if (d < bd) {
      bd = d;
      best = { o, p };
    }
  }
  if (!best) return null;
  const kind = ASSET_MAP[best.o.assetId].vehicle as VehicleKind;
  sim.live.set(best.o.id, { id: best.o.id, kind, x: best.p.x, y: best.p.y, z: best.p.z, yaw: best.p.yaw, v: 0, vy: 0, pitch: 0, roll: 0 });
  w.inVehicle = best.o.id;
  return null;
}

export function exitVehicle(playerId: string): Landed | null {
  const w = sim.walkers.get(playerId);
  if (!w || !w.inVehicle) return null;
  const id = w.inVehicle;
  const L = sim.live.get(id);
  w.inVehicle = null;
  sim.live.delete(id);
  if (!L) return null;
  w.x = L.x + Math.cos(L.yaw) * 2.2;
  w.z = L.z - Math.sin(L.yaw) * 2.2;
  w.y = L.y;
  w.vy = 0;
  w.yaw = L.yaw;
  return { id, pose: { x: L.x, y: L.y, z: L.z, yaw: L.yaw } };
}

/** Saves everything in motion (vehicles, carried items) back to their current poses. */
export function flushAll(): Landed[] {
  const out: Landed[] = [];
  for (const [id, L] of sim.loose) out.push({ id, pose: { x: L.x, y: L.y, z: L.z, yaw: L.yaw } });
  for (const [id, L] of sim.live) out.push({ id, pose: { x: L.x, y: L.y, z: L.z, yaw: L.yaw } });
  sim.loose.clear();
  sim.live.clear();
  for (const w of sim.walkers.values()) {
    w.held = null;
    w.inVehicle = null;
  }
  return out;
}
