"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Eye, EyeOff } from "lucide-react";
import api from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // FastAPI OAuth2 form expects form-encoded data
      const params = new URLSearchParams();
      params.append("username", form.email); // OAuth2 spec uses "username"
      params.append("password", form.password);

      const res = await api.post("/api/auth/login", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      localStorage.setItem("bibi_token", res.data.access_token);
      router.push("/us");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
        if (axiosErr.response?.status === 401) {
          setError("Incorrect email or password.");
        } else {
          setError(axiosErr.response?.data?.detail || "Login failed.");
        }
      } else {
        setError("Network error. Is the app running?");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-full bg-rose-100 items-center justify-center mb-4">
            <Heart className="w-6 h-6 text-rose-400" fill="currentColor" />
          </div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Welcome back
          </h1>
          <p className="text-muted-foreground text-sm">Log in to your space.</p>
        </div>

        {/* Form */}
        <div className="card-warm">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="Your password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="input-warm pr-10"
                  autoComplete="current-password"
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
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>

          <div className="divider" />

          <p className="text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link
              href="/join"
              className="text-rose-400 hover:text-rose-500 font-medium transition-colors"
            >
              Use your invite link
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
