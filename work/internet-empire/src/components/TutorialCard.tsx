import { useState } from "react";
import type { GameState } from "@/sim";

const STEPS = [
  "Queue actions on the Desk, then press End month. You get 3 action points each month.",
  "Build a website and grab a domain before spending big on ads.",
  "Watch cash and runway in Finance. Your goal is to reach December 2030 still relevant.",
];

export function TutorialCard({ state }: { state: GameState }) {
  const key = "internet-empire-tutorial-done";
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(key) === "1" || state.calendar.index > 2;
    } catch {
      return state.calendar.index > 2;
    }
  });

  if (dismissed || state.calendar.index > 5) return null;
  const step = Math.min(state.calendar.index, STEPS.length - 1);

  return (
    <div className="ie-tutorial" role="note">
      <strong>Tip {step + 1}/{STEPS.length}</strong>
      <p>{STEPS[step]}</p>
      <button
        type="button"
        className="ie-link-btn"
        onClick={() => {
          localStorage.setItem(key, "1");
          setDismissed(true);
        }}
      >
        Got it
      </button>
    </div>
  );
}