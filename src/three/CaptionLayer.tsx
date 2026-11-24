import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "../store";
import { usePlayback } from "../playback";

/*
 * Captions are drawn to a 2D canvas and shown as a texture on a camera-facing plane.
 * This avoids runtime font loading and keeps captions inside the rendered (and exported) frame.
 */

const W = 2048;
const H = 512;

function captionAt(t: number) {
  const caps = useStore.getState().captions;
  return caps.find((c) => t >= c.start && t < c.start + c.duration)?.text ?? "";
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (cur && ctx.measureText(t).width > maxW) {
      lines.push(cur);
      cur = w;
    } else {
      cur = t;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawCaption(canvas: HTMLCanvasElement, text: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);
  if (!text) return;
  const maxW = W * 0.9;
  let size = 150;
  let lines: string[] = [];
  for (;;) {
    ctx.font = `700 ${size}px Inter, Arial, Helvetica, sans-serif`;
    lines = wrapLines(ctx, text, maxW);
    if (lines.length * size * 1.25 <= H * 0.92 || size <= 56) break;
    size -= 8;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.92)";
  ctx.lineWidth = size * 0.16;
  ctx.fillStyle = "#ffffff";
  const lh = size * 1.25;
  const y0 = H / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((ln, i) => {
    const y = y0 + i * lh;
    ctx.strokeText(ln, W / 2, y);
    ctx.fillText(ln, W / 2, y);
  });
}

export function CaptionLayer() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const text = usePlayback((s) => captionAt(s.time));
  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    return c;
  }, []);
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [canvas]);
  const mesh = useRef<THREE.Mesh>(null!);
  const fwd = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    drawCaption(canvas, text);
    tex.needsUpdate = true;
  }, [text, canvas, tex]);

  useEffect(() => () => tex.dispose(), [tex]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    if (!text) {
      m.visible = false;
      return;
    }
    const dist = 4;
    const halfH = dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfW = halfH * camera.aspect;
    const w = halfW * 2 * 0.9;
    const h = w * (H / W);
    fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    m.position.copy(camera.position).addScaledVector(fwd, dist).addScaledVector(up, -halfH * 0.7);
    m.quaternion.copy(camera.quaternion);
    m.scale.set(w, h, 1);
    m.visible = true;
  });

  return (
    <mesh ref={mesh} renderOrder={1000} visible={false} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
