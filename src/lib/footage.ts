import { uid } from "./util";

/**
 * Imported video footage (for example a sandbox recording).
 * Files live in memory for this session; the timeline clip remembers the id,
 * so after a page reload the clip shows "re-import" until the file is added again.
 */
const urls = new Map<string, string>();

export const footageUrl = (id: string) => urls.get(id);

function probeDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "auto";
    v.muted = true;
    let settled = false;
    const done = (d: number) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      v.removeEventListener("durationchange", check);
      v.removeAttribute("src");
      v.load();
      resolve(d);
    };
    // MediaRecorder WebM files report Infinity until seeked to the end, so handle both cases.
    const check = () => {
      if (isFinite(v.duration) && v.duration > 0) done(v.duration);
    };
    const timer = window.setTimeout(() => done(5), 8000);
    v.addEventListener("durationchange", check);
    v.onloadedmetadata = () => {
      check();
      if (!settled) v.currentTime = 1e101;
    };
    v.onerror = () => done(5);
    v.src = url;
  });
}

export async function importFootage(file: File) {
  const id = uid();
  const url = URL.createObjectURL(file);
  urls.set(id, url);
  const duration = await probeDuration(url);
  return {
    id,
    name: file.name.replace(/\.[^.]+$/, ""),
    duration: Math.max(0.5, Math.round(duration * 10) / 10),
  };
}
