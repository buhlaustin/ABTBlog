/** Fixed gradient blobs behind marketing routes — CSS-only motion. */
export function MarketingAmbient() {
  return (
    <div
      className="marketing-ambient pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div className="marketing-ambient__blob marketing-ambient__blob--a" />
      <div className="marketing-ambient__blob marketing-ambient__blob--b" />
      <div className="marketing-ambient__blob marketing-ambient__blob--c" />
    </div>
  );
}