import { useEffect } from "react";
import { Stage2D } from "./Stage2D";
import { Timeline2D } from "./Timeline2D";
import { Studio2DLeft, Inspector2D } from "./Panels2D";
import { useStudio2d } from "./store2d";
import { clock2d, projectDuration } from "./anim2d";

/* The 2D animation studio: character & object library (left), stage and timeline (centre), properties (right). */
export function Studio2D() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      const st = useStudio2d.getState();
      if (e.key === " ") {
        e.preventDefault();
        if (st.playing) st.setPlaying(false);
        else {
          if (clock2d.t >= projectDuration(st.clips)) clock2d.t = 0;
          st.setPlaying(true);
        }
      }
      if (e.key === "Home") {
        clock2d.t = 0;
        st.setPlaying(false);
        st.setT(0);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && st.selected) {
        e.preventDefault();
        st.removeSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-0 flex-1">
      <Studio2DLeft />
      <main className="flex min-w-0 flex-1 flex-col">
        <Stage2D />
        <Timeline2D />
      </main>
      <Inspector2D />
    </div>
  );
}
