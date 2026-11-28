import { GameShell } from "@/components/GameShell";
import { SKIN_CLASSES, skinAttrs } from "@/themes/skins";
import { useGameStore } from "@/store/gameStore";
import { uiSkinFromState } from "@/sim/eras";
import { EndScreen } from "@/screens/EndScreen";
import { MenuScreen } from "@/screens/MenuScreen";
import { SetupScreen } from "@/screens/SetupScreen";

export function App() {
  const screen = useGameStore((s) => s.screen);
  const state = useGameStore((s) => s.state);
  const simplifiedUi = useGameStore((s) => s.simplifiedUi);
  const setSimplifiedUi = useGameStore((s) => s.setSimplifiedUi);

  const skinKey =
    screen === "game" && state
      ? simplifiedUi
        ? "enterprise"
        : uiSkinFromState(state)
      : "win95";
  const skinClass = SKIN_CLASSES[skinKey] ?? SKIN_CLASSES.win95;

  const win95Chrome = skinKey === "win95" && screen === "game";

  return (
    <div className={`ie-root ${skinClass}`} {...(state ? skinAttrs(state, simplifiedUi) : {})}>
      {win95Chrome && (
        <div className="ie-win95-taskbar">
          <span>Start</span>
          <span className="ie-win95-taskbar-title">Internet Empire</span>
        </div>
      )}
      <label className="ie-a11y-toggle">
        <input
          type="checkbox"
          checked={simplifiedUi}
          onChange={(e) => setSimplifiedUi(e.target.checked)}
        />
        Simplified modern UI
      </label>
      <div className={win95Chrome ? "ie-win95-window" : undefined}>
        {screen === "menu" && <MenuScreen />}
        {screen === "setup" && <SetupScreen />}
        {screen === "game" && state && <GameShell state={state} />}
        {screen === "end" && state && <EndScreen state={state} />}
      </div>
    </div>
  );
}