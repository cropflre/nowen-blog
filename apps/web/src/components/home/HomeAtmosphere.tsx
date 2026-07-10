export function HomeAtmosphere() {
  return (
    <div className="nowen-atmosphere" aria-hidden="true">
      <div className="absolute left-1/2 top-0 h-px w-[min(72rem,94vw)] -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />
      <div className="absolute left-1/2 top-36 h-[28rem] w-[min(64rem,92vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-primary)_8%,transparent),transparent_68%)] blur-3xl" />
    </div>
  );
}
