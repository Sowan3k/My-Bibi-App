"use client";

/**
 * Ambient background — petals, sparkles and hearts drifting slowly down
 * behind the whole dashboard. Pure CSS, pointer-events-none, very low
 * opacity so content stays perfectly readable; disabled automatically
 * for prefers-reduced-motion (global rule in globals.css).
 *
 * Deterministic layout (no Math.random in render → no hydration mismatch).
 * Negative delays pre-scatter the particles so the sky is never empty.
 */

const PARTICLES: {
  glyph: string;
  left: string;
  size: string;
  duration: string;
  delay: string;
  opacity: string;
}[] = [
  { glyph: "🌸", left: "4%", size: "text-xl", duration: "70s", delay: "-12s", opacity: "opacity-[0.09]" },
  { glyph: "✨", left: "13%", size: "text-sm", duration: "55s", delay: "-40s", opacity: "opacity-[0.10]" },
  { glyph: "🤍", left: "22%", size: "text-base", duration: "85s", delay: "-25s", opacity: "opacity-[0.08]" },
  { glyph: "🌸", left: "33%", size: "text-2xl", duration: "95s", delay: "-60s", opacity: "opacity-[0.07]" },
  { glyph: "✨", left: "44%", size: "text-xs", duration: "60s", delay: "-8s", opacity: "opacity-[0.10]" },
  { glyph: "🌷", left: "55%", size: "text-lg", duration: "80s", delay: "-48s", opacity: "opacity-[0.08]" },
  { glyph: "🤍", left: "64%", size: "text-sm", duration: "65s", delay: "-30s", opacity: "opacity-[0.09]" },
  { glyph: "🌸", left: "74%", size: "text-xl", duration: "90s", delay: "-70s", opacity: "opacity-[0.08]" },
  { glyph: "✨", left: "84%", size: "text-base", duration: "58s", delay: "-18s", opacity: "opacity-[0.10]" },
  { glyph: "🌸", left: "93%", size: "text-lg", duration: "75s", delay: "-52s", opacity: "opacity-[0.09]" },
];

export default function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden z-0 select-none"
    >
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className={`ambient-particle ${p.size} ${p.opacity}`}
          style={{
            left: p.left,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        >
          {p.glyph}
        </span>
      ))}
    </div>
  );
}
