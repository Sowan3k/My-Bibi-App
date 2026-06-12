"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Heart,
  Flame,
  Calendar,
  Bell,
  BellRing,
  CalendarHeart,
  Check,
} from "lucide-react";
import api from "@/lib/api";
import type { LittleThingsStatus, MoodDay } from "@/lib/types";
import { format, parseISO, subDays } from "date-fns";

const MOODS = [
  { emoji: "☀️", label: "Sunny", value: "sunny" },
  { emoji: "⛅", label: "Partly", value: "partly" },
  { emoji: "☁️", label: "Cloudy", value: "cloudy" },
  { emoji: "🌧️", label: "Rainy", value: "rainy" },
  { emoji: "⛈️", label: "Stormy", value: "stormy" },
  { emoji: "❄️", label: "Snowy", value: "snowy" },
];

const MOOD_COLORS: Record<string, string> = {
  sunny: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-300",
  partly: "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30 text-yellow-600 dark:text-yellow-300",
  cloudy: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-300",
  rainy: "bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30 text-sky-600 dark:text-sky-300",
  stormy: "bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/30 text-slate-600 dark:text-slate-300",
  snowy: "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300",
};

const HEAT_COLORS: Record<string, string> = {
  sunny: "bg-amber-400",
  partly: "bg-yellow-300",
  cloudy: "bg-blue-300",
  rainy: "bg-sky-400",
  stormy: "bg-slate-400",
  snowy: "bg-indigo-300",
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
    <div className="card-warm card-hover flex flex-col items-center text-center gap-2 py-6">
      <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-500/15 flex items-center justify-center">
        {icon}
      </div>
      <p className="font-display text-3xl font-semibold text-foreground">
        {value}
      </p>
      <p className="text-sm font-medium text-foreground">{label}</p>
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

/** My own 90-day mood calendar — mirror principle: own moods only. */
function MoodHeatmap({ days }: { days: MoodDay[] }) {
  const byDate = new Map(days.map((d) => [d.date, d.mood]));
  const today = new Date();
  const cells: { date: string; mood: string | null }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = format(subDays(today, i), "yyyy-MM-dd");
    cells.push({ date: d, mood: byDate.get(d) ?? null });
  }

  return (
    <div>
      <div className="grid grid-flow-col grid-rows-7 gap-1 w-fit">
        {cells.map((c) => (
          <div
            key={c.date}
            title={c.mood ? `${c.date}: ${c.mood}` : c.date}
            className={`w-3 h-3 rounded-[3px] transition-colors ${
              c.mood ? HEAT_COLORS[c.mood] ?? "bg-muted" : "bg-muted"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {MOODS.map((m) => (
          <span
            key={m.value}
            className="flex items-center gap-1 text-[10px] text-muted-foreground"
          >
            <span className={`w-2.5 h-2.5 rounded-[3px] ${HEAT_COLORS[m.value]}`} />
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LittleThingsPage() {
  const [status, setStatus] = useState<LittleThingsStatus | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(false);
  const [pingSuccess, setPingSuccess] = useState(false);
  const [settingMood, setSettingMood] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [savingDate, setSavingDate] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const [statusRes, historyRes] = await Promise.all([
        api.get<LittleThingsStatus>("/api/little-things/status"),
        api.get<MoodDay[]>("/api/little-things/mood-history"),
      ]);
      setStatus(statusRes.data);
      setSelectedMood(statusRes.data.my_mood);
      setMoodHistory(historyRes.data);
      if (statusRes.data.relationship_started) {
        setStartDate(statusRes.data.relationship_started);
      }
    } catch (err) {
      console.error("Failed to load little things", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const sendPing = async () => {
    if (!status || status.ping_cooldown_seconds > 0 || pinging) return;

    setPinging(true);
    try {
      await api.post("/api/little-things/ping");
      setPingSuccess(true);
      await fetchStatus();
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

  const saveStartDate = async () => {
    if (!startDate || savingDate) return;
    setSavingDate(true);
    try {
      await api.post("/api/little-things/start-date", { start_date: startDate });
      setEditingDate(false);
      await fetchStatus();
    } catch {
      // keep editing open
    } finally {
      setSavingDate(false);
    }
  };

  if (loading) {
    return (
      <div className="p-5 max-w-2xl mx-auto">
        <div className="h-8 w-48 skeleton rounded-full mb-6" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 skeleton" />
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
      <div className="animate-fade-in">
        <h1 className="page-title flex items-center gap-2">
          <Heart className="w-6 h-6 text-brand-300" fill="currentColor" />
          Little Things
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          The small gestures that keep you close.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 stagger-children">
        <StatCard
          icon={<Flame className="w-6 h-6 text-brand-400" />}
          value={status.streak}
          label={`day${status.streak !== 1 ? "s" : ""} streak`}
          sublabel="Active days together"
        />
        <StatCard
          icon={<Calendar className="w-6 h-6 text-sage-500 dark:text-sage-300" />}
          value={status.days_together}
          label={`day${status.days_together !== 1 ? "s" : ""} together`}
          sublabel={
            status.relationship_started
              ? `Since ${format(
                  parseISO(status.relationship_started),
                  "MMM d, yyyy"
                )}`
              : "Keep showing up"
          }
        />
      </div>

      {/* Relationship start date */}
      <div className="card-warm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <CalendarHeart className="w-5 h-5 text-brand-400" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Your day one
              </h2>
              <p className="text-xs text-muted-foreground">
                {status.relationship_started
                  ? `Counting from ${format(
                      parseISO(status.relationship_started),
                      "MMMM d, yyyy"
                    )}`
                  : "Set the date your story began"}
              </p>
            </div>
          </div>
          {editingDate ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-warm py-1.5 w-auto"
              />
              <button
                onClick={saveStartDate}
                disabled={savingDate}
                className="btn-primary py-1.5 px-4"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingDate(true)}
              className="btn-secondary py-1.5 px-4 text-xs"
            >
              {status.relationship_started ? "Change" : "Set date"}
            </button>
          )}
        </div>
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
          className={`w-full py-3 rounded-2xl text-sm font-medium transition-all duration-300 ${
            pingSuccess
              ? "tint-positive text-sage-600 dark:text-sage-300 animate-pop-in"
              : canPing
              ? "btn-primary animate-glow-pulse"
              : "bg-muted text-muted-foreground border border-border cursor-not-allowed"
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

        <div className="flex gap-2 flex-wrap">
          {MOODS.map((mood) => (
            <button
              key={mood.value}
              onClick={() => setMood(mood.value)}
              disabled={settingMood}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm border transition-all duration-200 hover:scale-105 ${
                selectedMood === mood.value
                  ? `${MOOD_COLORS[mood.value]} font-medium scale-105 shadow-soft`
                  : "bg-secondary border-border text-foreground hover:bg-muted"
              }`}
            >
              {mood.emoji} {mood.label}
            </button>
          ))}
        </div>

        {/* Partner's mood — shown as what they chose to share */}
        {status.partner_mood && (
          <div className="mt-4 pt-4 border-t border-border animate-fade-in">
            <p className="text-xs text-muted-foreground mb-1.5">
              {status.partner_name} is feeling:
            </p>
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border ${
                MOOD_COLORS[status.partner_mood] ?? ""
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

      {/* My mood calendar */}
      {moodHistory.length > 0 && (
        <div className="card-warm">
          <h2 className="text-base font-semibold text-foreground mb-1">
            My weather, last 90 days
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Only you can see this calendar. It's your own sky.
          </p>
          <MoodHeatmap days={moodHistory} />
        </div>
      )}

      {/* Ethics note */}
      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        Mood sharing is self-disclosure only. The app never infers, analyses, or
        reports on how either of you is feeling.
      </p>
    </div>
  );
}
