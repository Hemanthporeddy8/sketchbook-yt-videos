import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { useStudio2d, type Sel2D } from "./store2d";

const objRefs = new Map<string, SVGGElement>();
import { Figure2D, applyFigure, figRegistry } from "./rig2d";
import { BackgroundArt, ObjectArt } from "./art2d";
import { OBJECT_PALETTES } from "./gen2d";
import { clock2d, dimsOf, evalActor, evalCamera, evalObj, groundOf, projectDuration, sceneAt, sortedClips } from "./anim2d";
import { setStageSvg } from "./recorder2d";
import { fitAspect } from "../three/SceneView";
import type { Obj2D } from "./types2d";
import { liveMocap2D } from "./mocap2d";
import { voiceEngine } from "./voiceEngine";
import { isSpeaking, speakBrowser, stopSpeaking } from "./speech2d";

type Drag = { kind: "actor" | "object"; id: string; dx: number; dy: number };

function ComparisonBadge({
  x,
  y,
  title,
  height,
  sub,
  groundY,
  itemTopY,
}: {
  x: number;
  y: number;
  title: string;
  height?: string;
  sub?: string;
  groundY: number;
  itemTopY: number;
}) {
  const badgeW = Math.max(160, Math.min(260, title.length * 9.5 + 40));
  const badgeH = sub ? 56 : 42;
  const bx = x - badgeW / 2;
  const by = y - badgeH - 12;

  return (
    <g pointerEvents="none" className="select-none">
      {/* Vertical height measurement bracket / arrow line */}
      <line
        x1={x + badgeW / 2 + 10}
        y1={itemTopY}
        x2={x + badgeW / 2 + 10}
        y2={groundY}
        stroke="#f59e0b"
        strokeWidth={2}
        strokeDasharray="4 3"
        opacity={0.85}
      />
      <line x1={x + badgeW / 2 + 4} y1={itemTopY} x2={x + badgeW / 2 + 16} y2={itemTopY} stroke="#f59e0b" strokeWidth={2.5} />
      <line x1={x + badgeW / 2 + 4} y1={groundY} x2={x + badgeW / 2 + 16} y2={groundY} stroke="#f59e0b" strokeWidth={2.5} />

      {/* Floating dark glass comparison card */}
      <rect
        x={bx}
        y={by}
        width={badgeW}
        height={badgeH}
        rx={7}
        fill="rgba(15, 23, 42, 0.92)"
        stroke="#f59e0b"
        strokeWidth={1.5}
      />
      {/* Glowing amber accent dot */}
      <circle cx={bx + 12} cy={by + 14} r={3.5} fill="#f59e0b" />
      {/* Item title */}
      <text
        x={bx + 22}
        y={by + 18}
        fill="#f8fafc"
        fontSize={10.5}
        fontWeight={800}
        fontFamily="Inter, system-ui, sans-serif"
        letterSpacing="0.04em"
      >
        {title.toUpperCase()}
      </text>
      {/* Height measurement */}
      {height && (
        <text
          x={bx + 12}
          y={by + 33}
          fill="#fbbf24"
          fontSize={13}
          fontWeight={900}
          fontFamily="Inter, system-ui, sans-serif"
        >
          {height}
        </text>
      )}
      {/* Comparison ratio / subtitle */}
      {sub && (
        <text
          x={bx + 12}
          y={by + 47}
          fill="#94a3b8"
          fontSize={9}
          fontWeight={600}
          fontFamily="Inter, system-ui, sans-serif"
        >
          {sub}
        </text>
      )}
      {/* Anchor triangle pointer pointing down */}
      <polygon
        points={`${x - 5},${by + badgeH} ${x + 5},${by + badgeH} ${x},${by + badgeH + 6}`}
        fill="#f59e0b"
      />
    </g>
  );
}

function ObjectNode({ o, selected, onDown }: { o: Obj2D; selected: boolean; onDown: (e: RPointerEvent<SVGGElement>) => void }) {
  const flip = o.flip ? -1 : 1;
  return (
    <g
      ref={(el) => {
        if (el) objRefs.set(o.id, el);
        else objRefs.delete(o.id);
      }}
      transform={`translate(${o.x} ${o.y}) rotate(${o.rotation}) scale(${o.scale * flip} ${o.scale})`}
      onPointerDown={onDown}
      style={{ cursor: "grab" }}
    >
      {o.src ? (
        <image href={o.src} x={-140} y={-280} width={280} height={280} preserveAspectRatio="xMidYMax meet" />
      ) : (
        <ObjectArt family={o.family} pal={OBJECT_PALETTES[o.palette % OBJECT_PALETTES.length]} variant={o.variant} />
      )}
      {selected && <rect x={-118} y={-235} width={236} height={242} fill="none" stroke="#e87d0d" strokeWidth={3} strokeDasharray="8 6" />}
    </g>
  );
}

/** The 2D stage. Renders the scene and every character, and drives them from the timeline clock every frame. */
export function Stage2D() {
  const actors = useStudio2d((s) => s.actors);
  const objects = useStudio2d((s) => s.objects);
  const scene = useStudio2d((s) => s.scene);
  const aspect = useStudio2d((s) => s.aspect);
  const selected = useStudio2d((s) => s.selected);
  const playing = useStudio2d((s) => s.playing);
  const select = useStudio2d((s) => s.select);
  const patchActor = useStudio2d((s) => s.patchActor);
  const patchObject = useStudio2d((s) => s.patchObject);
  const cameraClips = useStudio2d((s) => s.cameraClips);
  const showRulerGrid = useStudio2d((s) => s.showRulerGrid);
  const setShowRulerGrid = useStudio2d((s) => s.setShowRulerGrid);

  const [W, H] = dimsOf(aspect);
  const gy = groundOf(aspect);
  const gyRef = useRef(gy);
  gyRef.current = gy;
  const [showRuler, setShowRuler] = useState(true);
  const [full, setFull] = useState(false);
  const [curScene, setCurScene] = useState<{ kind: number; palette: number }>({ kind: scene.kind, palette: scene.palette });
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const selWalk = useStudio2d((s) => {
    if (s.selected?.kind !== "clip") return null;
    const c = s.clips.find((x) => x.id === s.selected?.id);
    return c && c.kind === "walk" ? c : null;
  });
  const selScene = useStudio2d((s) => {
    if (s.selected?.kind !== "clip") return null;
    const c = s.sceneClips.find((x) => x.id === s.selected?.id);
    return c ?? null;
  });
  const selPos = useStudio2d((s) => {
    if (s.selected?.kind === "actor") {
      const a = s.actors.find((x) => x.id === s.selected?.id);
      return a ? `x=${Math.round(a.x)} y=${groundOf(s.aspect)}` : null;
    }
    if (s.selected?.kind === "object") {
      const o = s.objects.find((x) => x.id === s.selected?.id);
      return o ? `x=${Math.round(o.x)} y=${Math.round(o.y)}` : null;
    }
    if (s.selected?.kind === "clip") {
      const c = s.sceneClips.find((x) => x.id === s.selected?.id);
      return c ? `Scene @ ${c.start.toFixed(1)}s` : null;
    }
    return null;
  });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((es) => {
      const r = es[0].contentRect;
      setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onFs = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    setFull(!!document.fullscreenElement);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrapRef.current?.requestFullscreen?.();
  };

  // Animation clock + pose writer + scene change.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let uiAcc = 0;
    let wasPlaying = false;
    const spokenClips = new Set<string>();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const st = useStudio2d.getState();
      if (st.playing) {
        wasPlaying = true;
        clock2d.t += dt;
        const dur = projectDuration(st.clips, st.audioClips, st.cameraClips);
        if (clock2d.t >= dur) {
          stopSpeaking();
          spokenClips.clear();
          if (st.loop) clock2d.t = 0;
          else {
            clock2d.t = dur;
            st.setPlaying(false);
          }
        }
      } else {
        if (wasPlaying) {
          stopSpeaking();
          spokenClips.clear();
          wasPlaying = false;
        }
        clock2d.t = st.t;
      }
      // remove characters whose clips have all finished (autoRemove)
      const deadActors = st.actors.filter((a) => {
        if (!a.autoRemove) return false;
        const mine = st.clips.filter((c) => c.actorId === a.id);
        if (mine.length === 0) return false;
        const end = Math.max(...mine.map((c) => c.start + c.duration));
        return clock2d.t >= end;
      });
      if (deadActors.length > 0) {
        const remove = st.removeActorById;
        deadActors.forEach((a) => remove(a.id));
      }
      if (st.audioClips && st.audioClips.length > 0) {
        voiceEngine.syncPlayback(st.audioClips, clock2d.t, st.playing);
      } else {
        voiceEngine.stopAllPlayback();
      }

      for (const a of st.actors) {
        const d = figRegistry.get(a.id);
        if (!d) continue;
        const frame = evalActor(a, sortedClips(st.clips, a.id), clock2d.t);
        frame.species = a.species;

        // 1. Live Mocap & Live Dubbing Lip-Sync
        if (st.liveMocapActorId === a.id) {
          if (liveMocap2D.active && liveMocap2D.face) {
            frame.face = {
              ...frame.face,
              ...liveMocap2D.face,
            };
            if (liveMocap2D.headRoll) {
              frame.angles.head = (frame.angles.head ?? 0) + liveMocap2D.headRoll;
            }
          }
          const micVol = voiceEngine.getMicVolume();
          if (micVol > 0.04) {
            frame.face.jaw = Math.max(frame.face.jaw ?? 0, Math.min(1, micVol * 3.5));
            frame.face.talk = frame.face.jaw > 0.15;
          }
        }

        // 2. Recorded Audio Clips & Mocap Keyframes
        const activeClip = st.audioClips?.find(
          (c) => c.actorId === a.id && clock2d.t >= c.start && clock2d.t < c.start + c.duration,
        );
        if (activeClip) {
          if (activeClip.mocapFrames && activeClip.mocapFrames.length > 0) {
            const relT = clock2d.t - activeClip.start;
            const frames = activeClip.mocapFrames;
            let best = frames[0];
            for (let i = 1; i < frames.length; i++) {
              if (Math.abs(frames[i].t - relT) < Math.abs(best.t - relT)) {
                best = frames[i];
              }
            }
            if (best && best.face) {
              frame.face = {
                ...frame.face,
                ...(best.face as any),
              };
              if (best.head) {
                frame.angles.head = (frame.angles.head ?? 0) + best.head;
              }
            }
          } else {
            const flap = 0.35 + Math.sin(clock2d.t * 22) * 0.3;
            frame.face.jaw = Math.max(frame.face.jaw ?? 0, flap);
            frame.face.talk = true;
          }
        }

        // 3. Live Speech Synthesis for Speech Bubbles (Option A)
        if (!activeClip && st.playing) {
          const speechActionClip = st.clips.find(
            (c) => c.actorId === a.id && clock2d.t >= c.start && clock2d.t < c.start + c.duration && c.say && c.say.trim()
          );
          if (speechActionClip && speechActionClip.say) {
            if (!spokenClips.has(speechActionClip.id)) {
              spokenClips.add(speechActionClip.id);
              speakBrowser(speechActionClip.say, {
                preset: a.voicePreset,
                pitch: a.voicePitch,
                rate: a.voiceRate,
                lang: a.voiceLang,
              });
            }
            if (isSpeaking()) {
              const flap = 0.35 + Math.sin(clock2d.t * 22) * 0.3;
              frame.face.jaw = Math.max(frame.face.jaw ?? 0, flap);
              frame.face.talk = true;
            }
          }
        }

        applyFigure(d, frame, gyRef.current + (a.y ?? 0), a.scale, frame.rotation ?? (a.rotation ?? 0));
      }
      for (const o of st.objects) {
        const el = objRefs.get(o.id);
        if (!el) continue;
        const driveClips = st.clips.filter((c) => c.actorId === o.id && c.kind === "drive");
        const f = evalObj(o, driveClips, clock2d.t);
        const flip = o.flip ? -1 : 1;
        el.setAttribute("transform", `translate(${f.x} ${o.y - f.bob}) rotate(${o.rotation}) scale(${o.scale * flip} ${o.scale})`);
        const wheels = el.querySelectorAll(".car-wheel");
        wheels.forEach((w) => w.setAttribute("transform", `rotate(${f.wheelAngle})`));

        if (o.driverId) {
          const driverFig = figRegistry.get(o.driverId);
          if (driverFig?.outer) {
            driverFig.outer.setAttribute("transform", `translate(${f.x + 38 * flip} ${o.y - f.bob - 22}) scale(${0.72 * flip} 0.72)`);
          }
        }
      }
      // scene change: last scene clip containing t, else the default scene
      const sc = sceneAt(st.sceneClips, st.scene, clock2d.t);
      setCurScene((prev) => (prev.kind === sc.kind && prev.palette === sc.palette ? prev : sc));

      // Dynamic 60fps camera pan & zoom
      if (svgRef.current) {
        const cam = evalCamera(st.cameraClips, st.actors, st.objects, clock2d.t, st.aspect, st.clips);
        svgRef.current.setAttribute("viewBox", `${cam.vx} ${cam.vy} ${cam.vw} ${cam.vh}`);
      }
      uiAcc += dt;
      if (uiAcc > 0.1) {
        uiAcc = 0;
        if (Math.abs(st.t - clock2d.t) > 0.01) st.setT(clock2d.t);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      voiceEngine.stopAllPlayback();
      stopSpeaking();
    };
  }, []);

  const toPt = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const m = svg.getScreenCTM();
    if (!m) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(m.inverse());
  };

  const onStageDown = (e: RPointerEvent<SVGSVGElement>) => {
    const st = useStudio2d.getState();
    if (st.selected?.kind === "clip") {
      const c = st.clips.find((x) => x.id === st.selected?.id);
      if (c && c.kind === "walk") {
        const p = toPt(e);
        if (p) st.patchClip(c.id, { toX: Math.round(p.x) });
        return;
      }
    }
    select(null);
  };

  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const p = toPt(e);
    if (!p) return;
    if (d.kind === "actor") patchActor(d.id, { x: Math.round(p.x + d.dx), y: Math.round(p.y - gyRef.current + d.dy) });
    else patchObject(d.id, { x: Math.round(p.x + d.dx), y: Math.round(p.y + d.dy) });
  };

  const { w, h } = fitAspect(box.w - 24, box.h - 24, W / H);

  const initCam = evalCamera(cameraClips, actors, objects, clock2d.t, aspect, useStudio2d.getState().clips);

  return (
    <div ref={wrapRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#121417]">
      <div className="relative overflow-hidden shadow-2xl ring-1 ring-black/60" style={{ width: w || "100%", height: h || "100%" }}>
        {w > 0 && (
          <svg
            ref={(el) => {
              svgRef.current = el;
              setStageSvg(el);
            }}
            viewBox={`${initCam.vx} ${initCam.vy} ${initCam.vw} ${initCam.vh}`}
            width="100%"
            height="100%"
            className="block select-none"
            onPointerMove={onMove}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onPointerLeave={() => {
              dragRef.current = null;
            }}
            onPointerDown={onStageDown}
          >
            <BackgroundArt kind={curScene.kind} palette={curScene.palette} W={W} H={H} gy={gy} image={scene.image} />
            {actors
              .filter((a) => a.depth === 0)
              .map((a) => (
                <Figure2D
                  key={a.id}
                  actor={a}
                  selected={selected?.kind === "actor" && selected.id === a.id}
                  onDown={(e) => {
                    e.stopPropagation();
                    select({ kind: "actor", id: a.id });
                    if (playing) return;
                    const p = toPt(e);
                    if (p) dragRef.current = { kind: "actor", id: a.id, dx: a.x - p.x, dy: (a.y ?? 0) - (p.y - gyRef.current) };
                  }}
                />
              ))}
            {objects.map((o) => {
              const sel: Sel2D = { kind: "object", id: o.id };
              return (
                <ObjectNode
                  key={o.id}
                  o={o}
                  selected={selected?.kind === "object" && selected.id === o.id}
                  onDown={(e) => {
                    e.stopPropagation();
                    select(sel);
                    const p = toPt(e);
                    if (p) dragRef.current = { kind: "object", id: o.id, dx: o.x - p.x, dy: o.y - p.y };
                  }}
                />
              );
            })}
            {actors
              .filter((a) => a.depth > 0)
              .map((a) => (
                <Figure2D
                  key={a.id}
                  actor={a}
                  selected={selected?.kind === "actor" && selected.id === a.id}
                  onDown={(e) => {
                    e.stopPropagation();
                    select({ kind: "actor", id: a.id });
                    if (playing) return;
                    const p = toPt(e);
                    if (p) dragRef.current = { kind: "actor", id: a.id, dx: a.x - p.x, dy: (a.y ?? 0) - (p.y - gyRef.current) };
                  }}
                />
              ))}

            {/* Altitude ruler measurement grid for comparison videos */}
            {showRulerGrid && (
              <g pointerEvents="none" className="select-none">
                <line x1={-3000} y1={gy} x2={W + 3000} y2={gy} stroke="#f59e0b" strokeWidth={2.5} />
                <text x={30} y={gy - 8} fill="#f59e0b" fontSize={12} fontWeight={800} fontFamily="monospace">
                  0 m · GROUND LEVEL
                </text>
                {[
                  { h: 30, label: "5 m" },
                  { h: 60, label: "10 m" },
                  { h: 120, label: "25 m" },
                  { h: 180, label: "50 m" },
                  { h: 250, label: "100 m" },
                  { h: 320, label: "200 m" },
                  { h: 390, label: "330 m (Eiffel Tower)" },
                  { h: 460, label: "500 m" },
                  { h: 540, label: "828 m (Burj Khalifa)" },
                ].map((r, i) => (
                  <g key={i}>
                    <line
                      x1={-3000}
                      y1={gy - r.h}
                      x2={W + 3000}
                      y2={gy - r.h}
                      stroke="rgba(245, 158, 11, 0.4)"
                      strokeWidth={1}
                      strokeDasharray="6 4"
                    />
                    <rect
                      x={20}
                      y={gy - r.h - 11}
                      width={r.label.length * 8.5 + 16}
                      height={18}
                      rx={4}
                      fill="rgba(15, 23, 42, 0.88)"
                      stroke="#f59e0b"
                      strokeWidth={1}
                    />
                    <text
                      x={28}
                      y={gy - r.h + 2}
                      fill="#fbbf24"
                      fontSize={10.5}
                      fontWeight={700}
                      fontFamily="monospace"
                    >
                      {r.label}
                    </text>
                  </g>
                ))}
              </g>
            )}

            {/* Scale comparison callout badges for actors */}
            {actors.map((a) => {
              if (!a.showStat && !a.statTitle && !a.statHeight) return null;
              const groundY = gy + (a.y ?? 0);
              const itemTopY = groundY - 330 * (a.scale || 1);
              return (
                <ComparisonBadge
                  key={`stat-act-${a.id}`}
                  x={a.x}
                  y={itemTopY}
                  title={a.statTitle || a.name}
                  height={a.statHeight}
                  sub={a.statSub}
                  groundY={groundY}
                  itemTopY={itemTopY}
                />
              );
            })}

            {/* Scale comparison callout badges for objects */}
            {objects.map((o) => {
              if (!o.showStat && !o.statTitle && !o.statHeight) return null;
              const estH = o.family === 60 ? 560 : o.family === 61 ? 380 : o.family === 62 ? 280 : 200;
              const itemTopY = o.y - estH * (o.scale || 1);
              return (
                <ComparisonBadge
                  key={`stat-obj-${o.id}`}
                  x={o.x}
                  y={itemTopY}
                  title={o.statTitle || o.name}
                  height={o.statHeight}
                  sub={o.statSub}
                  groundY={o.y}
                  itemTopY={itemTopY}
                />
              );
            })}

            {showRuler && (
              <g pointerEvents="none">
                {Array.from({ length: Math.floor(W / 100) + 1 }, (_, i) => i * 100).map((x) => (
                  <g key={`x${x}`}>
                    <line x1={x} y1={0} x2={x} y2={x % 200 === 0 ? 20 : 11} stroke="rgba(255,255,255,0.75)" strokeWidth={1} />
                    {x % 200 === 0 && (
                      <text x={x + 5} y={34} fontSize={17} fill="rgba(255,255,255,0.9)" fontFamily="monospace">
                        {x}
                      </text>
                    )}
                  </g>
                ))}
                {Array.from({ length: Math.floor(H / 100) + 1 }, (_, i) => i * 100).map((y) => (
                  <g key={`y${y}`}>
                    <line x1={0} y1={y} x2={y % 200 === 0 ? 20 : 11} y2={y} stroke="rgba(255,255,255,0.75)" strokeWidth={1} />
                    {y % 200 === 0 && (
                      <text x={26} y={y - 5} fontSize={17} fill="rgba(255,255,255,0.9)" fontFamily="monospace">
                        {y}
                      </text>
                    )}
                  </g>
                ))}
              </g>
            )}
            {selWalk && (
              <g pointerEvents="none">
                <line x1={selWalk.toX} y1={0} x2={selWalk.toX} y2={H} stroke="#34d399" strokeWidth={2} strokeDasharray="8 6" />
                <text x={selWalk.toX + 8} y={46} fontSize={19} fill="#34d399" fontFamily="monospace" fontWeight={700}>
                  x={Math.round(selWalk.toX)}
                </text>
              </g>
            )}
            {selScene && (
              <g pointerEvents="none">
                <rect
                  x={(W - 190) / 2}
                  y={H - 118}
                  width={190}
                  height={54}
                  rx={10}
                  fill="rgba(0,0,0,0.55)"
                  stroke="#e87d0d"
                  strokeWidth={2}
                />
                <text x={W / 2} y={H - 86} textAnchor="middle" fontSize={20} fill="#ffb36b" fontWeight={700} fontFamily="Inter, sans-serif">
                  SCENE CHANGE
                </text>
              </g>
            )}
          </svg>
        )}
        <div className="pointer-events-none absolute left-2 top-2 flex gap-1.5">
          <span className="rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-200">{aspect}</span>
          <span className={`rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide ${playing ? "bg-emerald-500/90 text-black" : "bg-[#e87d0d]/90 text-black"}`}>
            {playing ? "PLAY" : "EDIT"}
          </span>
        </div>
        <div className="absolute right-2 top-2 flex gap-1.5">
          {selPos && <span className="rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-emerald-300">{selPos}</span>}
          <button
            onClick={() => setShowRulerGrid(!showRulerGrid)}
            className={`rounded px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1 transition ${
              showRulerGrid ? "bg-amber-400 text-black font-bold shadow" : "bg-black/60 text-amber-200/80 hover:bg-black/80"
            }`}
            title="Toggle Scale Comparison Altitude Grid (0m - 828m)"
          >
            📏 Height Ruler {showRulerGrid ? "ON" : "OFF"}
          </button>
          <button onClick={() => setShowRuler((v) => !v)} className={`rounded px-2 py-0.5 text-[10px] font-semibold ${showRuler ? "bg-[#e87d0d] text-black" : "bg-black/60 text-slate-300"}`} title="Show or hide the position ruler">
            XY Ruler
          </button>
          <button onClick={toggleFull} className="flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-slate-200 hover:bg-black/80" title="Fullscreen">
            {full ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            {full ? "Exit" : "Fullscreen"}
          </button>
        </div>
      </div>
    </div>
  );
}

