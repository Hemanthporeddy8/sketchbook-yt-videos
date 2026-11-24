import { usePlayback } from "../playback";
import { sceneEnd, useStore } from "../store";
import { runtime } from "../three/runtime";

const slug = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "pixelstage-video";

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Saves the current frame as a PNG thumbnail (1280×720 / 1080×1920 depending on aspect). */
export function saveThumbnail(name: string) {
  const c = runtime.canvas;
  if (!c) return "Viewport is not ready yet.";
  download(c.toDataURL("image/png"), `${slug(name)}-thumbnail.png`);
  return null;
}

/**
 * Plays the whole timeline from 0 while recording the 3D viewport canvas.
 * Captions, characters, motion and the world are all captured exactly as shown.
 */
export function recordVideo(name: string): string | null {
  const canvas = runtime.canvas;
  if (!canvas) return "Viewport is not ready yet.";
  if (typeof MediaRecorder === "undefined") return "Your browser cannot record video. Please use Chrome or Edge.";
  if (usePlayback.getState().rec === "recording") return "Already recording.";

  const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
  const stream = canvas.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: mimeType || undefined, videoBitsPerSecond: 10_000_000 });
  const chunks: Blob[] = [];
  const prevLoop = usePlayback.getState().loop;

  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  rec.onstop = () => {
    const isMp4 = mimeType.startsWith("video/mp4");
    const blob = new Blob(chunks, { type: isMp4 ? "video/mp4" : "video/webm" });
    const url = URL.createObjectURL(blob);
    download(url, `${slug(name)}.${isMp4 ? "mp4" : "webm"}`);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    stream.getTracks().forEach((t) => t.stop());
    unsub();
    usePlayback.setState({ rec: "done", recLabel: "Video saved", playing: false, loop: prevLoop });
    setTimeout(() => {
      if (usePlayback.getState().rec === "done") usePlayback.setState({ rec: "idle", recLabel: "" });
    }, 4000);
  };

  // Stop recording as soon as the timeline reaches its end (PlaybackDriver pauses it).
  const unsub = usePlayback.subscribe((s) => {
    if (rec.state === "recording" && !s.playing) rec.stop();
  });

  const st = useStore.getState();
  const total = sceneEnd(st.clips, st.captions);
  usePlayback.setState({ time: 0, playing: true, loop: false, rec: "recording", recLabel: `Recording ${total.toFixed(1)}s…` });
  rec.start(250);
  return null;
}
