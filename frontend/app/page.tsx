"use client";

import Link from "next/link";
import { Heart, Lock, MessageCircle, BookOpen, Flower2, Sparkles } from "lucide-react";

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
    icon: BookOpen,
    title: "My Pages",
    description: "A private journal that's yours alone. Encrypted, always.",
  },
  {
    icon: Heart,
    title: "Little Things",
    description: "Streak, milestones, thinking-of-you pings.",
  },
  {
    icon: Lock,
    title: "Your data. Your server.",
    description: "No cloud. No tracking. No third parties.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-cream-100 via-white to-rose-50 flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 shadow-soft">
          <Heart className="w-8 h-8 text-rose-400" fill="currentColor" />
        </div>

        <h1 className="text-5xl md:text-6xl font-semibold text-foreground tracking-tight mb-4">
          My Bibi
          <span className="text-rose-300 ml-2">❤️</span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-md mx-auto mb-10 leading-relaxed">
          A private space for two.
          <br />
          Self-hosted, open source, always yours.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
          <Link
            href="/setup"
            className="btn-primary text-base px-8 py-3 rounded-2xl shadow-warm"
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-16">
          {features.map((f) => (
            <div
              key={f.title}
              className="card-warm flex flex-col items-start gap-2 text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                <f.icon className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-sm font-medium text-foreground">{f.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>

        {/* Ethics quote */}
        <blockquote className="max-w-xl mx-auto border-l-4 border-rose-200 pl-5 py-1 text-left">
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
      <footer className="text-center py-6 text-xs text-muted-foreground border-t border-cream-200">
        <p>
          MIT License · Self-hosted · No telemetry · No cloud ·{" "}
          <a
            href="https://github.com/yourusername/my-bibi-app"
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
