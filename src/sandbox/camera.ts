import * as THREE from "three";

export type CamMode = "orbit" | "fly" | "third" | "first";

/** Shared camera state for the sandbox. Mouse look writes it, the camera director and the player read it. */
export const cam = {
  yaw: 0,
  pitch: 0.18,
  dist: 4.6,
  fly: new THREE.Vector3(0, 3, 12),
  sway: new THREE.Vector2(0, 0),
  swing: 0,
  hold: 0,
};

/** Look direction for a yaw/pitch pair (yaw 0 looks toward -Z, positive pitch looks up). */
export function lookDir(yaw: number, pitch: number): THREE.Vector3 {
  return new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
}

/** Camera-relative ground movement. fw = forward (W/S), sd = strafe right (D/A). */
export function moveVec(yaw: number, fw: number, sd: number): { dx: number; dz: number } {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  return { dx: fx * fw + rx * sd, dz: fz * fw + rz * sd };
}
