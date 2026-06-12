"use client";

import { useState } from "react";
import {
  HelpCircle,
  ChevronDown,
  MessageCircle,
  Sparkles,
  Flower2,
  Heart,
  Hourglass,
  Mail,
  Star,
  Music,
  CalendarDays,
  Map,
  Album,
  BookOpen,
  Lightbulb,
  Gift,
  Shield,
  Palette,
  PlayCircle,
  HardDrive,
  Bot,
} from "lucide-react";
import { replayOnboarding } from "@/components/Onboarding";

function Section({
  icon: Icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: typeof Heart;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card-warm !p-0 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg tint-brand flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-brand-400" />
        </div>
        <span className="flex-1 text-sm font-semibold text-foreground">
          {title}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 text-sm text-muted-foreground leading-relaxed space-y-2 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

function Item({ icon: Icon, name, desc }: { icon: typeof Heart; name: string; desc: string }) {
  return (
    <div className="flex gap-3 items-start">
      <Icon className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
      <p>
        <strong className="text-foreground font-medium">{name}</strong> — {desc}
      </p>
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="p-5 max-w-2xl mx-auto space-y-4">
      <div className="animate-fade-in mb-2">
        <h1 className="page-title flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-brand-300" />
          Help & guide
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Everything in the app, explained. Tap a section to open it.
        </p>
      </div>

      {/* Replay tour */}
      <button
        onClick={replayOnboarding}
        className="w-full card-warm card-hover flex items-center gap-3 text-left"
      >
        <PlayCircle className="w-6 h-6 text-brand-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">Replay the tour</p>
          <p className="text-xs text-muted-foreground">
            The one-minute walkthrough you saw on your first visit.
          </p>
        </div>
      </button>

      <div className="space-y-3 stagger-children">
        <Section icon={Heart} title="Getting started" defaultOpen>
          <p>
            <strong className="text-foreground">1.</strong> The first person runs
            the server and creates their account at <code>/setup</code>.
          </p>
          <p>
            <strong className="text-foreground">2.</strong> Setup gives you a
            one-time invite link — send it to your partner. They open it and
            create the second (and final) account. Nobody else can ever join.
          </p>
          <p>
            <strong className="text-foreground">3.</strong> That's it. Both log
            in and the whole app is yours. If the invite expires, generate a new
            one from Settings.
          </p>
        </Section>

        <Section icon={MessageCircle} title="Together — the daily spaces">
          <Item
            icon={MessageCircle}
            name="Us"
            desc="your private chat. Photos, voice notes, files and links with rich previews. The header shows when your partner is online. Your messages show ✓ sent, ✓✓ delivered, and Seen. Hover or tap a message and hit the smiley to react — same emoji again removes it."
          />
          <Item
            icon={Sparkles}
            name="Memory Garden"
            desc="save the moments worth keeping, with a photo and a date. Each becomes a markdown file in your vault. On anniversaries they resurface under “On this day”."
          />
          <Item
            icon={Flower2}
            name="Daily Bloom"
            desc="one shared question per day. Your answer stays hidden until you've both replied — then both reveal at once."
          />
          <Item
            icon={Heart}
            name="Little Things"
            desc="your streak, days together, a thinking-of-you ping (one per 5 minutes), and mood weather — a sky you choose to share. Your 90-day mood calendar is visible only to you."
          />
        </Section>

        <Section icon={Hourglass} title="Keepsakes — the slow magic">
          <Item
            icon={Hourglass}
            name="Time Capsules"
            desc="seal a message (and photo) until a future date. Neither of you can open it early — the server itself refuses. Opened capsules join your timeline."
          />
          <Item
            icon={Mail}
            name="Letters"
            desc="a slower inbox. Write now, choose a delivery date, and it stays completely invisible until that day. You can take back a letter only while it's undelivered."
          />
          <Item
            icon={Star}
            name="Dreams"
            desc="your shared someday-board. Add steps, tick them off, watch the progress bar fill. Achieving a dream archives it into your story."
          />
          <Item
            icon={Music}
            name="Our Songs"
            desc="the soundtrack of you two. Paste a YouTube or Spotify link, add the story behind it — the app embeds the official player and never touches the audio."
          />
          <Item
            icon={CalendarDays}
            name="Our Story"
            desc="everything above, woven into one chronological timeline. No AI — just your own kept moments in order."
          />
          <Item
            icon={Map}
            name="Garden Map"
            desc="the same story as a living garden — every memory a flower, every dream a star. Tap a plant to open it."
          />
          <Item
            icon={Album}
            name="Scrapbook"
            desc="a keepsake page generated for each month: photos, memories, blooms, milestones. Hit Export PDF to print or save it — all generated locally."
          />
        </Section>

        <Section icon={BookOpen} title="Just me — your private side">
          <Item
            icon={BookOpen}
            name="My Pages"
            desc="your journal. Entries are encrypted with a key made from your password — your partner can't read them, and neither can whoever runs the server."
          />
          <Item
            icon={Lightbulb}
            name="I Noticed"
            desc="the local AI reads only YOUR OWN messages and bloom answers, and reflects your patterns back to you — topics you return to, thanks you never said, promises left open. It never analyses your partner, and they never see your reflections."
          />
          <Item
            icon={Gift}
            name="Gift Vault"
            desc="your secret wishlist — sizes, favourites, hints to yourself. Encrypted, and there's deliberately no share button. Getting it right without peeking is the point."
          />
          <p className="tint-brand rounded-xl px-3 py-2 text-xs">
            🔑 <strong className="text-foreground">Journal locked?</strong> After
            a server restart your encryption key is gone from memory (on
            purpose). Just log in again and everything unlocks.
          </p>
        </Section>

        <Section icon={Shield} title="The rules this app lives by">
          <p>These are hard limits enforced in the code, not settings:</p>
          <p>1. The AI never writes or speaks as either of you.</p>
          <p>
            2. <strong className="text-foreground">The mirror principle:</strong>{" "}
            insights about you go only to you. The app will never tell you your
            partner “seems distant” — that feature category is rejected by
            design.
          </p>
          <p>3. No sentiment analysis of your partner delivered to you. Ever.</p>
          <p>4. Private stays private — encryption at rest for journals and gifts.</p>
          <p>5. You are equals. There is no admin over the relationship data.</p>
          <p>6. Shared memory is deliberate and transparent — no hidden profiles.</p>
          <p>7. Your words never leave your server. Local AI only, no telemetry.</p>
        </Section>

        <Section icon={Palette} title="Themes, text size & installing the app">
          <p>
            Open <strong className="text-foreground">Appearance</strong> (bottom
            of the sidebar) or Settings to switch light/dark, pick one of seven
            colour themes — Rose, Crimson ❤️, Ocean, Lavender, Sunset, Forest,
            Midnight — and set your text size. Each of you can use a different
            look; choices are remembered on your device, even on the login page.
          </p>
          <p>
            📱 <strong className="text-foreground">Install as an app:</strong> in
            your phone browser choose “Add to Home Screen” — My Bibi is a PWA
            and works like a native app.
          </p>
        </Section>

        <Section icon={Bot} title="Enabling the AI (optional)">
          <p>
            The “I Noticed” reflections use a small model running on your own
            machine via Ollama — nothing is sent anywhere.
          </p>
          <p>
            With Docker: <code>docker compose --profile ai up -d</code>, then{" "}
            <code>docker exec -it &lt;ollama&gt; ollama pull llama3.2:3b</code>.
            Without it, simply install Ollama and pull the model. The rest of
            the app works perfectly with AI off.
          </p>
        </Section>

        <Section icon={HardDrive} title="Your data & backups">
          <p>
            Everything lives in the <code>vault/</code> folder on your server:
            the SQLite database, your photos and voice notes, and one markdown
            file per memory and journal entry (journals stored encrypted). The
            vault opens beautifully in Obsidian.
          </p>
          <p>
            Back it up by copying that one folder:{" "}
            <code>tar -czf bibi-backup.tar.gz vault/</code>
          </p>
        </Section>
      </div>

      <p className="text-xs text-muted-foreground text-center leading-relaxed pt-2">
        Built by one couple, for themselves first. The limits are the point. ❤️
      </p>
    </div>
  );
}
