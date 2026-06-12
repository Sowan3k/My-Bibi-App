"use client";

import { useState, useEffect } from "react";
import { CalendarDays } from "lucide-react";
import api from "@/lib/api";
import type { TimelineEvent } from "@/lib/types";
import { format, parseISO } from "date-fns";

const TYPE_STYLES: Record<string, string> = {
  beginning: "tint-brand",
  memory: "tint-brand",
  dream: "bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20",
  capsule: "bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20",
  song: "tint-positive",
  letter: "bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20",
};

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<TimelineEvent[]>("/api/timeline")
      .then((r) => setEvents(r.data))
      .catch((err) => console.error("Failed to load timeline", err))
      .finally(() => setLoading(false));
  }, []);

  // Group events by year
  const byYear = events.reduce<Record<string, TimelineEvent[]>>((acc, e) => {
    const year = e.date.slice(0, 4);
    (acc[year] = acc[year] || []).push(e);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort();

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <div className="mb-8 animate-fade-in">
        <h1 className="page-title flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-brand-300" />
          Our Story
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Everything you've kept, in the order it happened. No AI, just your
          own markdown.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 skeleton" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <div className="text-5xl mb-4 animate-float">📜</div>
          <p className="font-display text-xl font-medium text-foreground mb-1">
            Your story starts now
          </p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Save memories, achieve dreams, open capsules — they all land here,
            in order.
          </p>
        </div>
      ) : (
        <div className="relative pl-6">
          {/* The thread */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-brand-200 via-border to-brand-200 dark:from-brand-500/30 dark:via-border dark:to-brand-500/30" />

          {years.map((year) => (
            <div key={year} className="mb-8">
              <div className="relative mb-4 -ml-6 flex items-center gap-3">
                <span className="w-4 h-4 rounded-full bg-brand-300 ring-4 ring-background flex-shrink-0 z-10" />
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  {year}
                </h2>
              </div>

              <div className="space-y-4 stagger-children">
                {byYear[year].map((event, i) => (
                  <div key={`${event.type}-${event.ref_id}-${i}`} className="relative">
                    {/* Node dot */}
                    <span className="absolute -left-6 top-5 w-2.5 h-2.5 rounded-full bg-brand-300/70 ring-4 ring-background" />

                    <div
                      className={`rounded-2xl p-4 ${
                        TYPE_STYLES[event.type] ?? "card-warm"
                      } transition-all duration-300 hover:translate-x-1`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl leading-none flex-shrink-0">
                          {event.emoji}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(event.date), "MMMM d")}
                          </p>
                          <h3 className="text-sm font-medium text-foreground mt-0.5">
                            {event.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {event.subtitle}
                          </p>
                        </div>
                        {event.media_path && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/chat/media/${encodeURIComponent(
                              event.media_path
                            )}`}
                            alt=""
                            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                            loading="lazy"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Now marker */}
          <div className="relative -ml-6 flex items-center gap-3">
            <span className="w-4 h-4 rounded-full bg-brand-400 ring-4 ring-background animate-pulse flex-shrink-0 z-10" />
            <p className="text-sm text-muted-foreground italic">
              …and you're still writing it.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
