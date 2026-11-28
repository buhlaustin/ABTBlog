import { useGameStore } from "@/store/gameStore";

export function FlashBar() {
  const flash = useGameStore((s) => s.flash);
  const clearFlash = useGameStore((s) => s.clearFlash);
  if (!flash) return null;
  return (
    <p className="ie-flash" role="status">
      {flash}
      <button type="button" className="ie-link-btn" onClick={() => clearFlash()}>
        dismiss
      </button>
    </p>
  );
}