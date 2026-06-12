"use client";

/**
 * Animated ASCII-art background for auth pages.
 * A couple holding hands under a beating ASCII heart, with "<3" particles
 * drifting up like bubbles. Pure text, pure CSS — soft enough that the
 * form above stays perfectly readable.
 */

const HEART_ART = [
  "    .:::.   .:::.    ",
  "   :::::::.:::::::   ",
  "   :::::::::::::::   ",
  "    ':::::::::::'    ",
  "      ':::::::'      ",
  "        ':::'        ",
  "          '          ",
].join("\n");

const COUPLE_ART = [
  "   o                 o   ",
  "  /|\\_______________/|\\  ",
  "  / \\               / \\  ",
].join("\n");

// Deterministic particle layout (no Math.random → no hydration mismatch)
const PARTICLES: { left: string; delay: string; duration: string; size: string }[] = [
  { left: "6%", delay: "0s", duration: "14s", size: "text-sm" },
  { left: "16%", delay: "3.5s", duration: "17s", size: "text-xs" },
  { left: "26%", delay: "7s", duration: "13s", size: "text-base" },
  { left: "38%", delay: "1.5s", duration: "18s", size: "text-xs" },
  { left: "48%", delay: "9s", duration: "15s", size: "text-sm" },
  { left: "58%", delay: "5s", duration: "12s", size: "text-xs" },
  { left: "68%", delay: "11s", duration: "16s", size: "text-base" },
  { left: "78%", delay: "2.5s", duration: "14s", size: "text-sm" },
  { left: "88%", delay: "6.5s", duration: "19s", size: "text-xs" },
  { left: "94%", delay: "10s", duration: "13s", size: "text-sm" },
];

export default function AsciiCoupleBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {/* Soft radial glow behind the art */}
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,hsl(var(--brand-300)/0.08),transparent_65%)]" />

      {/* The couple, centered */}
      <div className="absolute inset-0 flex flex-col items-center justify-center animate-float">
        <pre className="font-mono text-[11px] sm:text-sm leading-[1.05] text-brand-400/40 dark:text-brand-300/30 animate-heartbeat [animation-duration:2.4s]">
          {HEART_ART}
        </pre>
        <pre className="font-mono text-[11px] sm:text-sm leading-[1.05] text-brand-400/35 dark:text-brand-300/25 mt-1">
          {COUPLE_ART}
        </pre>
      </div>

      {/* Rising <3 particles */}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className={`ascii-heart font-mono ${p.size} text-brand-400/30 dark:text-brand-300/25`}
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        >
          {"<3"}
        </span>
      ))}
    </div>
  );
}
