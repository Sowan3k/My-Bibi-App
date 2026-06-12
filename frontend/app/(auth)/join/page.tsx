"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Heart, Eye, EyeOff, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { AuthAppearanceCorner } from "@/components/ThemeControls";
import AsciiCoupleBackground from "@/components/AsciiCoupleBackground";

// useSearchParams requires a Suspense boundary during prerender
export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinForm />
    </Suspense>
  );
}

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError(
        "No invite token found. Ask your partner to share their invite link."
      );
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Missing invite token.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/auth/join", {
        ...form,
        invite_token: token,
      });
      localStorage.setItem("bibi_token", res.data.access_token);
      router.push("/us");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        const detail = axiosErr.response?.data?.detail;
        if (detail?.includes("expired")) {
          setError(
            "This invite link has expired. Ask your partner for a new one."
          );
        } else if (detail?.includes("used")) {
          setError(
            "This invite link has already been used. Each link works once."
          );
        } else {
          setError(detail || "Failed to join. The invite link may be invalid.");
        }
      } else {
        setError("Network error. Is the app running?");
      }
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Join My Bibi
          </h1>
          <p className="text-muted-foreground text-sm">
            Your partner set up this space for you two. Create your account to
            join them.
          </p>
        </div>

        {/* No token warning */}
        {!token && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                No invite link detected
              </p>
              <p className="text-xs text-amber-700 mt-1">
                You need a link like{" "}
                <code className="bg-amber-100 px-1 rounded">
                  /join?token=abc123
                </code>
                . Ask your partner to share it from their setup page.
              </p>
            </div>
          </div>
        )}

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
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !token}
              className="btn-primary w-full mt-2"
            >
              {loading ? "Joining…" : "Create my account"}
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
      </div>
    </main>
  );
}
