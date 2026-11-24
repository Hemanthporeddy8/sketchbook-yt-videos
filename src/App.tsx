import { useEffect } from "react";
import { Header } from "./ui/Header";
import { LeftPanel } from "./ui/LeftPanel";
import { RightPanel } from "./ui/RightPanel";
import { Timeline } from "./ui/Timeline";
import { SceneView } from "./three/SceneView";
import { useStore, sceneEnd } from "./store";
import { usePlayback } from "./playback";
import { SandboxView } from "./sandbox/SandboxView";
import { SandboxLeft } from "./sandbox/SandboxLeft";
import { SandboxRight } from "./sandbox/SandboxRight";
import { MenuBar, StatusBar, ToolStrip } from "./sandbox/Chrome";
import { Studio2D } from "./twod/Studio2D";

export default function App() {
  const mode = useStore((s) => s.mode);
  useFilmShortcuts(mode === "film");

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#07080c] text-slate-200">
      <Header />
      {mode === "2d" ? (
        <Studio2D />
      ) : mode === "film" ? (
        <div className="flex min-h-0 flex-1">
          <LeftPanel />
          <main className="flex min-w-0 flex-1 flex-col">
            <SceneView />
            <Timeline />
          </main>
          <RightPanel />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <MenuBar />
          <div className="flex min-h-0 flex-1">
            <ToolStrip />
            <SandboxLeft />
            <SandboxView />
            <SandboxRight />
          </div>
          <StatusBar />
        </div>
      )}
    </div>
  );
}

/** Film-only shortcuts. The sandbox and 2D studio have their own controls. */
function useFilmShortcuts(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const st = useStore.getState();
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (mod && key === "z") {
        e.preventDefault();
        st.undo();
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        const p = usePlayback.getState();
        if (p.rec === "recording") return;
        if (p.playing) usePlayback.setState({ playing: false });
        else {
          if (p.time >= sceneEnd(st.clips, st.captions)) usePlayback.setState({ time: 0 });
          usePlayback.setState({ playing: true });
        }
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && st.selectedClipId) {
        e.preventDefault();
        st.removeClip(st.selectedClipId);
        return;
      }
      if (key === "b" && !mod) st.setMode("sandbox");
      if (e.key === "Escape") {
        st.selectChar(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);
}
