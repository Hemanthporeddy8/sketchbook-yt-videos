import type { ThreeEvent } from "@react-three/fiber";

/** Shared runtime handles (canvas for export, pending click resolution). */
export const runtime = {
  canvas: null as HTMLCanvasElement | null,
  pending: null as null | ((button: number) => void),
  px: 0,
  py: 0,
  button: 0,
};

/**
 * Registers a click on a 3D object. The action only fires on pointer-up if the pointer
 * barely moved, so orbiting the camera never accidentally places or selects anything.
 */
export function setPending(e: ThreeEvent<PointerEvent>, fn: (button: number) => void) {
  const ne = e.nativeEvent;
  if (ne.button !== 0 && ne.button !== 2) return;
  runtime.pending = fn;
  runtime.px = ne.clientX;
  runtime.py = ne.clientY;
  runtime.button = ne.button;
}

export function installPointerUp() {
  const onUp = (ev: PointerEvent) => {
    const fn = runtime.pending;
    runtime.pending = null;
    if (!fn) return;
    const moved = Math.hypot(ev.clientX - runtime.px, ev.clientY - runtime.py);
    if (moved < 6) fn(runtime.button);
  };
  window.addEventListener("pointerup", onUp);
  return () => window.removeEventListener("pointerup", onUp);
}

/** ID of character currently walking via real-time WASD / arrow keys */
export let liveWalkingCharId: string | null = null;
export function setLiveWalkingCharId(id: string | null) {
  liveWalkingCharId = id;
}

