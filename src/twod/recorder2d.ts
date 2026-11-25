import { clock2d, dimsOf, projectDuration } from "./anim2d";
import { useStudio2d } from "./store2d";

/*
 * Exports the 2D stage as a WebM video with synchronized audio.
 * Each frame is the live SVG serialised to an image and drawn to a canvas,
 * while character voice/dub takes are decoded and mixed via Web Audio API.
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
  const dur = projectDuration(st.clips, st.audioClips);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "Canvas is not available in this browser.";
  const stream = canvas.captureStream(24);

  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  const mime = types.find((t) => MediaRecorder.isTypeSupported(t));

  st.setRec("recording", "Preparing export…");

  const clipsWithAudio = st.audioClips || [];

  const startRecording = async () => {
    let audioCtx: AudioContext | null = null;
    let audioDest: MediaStreamAudioDestinationNode | null = null;

    if (clipsWithAudio.length > 0) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtx = new AudioCtx();
        audioDest = audioCtx.createMediaStreamDestination();
        audioDest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));

        // Preload & decode all audio buffers
        for (const clip of clipsWithAudio) {
          try {
            const resp = await fetch(clip.audioUrl);
            const arrayBuf = await resp.arrayBuffer();
            const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
            const source = audioCtx.createBufferSource();
            source.buffer = audioBuf;
            const gain = audioCtx.createGain();
            gain.gain.value = Math.max(0, Math.min(1, clip.volume ?? 1));
            source.connect(gain);
            gain.connect(audioDest);
            // Schedule playback at clip start
            source.start(audioCtx.currentTime + clip.start, 0, clip.duration);
          } catch (e) {
            console.warn("Could not mix audio clip into export:", clip.id, e);
          }
        }
      } catch (err) {
        console.warn("Audio mixing initialization failed:", err);
      }
    }

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
      try {
        audioCtx?.close();
      } catch {}
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
  };

  void startRecording();
  return null;
}
