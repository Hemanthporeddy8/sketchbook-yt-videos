import { clock2d, dimsOf, projectDuration } from "./anim2d";
import { useStudio2d } from "./store2d";

/*
 * Exports the 2D stage as a WebM. Each frame is the live SVG serialised to an image and drawn to a canvas,
 * so the video matches what you see on the stage (poses, faces, bubbles, objects and backgrounds).
 */

let stageSvg: SVGSVGElement | null = null;
export const setStageSvg = (s: SVGSVGElement | null) => {
  stageSvg = s;
};

const slug = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "2d-animation";

export function exportStage2D(name: string): string | null {
  const svg = stageSvg;
  if (!svg) return "The stage is not ready yet.";
  if (typeof MediaRecorder === "undefined") return "Video export needs Chrome or Edge.";
  const st = useStudio2d.getState();
  if (st.rec === "recording") return "Already recording.";

  const [W, H] = dimsOf(st.aspect);
  const dur = projectDuration(st.clips);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "Canvas is not available in this browser.";
  const stream = canvas.captureStream(24);
  const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  const mime = types.find((t) => MediaRecorder.isTypeSupported(t));
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };

  let busy = false;
  let done = false;
  const prevLoop = st.loop;
  const iv = window.setInterval(() => {
    if (busy || done) return;
    busy = true;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", String(W));
    clone.setAttribute("height", String(H));
    clone.removeAttribute("class");
    clone.removeAttribute("style");
    // strip selection outlines / hover borders from the exported frame
    clone.querySelectorAll("rect[stroke='#e87d0d'], ellipse[stroke='#e87d0d']").forEach((el) => el.remove());
    clone.querySelectorAll("[display='none']").forEach((el) => el.remove());
    const xml = new XMLSerializer().serializeToString(clone);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, W, H);
      busy = false;
    };
    img.onerror = () => {
      busy = false;
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  }, 1000 / 24);

  rec.onstop = () => {
    done = true;
    window.clearInterval(iv);
    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(name)}-2d.webm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    stream.getTracks().forEach((t) => t.stop());
    const s2 = useStudio2d.getState();
    s2.setLoop(prevLoop);
    s2.setRec("done", "Video saved");
    setTimeout(() => {
      if (useStudio2d.getState().rec === "done") useStudio2d.getState().setRec("idle", "");
    }, 4000);
  };

  clock2d.t = 0;
  st.setLoop(false);
  st.setT(0);
  st.setRec("recording", "Recording…");
  st.setPlaying(true);
  rec.start(250);
  window.setTimeout(() => {
    useStudio2d.getState().setPlaying(false);
    rec.stop();
  }, (dur + 0.3) * 1000);
  return null;
}
