"use client";

import { useState, useEffect } from "react";
import { Map, X } from "lucide-react";
import api from "@/lib/api";
import type { TimelineEvent } from "@/lib/types";
import { format, parseISO } from "date-fns";

/**
 * Garden Map — the relationship as a garden growing left to right.
 * Each kept thing is a plant: memories bloom as flowers, dreams shine as
 * stars, capsules wait as hourglasses, songs as notes, letters as mail.
 * Tap a plant to open what it holds. Pure SVG, mobile-first (scrolls
 * horizontally). No AI — just your own vault, planted.
 */

const PLANT: Record<string, { emoji: string; label: string }> = {
  beginning: { emoji: "💞", label: "The beginning" },
  memory: { emoji: "🌸", label: "Memory" },
  dream: { emoji: "⭐", label: "Dream achieved" },
  capsule: { emoji: "⏳", label: "Capsule" },
  song: { emoji: "🎵", label: "Song" },
  letter: { emoji: "💌", label: "Letter" },
};

const SPACING = 90; // px between plants
const GROUND_Y = 240;

/** Deterministic pseudo-random from index — stable between renders. */
function jitter(i: number, range: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * range - range / 2;
}

export default function GardenMapPage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TimelineEvent | null>(null);

  useEffect(() => {
    api
      .get<TimelineEvent[]>("/api/timeline")
      .then((r) => setEvents(r.data))
      .catch((err) => console.error("Failed to load garden", err))
      .finally(() => setLoading(false));
  }, []);

  const width = Math.max(events.length * SPACING + 160, 600);

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 pb-3">
        <h1 className="page-title flex items-center gap-2">
          <Map className="w-6 h-6 text-brand-300" />
          Garden Map
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Everything you've planted, growing left to right. Tap a bloom to
          open it.
        </p>
      </div>

      {loading ? (
        <div className="px-5">
          <div className="h-72 skeleton" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <div className="text-5xl mb-4 animate-float">🌱</div>
          <p className="font-display text-xl font-medium text-foreground mb-1">
            Bare soil
          </p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Save a memory or achieve a dream and watch your garden grow.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin px-5 pb-5">
          <svg
            width={width}
            height={GROUND_Y + 80}
            viewBox={`0 0 ${width} ${GROUND_Y + 80}`}
            className="select-none"
          >
            {/* Sky glow */}
            <defs>
              <radialGradient id="sun" cx="50%" cy="0%" r="80%">
                <stop offset="0%" stopColor="hsl(var(--brand-300))" stopOpacity="0.14" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--brand-300))" stopOpacity="0.25" />
                <stop offset="100%" stopColor="hsl(var(--brand-300))" stopOpacity="0.04" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width={width} height={GROUND_Y} fill="url(#sun)" />

            {/* Ground */}
            <rect
              x="0"
              y={GROUND_Y}
              width={width}
              height="80"
              fill="url(#ground)"
              rx="20"
            />
            <line
              x1="0"
              y1={GROUND_Y}
              x2={width}
              y2={GROUND_Y}
              stroke="hsl(var(--brand-300))"
              strokeOpacity="0.4"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {events.map((event, i) => {
              const x = 80 + i * SPACING + jitter(i, 24);
              const stemH = 60 + Math.abs(jitter(i * 3 + 1, 70));
              const topY = GROUND_Y - stemH;
              const plant = PLANT[event.type] ?? PLANT.memory;
              const sway = 1.8 + Math.abs(jitter(i * 7 + 2, 1.6));

              return (
                <g
                  key={`${event.type}-${event.ref_id}-${i}`}
                  onClick={() => setSelected(event)}
                  className="cursor-pointer"
                >
                  {/* Stem */}
                  <path
                    d={`M ${x} ${GROUND_Y} Q ${x + jitter(i * 11 + 4, 14)} ${
                      GROUND_Y - stemH / 2
                    } ${x} ${topY + 14}`}
                    stroke="hsl(var(--accent))"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Leaf */}
                  <ellipse
                    cx={x + 7}
                    cy={GROUND_Y - stemH / 2.4}
                    rx="7"
                    ry="3.5"
                    fill="hsl(var(--accent))"
                    opacity="0.8"
                    transform={`rotate(-24 ${x + 7} ${GROUND_Y - stemH / 2.4})`}
                  />
                  {/* Bloom — gently swaying */}
                  <g
                    style={{
                      transformOrigin: `${x}px ${GROUND_Y}px`,
                      animation: `garden-sway ${sway + 2}s ease-in-out ${
                        i * 0.25
                      }s infinite alternate`,
                    }}
                  >
                    <circle
                      cx={x}
                      cy={topY}
                      r="17"
                      fill="hsl(var(--card))"
                      stroke="hsl(var(--brand-300))"
                      strokeOpacity="0.5"
                      strokeWidth="1.5"
                      className="transition-all duration-200 hover:stroke-[3px]"
                    />
                    <text
                      x={x}
                      y={topY + 6}
                      textAnchor="middle"
                      fontSize="17"
                    >
                      {plant.emoji}
                    </text>
                  </g>
                  {/* Date tag */}
                  <text
                    x={x}
                    y={GROUND_Y + 22}
                    textAnchor="middle"
                    fontSize="9"
                    fill="hsl(var(--muted-foreground))"
                  >
                    {format(parseISO(event.date), "MMM yyyy")}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Legend */}
      {events.length > 0 && (
        <div className="px-5 pb-5 flex gap-3 flex-wrap print-hidden">
          {Object.entries(PLANT).map(([key, p]) => (
            <span
              key={key}
              className="flex items-center gap-1 text-[11px] text-muted-foreground"
            >
              {p.emoji} {p.label}
            </span>
          ))}
        </div>
      )}

      {/* Detail popover */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="modal-overlay" onClick={() => setSelected(null)} />
          <div className="modal-panel max-w-sm">
            <div className="flex items-start justify-between mb-3">
              <span className="text-4xl">{PLANT[selected.type]?.emoji}</span>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              {selected.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {selected.subtitle}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {format(parseISO(selected.date), "MMMM d, yyyy")}
            </p>
            {selected.media_path && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/chat/media/${encodeURIComponent(selected.media_path)}`}
                alt=""
                className="w-full max-h-56 object-cover rounded-2xl mt-3"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
