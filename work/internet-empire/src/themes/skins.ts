import type { GameState } from "@/sim";
import { uiSkinFromState } from "@/sim/eras";

export function skinAttrs(state: GameState, simplified: boolean): Record<string, string> {
  if (simplified) return { "data-ui-skin": "enterprise" };
  return { "data-ui-skin": uiSkinFromState(state) };
}

export const SKIN_CLASSES: Record<string, string> = {
  win95: "ie-skin-win95 min-h-screen bg-[#008080] text-black font-win95",
  dotcom: "ie-skin-dotcom min-h-screen bg-gradient-to-b from-indigo-500 to-purple-600 text-white font-dotcom",
  "dotcom-bust": "ie-skin-dotcom-bust min-h-screen bg-gradient-to-b from-slate-600 to-slate-800 text-slate-100 font-dotcom",
  web2: "ie-skin-web2 min-h-screen bg-slate-100 text-slate-800 font-web2",
  mobile: "ie-skin-mobile min-h-screen bg-zinc-900 text-zinc-100",
  platform: "ie-skin-platform min-h-screen bg-slate-50 text-slate-900",
  enterprise: "ie-skin-enterprise min-h-screen bg-zinc-950 text-zinc-100",
};