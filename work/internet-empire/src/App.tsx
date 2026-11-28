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

  return (
    <div className={`ie-root ${skinClass}`} {...(state ? skinAttrs(state, simplifiedUi) : {})}>
      <label className="ie-a11y-toggle">
        <input
          type="checkbox"
          checked={simplifiedUi}
          onChange={(e) => setSimplifiedUi(e.target.checked)}
        />
        Simplified modern UI
      </label>
      {screen === "menu" && <MenuScreen />}
      {screen === "setup" && <SetupScreen />}
      {screen === "game" && state && <GameShell state={state} />}
      {screen === "end" && state && <EndScreen state={state} />}
    </div>
  );
}