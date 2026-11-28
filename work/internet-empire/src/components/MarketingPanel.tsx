import type { GameState } from "@/sim";
import { deriveUiEra } from "@/sim/eras";
import { channelsForEra } from "@/sim/marketing";
import { laneDef } from "@/sim/lanes";

export function MarketingPanel({ state }: { state: GameState }) {
  const era = deriveUiEra(state);
  const channels = channelsForEra(era);
  const lane = laneDef(state.lane);

  return (
    <div className="ie-panel">
      <h3 className="ie-panel-title">Marketing</h3>
      <p>
        Brand <strong>{state.brand}</strong> · Lane: {lane.label} — {lane.blurb}
      </p>
      <p className="ie-muted">Ad CPM multiplier ×{state.macro.adCpm.toFixed(2)} · Mood {state.macro.mood}</p>
      <h4 className="ie-starter-head">Channels live this era</h4>
      <ul className="ie-channel-list">
        {channels.map((c) => (
          <li key={c.id}>
            <strong>{c.label}</strong>
            <span className="ie-muted block text-xs">{c.blurb}</span>
          </li>
        ))}
      </ul>
      <p className="ie-muted mt-3 text-xs">Queue growth actions from the Desk tab.</p>
    </div>
  );
}