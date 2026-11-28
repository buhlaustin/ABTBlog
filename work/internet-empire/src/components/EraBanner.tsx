import type { GameState } from "@/sim";
import { eraAt, uiSkinFromState } from "@/sim/eras";

const TAGLINES: Record<string, string> = {
  win95: "Where do you want to go today?",
  dotcom: "Get big fast — then explain it to investors.",
  "dotcom-bust": "We are temporarily over capacity. Please try again never.",
  web2: "Beta forever. Users create the content.",
  mobile: "There's an app for that. Is there a website?",
  platform: "Take rate now, trust later.",
  enterprise: "AI strategy slide deck loading…",
};

export function EraBanner({ state }: { state: GameState }) {
  const skin = uiSkinFromState(state);
  const era = eraAt(state.calendar.year);
  const line = TAGLINES[skin] ?? era.label;
  return (
    <p className="ie-era-banner" data-skin={skin}>
      {line}
    </p>
  );
}