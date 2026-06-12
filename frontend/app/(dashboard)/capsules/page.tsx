"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Hourglass,
  Plus,
  X,
  Lock,
  Unlock,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import api from "@/lib/api";
import type { TimeCapsule } from "@/lib/types";
import { format, parseISO, differenceInCalendarDays } from "date-fns";

function daysUntil(dateStr: string): number {
  return differenceInCalendarDays(parseISO(dateStr), new Date());
}

function CapsuleCard({
  capsule,
  onOpen,
  onDelete,
  meId,
}: {
  capsule: TimeCapsule;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  meId: string | null;
}) {
  const opened = !!capsule.opened_at;
  const remaining = daysUntil(capsule.unlock_at);

  if (opened) {
    return (
      <div className="card-warm animate-fade-in">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full tint-brand flex items-center justify-center">
              <Unlock className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <h3 className="font-medium text-foreground text-sm">
                {capsule.title}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                from {capsule.created_by_name} · sealed{" "}
                {format(parseISO(capsule.created_at), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <span className="text-[10px] text-sage-500 dark:text-sage-300 font-medium uppercase tracking-wide">
            opened
          </span>
        </div>
        {capsule.media_path && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/chat/media/${encodeURIComponent(capsule.media_path)}`}
            alt=""
            className="w-full max-h-64 object-cover rounded-xl mb-3"
          />
        )}
        <p className="text-hand text-foreground whitespace-pre-wrap">
          {capsule.message}
        </p>
      </div>
    );
  }

  return (
    <div className="card-warm card-hover relative overflow-hidden">
      {/* sealed shimmer */}
      <div className="absolute inset-0 pointer-events-none [background:linear-gradient(120deg,transparent_30%,hsl(var(--brand-300)/0.06)_50%,transparent_70%)]" />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-4.5 h-4.5 w-[18px] h-[18px] text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-foreground text-sm">
              {capsule.title}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              sealed by {capsule.created_by_name}
            </p>
          </div>
        </div>
        {capsule.created_by === meId && (
          <button
            onClick={() => onDelete(capsule.id)}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors"
            title="Delete (only while sealed)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            unlocks {format(parseISO(capsule.unlock_at), "MMMM d, yyyy")}
          </p>
          {!capsule.is_unlockable && (
            <p className="font-display text-2xl font-semibold text-foreground mt-0.5">
              {remaining} day{remaining !== 1 ? "s" : ""}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                to go
              </span>
            </p>
          )}
        </div>
        {capsule.is_unlockable ? (
          <button
            onClick={() => onOpen(capsule.id)}
            className="btn-primary flex items-center gap-2 animate-glow-pulse"
          >
            <Unlock className="w-4 h-4" />
            Open it
          </button>
        ) : (
          <Hourglass className="w-6 h-6 text-brand-300 animate-wiggle [animation-iteration-count:infinite] [animation-duration:3s]" />
        )}
      </div>
    </div>
  );
}

function SealCapsuleModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [unlockAt, setUnlockAt] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("message", message.trim());
      fd.append("unlock_at", unlockAt);
      if (photo) fd.append("media", photo);
      await api.post("/api/capsules", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSaved();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to seal capsule.");
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
            Seal a time capsule ⏳
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Name on the capsule
            </label>
            <input
              type="text"
              required
              placeholder="For our anniversary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-warm"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Message to the future
            </label>
            <textarea
              rows={4}
              required
              placeholder="Write to the two of you, months from now…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input-warm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Unlock date
            </label>
            <input
              type="date"
              required
              value={unlockAt}
              onChange={(e) => setUnlockAt(e.target.value)}
              className="input-warm"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Once sealed, <strong>neither of you</strong> can open it early —
              not even you. That's the point.
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <div className="flex items-center gap-2 btn-secondary text-sm py-2">
                <ImageIcon className="w-4 h-4" />
                {photo ? photo.name : "Add a photo (optional)"}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-3 animate-fade-in">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Sealing…" : "Seal it shut"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CapsulesPage() {
  const [capsules, setCapsules] = useState<TimeCapsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);

  const fetchCapsules = useCallback(async () => {
    try {
      const res = await api.get<TimeCapsule[]>("/api/capsules");
      setCapsules(res.data);
    } catch (err) {
      console.error("Failed to load capsules", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCapsules();
    api
      .get<{ id: string }>("/api/auth/me")
      .then((r) => setMeId(r.data.id))
      .catch(() => {});
  }, [fetchCapsules]);

  const openCapsule = async (id: string) => {
    try {
      await api.post(`/api/capsules/${id}/open`);
      await fetchCapsules();
    } catch (err) {
      console.error("Failed to open capsule", err);
    }
  };

  const deleteCapsule = async (id: string) => {
    try {
      await api.delete(`/api/capsules/${id}`);
      await fetchCapsules();
    } catch {
      // sealed-only deletion may 403/409 — ignore
    }
  };

  const sealed = capsules.filter((c) => !c.opened_at);
  const opened = capsules.filter((c) => !!c.opened_at);

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Hourglass className="w-6 h-6 text-brand-300" />
            Time Capsules
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Messages locked until a day you choose. No early peeking.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Seal one</span>
          <span className="sm:hidden">Seal</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 skeleton" />
          ))}
        </div>
      ) : capsules.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <div className="text-5xl mb-4 animate-float">⏳</div>
          <p className="font-display text-xl font-medium text-foreground mb-1">
            No capsules yet
          </p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
            Write something for a future version of you two — an anniversary, a
            birthday, or just &quot;one year from today&quot;.
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            Seal your first capsule
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {sealed.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-foreground mb-3">
                Waiting to be opened
              </h2>
              <div className="space-y-4 stagger-children">
                {sealed.map((c) => (
                  <CapsuleCard
                    key={c.id}
                    capsule={c}
                    onOpen={openCapsule}
                    onDelete={deleteCapsule}
                    meId={meId}
                  />
                ))}
              </div>
            </section>
          )}
          {opened.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-foreground mb-3">
                Opened
              </h2>
              <div className="space-y-4 stagger-children">
                {opened.map((c) => (
                  <CapsuleCard
                    key={c.id}
                    capsule={c}
                    onOpen={openCapsule}
                    onDelete={deleteCapsule}
                    meId={meId}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {showModal && (
        <SealCapsuleModal
          onClose={() => setShowModal(false)}
          onSaved={fetchCapsules}
        />
      )}
    </div>
  );
}
