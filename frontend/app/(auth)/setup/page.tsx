"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Eye, EyeOff, Copy, Check } from "lucide-react";
import api from "@/lib/api";
import { AuthAppearanceCorner } from "@/components/ThemeControls";
import AsciiCoupleBackground from "@/components/AsciiCoupleBackground";

interface SetupResponse {
  access_token: string;
  token_type: string;
  invite_link: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function SetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<SetupResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<SetupResponse>("/api/auth/setup", form);
      // Save token
      localStorage.setItem("bibi_token", res.data.access_token);
      setDone(res.data);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(
          axiosErr.response?.data?.detail ||
            "Setup failed. This instance may already be configured."
        );
      } else {
        setError("Network error. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  };

  const copyInvite = async () => {
    if (!done?.invite_link) return;
    await navigator.clipboard.writeText(done.invite_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (done) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6 py-12 relative overflow-hidden">
        <AsciiCoupleBackground />
        <AuthAppearanceCorner />
        <div className="w-full max-w-md animate-slide-up relative z-10">
          <div className="card-warm text-center">
            <div className="inline-flex w-14 h-14 rounded-full bg-sage-100 dark:bg-sage-500/20 items-center justify-center mb-4 animate-pop-in">
              <Check className="w-7 h-7 text-sage-500 dark:text-sage-300" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-foreground mb-2">
              You're all set, {done.user.name}! 🎉
            </h1>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              Send this invite link to your partner. It can only be used once.
            </p>

            <div className="bg-muted rounded-xl p-3 flex items-center gap-3 mb-6 text-left">
              <p className="text-xs font-mono text-foreground break-all flex-1">
                {done.invite_link}
              </p>
              <button
                onClick={copyInvite}
                className="flex-shrink-0 p-2 rounded-lg hover:bg-secondary transition-colors"
                title="Copy invite link"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-sage-500" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>

            <p className="text-xs text-muted-foreground mb-6">
              The link expires in 7 days. Your partner will use it to create
              their account.
            </p>

            <button
              onClick={() => router.push("/us")}
              className="btn-primary w-full"
            >
              Go to our space →
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <AsciiCoupleBackground />
      <AuthAppearanceCorner />
      <div className="w-full max-w-md animate-slide-up relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-full bg-brand-100 dark:bg-brand-500/20 items-center justify-center mb-4 shadow-soft">
            <Heart
              className="w-7 h-7 text-brand-400 animate-heartbeat"
              fill="currentColor"
            />
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground mb-2">
            Set up My Bibi
          </h1>
          <p className="text-muted-foreground text-sm">
            Create the first account for your instance. You'll share an invite
            link with your partner after.
          </p>
        </div>

        {/* Form */}
        <div className="card-warm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Your name
              </label>
              <input
                type="text"
                required
                placeholder="What should your partner call you?"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-warm"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-warm"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="input-warm pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-3 animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? "Setting up…" : "Create my account"}
            </button>
          </form>

          <div className="divider" />

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-brand-400 hover:text-brand-500 font-medium transition-colors"
            >
              Log in
            </Link>
          </p>
        </div>

        {/* Privacy note */}
        <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
          Your data stays on this server. No third parties, no tracking.
        </p>
      </div>
    </main>
  );
}
