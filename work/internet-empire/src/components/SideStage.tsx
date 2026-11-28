import { useEffect, useRef } from "react";
import type { GameState } from "@/sim";
import { uiSkinFromState } from "@/sim/eras";
import { SceneRuntime } from "@/three/SceneRuntime";

export function SideStage({ state }: { state: GameState }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<SceneRuntime | null>(null);
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduceMotion || !mountRef.current) return;
    const rt = new SceneRuntime(mountRef.current);
    runtimeRef.current = rt;
    return () => {
      rt.dispose();
      runtimeRef.current = null;
    };
  }, [reduceMotion]);

  useEffect(() => {
    runtimeRef.current?.apply({
      skin: uiSkinFromState(state),
      infraTier: state.infraTier,
      visitors: state.visitors,
      mood: state.macro.mood,
      year: state.calendar.year,
      companyName: state.companyName,
    });
  }, [state]);

  if (reduceMotion) {
    return (
      <aside className="ie-stage ie-stage-poster" aria-hidden>
        <p className="ie-stage-label">Office · {state.calendar.year}</p>
        <div className="ie-poster" data-year={state.calendar.year} />
      </aside>
    );
  }

  return (
    <aside className="ie-stage" aria-label="Office vignette">
      <p className="ie-stage-label">Side stage</p>
      <div ref={mountRef} className="ie-stage-canvas" />
    </aside>
  );
}
