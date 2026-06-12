"use client";

import { useState, useEffect } from "react";
import { Flower2, Send, Lock, ChevronDown } from "lucide-react";
import api from "@/lib/api";
import type { BloomEntry } from "@/lib/types";
import { format, parseISO } from "date-fns";

interface TodayBloom {
  prompt_id: string;
  prompt_text: string;
  my_answer: string | null;
  partner_name: string;
  partner_answered: boolean;
  both_answered: boolean;
  partner_answer: string | null; // only present if both_answered
}

export default function BloomPage() {
  const [today, setToday] = useState<TodayBloom | null>(null);
  const [history, setHistory] = useState<BloomEntry[]>([]);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [todayRes, histRes] = await Promise.all([
          api.get<TodayBloom>("/api/bloom/today"),
          api.get<BloomEntry[]>("/api/bloom/history"),
        ]);
        setToday(todayRes.data);
        setHistory(histRes.data);
      } catch (err) {
        console.error("Failed to load bloom", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const submitAnswer = async () => {
    if (!answer.trim() || !today || submitting) return;
    setError("");
    setSubmitting(true);

    try {
      const res = await api.post<TodayBloom>("/api/bloom/answer", {
        prompt_id: today.prompt_id,
        answer: answer.trim(),
      });
      setToday(res.data);
      setAnswer("");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(
          axiosErr.response?.data?.detail || "Failed to submit answer."
        );
      } else {
        setError("Network error.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-5 max-w-2xl mx-auto">
        <div className="h-8 w-48 skeleton rounded-full mb-6" />
        <div className="card-warm space-y-4">
          <div className="h-4 skeleton" />
          <div className="h-4 skeleton w-3/4" />
          <div className="h-24 skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <h1 className="page-title flex items-center gap-2">
          <Flower2 className="w-6 h-6 text-brand-300" />
          Daily Bloom
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          One shared prompt, every day. Answers revealed only when both reply.
        </p>
      </div>

      {/* Today's card */}
      {today && (
        <div className="card-warm mb-6 animate-slide-up">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-brand-300 animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Today's bloom
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {format(new Date(), "MMMM d, yyyy")}
            </span>
          </div>

          {/* Prompt */}
          <blockquote className="font-display text-2xl font-medium text-foreground leading-relaxed mb-6">
            {today.prompt_text}
          </blockquote>

          {/* States */}
          {!today.my_answer && (
            // User hasn't answered yet
            <div className="space-y-3">
              <textarea
                rows={3}
                placeholder="Write your answer here…"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="input-warm resize-none"
                autoFocus
              />
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              <button
                onClick={submitAnswer}
                disabled={!answer.trim() || submitting}
                className="btn-primary flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {submitting ? "Sending…" : "Share my answer"}
              </button>
            </div>
          )}

          {today.my_answer && !today.both_answered && (
            // Waiting for partner
            <div className="space-y-4 animate-fade-in">
              <div className="bg-muted rounded-xl p-4 border border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Your answer
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {today.my_answer}
                </p>
              </div>

              <div className="flex items-center gap-3 tint-positive rounded-xl p-4">
                <div className="w-8 h-8 rounded-full bg-sage-100 dark:bg-sage-500/20 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-sage-500 dark:text-sage-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Waiting for {today.partner_name}…
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Their answer will appear here once they reply.
                  </p>
                </div>
              </div>
            </div>
          )}

          {today.both_answered && (
            // Both answered — reveal
            <div className="space-y-4 stagger-children">
              <div className="tint-brand rounded-xl p-4">
                <p className="text-xs font-medium text-brand-400 uppercase tracking-wider mb-1.5">
                  Your answer
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {today.my_answer}
                </p>
              </div>

              <div className="tint-positive rounded-xl p-4">
                <p className="text-xs font-medium text-sage-500 dark:text-sage-300 uppercase tracking-wider mb-1.5">
                  {today.partner_name}'s answer
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {today.partner_answer}
                </p>
              </div>

              <div className="text-center py-2">
                <span className="text-3xl inline-block animate-pop-in">🌸</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Both answered today
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm font-medium text-foreground mb-4 hover:text-brand-400 transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ${
                showHistory ? "rotate-180" : ""
              }`}
            />
            Past blooms ({history.length})
          </button>

          {showHistory && (
            <div className="space-y-4 stagger-children">
              {history.map((entry) => (
                <div key={entry.prompt_id} className="card-warm">
                  <p className="text-xs text-muted-foreground mb-2">
                    {format(parseISO(entry.date), "MMMM d, yyyy")}
                  </p>
                  <p className="font-display text-base font-medium text-foreground mb-3 leading-relaxed">
                    {entry.prompt_text}
                  </p>
                  <div className="space-y-2">
                    <div className="tint-brand rounded-lg p-3">
                      <p className="text-[10px] text-brand-400 font-medium uppercase tracking-wider mb-1">
                        You
                      </p>
                      <p className="text-xs text-foreground">{entry.my_answer}</p>
                    </div>
                    <div className="tint-positive rounded-lg p-3">
                      <p className="text-[10px] text-sage-500 dark:text-sage-300 font-medium uppercase tracking-wider mb-1">
                        {entry.partner_name}
                      </p>
                      <p className="text-xs text-foreground">
                        {entry.partner_answer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
