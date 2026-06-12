"use client";

import { useState, useEffect, useCallback } from "react";
import { Music, Plus, X, Trash2, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import type { Song } from "@/lib/types";
import { format, parseISO } from "date-fns";

/** Official embeds only — we never proxy or download audio. */
function SongEmbed({ song }: { song: Song }) {
  if (song.provider === "youtube" && song.embed_id) {
    return (
      <div className="rounded-xl overflow-hidden aspect-video bg-black/5">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${song.embed_id}`}
          title={song.title || "Shared song"}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
          loading="lazy"
        />
      </div>
    );
  }
  if (song.provider === "spotify" && song.embed_id) {
    return (
      <div className="rounded-xl overflow-hidden">
        <iframe
          src={`https://open.spotify.com/embed/${song.embed_id}`}
          title={song.title || "Shared song"}
          allow="encrypted-media"
          className="w-full h-[152px]"
          loading="lazy"
        />
      </div>
    );
  }
  return (
    <a
      href={song.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-500 transition-colors"
    >
      <ExternalLink className="w-4 h-4" />
      {song.url}
    </a>
  );
}

function AddSongModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/api/playlist", {
        url: url.trim(),
        title: title.trim() || null,
        note: note.trim() || null,
      });
      onSaved();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to add song.");
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
            Add to our soundtrack 🎵
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
              YouTube or Spotify link
            </label>
            <input
              type="url"
              required
              placeholder="https://youtu.be/…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input-warm"
              autoFocus
            />
          </div>
          <input
            type="text"
            placeholder="Song title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-warm"
          />
          <textarea
            rows={2}
            placeholder="Why this song? (the story behind it)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input-warm resize-none"
          />

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
              {saving ? "Adding…" : "Add this song"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PlaylistPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchSongs = useCallback(async () => {
    try {
      const res = await api.get<Song[]>("/api/playlist");
      setSongs(res.data);
    } catch (err) {
      console.error("Failed to load playlist", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const deleteSong = async (id: string) => {
    try {
      await api.delete(`/api/playlist/${id}`);
      await fetchSongs();
    } catch {
      // ignore
    }
  };

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Music className="w-6 h-6 text-brand-300" />
            Our Songs
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            The soundtrack of you two, and the stories behind it.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add song</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 skeleton" />
          ))}
        </div>
      ) : songs.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <div className="text-5xl mb-4 animate-float">🎶</div>
          <p className="font-display text-xl font-medium text-foreground mb-1">
            No songs yet
          </p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
            That song from the car ride. The one you danced to in the kitchen.
            Keep them here, with the story.
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            Add the first one
          </button>
        </div>
      ) : (
        <div className="space-y-5 stagger-children">
          {songs.map((song) => (
            <div key={song.id} className="card-warm">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  {song.title && (
                    <h3 className="font-medium text-foreground text-sm">
                      {song.title}
                    </h3>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    shared by {song.shared_by_name} ·{" "}
                    {format(parseISO(song.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <button
                  onClick={() => deleteSong(song.id)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <SongEmbed song={song} />

              {song.note && (
                <p className="text-hand text-foreground mt-3">
                  “{song.note}”
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddSongModal onClose={() => setShowModal(false)} onSaved={fetchSongs} />
      )}
    </div>
  );
}
