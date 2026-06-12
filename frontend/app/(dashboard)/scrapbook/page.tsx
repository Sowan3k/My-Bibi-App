"use client";

import { useState, useEffect, useCallback } from "react";
import { Album, Printer, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import type { ScrapbookData } from "@/lib/types";
import { format, parse, parseISO } from "date-fns";

function monthLabel(ym: string): string {
  return format(parse(ym, "yyyy-MM", new Date()), "MMMM yyyy");
}

export default function ScrapbookPage() {
  const [months, setMonths] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [data, setData] = useState<ScrapbookData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<string[]>("/api/scrapbook/months")
      .then((r) => {
        setMonths(r.data);
        if (r.data.length > 0) setSelected(r.data[0]);
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchMonth = useCallback(async (ym: string) => {
    setLoading(true);
    try {
      const res = await api.get<ScrapbookData>(`/api/scrapbook/${ym}`);
      setData(res.data);
    } catch (err) {
      console.error("Failed to load scrapbook", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected) fetchMonth(selected);
  }, [selected, fetchMonth]);

  const idx = selected ? months.indexOf(selected) : -1;
  const newer = idx > 0 ? months[idx - 1] : null;
  const older = idx >= 0 && idx < months.length - 1 ? months[idx + 1] : null;

  return (
    <div className="p-5 max-w-3xl mx-auto">
      {/* Controls (hidden when printing) */}
      <div className="flex items-center justify-between mb-6 gap-3 print-hidden">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Album className="w-6 h-6 text-brand-300" />
            Scrapbook
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            A monthly keepsake, generated from your own vault. Print it, keep
            it.
          </p>
        </div>
        {data && (
          <button
            onClick={() => window.print()}
            className="btn-primary flex items-center gap-2 flex-shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        )}
      </div>

      {months.length > 0 && (
        <div className="flex items-center justify-center gap-4 mb-8 print-hidden">
          <button
            onClick={() => older && setSelected(older)}
            disabled={!older}
            className="btn-ghost disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">{older ? monthLabel(older) : ""}</span>
          </button>
          <span className="font-display text-lg font-semibold text-foreground min-w-[160px] text-center">
            {selected ? monthLabel(selected) : ""}
          </span>
          <button
            onClick={() => newer && setSelected(newer)}
            disabled={!newer}
            className="btn-ghost disabled:opacity-30"
          >
            <span className="hidden sm:inline mr-1">{newer ? monthLabel(newer) : ""}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 skeleton" />
          ))}
        </div>
      ) : !data || months.length === 0 ? (
        <div className="text-center py-16 animate-fade-in print-hidden">
          <div className="text-5xl mb-4 animate-float">📔</div>
          <p className="font-display text-xl font-medium text-foreground mb-1">
            Nothing to bind yet
          </p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Once you have memories, photos, and blooms, each month becomes a
            page here.
          </p>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* Cover */}
          <div className="text-center py-10 card-warm print-page">
            <p className="text-5xl mb-3">📔</p>
            <h2 className="font-display text-4xl font-semibold text-foreground">
              {monthLabel(data.month)}
            </h2>
            <p className="text-hand text-brand-500 dark:text-brand-300 mt-2">
              a month of us
            </p>
            {/* Stats row */}
            <div className="flex justify-center gap-6 mt-6 text-center flex-wrap">
              {[
                { n: data.stats.messages, label: "messages" },
                { n: data.stats.memories, label: "memories" },
                { n: data.stats.blooms, label: "blooms" },
                { n: data.stats.pings, label: "pings" },
                { n: data.stats.songs, label: "songs" },
              ]
                .filter((s) => s.n > 0)
                .map((s) => (
                  <div key={s.label}>
                    <p className="font-display text-2xl font-semibold text-foreground">
                      {s.n}
                    </p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                      {s.label}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          {/* Photos */}
          {data.photos.length > 0 && (
            <section className="print-page">
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                The photos
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {data.photos.map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={`/api/chat/media/${encodeURIComponent(p.media_path)}`}
                    alt=""
                    className={`w-full h-40 object-cover rounded-2xl shadow-card ${
                      i % 3 === 1 ? "rotate-1" : i % 3 === 2 ? "-rotate-1" : ""
                    }`}
                    loading="lazy"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Memories */}
          {data.memories.length > 0 && (
            <section className="print-page">
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                What you kept
              </h3>
              <div className="space-y-3">
                {data.memories.map((m) => (
                  <div key={m.id} className="card-warm flex gap-4">
                    {m.media_path && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/chat/media/${encodeURIComponent(m.media_path)}`}
                        alt=""
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {m.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(m.memory_date), "MMMM d")} · {m.by_name}
                      </p>
                      {m.content && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {m.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Blooms */}
          {data.blooms.length > 0 && (
            <section className="print-page">
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                Questions you both answered
              </h3>
              <div className="space-y-3">
                {data.blooms.map((b) => (
                  <div key={b.date} className="card-warm">
                    <p className="text-xs text-muted-foreground mb-1">
                      {format(parseISO(b.date), "MMMM d")}
                    </p>
                    <p className="font-display text-base text-foreground mb-2">
                      {b.prompt}
                    </p>
                    {b.answers.map((a) => (
                      <p key={a.name} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {a.name}:
                        </span>{" "}
                        {a.answer}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Milestones */}
          {(data.dreams_achieved.length > 0 || data.capsules_opened.length > 0) && (
            <section className="print-page">
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                Milestones
              </h3>
              <div className="space-y-2">
                {data.dreams_achieved.map((d) => (
                  <div key={d.id} className="tint-positive rounded-xl p-3 text-sm">
                    {d.emoji} Dream achieved: <strong>{d.title}</strong>
                  </div>
                ))}
                {data.capsules_opened.map((c) => (
                  <div key={c.id} className="tint-brand rounded-xl p-3 text-sm">
                    ⏳ Capsule opened: <strong>{c.title}</strong> (from {c.by_name})
                  </div>
                ))}
              </div>
            </section>
          )}

          <p className="text-center text-hand text-xl text-brand-500 dark:text-brand-300 pb-6">
            made with the things you kept ❤️
          </p>
        </div>
      )}
    </div>
  );
}
