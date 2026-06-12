"use client";

import { useState, useEffect, useCallback } from "react";
import { Lightbulb, Sparkles, RefreshCw, WifiOff, Lock } from "lucide-react";
import api from "@/lib/api";
import type { Insight, ResurfaceResponse } from "@/lib/types";
import { format, parseISO } from "date-fns";

export default function InsightsPage() {
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [resurface, setResurface] = useState<ResurfaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, insightsRes, resurfaceRes] = await Promise.all([
        api.get<{ ai_available: boolean }>("/api/insights/status"),
        api.get<Insight[]>("/api/insights"),
        api.get<ResurfaceResponse>("/api/insights/resurface"),
      ]);
      setAiAvailable(statusRes.data.ai_available);
      setInsights(insightsRes.data);
      setResurface(resurfaceRes.data);
    } catch (err) {
      console.error("Failed to load insights", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    setError("");
    try {
      await api.post("/api/insights/notice");
      await fetchAll();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Couldn't generate insights.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-5 max-w-2xl mx-auto space-y-6">
      <div className="animate-fade-in">
        <h1 className="page-title flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-brand-300" />
          I Noticed
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
          <Lock className="w-3 h-3" />
          A private mirror — it reads only <strong>your</strong> words, and
          shows only <strong>you</strong>.
        </p>
      </div>

      {/* Mirror principle note */}
      <div className="tint-brand rounded-2xl p-4 text-xs text-muted-foreground leading-relaxed">
        The local AI looks at your own messages and bloom answers — never your
        partner's — and reflects back patterns: things you keep mentioning,
        gratitude you felt but didn't say, little promises left open. Your
        partner has their own mirror. Neither of you can see the other's.
      </div>

      {/* Memory resurfacing */}
      {!loading && resurface?.memory && (
        <div className="card-warm animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <h2 className="text-sm font-semibold text-foreground">
              Worth revisiting
            </h2>
          </div>
          <div className="flex gap-4">
            {resurface.memory.media_path && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/chat/media/${encodeURIComponent(
                  resurface.memory.media_path
                )}`}
                alt=""
                className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
              />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">
                {resurface.memory.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(parseISO(resurface.memory.memory_date), "MMMM d, yyyy")}{" "}
                · saved by {resurface.memory.created_by_name}
              </p>
              {resurface.caption && (
                <p className="text-hand text-brand-500 dark:text-brand-300 mt-2">
                  {resurface.caption}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI status + generate */}
      {loading ? (
        <div className="h-32 skeleton" />
      ) : aiAvailable === false ? (
        <div className="card-warm text-center py-10">
          <WifiOff className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground mb-1">
            Local AI is offline
          </p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Start Ollama on your server to enable private reflections.
            Everything else works without it — nothing here ever uses a cloud
            API.
          </p>
        </div>
      ) : (
        <div className="card-warm">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Fresh reflections
              </h2>
              <p className="text-sm text-muted-foreground">
                Reads your last 30 days of your own words. Takes a moment.
              </p>
            </div>
            <button
              onClick={generate}
              disabled={generating}
              className="btn-primary flex items-center gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${generating ? "animate-spin" : ""}`}
              />
              {generating ? "Reflecting…" : "Notice something"}
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-500 dark:text-red-400 mt-3 animate-fade-in">
              {error}
            </p>
          )}
        </div>
      )}

      {/* Past insights */}
      {insights.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Your reflections
          </h2>
          <div className="space-y-3 stagger-children">
            {insights.map((insight) => (
              <div key={insight.id} className="card-warm">
                <p className="text-xs text-muted-foreground mb-2">
                  {format(parseISO(insight.created_at), "MMMM d, yyyy · h:mm a")}
                </p>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {insight.content}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
