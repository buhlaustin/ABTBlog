import { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";

export function MenuScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const loadSave = useGameStore((s) => s.loadSave);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    setHasSave(!!localStorage.getItem("internet-empire-save-v1"));
  }, []);

  return (
    <section className="ie-menu">
      <p className="ie-eyebrow">Browser tycoon</p>
      <h1>Internet Empire</h1>
      <p className="ie-lede">Build the internet. One startup at a time.</p>
      <p className="ie-muted">1995 dial-up → 2030 AI era. Monthly strategy. Deterministic sim.</p>
      <div className="ie-menu-actions">
        <button type="button" className="ie-btn ie-btn-primary" onClick={() => setScreen("setup")}>
          New game
        </button>
        <button
          type="button"
          className="ie-btn"
          disabled={!hasSave}
          onClick={() => loadSave()}
        >
          Continue
        </button>
      </div>
    </section>
  );
}