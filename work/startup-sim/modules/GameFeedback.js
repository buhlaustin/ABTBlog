/** Persistent action feedback — survives panel re-renders on refresh(). */

let flash = { message: '', isError: false };

export function setGameFeedback(message, isError = false) {
  flash = { message: String(message ?? ''), isError: Boolean(isError) };
  paintGameFeedback();
}

export function clearGameFeedback() {
  flash = { message: '', isError: false };
  paintGameFeedback();
}

export function paintGameFeedback() {
  const el = document.getElementById('game-flash');
  if (!el) return;
  el.textContent = flash.message;
  el.hidden = !flash.message;
  el.classList.toggle('error', flash.isError);
}
