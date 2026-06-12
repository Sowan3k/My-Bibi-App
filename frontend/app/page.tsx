"use client";

import Link from "next/link";
import {
  Heart,
  Lock,
  MessageCircle,
  BookOpen,
  Flower2,
  Sparkles,
  Hourglass,
  Mail,
  Music,
  Star,
  Map,
  Gift,
} from "lucide-react";
import { AuthAppearanceCorner } from "@/components/ThemeControls";

const features = [
  {
    icon: MessageCircle,
    title: "Shared Chat",
    description: "Text, photos, and voice notes. Private between you two.",
  },
  {
    icon: Sparkles,
    title: "Memory Garden",
    description: "Save meaningful moments as markdown. Yours forever.",
  },
  {
    icon: Flower2,
    title: "Daily Bloom",
    description: "One shared prompt per day, revealed only when both reply.",
  },
  {
    icon: Hourglass,
    title: "Time Capsules",
    description: "Seal a message until a future date. No early peeking.",
  },
  {
    icon: Mail,
    title: "Letters",
    description: "Slow messages, delivered on the day you choose.",
  },
  {
    icon: Star,
    title: "Future Dreams",
    description: "A shared board of goals, step by step, together.",
  },
  {
    icon: Music,
    title: "Our Songs",
    description: "The playlist of your story, with the notes behind it.",
  },
  {
    icon: BookOpen,
    title: "My Pages",
    description: "A private journal that's yours alone. Encrypted, always.",
  },
  {
    icon: Gift,
    title: "Gift Vault",
    description: "Your private wishlist. Encrypted — even on your own server.",
  },
  {
    icon: Map,
    title: "Garden Map",
    description: "Your whole story as a garden you can walk through.",
  },
  {
    icon: Heart,
    title: "Little Things",
    description: "Streak, milestones, thinking-of-you pings.",
  },
  {
    icon: Lock,
    title: "Your data. Your server.",
    description: "No cloud. No tracking. No third parties. Local AI only.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-aurora flex flex-col relative overflow-hidden">
      {/* Floating decorative hearts */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <Heart
          className="absolute top-[12%] left-[8%] w-6 h-6 text-brand-200 animate-float"
          fill="currentColor"
        />
        <Heart
          className="absolute top-[22%] right-[12%] w-4 h-4 text-brand-300/60 animate-float [animation-delay:1.2s]"
          fill="currentColor"
        />
        <Heart
          className="absolute bottom-[28%] left-[14%] w-5 h-5 text-brand-200/70 animate-float [animation-delay:2.1s]"
          fill="currentColor"
        />
        <Sparkles className="absolute top-[35%] left-[28%] w-4 h-4 text-brand-300/50 animate-twinkle" />
        <Sparkles className="absolute bottom-[20%] right-[20%] w-5 h-5 text-brand-300/40 animate-twinkle [animation-delay:0.8s]" />
      </div>

      {/* Theme + colour picker — works before login, choice is remembered */}
      <AuthAppearanceCorner />

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center relative z-[1]">
        <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-100 dark:bg-brand-500/20 shadow-warm animate-pop-in">
          <Heart
            className="w-10 h-10 text-brand-400 animate-heartbeat"
            fill="currentColor"
          />
        </div>

        <h1 className="font-display text-6xl md:text-7xl font-semibold text-foreground tracking-tight mb-4 animate-slide-up">
          My Bibi
          <span className="text-brand-300 ml-3">❤️</span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-md mx-auto mb-10 leading-relaxed animate-slide-up [animation-delay:0.1s] opacity-0 [animation-fill-mode:forwards]">
          A private space for two.
          <br />
          Self-hosted, open source, always yours.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16 animate-slide-up [animation-delay:0.2s] opacity-0 [animation-fill-mode:forwards]">
          <Link
            href="/setup"
            className="btn-primary text-base px-8 py-3 rounded-2xl shadow-warm hover:shadow-glow"
          >
            Set up your instance
          </Link>
          <Link
            href="/join"
            className="btn-secondary text-base px-8 py-3 rounded-2xl"
          >
            I have an invite
          </Link>
          <Link
            href="/login"
            className="btn-ghost text-base px-8 py-3 rounded-2xl"
          >
            Log in
          </Link>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16 stagger-children">
          {features.map((f) => (
            <div
              key={f.title}
              className="card-warm card-hover flex flex-col items-start gap-2 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/15 flex items-center justify-center">
                <f.icon className="w-4.5 h-4.5 w-[18px] h-[18px] text-brand-400" />
              </div>
              <p className="text-sm font-medium text-foreground">{f.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>

        {/* Ethics quote */}
        <blockquote className="max-w-xl mx-auto border-l-4 border-brand-200 dark:border-brand-500/40 pl-5 py-1 text-left animate-fade-in">
          <p className="text-sm text-muted-foreground italic leading-relaxed">
            "This app will never message your partner for you, never read your
            partner's mood for you, and never score your relationship. It
            remembers what you chose to keep, reminds you to show up, and stays
            out of the way. Your data lives on your server, in plain markdown,
            owned by both of you equally.{" "}
            <strong className="text-foreground not-italic">
              We built the limits in on purpose. The limits are the point.
            </strong>
            "
          </p>
        </blockquote>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-muted-foreground border-t border-border relative z-[1]">
        <p>
          MIT License · Self-hosted · No telemetry · No cloud ·{" "}
          <a
            href="https://github.com/Sowan3k/My-Bibi-App"
            className="underline hover:text-foreground transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </footer>
    </main>
  );
}
