import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "../store";
import { usePlayback } from "../playback";
import { footageUrl } from "../lib/footage";
import { FOOTAGE_TRACK } from "../lib/types";

/**
 * Plays imported footage full-screen in the film viewport while its timeline clip is active.
 * It is drawn as a texture on a plane in front of the camera, so exported videos include it.
 */
export function FootageScreen() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const video = useMemo(() => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    return v;
  }, []);
  const tex = useMemo(() => {
    const t = new THREE.VideoTexture(video);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [video]);
  const mesh = useRef<THREE.Mesh>(null!);
  const fwd = useMemo(() => new THREE.Vector3(), []);

  useEffect(
    () => () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
      tex.dispose();
    },
    [video, tex],
  );

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const st = useStore.getState();
    const pb = usePlayback.getState();
    const t = pb.time;
    const clip = st.clips.find((c) => c.characterId === FOOTAGE_TRACK && t >= c.start && t < c.start + c.duration);
    const url = clip?.footageId ? footageUrl(clip.footageId) : undefined;
    if (!clip || !url) {
      m.visible = false;
      if (!video.paused) video.pause();
      return;
    }
    if (video.src !== url) video.src = url;

    // Hold the last frame if the timeline runs longer than the footage.
    const dur = isFinite(video.duration) && video.duration > 0 ? video.duration : Infinity;
    const want = Math.min(Math.max(0, t - clip.start), Math.max(0, dur - 0.05));
    if (video.readyState >= 1 && Math.abs(video.currentTime - want) > (pb.playing ? 0.3 : 0.05)) {
      try {
        video.currentTime = want;
      } catch {
        /* not seekable yet */
      }
    }
    if (pb.playing && video.paused) video.play().catch(() => undefined);
    if (!pb.playing && !video.paused) video.pause();
    if (video.readyState >= 2) tex.needsUpdate = true;

    // Fit the footage inside the frame (letterboxed if the aspect differs).
    const vw = video.videoWidth || 16;
    const vh = video.videoHeight || 9;
    const dist = 3;
    const halfH = dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfW = halfH * camera.aspect;
    let w = halfW * 2;
    let h = halfH * 2;
    if (w / h > vw / vh) w = h * (vw / vh);
    else h = w / (vw / vh);

    fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    m.position.copy(camera.position).addScaledVector(fwd, dist);
    m.quaternion.copy(camera.quaternion);
    m.scale.set(w, h, 1);
    m.visible = true;
  });

  return (
    <mesh ref={mesh} renderOrder={900} visible={false} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
