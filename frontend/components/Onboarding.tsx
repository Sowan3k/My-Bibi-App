"use client";

/**
 * First-run onboarding — an animated, skippable walkthrough of the app.
 * Shows once (localStorage flag), replayable from Help or Settings via
 * `replayOnboarding()` which dispatches a window event the dashboard
 * layout listens for.
 */

import { useEffect, useState } from "react";
import { ChevronLeft, X } from "lucide-react";

const FLAG = "bibi_onboarded";
export const ONBOARDING_EVENT = "bibi:show-onboarding";

export function shouldShowOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(FLAG) !== "1";
}

export function replayOnboarding() {
  localStorage.removeItem(FLAG);
  window.dispatchEvent(new Event(ONBOARDING_EVENT));
}

const STEPS: {
  emoji: string;
  title: string;
  body: string;
  hint?: string;
}[] = [
  {
    emoji: "❤️",
    title: "Welcome to My Bibi",
    body: "A private space for exactly two people — you and your favourite person. Everything here lives on your own server. No cloud, no ads, no one reading along.",
    hint: "This tour takes about a minute.",
  },
  {
    emoji: "💬",
    title: "Us — your chat",
    body: "Texts, photos, voice notes, files and song links. You'll see when they're online, when your message is delivered ✓✓ and seen, and you can react with a tap.",
    hint: "Tip: hover or tap a message to react with an emoji.",
  },
  {
    emoji: "🌸",
    title: "Memory Garden & Daily Bloom",
    body: "Save the moments worth keeping — they become markdown files you own forever. And every day, one shared question: answers reveal only when you've both replied.",
    hint: "Memories resurface on their anniversaries in “On this day”.",
  },
  {
    emoji: "⏳",
    title: "Keepsakes",
    body: "Seal Time Capsules no one can open early. Send Letters that arrive days later. Build a Dreams board together, keep your songs, and watch it all grow into your Story and Garden Map.",
    hint: "Opened capsules and achieved dreams join your timeline automatically.",
  },
  {
    emoji: "🔒",
    title: "Just for you",
    body: "My Pages is your private journal and Gift Vault your secret wishlist — both encrypted with your password. Even the person hosting the server can't read them. “I Noticed” reflects only your own words back to you, never your partner's.",
    hint: "If the server restarts, log in again to unlock them. That's the privacy working.",
  },
  {
    emoji: "🎨",
    title: "Make it yours",
    body: "Light or dark, seven colour themes (Crimson for the romantics, Midnight for the quiet ones), and three text sizes — all in Appearance, and your partner can pick their own.",
    hint: "Find it at the bottom of the sidebar, or in Settings.",
  },
];

export default function Onboarding({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const s = STEPS[step];

  const finish = () => {
    localStorage.setItem(FLAG, "1");
    onClose();
  };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight" && !last) setStep((v) => v + 1);
      if (e.key === "ArrowLeft" && step > 0) setStep((v) => v - 1);
      if (e.key === "Enter") (last ? finish : () => setStep((v) => v + 1))();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, last]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="modal-overlay" onClick={finish} />
      <div className="modal-panel max-w-md text-center max-h-[90vh] overflow-y-auto scrollbar-thin">
        {/* Skip */}
        <button
          onClick={finish}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          title="Skip tour"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Animated step content — keyed so each step pops in fresh */}
        <div key={step} className="animate-pop-in">
          <div className="text-6xl mb-4 inline-block animate-float">
            {s.emoji}
          </div>
          <h2 className="font-display text-2xl font-semibold text-foreground mb-3">
            {s.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            {s.body}
          </p>
          {s.hint && (
            <p className="text-xs text-brand-500 dark:text-brand-300 tint-brand rounded-xl px-3 py-2 inline-block">
              {s.hint}
            </p>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mt-6 mb-5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-6 bg-brand-400"
                  : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
              }`}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="btn-ghost flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <button onClick={finish} className="btn-ghost">
              Skip
            </button>
          )}
          <button
            onClick={last ? finish : () => setStep(step + 1)}
            className="btn-primary flex-1"
          >
            {last ? "Let's go ❤️" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
