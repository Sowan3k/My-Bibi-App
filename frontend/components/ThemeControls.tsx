"use client";

/**
 * Appearance controls — mode toggle (light/dark/system) + accent swatches.
 * Used in the sidebar (popover) and on auth pages (compact toggle).
 */

import { useEffect, useRef, useState } from "react";
import { Moon, Sun, MonitorSmartphone, Palette, Check } from "lucide-react";
import { ACCENTS, TEXT_SIZES, useTheme, type ThemeMode } from "@/lib/theme";

const MODES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Auto", icon: MonitorSmartphone },
];

/** Compact sun/moon button that cycles light → dark → system. */
export function ThemeToggleButton({ className = "" }: { className?: string }) {
  const { mode, resolvedDark, setMode } = useTheme();
  const next: ThemeMode =
    mode === "light" ? "dark" : mode === "dark" ? "system" : "light";

  return (
    <button
      type="button"
      onClick={() => setMode(next)}
      title={`Theme: ${mode} — click for ${next}`}
      className={`p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 ${className}`}
    >
      {mode === "system" ? (
        <MonitorSmartphone className="w-4 h-4" />
      ) : resolvedDark ? (
        <Moon className="w-4 h-4" />
      ) : (
        <Sun className="w-4 h-4" />
      )}
    </button>
  );
}

/** Full appearance panel: mode + accent swatches + text size. */
export function AppearancePanel() {
  const { mode, accent, textSize, setMode, setAccent, setTextSize } =
    useTheme();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Mode</p>
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all duration-200 ${
                mode === m.value
                  ? "bg-card text-foreground shadow-card"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <m.icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Colour theme
        </p>
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a.value}
              onClick={() => setAccent(a.value)}
              title={a.label}
              className={`relative w-8 h-8 rounded-full transition-all duration-200 ease-spring hover:scale-110 ${
                accent === a.value
                  ? "ring-2 ring-offset-2 ring-offset-card scale-105"
                  : ""
              }`}
              style={{
                backgroundColor: a.swatch,
                ...(accent === a.value
                  ? ({ "--tw-ring-color": a.swatch } as React.CSSProperties)
                  : {}),
              }}
            >
              {accent === a.value && (
                <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Text size
        </p>
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {TEXT_SIZES.map((s, i) => (
            <button
              key={s.value}
              onClick={() => setTextSize(s.value)}
              className={`flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 font-medium transition-all duration-200 ${
                textSize === s.value
                  ? "bg-card text-foreground shadow-card"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                className={
                  i === 0 ? "text-[10px]" : i === 1 ? "text-xs" : "text-sm"
                }
              >
                A
              </span>
              <span className="text-[10px]">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Floating appearance corner for auth/landing pages.
 * Mode toggle + palette popover — theme is changeable before logging in,
 * and the choice is saved (localStorage) for every future visit.
 */
export function AuthAppearanceCorner() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="absolute top-4 right-4 z-20" ref={ref}>
      <div className="flex items-center gap-1 bg-card/70 backdrop-blur border border-border rounded-2xl p-1 shadow-card">
        <ThemeToggleButton />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          title="Colour theme"
          className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <Palette className="w-4 h-4" />
        </button>
      </div>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-64 card-warm p-4 animate-scale-in">
          <AppearancePanel />
        </div>
      )}
    </div>
  );
}

/** Sidebar popover wrapper around the appearance panel. */
export function AppearancePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="nav-item w-full text-left"
      >
        <Palette className="w-5 h-5 flex-shrink-0" />
        <span>Appearance</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 card-warm p-4 animate-scale-in z-50">
          <AppearancePanel />
        </div>
      )}
    </div>
  );
}
