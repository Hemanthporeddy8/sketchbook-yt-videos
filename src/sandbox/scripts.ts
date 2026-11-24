import { blocked, ensureWalker, grabObject, nearestGrabbable, poseOf, releaseHeld, RUN_SPEED, sim, stepWalker, WALK_SPEED, type Ctx, type Walker } from "./sim";
import { cam } from "./camera";
import { useSandbox, type Cmd, type SActor, type SObject, type Target } from "./sandboxStore";

/*
 * NPC brain: command lists, idle behaviours, path planning and conversations.
 * Every character that is not the player is driven from here.
 */

const WALK = WALK_SPEED;
const CELL = 0.5;
const VENDOR_G = ["shrug", "point", "think", "nod", "wave", "dance-groove"];

interface Run {
  idx: number;
  timer: number;
  phase: number;
  target?: string;
  path?: { x: number; z: number }[];
  replan?: number;
  bTarget?: { x: number; z: number };
  bWait?: number;
  bDir?: number;
  bAge?: number;
  bTimer?: number;
}

export const script = {
  perf: new Map<string, { stance: string; gesture: string; until: number }>(),
  bubbles: new Map<string, { text: string; until: number }>(),
  expr: new Map<string, string>(),
  runs: new Map<string, Run>(),
  talk: null as null | { actorId: string; closeAt: number | null },
};

const wrapA = (a: number) => {
  let x = a;
  while (x > Math.PI) x -= 2 * Math.PI;
  while (x < -Math.PI) x += 2 * Math.PI;
  return x;
};

/** Plays an action on an actor right away (used by the Test button and the F dance key). */
export function testPerform(id: string, stance: string, gesture: string, seconds = 6) {
  script.perf.set(id, { stance, gesture, until: sim.t + seconds });
}

function say(id: string, text: string, secs: number) {
  script.bubbles.set(id, { text, until: sim.t + secs });
}

function perform(id: string, stance: string, gesture: string, secs: number) {
  script.perf.set(id, { stance, gesture, until: sim.t + secs });
}

/* ------------------------------------------------------------------ */
/* Conversations                                                        */
/* ------------------------------------------------------------------ */

const optsOf = (a: SActor) => a.dialogue.map((l, i) => ({ label: l.prompt, idx: i }));

/** Nearest NPC (not the player) within maxD metres of (x, z). */
export function nearestNpc(x: number, z: number, maxD: number): SActor | null {
  const st = useSandbox.getState();
  let best: SActor | null = null;
  let bd = maxD;
  for (const a of st.actors) {
    if (a.id === st.playerId) continue;
    const w = sim.walkers.get(a.id);
    if (!w || w.inVehicle) continue;
    const d = Math.hypot(w.x - x, w.z - z);
    if (d < bd) {
      bd = d;
      best = a;
    }
  }
  return best;
}

/** Opens a conversation: the NPC and player turn to face each other and the NPC greets them. */
export function beginTalk(id: string) {
  const st = useSandbox.getState();
  const a = st.actors.find((x) => x.id === id);
  if (!a || a.id === st.playerId) return;
  script.talk = { actorId: id, closeAt: null };
  const nw = sim.walkers.get(id);
  const pw = st.playerId ? sim.walkers.get(st.playerId) : undefined;
  if (nw && pw) {
    nw.yaw = Math.atan2(pw.x - nw.x, pw.z - nw.z);
    pw.yaw = Math.atan2(nw.x - pw.x, nw.z - pw.z);
    cam.yaw = Math.atan2(-(nw.x - pw.x), -(nw.z - pw.z));
    cam.pitch = 0.12;
  }
  say(id, a.greeting, 7);
  perform(id, "stand", "wave", 2.2);
  st.setConvo({ actorId: id, text: a.greeting, options: optsOf(a), ended: false });
}

/** The player picked option idx: the NPC answers, then offers the options again (or ends if it was goodbye). */
export function chooseTalk(idx: number) {
  const st = useSandbox.getState();
  const c = st.convo;
  if (!c || c.ended || !script.talk) return;
  const a = st.actors.find((x) => x.id === c.actorId);
  const line = a?.dialogue[idx];
  if (!a || !line) return;
  say(a.id, line.reply, line.end ? 3.2 : 5.5);
  perform(a.id, "stand", line.gesture || "none", 2.4);
  if (line.end) {
    script.talk.closeAt = sim.t + 3.2;
    st.setConvo({ ...c, text: line.reply, options: [], ended: true });
  } else {
    st.setConvo({ ...c, text: line.reply, options: optsOf(a) });
  }
}

/** Closes the conversation and lets everyone go back to what they were doing. */
export function endTalk() {
  const id = script.talk?.actorId;
  script.talk = null;
  if (id) {
    script.bubbles.delete(id);
    script.perf.delete(id);
  }
  useSandbox.getState().setConvo(null);
}

/* ------------------------------------------------------------------ */
/* Path planning                                                        */
/* ------------------------------------------------------------------ */

/** Breadth-first search on a 0.5 m grid over the solid footprints. Returns world-space waypoints or null. */
function planPath(sx: number, sz: number, tx: number, tz: number, ctx: Ctx): { x: number; z: number }[] | null {
  const pad = 12;
  const minX = Math.min(sx, tx) - pad;
  const minZ = Math.min(sz, tz) - pad;
  const nx = Math.ceil((Math.abs(tx - sx) + 2 * pad) / CELL);
  const nz = Math.ceil((Math.abs(tz - sz) + 2 * pad) / CELL);
  if (nx * nz > 160000) return null;
  const cellX = (i: number) => minX + (i + 0.5) * CELL;
  const cellZ = (j: number) => minZ + (j + 0.5) * CELL;
  const toI = (x: number) => Math.min(nx - 1, Math.max(0, Math.floor((x - minX) / CELL)));
  const toJ = (z: number) => Math.min(nz - 1, Math.max(0, Math.floor((z - minZ) / CELL)));
  const idx = (i: number, j: number) => j * nx + i;

  const state = new Uint8Array(nx * nz); // 0 unknown, 1 free, 2 blocked
  const isFree = (i: number, j: number) => {
    const k = idx(i, j);
    if (!state[k]) state[k] = blocked(cellX(i), 0, cellZ(j), 0.35, 1.8, ctx, null) ? 2 : 1;
    return state[k] === 1;
  };

  const start = idx(toI(sx), toJ(sz));
  const goal = idx(toI(tx), toJ(tz));
  const parent = new Int32Array(nx * nz).fill(-1);
  const queue = new Int32Array(nx * nz);
  let qh = 0;
  let qt = 0;
  parent[start] = start;
  queue[qt++] = start;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  let found = false;
  while (qh < qt) {
    const cur = queue[qh++];
    if (cur === goal) {
      found = true;
      break;
    }
    const ci = cur % nx;
    const cj = (cur - ci) / nx;
    for (const [di, dj] of dirs) {
      const ni = ci + di;
      const nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= nx || nj >= nz) continue;
      const nk = idx(ni, nj);
      if (parent[nk] !== -1) continue;
      if (nk !== goal && !isFree(ni, nj)) continue;
      parent[nk] = cur;
      queue[qt++] = nk;
    }
  }
  if (!found) return null;
  const out: { x: number; z: number }[] = [];
  let c = goal;
  while (c !== start) {
    const ci = c % nx;
    const cj = (c - ci) / nx;
    out.push({ x: cellX(ci), z: cellZ(cj) });
    c = parent[c];
  }
  out.reverse();
  return out;
}

/** Walks toward (tx, tz) along a planned path, re-planning every `replanEvery` seconds (0 = never). */
function moveTo(w: Walker, dt: number, ctx: Ctx, r: Run, tx: number, tz: number, speed: number, replanEvery: number) {
  if (!r.path || (replanEvery > 0 && r.timer - (r.replan ?? 0) > replanEvery)) {
    r.path = planPath(w.x, w.z, tx, tz, ctx) ?? [{ x: tx, z: tz }];
    r.replan = r.timer;
  }
  while (r.path.length > 1 && Math.hypot(r.path[0].x - w.x, r.path[0].z - w.z) < 0.4) r.path.shift();
  const wp = r.path[0];
  stepWalker(w, dt, ctx, wp.x - w.x, wp.z - w.z, speed, false);
}

function resolve(t: Target, objs: SObject[]): { x: number; z: number } | null {
  const st = useSandbox.getState();
  if (t.kind === "point") return { x: t.x, z: t.z };
  if (t.kind === "actor") {
    const w = sim.walkers.get(t.id);
    if (w) return { x: w.x, z: w.z };
    const a = st.actors.find((x) => x.id === t.id);
    return a ? { x: a.startX, z: a.startZ } : null;
  }
  if (t.kind === "player") {
    const w = st.playerId ? sim.walkers.get(st.playerId) : undefined;
    return w ? { x: w.x, z: w.z } : null;
  }
  const o = objs.find((x) => x.id === t.id);
  if (!o) return null;
  const p = poseOf(o, sim.t);
  return { x: p.x, z: p.z };
}

/* ------------------------------------------------------------------ */
/* Scene run                                                            */
/* ------------------------------------------------------------------ */

function resetRuntime() {
  script.runs.clear();
  script.perf.clear();
  script.bubbles.clear();
  script.expr.clear();
  const st = useSandbox.getState();
  for (const a of st.actors) {
    const w = ensureWalker(a.id, a.startX, a.startZ, a.startYaw);
    if (w.held) {
      sim.loose.delete(w.held);
      w.held = null;
    }
    if (w.inVehicle) {
      sim.live.delete(w.inVehicle);
      w.inVehicle = null;
    }
    w.x = a.startX;
    w.z = a.startZ;
    w.yaw = a.startYaw;
    w.y = 0;
    w.vy = 0;
    w.speed = 0;
  }
}

export function runScene() {
  endTalk();
  resetRuntime();
  useSandbox.getState().setScriptRunning(true);
}

export function stopScene() {
  endTalk();
  useSandbox.getState().setScriptRunning(false);
  resetRuntime();
}

/** Runs one scripted command for one frame. Returns true when the command has finished. */
function runCmd(a: SActor, w: Walker, c: Cmd, r: Run, dt: number, ctx: Ctx, objs: SObject[]): boolean {
  switch (c.type) {
    case "walk": {
      const tg = resolve(c.target, objs);
      if (!tg) return true;
      const stop = c.target.kind === "actor" || c.target.kind === "player" ? 1.6 : 0.5;
      const dist = Math.hypot(tg.x - w.x, tg.z - w.z);
      if (dist <= stop || r.timer > 45) {
        stepWalker(w, dt, ctx, 0, 0, 0, false);
        return true;
      }
      const moving = c.target.kind === "actor" || c.target.kind === "player" ? 1 : 0;
      moveTo(w, dt, ctx, r, tg.x, tg.z, WALK, moving ? 1 : 0);
      return false;
    }
    case "follow": {
      const tg = resolve(c.target, objs);
      if (tg) {
        const dist = Math.hypot(tg.x - w.x, tg.z - w.z);
        if (dist > 2.2) moveTo(w, dt, ctx, r, tg.x, tg.z, dist > 5 ? RUN_SPEED : WALK_SPEED, 0.8);
        else stepWalker(w, dt, ctx, 0, 0, 0, false);
      } else {
        stepWalker(w, dt, ctx, 0, 0, 0, false);
      }
      return r.timer >= c.seconds;
    }
    case "face": {
      const tg = resolve(c.target, objs);
      if (tg) w.yaw = Math.atan2(tg.x - w.x, tg.z - w.z);
      stepWalker(w, dt, ctx, 0, 0, 0, false);
      return r.timer >= 0.3;
    }
    case "perform": {
      if (r.phase === 0) {
        perform(a.id, c.stance, c.gesture, c.seconds + 0.05);
        r.phase = 1;
      }
      stepWalker(w, dt, ctx, 0, 0, 0, false);
      if (r.timer >= c.seconds) {
        script.perf.delete(a.id);
        return true;
      }
      return false;
    }
    case "say": {
      if (r.phase === 0) {
        say(a.id, c.text, c.seconds);
        r.phase = 1;
      }
      stepWalker(w, dt, ctx, 0, 0, 0, false);
      if (r.timer >= c.seconds) {
        script.bubbles.delete(a.id);
        return true;
      }
      return false;
    }
    case "grab": {
      if (r.phase === 0) {
        const found = c.objectId ? objs.find((o) => o.id === c.objectId) : nearestGrabbable(objs, w.x, w.z, 4);
        if (!found) return true;
        r.target = found.id;
        r.phase = 1;
      }
      const o = objs.find((x) => x.id === r.target);
      if (!o || r.timer > 25) return true;
      const p = poseOf(o, sim.t);
      if (Math.hypot(p.x - w.x, p.z - w.z) > 1.1) {
        moveTo(w, dt, ctx, r, p.x, p.z, WALK, 1);
        return false;
      }
      grabObject(a.id, o);
      stepWalker(w, dt, ctx, 0, 0, 0, false);
      return true;
    }
    case "drop":
      releaseHeld(a.id, false);
      return true;
    case "throw":
      releaseHeld(a.id, true);
      return true;
    case "wait":
      stepWalker(w, dt, ctx, 0, 0, 0, false);
      return r.timer >= c.seconds;
    case "expression":
      script.expr.set(a.id, c.expression);
      return true;
  }
}

/** Idle life for NPCs with no command list: wander, patrol, vendor gestures, or stand still. */
function runBehavior(a: SActor, w: Walker, r: Run, dt: number, ctx: Ctx) {
  if (a.behavior === "vendor") {
    stepWalker(w, dt, ctx, 0, 0, 0, false);
    r.bTimer = (r.bTimer ?? 2) - dt;
    if (r.bTimer <= 0 && !script.perf.has(a.id)) {
      r.bTimer = 4 + Math.random() * 4;
      perform(a.id, "stand", VENDOR_G[Math.floor(Math.random() * VENDOR_G.length)], 2.6);
    }
    return;
  }
  if (a.behavior === "wander" || a.behavior === "patrol") {
    const R = Math.max(2, a.wanderRadius);
    if (!r.bTarget) {
      r.bWait = (r.bWait ?? 1) - dt;
      stepWalker(w, dt, ctx, 0, 0, 0, false);
      if (r.bWait > 0) return;
      if (a.behavior === "patrol") {
        r.bDir = -(r.bDir ?? 1);
        r.bTarget = { x: a.startX + r.bDir * R, z: a.startZ };
      } else {
        const ang = Math.random() * Math.PI * 2;
        const rad = 1.5 + Math.random() * (R - 1.5);
        r.bTarget = { x: a.startX + Math.sin(ang) * rad, z: a.startZ + Math.cos(ang) * rad };
      }
      r.bAge = 0;
      r.path = undefined;
    }
    r.bAge = (r.bAge ?? 0) + dt;
    const tg = r.bTarget;
    if (Math.hypot(tg.x - w.x, tg.z - w.z) < 0.6 || r.bAge > 14) {
      r.bTarget = undefined;
      r.bWait = 1.2 + Math.random() * 2.8;
      stepWalker(w, dt, ctx, 0, 0, 0, false);
      return;
    }
    moveTo(w, dt, ctx, r, tg.x, tg.z, WALK * 0.7, 1);
    return;
  }
  stepWalker(w, dt, ctx, 0, 0, 0, false);
}

/** Advances conversations, command lists and idle behaviours. Called once per frame. */
export function tickScripts(dt: number, objs: SObject[], blocks: Record<string, string>) {
  for (const [id, p] of script.perf) if (sim.t >= p.until) script.perf.delete(id);
  for (const [id, b] of script.bubbles) if (sim.t >= b.until) script.bubbles.delete(id);
  const st = useSandbox.getState();
  const ctx: Ctx = { objs, blocks, t: sim.t };

  if (script.talk) {
    const nw = sim.walkers.get(script.talk.actorId);
    const pw = st.playerId ? sim.walkers.get(st.playerId) : undefined;
    if (nw) {
      if (pw) nw.yaw += wrapA(Math.atan2(pw.x - nw.x, pw.z - nw.z) - nw.yaw) * Math.min(1, dt * 6);
      stepWalker(nw, dt, ctx, 0, 0, 0, false);
    }
    if (script.talk.closeAt !== null && sim.t >= script.talk.closeAt) endTalk();
  }

  if (!st.play && !st.scriptRunning) return;
  for (const a of st.actors) {
    if (a.id === st.playerId) continue;
    if (script.talk && script.talk.actorId === a.id) continue;
    const w = sim.walkers.get(a.id);
    if (!w || w.inVehicle) continue;
    let r = script.runs.get(a.id);
    if (!r) {
      r = { idx: 0, timer: 0, phase: 0 };
      script.runs.set(a.id, r);
    }
    r.timer += dt;
    if (st.scriptRunning && a.queue.length > 0 && (r.idx < a.queue.length || st.scriptRepeat)) {
      if (r.idx >= a.queue.length) {
        r.idx = 0;
        r.timer = 0;
        r.phase = 0;
        r.path = undefined;
      }
      const c = a.queue[r.idx];
      if (runCmd(a, w, c, r, dt, ctx, objs)) {
        r.idx++;
        r.timer = 0;
        r.phase = 0;
        r.target = undefined;
        r.path = undefined;
        r.replan = undefined;
      }
      continue;
    }
    runBehavior(a, w, r, dt, ctx);
  }
}
