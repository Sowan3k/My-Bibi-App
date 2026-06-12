"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, MailOpen, PenLine, X, Clock, Trash2 } from "lucide-react";
import api from "@/lib/api";
import type { Letter } from "@/lib/types";
import { format, parseISO, differenceInCalendarDays } from "date-fns";

type Tab = "inbox" | "sent";

function WriteLetterModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deliverAt, setDeliverAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/api/letters", {
        title: title.trim() || null,
        body: body.trim(),
        deliver_at: deliverAt,
      });
      onSaved();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to send letter.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-panel max-w-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Write a letter 💌
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
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-warm"
          />

          <textarea
            rows={8}
            required
            placeholder="Slow down. Say the things chat is too fast for…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="input-warm resize-none font-hand text-xl leading-relaxed"
            autoFocus
          />

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Deliver on
            </label>
            <input
              type="date"
              required
              value={deliverAt}
              onChange={(e) => setDeliverAt(e.target.value)}
              className="input-warm"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              They won't see anything — not even a teaser — until this day.
            </p>
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
              {saving ? "Sealing…" : "Send it into the future"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LettersPage() {
  const [tab, setTab] = useState<Tab>("inbox");
  const [inbox, setInbox] = useState<Letter[]>([]);
  const [sent, setSent] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [openLetter, setOpenLetter] = useState<Letter | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [inboxRes, sentRes] = await Promise.all([
        api.get<Letter[]>("/api/letters/inbox"),
        api.get<Letter[]>("/api/letters/sent"),
      ]);
      setInbox(inboxRes.data);
      setSent(sentRes.data);
    } catch (err) {
      console.error("Failed to load letters", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const readLetter = async (letter: Letter) => {
    setOpenLetter(letter);
    if (!letter.read_at) {
      try {
        await api.post(`/api/letters/${letter.id}/read`);
        await fetchAll();
      } catch {
        // ignore
      }
    }
  };

  const deleteLetter = async (id: string) => {
    try {
      await api.delete(`/api/letters/${id}`);
      await fetchAll();
    } catch {
      // delivered letters can't be deleted
    }
  };

  const unread = inbox.filter((l) => !l.read_at).length;

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Mail className="w-6 h-6 text-brand-300" />
            Letters
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            A slower inbox. Words that take their time.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 flex-shrink-0"
        >
          <PenLine className="w-4 h-4" />
          <span className="hidden sm:inline">Write</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6 w-fit">
        <button
          onClick={() => setTab("inbox")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            tab === "inbox"
              ? "bg-card text-foreground shadow-card"
              : "text-muted-foreground"
          }`}
        >
          Inbox{unread > 0 && (
            <span className="ml-1.5 text-[10px] bg-brand-300 text-white rounded-full px-1.5 py-0.5">
              {unread}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("sent")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            tab === "sent"
              ? "bg-card text-foreground shadow-card"
              : "text-muted-foreground"
          }`}
        >
          Sent
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 skeleton" />
          ))}
        </div>
      ) : tab === "inbox" ? (
        inbox.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="text-5xl mb-4 animate-float">📮</div>
            <p className="font-display text-xl font-medium text-foreground mb-1">
              Nothing here yet
            </p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              When a letter from your partner reaches its delivery date, it
              lands here.
            </p>
          </div>
        ) : (
          <div className="space-y-3 stagger-children">
            {inbox.map((letter) => (
              <button
                key={letter.id}
                onClick={() => readLetter(letter)}
                className={`w-full text-left card-warm card-hover ${
                  !letter.read_at ? "border-brand-200 dark:border-brand-500/40" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      letter.read_at ? "bg-muted" : "tint-brand animate-glow-pulse"
                    }`}
                  >
                    {letter.read_at ? (
                      <MailOpen className="w-4.5 h-4.5 w-[18px] h-[18px] text-muted-foreground" />
                    ) : (
                      <Mail className="w-[18px] h-[18px] text-brand-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {letter.title || "A letter for you"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      from {letter.author_name} · delivered{" "}
                      {format(parseISO(letter.deliver_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  {!letter.read_at && (
                    <span className="text-[10px] font-semibold text-brand-400 uppercase tracking-wide">
                      new
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )
      ) : sent.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <div className="text-5xl mb-4 animate-float">🕊️</div>
          <p className="font-display text-xl font-medium text-foreground mb-1">
            No letters sent
          </p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
            Write one now, date it for later. Future them will thank present
            you.
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            Write your first letter
          </button>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {sent.map((letter) => {
            const days = differenceInCalendarDays(
              parseISO(letter.deliver_at),
              new Date()
            );
            return (
              <div key={letter.id} className="card-warm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {letter.delivered ? (
                      <MailOpen className="w-[18px] h-[18px] text-sage-500 dark:text-sage-300" />
                    ) : (
                      <Clock className="w-[18px] h-[18px] text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {letter.title || "Untitled letter"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {letter.delivered
                        ? `delivered ${format(
                            parseISO(letter.deliver_at),
                            "MMM d, yyyy"
                          )}${letter.read_at ? " · read" : ""}`
                        : `delivers in ${days} day${days !== 1 ? "s" : ""} (${format(
                            parseISO(letter.deliver_at),
                            "MMM d, yyyy"
                          )})`}
                    </p>
                  </div>
                  {!letter.delivered && (
                    <button
                      onClick={() => deleteLetter(letter.id)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors"
                      title="Take it back (undelivered only)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {letter.delivered && letter.body && (
                  <p className="text-hand text-foreground mt-3 pl-13 whitespace-pre-wrap border-t border-border pt-3">
                    {letter.body}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reading view */}
      {openLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="modal-overlay" onClick={() => setOpenLetter(null)} />
          <div className="modal-panel max-w-xl max-h-[85vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  {openLetter.title || "A letter for you"}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  from {openLetter.author_name} ·{" "}
                  {format(parseISO(openLetter.deliver_at), "MMMM d, yyyy")}
                </p>
              </div>
              <button
                onClick={() => setOpenLetter(null)}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="tint-brand rounded-2xl p-5">
              <p className="text-hand text-2xl text-foreground whitespace-pre-wrap leading-relaxed">
                {openLetter.body}
              </p>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <WriteLetterModal
          onClose={() => setShowModal(false)}
          onSaved={fetchAll}
        />
      )}
    </div>
  );
}
