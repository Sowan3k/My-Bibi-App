"use client";

/**
 * My Bibi — Theme system
 *
 * Two independent axes, both persisted to localStorage:
 *   - mode:   "light" | "dark" | "system"   (class "dark" on <html>)
 *   - accent: "rose" | "ocean" | "lavender" | "sunset" | "forest"
 *             (data-accent attribute on <html>)
 *
 * A small inline script in app/layout.tsx applies both before first paint
 * so there is no flash of the wrong theme.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { MODE_KEY, ACCENT_KEY, TEXTSIZE_KEY } from "./theme-script";

export type ThemeMode = "light" | "dark" | "system";
export type Accent =
  | "rose"
  | "crimson"
  | "ocean"
  | "lavender"
  | "sunset"
  | "forest"
  | "midnight";

export const ACCENTS: { value: Accent; label: string; swatch: string }[] = [
  { value: "rose", label: "Rose", swatch: "#f4a7b9" },
  { value: "crimson", label: "Crimson ❤️", swatch: "#dc2626" },
  { value: "ocean", label: "Ocean", swatch: "#67c3ee" },
  { value: "lavender", label: "Lavender", swatch: "#bfa3e8" },
  { value: "sunset", label: "Sunset", swatch: "#f8b06b" },
  { value: "forest", label: "Forest", swatch: "#8fc4a0" },
  { value: "midnight", label: "Midnight", swatch: "#3f5587" },
];

export type TextSize = "sm" | "md" | "lg";

export const TEXT_SIZES: { value: TextSize; label: string }[] = [
  { value: "sm", label: "Cosy" },
  { value: "md", label: "Normal" },
  { value: "lg", label: "Large" },
];

interface ThemeContextValue {
  mode: ThemeMode;
  accent: Accent;
  textSize: TextSize;
  resolvedDark: boolean;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: Accent) => void;
  setTextSize: (size: TextSize) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  accent: "rose",
  textSize: "md",
  resolvedDark: false,
  setMode: () => {},
  setAccent: () => {},
  setTextSize: () => {},
});

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(mode: ThemeMode, accent: Accent, textSize: TextSize) {
  const root = document.documentElement;
  const dark = mode === "dark" || (mode === "system" && systemPrefersDark());
  root.classList.toggle("dark", dark);
  root.setAttribute("data-accent", accent);
  root.setAttribute("data-textsize", textSize);
  // Keep the browser chrome colour in sync (PWA address bar)
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", dark ? "#1c1714" : "#fdf6ec");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [accent, setAccentState] = useState<Accent>("rose");
  const [textSize, setTextSizeState] = useState<TextSize>("md");
  const [resolvedDark, setResolvedDark] = useState(false);

  // Hydrate from localStorage (inline script already applied the classes)
  useEffect(() => {
    const storedMode = (localStorage.getItem(MODE_KEY) as ThemeMode) || "system";
    const storedAccent = (localStorage.getItem(ACCENT_KEY) as Accent) || "rose";
    const storedSize = (localStorage.getItem(TEXTSIZE_KEY) as TextSize) || "md";
    setModeState(storedMode);
    setAccentState(storedAccent);
    setTextSizeState(storedSize);
    setResolvedDark(document.documentElement.classList.contains("dark"));
  }, []);

  // React to OS theme changes while in "system" mode
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (mode === "system") {
        applyTheme(mode, accent, textSize);
        setResolvedDark(mq.matches);
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode, accent, textSize]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      localStorage.setItem(MODE_KEY, next);
      applyTheme(next, accent, textSize);
      setResolvedDark(document.documentElement.classList.contains("dark"));
    },
    [accent, textSize]
  );

  const setAccent = useCallback(
    (next: Accent) => {
      setAccentState(next);
      localStorage.setItem(ACCENT_KEY, next);
      applyTheme(mode, next, textSize);
    },
    [mode, textSize]
  );

  const setTextSize = useCallback(
    (next: TextSize) => {
      setTextSizeState(next);
      localStorage.setItem(TEXTSIZE_KEY, next);
      applyTheme(mode, accent, next);
    },
    [mode, accent]
  );

  return (
    <ThemeContext.Provider
      value={{ mode, accent, textSize, resolvedDark, setMode, setAccent, setTextSize }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// THEME_INIT_SCRIPT (pre-paint bootstrap) lives in lib/theme-script.ts —
// it must stay in a server-safe module so the root layout can inline it.
