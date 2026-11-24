import { GESTURE_MAP, STANCE_MAP } from "./actions";

/*
 * Locomotion for every character (player, NPCs, Film characters via the shared rig).
 * Legs and arms are driven by a gait phase that advances with the distance travelled,
 * so the feet step at the same rate the body moves. Arms swing opposite the legs,
 * knees bend on the forward swing, the torso counter-rotates, and the hips bob twice per cycle.
 */

type Vec = [number, number, number];

export interface LocoIn {
  speed: number;
  grounded: boolean;
  vy: number;
  gait: number;
  t: number;
  held: boolean;
  perf: { stance: string; gesture: string } | null;
  talking: boolean;
}

const TAU = Math.PI * 2;

export function locoPose(i: LocoIn): { rot: Record<string, Vec>; py: number } {
  const rot: Record<string, Vec> = {};
  let py = 0;
  const moving = i.grounded && i.speed > 0.25;
  const run = i.speed > 5.4;
  const ph = i.gait * TAU;
  const sc = Math.min(1.5, Math.max(0.45, i.speed / 3.6));

  if (!i.grounded) {
    const fall = i.vy < 0 ? 1 : 0.6;
    rot.lUpperLeg = [-0.6, 0, 0.08];
    rot.rUpperLeg = [-0.4, 0, -0.08];
    rot.lLowerLeg = [0.9, 0, 0];
    rot.rLowerLeg = [0.7, 0, 0];
    rot.lUpperArm = [-2.2 * fall, 0, 0.35];
    rot.rUpperArm = [-2.2 * fall, 0, -0.35];
    rot.lLowerArm = [-0.3, 0, 0];
    rot.rLowerArm = [-0.3, 0, 0];
    rot.spine = [0.08, 0, 0];
  } else if (moving) {
    const thigh = (run ? 0.85 : 0.5) * sc;
    const knee = run ? 1.25 : 0.65;
    const arm = (run ? 0.95 : 0.45) * sc;
    rot.lUpperLeg = [Math.sin(ph) * thigh, 0, 0];
    rot.rUpperLeg = [Math.sin(ph + Math.PI) * thigh, 0, 0];
    rot.lLowerLeg = [knee * Math.max(0, -Math.cos(ph)) + 0.04, 0, 0];
    rot.rLowerLeg = [knee * Math.max(0, Math.cos(ph)) + 0.04, 0, 0];
    rot.lUpperArm = [-Math.sin(ph) * arm, 0, 0.1];
    rot.rUpperArm = [Math.sin(ph) * arm, 0, -0.1];
    const elbow = run ? -0.9 : -0.3;
    rot.lLowerArm = [elbow, 0, 0];
    rot.rLowerArm = [elbow, 0, 0];
    const lean = run ? 0.2 : 0.035;
    rot.spine = [lean, Math.sin(ph) * (run ? 0.14 : 0.08), 0];
    rot.head = [-lean * 0.9, -Math.sin(ph) * 0.06, 0];
    py = 0.02 * sc * Math.abs(Math.cos(ph)) - 0.012 * sc;
  } else {
    const br = Math.sin(i.t * TAU * 0.28);
    rot.spine = [0.02 + br * 0.012, 0, 0];
    rot.head = [-0.03, Math.sin(i.t * TAU * 0.09) * 0.14, 0];
    rot.lUpperArm = [0.04 * br, 0, 0.1 + 0.02 * br];
    rot.rUpperArm = [0.04 * br, 0, -0.1 - 0.02 * br];
    rot.lLowerArm = [-0.14, 0, 0];
    rot.rLowerArm = [-0.14, 0, 0];
    py = 0.005 * br;
  }

  if (i.held && i.grounded && !i.perf) {
    rot.lUpperArm = [-1.15, 0, 0.25];
    rot.rUpperArm = [-1.15, 0, -0.25];
    rot.lLowerArm = [-1.35, 0, 0];
    rot.rLowerArm = [-1.35, 0, 0];
  }

  if (i.perf) {
    const st = STANCE_MAP[i.perf.stance];
    if (st) {
      for (const k in st.rot) rot[k] = [...st.rot[k]] as Vec;
      if (st.py !== undefined) py = st.py;
    }
    const gs = GESTURE_MAP[i.perf.gesture];
    if (gs) {
      for (const os of gs.osc) {
        const cur = rot[os.b] ?? (rot[os.b] = [0, 0, 0]);
        cur[os.a] = os.off + (os.amp ? os.amp * Math.sin(TAU * os.f * i.t + os.ph) : 0);
      }
    }
  }
  return { rot, py };
}
