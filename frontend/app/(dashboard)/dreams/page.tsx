"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Star,
  Plus,
  X,
  Trophy,
  Trash2,
  CheckCircle2,
  Circle,
} from "lucide-react";
import api from "@/lib/api";
import type { Dream } from "@/lib/types";
import { format, parseISO } from "date-fns";

function DreamCard({
  dream,
  onChanged,
}: {
  dream: Dream;
  onChanged: () => void;
}) {
  const [newStep, setNewStep] = useState("");
  const [addingStep, setAddingStep] = useState(false);
  const achieved = dream.status === "achieved";

  const toggleStep = async (stepId: string, done: boolean) => {
    try {
      await api.patch(`/api/dreams/steps/${stepId}`, { done });
      onChanged();
    } catch {
      // ignore
    }
  };

  const addStep = async () => {
    if (!newStep.trim() || addingStep) return;
    setAddingStep(true);
    try {
      await api.post(`/api/dreams/${dream.id}/steps`, { title: newStep.trim() });
      setNewStep("");
      onChanged();
    } finally {
      setAddingStep(false);
    }
  };

  const achieve = async () => {
    try {
      await api.post(`/api/dreams/${dream.id}/achieve`);
      onChanged();
    } catch {
      // ignore
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/api/dreams/${dream.id}`);
      onChanged();
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={`card-warm ${
        achieved ? "tint-positive" : "card-hover"
      } transition-all duration-300`}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl flex-shrink-0 leading-none mt-0.5">
          {dream.emoji || (achieved ? "🏆" : "✨")}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-foreground">{dream.title}</h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!achieved && (
                <button
                  onClick={achieve}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-amber-500 transition-colors"
                  title="Mark achieved"
                >
                  <Trophy className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={remove}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors"
                title="Delete dream"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          {dream.description && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {dream.description}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground mt-1">
            {achieved && dream.achieved_at
              ? `Achieved ${format(parseISO(dream.achieved_at), "MMM d, yyyy")} 🎉`
              : dream.target_date
              ? `Aiming for ${format(parseISO(dream.target_date), "MMM yyyy")}`
              : `Dreamed up by ${dream.created_by_name}`}
          </p>

          {/* Progress bar */}
          {dream.steps.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                <span>
                  {dream.steps.filter((s) => s.done).length}/
                  {dream.steps.length} steps
                </span>
                <span>{dream.progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-300 to-brand-400 transition-all duration-700 ease-spring"
                  style={{ width: `${dream.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Steps */}
          {!achieved && (
            <div className="mt-3 space-y-1.5">
              {dream.steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => toggleStep(step.id, !step.done)}
                  className="flex items-center gap-2 w-full text-left group"
                >
                  {step.done ? (
                    <CheckCircle2 className="w-4 h-4 text-sage-500 dark:text-sage-300 flex-shrink-0 animate-pop-in" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:text-brand-400 transition-colors" />
                  )}
                  <span
                    className={`text-xs transition-all ${
                      step.done
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }`}
                  >
                    {step.title}
                  </span>
                </button>
              ))}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Add a step…"
                  value={newStep}
                  onChange={(e) => setNewStep(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addStep()}
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground border-b border-border focus:border-brand-300 outline-none py-1 transition-colors"
                />
                <button
                  onClick={addStep}
                  disabled={!newStep.trim() || addingStep}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NewDreamModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);

  const EMOJI_OPTIONS = ["✨", "🏡", "✈️", "💍", "🐶", "🌍", "👶", "🎓", "🚐", "🌅"];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/dreams", {
        title: title.trim(),
        description: description.trim() || null,
        emoji: emoji || null,
        target_date: targetDate || null,
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-panel">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Dream something up ✨
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <input
            type="text"
            required
            placeholder="See the northern lights together"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-warm"
            autoFocus
          />
          <textarea
            rows={2}
            placeholder="Why this one matters (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-warm resize-none"
          />

          <div>
            <p className="text-sm font-medium text-foreground mb-2">Pick an icon</p>
            <div className="flex gap-1.5 flex-wrap">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(emoji === e ? "" : e)}
                  className={`w-9 h-9 rounded-xl text-lg transition-all hover:scale-110 ${
                    emoji === e
                      ? "tint-brand scale-110 shadow-soft"
                      : "bg-secondary"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Target date (optional)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="input-warm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="btn-primary flex-1"
            >
              {saving ? "Adding…" : "Add to our board"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DreamsPage() {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchDreams = useCallback(async () => {
    try {
      const res = await api.get<Dream[]>("/api/dreams");
      setDreams(res.data);
    } catch (err) {
      console.error("Failed to load dreams", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDreams();
  }, [fetchDreams]);

  const dreaming = dreams.filter((d) => d.status === "dreaming");
  const achieved = dreams.filter((d) => d.status === "achieved");

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Star className="w-6 h-6 text-brand-300" />
            Future Dreams
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            The things you'll do together, one step at a time.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New dream</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 skeleton" />
          ))}
        </div>
      ) : dreams.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <div className="text-5xl mb-4 animate-float">🌠</div>
          <p className="font-display text-xl font-medium text-foreground mb-1">
            The board is empty
          </p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
            Big or small — the trip, the house, the dog. Put it on the board
            and walk toward it together.
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            Dream the first one
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {dreaming.length > 0 && (
            <div className="space-y-4 stagger-children">
              {dreaming.map((d) => (
                <DreamCard key={d.id} dream={d} onChanged={fetchDreams} />
              ))}
            </div>
          )}
          {achieved.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500" />
                Achieved — now part of your story
              </h2>
              <div className="space-y-4 stagger-children">
                {achieved.map((d) => (
                  <DreamCard key={d.id} dream={d} onChanged={fetchDreams} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {showModal && (
        <NewDreamModal
          onClose={() => setShowModal(false)}
          onSaved={fetchDreams}
        />
      )}
    </div>
  );
}
