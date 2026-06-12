"use client";

import { useState, useEffect, useCallback } from "react";
import { Gift, Plus, X, Trash2, Lock, KeyRound, ExternalLink, Pencil } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import type { GiftWish } from "@/lib/types";

function WishModal({
  wish,
  onClose,
  onSaved,
}: {
  wish: GiftWish | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(wish?.title ?? "");
  const [note, setNote] = useState(wish?.note ?? "");
  const [url, setUrl] = useState(wish?.url ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        note: note.trim() || null,
        url: url.trim() || null,
      };
      if (wish) {
        await api.patch(`/api/gifts/${wish.id}`, payload);
      } else {
        await api.post("/api/gifts", payload);
      }
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
            {wish ? "Edit wish" : "Add a wish 🎁"}
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
            placeholder="That book / ring size 7 / cozy socks…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-warm"
            autoFocus
          />
          <textarea
            rows={2}
            placeholder="Details only you need to remember (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input-warm resize-none"
          />
          <input
            type="url"
            placeholder="Link (optional)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="input-warm"
          />

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="btn-primary flex-1"
            >
              {saving ? "Saving…" : wish ? "Save changes" : "Keep it secret"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GiftVaultPage() {
  const [wishes, setWishes] = useState<GiftWish[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; wish: GiftWish | null }>({
    open: false,
    wish: null,
  });

  const fetchWishes = useCallback(async () => {
    try {
      const res = await api.get<GiftWish[]>("/api/gifts");
      setWishes(res.data);
      setLocked(false);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 423) {
        setLocked(true);
      } else {
        console.error("Failed to load gift vault", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishes();
  }, [fetchWishes]);

  const deleteWish = async (id: string) => {
    try {
      await api.delete(`/api/gifts/${id}`);
      await fetchWishes();
    } catch {
      // ignore
    }
  };

  if (locked) {
    return (
      <div className="p-5 max-w-2xl mx-auto">
        <div className="text-center py-20 animate-fade-in">
          <div className="inline-flex w-16 h-16 rounded-full tint-brand items-center justify-center mb-4">
            <KeyRound className="w-7 h-7 text-brand-400" />
          </div>
          <p className="font-display text-xl font-medium text-foreground mb-2">
            Your vault is locked
          </p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5 leading-relaxed">
            Wishes are encrypted with your password-derived key. Log in again
            to unlock them.
          </p>
          <Link href="/login" className="btn-primary inline-flex">
            Log in to unlock
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Gift className="w-6 h-6 text-brand-300" />
            Gift Vault
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Encrypted · invisible to your partner, even on the server
          </p>
        </div>
        <button
          onClick={() => setModal({ open: true, wish: null })}
          className="btn-primary flex items-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add wish</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      <div className="tint-brand rounded-2xl p-4 text-xs text-muted-foreground leading-relaxed mb-6">
        Keep your own gift intel here: sizes, favourites, things you'd love.
        Your partner has their own vault and can never see yours — there is no
        share button on purpose. Getting it right without peeking is the magic.
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 skeleton" />
          ))}
        </div>
      ) : wishes.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <div className="text-5xl mb-4 animate-float">🎁</div>
          <p className="font-display text-xl font-medium text-foreground mb-1">
            Empty vault
          </p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
            Next time you think &quot;I'd love that&quot;, put it here before
            you forget.
          </p>
          <button
            onClick={() => setModal({ open: true, wish: null })}
            className="btn-primary"
          >
            Add your first wish
          </button>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {wishes.map((wish) => (
            <div key={wish.id} className="card-warm card-hover group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {wish.title}
                  </p>
                  {wish.note && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {wish.note}
                    </p>
                  )}
                  {wish.url && (
                    <a
                      href={wish.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-500 mt-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {new URL(wish.url).hostname}
                    </a>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => setModal({ open: true, wish })}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteWish(wish.id)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <WishModal
          wish={modal.wish}
          onClose={() => setModal({ open: false, wish: null })}
          onSaved={fetchWishes}
        />
      )}
    </div>
  );
}
