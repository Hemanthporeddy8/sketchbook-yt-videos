import { runtime } from "../three/runtime";
import { useSandbox } from "./sandboxStore";

let rec: MediaRecorder | null = null;

const slug = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "sandbox";

/** Starts/stops recording the sandbox viewport (your gameplay and builds, as shown on screen). */
export function toggleSandboxRec(name: string): string | null {
  if (rec && rec.state === "recording") {
    rec.stop();
    return null;
  }
  const canvas = runtime.canvas;
  if (!canvas) return "Viewport is not ready yet.";
  if (typeof MediaRecorder === "undefined") return "Recording is not supported in this browser. Use Chrome or Edge.";

  const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
  const stream = canvas.captureStream(30);
  const chunks: Blob[] = [];
  const r = new MediaRecorder(stream, { mimeType: mimeType || undefined, videoBitsPerSecond: 10_000_000 });
  r.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  r.onstop = () => {
    const isMp4 = mimeType.startsWith("video/mp4");
    const blob = new Blob(chunks, { type: isMp4 ? "video/mp4" : "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(name)}-sandbox.${isMp4 ? "mp4" : "webm"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    stream.getTracks().forEach((t) => t.stop());
    rec = null;
    useSandbox.getState().setRec("done", "Recording saved");
    setTimeout(() => {
      if (useSandbox.getState().recState === "done") useSandbox.getState().setRec("idle", "");
    }, 4000);
  };
  rec = r;
  r.start(250);
  useSandbox.getState().setRec("recording", "REC");
  return null;
}
