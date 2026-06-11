"use client";

import { useState, useEffect } from "react";
import { Heart, Flame, Calendar, Bell, BellRing } from "lucide-react";
import api from "@/lib/api";

interface LittleThingsStatus {
  streak: number;
  days_together: number;
  relationship_started: string | null;
  partner_name: string;
  partner_mood: string | null;
  my_mood: string | null;
  partner_online: boolean;
  ping_cooldown_seconds: number; // 0 means can ping
}

const MOODS = [
  { emoji: "☀️", label: "Sunny", value: "sunny" },
  { emoji: "⛅", label: "Cloudy", value: "cloudy" },
  { emoji: "⛈️", label: "Stormy", value: "stormy" },
];

const MOOD_COLORS: Record<string, string> = {
  sunny: "bg-amber-50 border-amber-200 text-amber-600",
  cloudy: "bg-blue-50 border-blue-200 text-blue-600",
  stormy: "bg-slate-50 border-slate-200 text-slate-600",
};

function StatCard({
  icon,
  value,
  label,
  sublabel,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className="card-warm flex flex-col items-center text-center gap-2 py-6">
      <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
        {icon}
      </div>
      <p className="text-3xl font-semibold text-foreground">{value}</p>
      <p className="text-sm font-medium text-foreground">{label}</p>
      {sublabel && (
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      )}
    </div>
  );
}

export default function LittleThingsPage() {
  const [status, setStatus] = useState<LittleThingsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(false);
  const [pingSuccess, setPingSuccess] = useState(false);
  const [settingMood, setSettingMood] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await api.get<LittleThingsStatus>("/api/little-things/status");
      setStatus(res.data);
      setSelectedMood(res.data.my_mood);
    } catch (err) {
      console.error("Failed to load little things", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const sendPing = async () => {
    if (!status || status.ping_cooldown_seconds > 0 || pinging) return;

    setPinging(true);
    try {
      await api.post("/api/little-things/ping");
      setPingSuccess(true);
      await fetchStatus(); // Refresh cooldown
      setTimeout(() => setPingSuccess(false), 3000);
    } catch {
      // Silently fail
    } finally {
      setPinging(false);
    }
  };

  const setMood = async (mood: string) => {
    if (settingMood) return;
    setSettingMood(true);
    setSelectedMood(mood);
    try {
      await api.post("/api/little-things/mood", { mood });
      await fetchStatus();
    } catch {
      setSelectedMood(status?.my_mood ?? null);
    } finally {
      setSettingMood(false);
    }
  };

  if (loading) {
    return (
      <div className="p-5 max-w-2xl mx-auto">
        <div className="h-8 w-48 bg-cream-200 rounded-full animate-pulse mb-6" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-cream-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!status) return null;

  const canPing = status.ping_cooldown_seconds <= 0;
  const cooldownMin = Math.ceil(status.ping_cooldown_seconds / 60);

  return (
    <div className="p-5 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Heart className="w-6 h-6 text-rose-300" fill="currentColor" />
          Little Things
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          The small gestures that keep you close.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={<Flame className="w-6 h-6 text-rose-400" />}
          value={status.streak}
          label={`day${status.streak !== 1 ? "s" : ""} streak`}
          sublabel="Active days together"
        />
        <StatCard
          icon={<Calendar className="w-6 h-6 text-sage-500" />}
          value={status.days_together}
          label={`day${status.days_together !== 1 ? "s" : ""} together`}
          sublabel={
            status.relationship_started
              ? `Since ${status.relationship_started}`
              : "Keep showing up"
          }
        />
      </div>

      {/* Thinking of you ping */}
      <div className="card-warm">
        <h2 className="text-base font-semibold text-foreground mb-1">
          Thinking of you 💭
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Send {status.partner_name} a gentle ping. No words needed.
        </p>

        <button
          onClick={sendPing}
          disabled={!canPing || pinging}
          className={`w-full py-3 rounded-2xl text-sm font-medium transition-all duration-200 ${
            pingSuccess
              ? "bg-sage-100 text-sage-600 border border-sage-200"
              : canPing
              ? "btn-primary"
              : "bg-cream-100 text-muted-foreground border border-cream-200 cursor-not-allowed"
          }`}
        >
          {pingSuccess ? (
            <span className="flex items-center justify-center gap-2">
              <BellRing className="w-4 h-4" />
              Sent! {status.partner_name} knows you're thinking of them
            </span>
          ) : canPing ? (
            <span className="flex items-center justify-center gap-2">
              <Bell className="w-4 h-4" />
              {pinging ? "Sending…" : `Ping ${status.partner_name}`}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Bell className="w-4 h-4" />
              Cooldown — {cooldownMin} min left
            </span>
          )}
        </button>
      </div>

      {/* Mood weather */}
      <div className="card-warm">
        <h2 className="text-base font-semibold text-foreground mb-1">
          How are you feeling today?
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Share your mood. This is your own self-disclosure — not a report to
          your partner, just your presence.
        </p>

        <div className="flex gap-3 flex-wrap">
          {MOODS.map((mood) => (
            <button
              key={mood.value}
              onClick={() => setMood(mood.value)}
              disabled={settingMood}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm border transition-all duration-150 ${
                selectedMood === mood.value
                  ? `${MOOD_COLORS[mood.value]} font-medium ring-2 ring-offset-1`
                  : "bg-cream-50 border-cream-200 text-foreground hover:bg-cream-100"
              }`}
              style={
                selectedMood === mood.value
                  ? {
                      ringColor:
                        mood.value === "sunny"
                          ? "#fcd34d"
                          : mood.value === "cloudy"
                          ? "#93c5fd"
                          : "#94a3b8",
                    }
                  : undefined
              }
            >
              {mood.emoji} {mood.label}
            </button>
          ))}
        </div>

        {/* Partner's mood — shown as what they chose to share */}
        {status.partner_mood && (
          <div className="mt-4 pt-4 border-t border-cream-200">
            <p className="text-xs text-muted-foreground mb-1">
              {status.partner_name} is feeling:
            </p>
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border ${
                MOOD_COLORS[status.partner_mood]
              }`}
            >
              {MOODS.find((m) => m.value === status.partner_mood)?.emoji}{" "}
              {MOODS.find((m) => m.value === status.partner_mood)?.label}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              They chose to share this with you.
            </p>
          </div>
        )}
      </div>

      {/* Ethics note */}
      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        Mood sharing is self-disclosure only. The app never infers, analyses, or
        reports on how either of you is feeling.
      </p>
    </div>
  );
}
