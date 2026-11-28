import { useGameStore } from "@/store/gameStore";

export function SetupScreen() {
  const setup = useGameStore((s) => s.newGameSetup);
  const patchSetup = useGameStore((s) => s.patchSetup);
  const startGame = useGameStore((s) => s.startGame);
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <section className="ie-setup">
      <button type="button" className="ie-link-btn" onClick={() => setScreen("menu")}>
        ← Back
      </button>
      <h2>Found your company</h2>
      <label>
        Company name
        <input
          value={setup.companyName}
          onChange={(e) => patchSetup({ companyName: e.target.value })}
          maxLength={48}
          placeholder="Netscape killer"
        />
      </label>
      <label>
        Mode
        <select
          value={setup.mode}
          onChange={(e) => patchSetup({ mode: e.target.value as "career" | "sandbox" })}
        >
          <option value="career">Career</option>
          <option value="sandbox">Sandbox</option>
        </select>
      </label>
      {setup.mode === "sandbox" && (
        <>
          <label>
            Start year
            <input
              type="number"
              min={1995}
              max={2028}
              value={setup.startYear}
              onChange={(e) => patchSetup({ startYear: Number(e.target.value) })}
            />
          </label>
          <label>
            Starting cash
            <input
              type="number"
              min={5000}
              step={1000}
              value={setup.startingCash}
              onChange={(e) => patchSetup({ startingCash: Number(e.target.value) })}
            />
          </label>
        </>
      )}
      <button type="button" className="ie-btn ie-btn-primary" onClick={() => startGame()}>
        Start in {setup.mode === "sandbox" ? setup.startYear : 1995}
      </button>
    </section>
  );
}