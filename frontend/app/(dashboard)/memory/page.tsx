"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Calendar, Image as ImageIcon, X, Sparkles } from "lucide-react";
import api from "@/lib/api";
import type { Memory } from "@/lib/types";
import { format, parseISO } from "date-fns";

interface MemoryFormData {
  title: string;
  content: string;
  memory_date: string;
  photo?: File | null;
}

function MemoryCard({ memory }: { memory: Memory }) {
  return (
    <div className="memory-card group">
      {memory.media_path && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/chat/media/${encodeURIComponent(memory.media_path)}`}
          alt={memory.title}
          className="w-full h-40 object-cover"
        />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-medium text-foreground text-sm leading-snug">
            {memory.title}
          </h3>
          <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">
            {format(parseISO(memory.memory_date), "MMM d, yyyy")}
          </span>
        </div>
        {memory.content && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {memory.content}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground mt-2">
          Saved by {memory.created_by_name}
        </p>
      </div>
    </div>
  );
}

function SaveMemoryModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<MemoryFormData>({
    title: "",
    content: "",
    memory_date: format(new Date(), "yyyy-MM-dd"),
    photo: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Give this memory a title.");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", form.title.trim());
      formData.append("content", form.content.trim());
      formData.append("memory_date", form.memory_date);
      if (form.photo) {
        formData.append("photo", form.photo);
      }

      await api.post("/api/memory", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onSaved();
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || "Failed to save memory.");
      } else {
        setError("Network error.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">
            Save a moment ✨
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-cream-100 text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              What was this moment?
            </label>
            <input
              type="text"
              required
              placeholder="Our first hike together"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-warm"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Tell the story (optional)
            </label>
            <textarea
              rows={3}
              placeholder="What made it special? How did it feel?"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="input-warm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              When did this happen?
            </label>
            <input
              type="date"
              value={form.memory_date}
              onChange={(e) =>
                setForm({ ...form, memory_date: e.target.value })
              }
              className="input-warm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Add a photo (optional)
            </label>
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <div className="flex items-center gap-2 btn-secondary text-sm py-2">
                <ImageIcon className="w-4 h-4" />
                {form.photo ? form.photo.name : "Choose photo"}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  setForm({ ...form, photo: e.target.files?.[0] ?? null })
                }
              />
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Saving…" : "Save this memory"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MemoryGardenPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [onThisDay, setOnThisDay] = useState<Memory[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchMemories = useCallback(async () => {
    try {
      const [memoriesRes, otdRes] = await Promise.all([
        api.get<Memory[]>("/api/memory", {
          params: search ? { q: search } : {},
        }),
        api.get<Memory[]>("/api/memory/on-this-day"),
      ]);
      setMemories(memoriesRes.data);
      setOnThisDay(otdRes.data);
    } catch (err) {
      console.error("Failed to load memories", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const debounce = setTimeout(fetchMemories, 300);
    return () => clearTimeout(debounce);
  }, [fetchMemories]);

  return (
    <div className="p-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-rose-300" />
            Memory Garden
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Every moment you chose to keep.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Save a moment
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search memories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-warm pl-9"
        />
      </div>

      {/* On This Day */}
      {onThisDay.length > 0 && !search && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-rose-300" />
            <h2 className="text-sm font-semibold text-foreground">
              On this day
            </h2>
            <span className="text-xs text-muted-foreground">
              — from past years
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {onThisDay.map((m) => (
              <MemoryCard key={m.id} memory={m} />
            ))}
          </div>
          <div className="divider" />
        </section>
      )}

      {/* All memories */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-2xl bg-cream-200 animate-pulse"
            />
          ))}
        </div>
      ) : memories.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🌱</div>
          <p className="text-lg font-medium text-foreground mb-1">
            {search ? "No memories found" : "Your garden is empty"}
          </p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {search
              ? "Try a different search."
              : "Save your first moment and start growing something beautiful."}
          </p>
          {!search && (
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary mt-4"
            >
              Save a moment
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {memories.map((m) => (
            <MemoryCard key={m.id} memory={m} />
          ))}
        </div>
      )}

      {/* Save modal */}
      {showModal && (
        <SaveMemoryModal
          onClose={() => setShowModal(false)}
          onSaved={fetchMemories}
        />
      )}
    </div>
  );
}
