"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, Lock, Edit2, Trash2, Save, ChevronLeft, KeyRound } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import type { JournalEntry } from "@/lib/types";
import { format, parseISO } from "date-fns";

type View = "list" | "edit" | "read";

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [view, setView] = useState<View>("list");
  const [selected, setSelected] = useState<JournalEntry | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await api.get<JournalEntry[]>("/api/journal");
      setEntries(res.data);
      setLocked(false);
    } catch (err: unknown) {
      // 423 = encrypted entries are locked until next login
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        (err as { response?: { status?: number } }).response?.status === 423
      ) {
        setLocked(true);
      } else {
        console.error("Failed to load journal", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const startNew = () => {
    setSelected(null);
    setEditTitle("");
    setEditContent("");
    setError("");
    setView("edit");
  };

  const openEntry = (entry: JournalEntry) => {
    setSelected(entry);
    setView("read");
  };

  const startEdit = (entry: JournalEntry) => {
    setSelected(entry);
    setEditTitle(entry.title ?? "");
    setEditContent(entry.content);
    setError("");
    setView("edit");
  };

  const saveEntry = async () => {
    if (!editContent.trim()) {
      setError("Write something first.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (selected) {
        // Update
        const res = await api.patch<JournalEntry>(`/api/journal/${selected.id}`, {
          title: editTitle.trim() || null,
          content: editContent.trim(),
        });
        setSelected(res.data);
      } else {
        // Create
        const res = await api.post<JournalEntry>("/api/journal", {
          title: editTitle.trim() || null,
          content: editContent.trim(),
        });
        setSelected(res.data);
      }
      await fetchEntries();
      setView("read");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || "Failed to save.");
      } else {
        setError("Network error.");
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      await api.delete(`/api/journal/${id}`);
      setDeleteConfirm(null);
      setView("list");
      setSelected(null);
      await fetchEntries();
    } catch {
      // Silently fail
    }
  };

  // --- Locked view (encrypted, key not in server memory) ---
  if (locked) {
    return (
      <div className="p-5 max-w-2xl mx-auto">
        <div className="text-center py-20 animate-fade-in">
          <div className="inline-flex w-16 h-16 rounded-full tint-brand items-center justify-center mb-4">
            <KeyRound className="w-7 h-7 text-brand-400" />
          </div>
          <p className="font-display text-xl font-medium text-foreground mb-2">
            Your journal is locked
          </p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5 leading-relaxed">
            Your entries are encrypted with a key made from your password.
            The server was restarted, so the key is gone from memory. Log in
            again to unlock them — that's the privacy working as intended.
          </p>
          <Link href="/login" className="btn-primary inline-flex">
            Log in to unlock
          </Link>
        </div>
      </div>
    );
  }

  // --- List view ---
  if (view === "list") {
    return (
      <div className="p-5 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-brand-300" />
              My Pages
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Private — encrypted, only you can read this
            </p>
          </div>
          <button onClick={startNew} className="btn-primary flex items-center gap-2 flex-shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New entry</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 skeleton" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="text-5xl mb-4 animate-float">📖</div>
            <p className="font-display text-xl font-medium text-foreground mb-1">
              Your pages are blank
            </p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
              Write freely. This is your private space — no one else can read it.
            </p>
            <button onClick={startNew} className="btn-primary">
              Write your first entry
            </button>
          </div>
        ) : (
          <div className="space-y-3 stagger-children">
            {entries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => openEntry(entry)}
                className="w-full text-left card-warm card-hover group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {entry.title || format(parseISO(entry.created_at), "MMMM d")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {entry.content.slice(0, 120)}
                      {entry.content.length > 120 ? "…" : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-muted-foreground">
                      {format(parseISO(entry.updated_at), "MMM d")}
                    </p>
                    <Lock className="w-3 h-3 text-muted-foreground mt-1 ml-auto" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Read view ---
  if (view === "read" && selected) {
    return (
      <div className="p-5 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setView("list")}
            className="btn-ghost flex items-center gap-1 -ml-2"
          >
            <ChevronLeft className="w-4 h-4" />
            All entries
          </button>
          <div className="flex-1" />
          <button
            onClick={() => startEdit(selected)}
            className="btn-ghost flex items-center gap-1.5"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => setDeleteConfirm(selected.id)}
            className="btn-ghost text-red-400 hover:text-red-500 flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>

        <div className="card-warm">
          <div className="flex items-start justify-between mb-4">
            <div>
              {selected.title && (
                <h2 className="text-xl font-semibold text-foreground mb-1">
                  {selected.title}
                </h2>
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="w-3 h-3" />
                {format(parseISO(selected.created_at), "MMMM d, yyyy")}
                {selected.updated_at !== selected.created_at &&
                  ` · edited ${format(parseISO(selected.updated_at), "MMM d")}`}
              </p>
            </div>
          </div>
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed">
            {selected.content}
          </div>
        </div>

        {/* Delete confirm */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="modal-overlay"
              onClick={() => setDeleteConfirm(null)}
            />
            <div className="modal-panel max-w-sm">
              <h3 className="font-semibold text-foreground mb-2">
                Delete this entry?
              </h3>
              <p className="text-sm text-muted-foreground mb-5">
                This is permanent. The markdown file will also be deleted from
                your vault.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteEntry(deleteConfirm)}
                  className="flex-1 btn-primary bg-red-400 hover:bg-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Edit view ---
  return (
    <div className="p-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setView(selected ? "read" : "list")}
          className="btn-ghost flex items-center gap-1 -ml-2"
        >
          <ChevronLeft className="w-4 h-4" />
          {selected ? "Cancel" : "All entries"}
        </button>
        <div className="flex-1" />
        <button
          onClick={saveEntry}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="card-warm space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="w-3 h-3" />
          Private · Only you can read this
        </div>

        <input
          type="text"
          placeholder="Title (optional)"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full text-xl font-semibold border-none outline-none bg-transparent text-foreground placeholder:text-muted-foreground placeholder:font-normal"
        />

        <textarea
          placeholder="Write freely…"
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full min-h-[50vh] border-none outline-none bg-transparent resize-none text-foreground text-sm leading-relaxed placeholder:text-muted-foreground"
          autoFocus={!editTitle}
        />

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
}
