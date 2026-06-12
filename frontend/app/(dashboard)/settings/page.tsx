"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings,
  User as UserIcon,
  KeyRound,
  CalendarHeart,
  Activity,
  PlayCircle,
  LogOut,
  Copy,
  Check,
  Eye,
  EyeOff,
  Bot,
  Server,
} from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { User, LittleThingsStatus } from "@/lib/types";
import { AppearancePanel } from "@/components/ThemeControls";
import { replayOnboarding } from "@/components/Onboarding";
import { format, parseISO } from "date-fns";

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Settings;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-warm">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
        <Icon className="w-4 h-4 text-brand-400" />
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [status, setStatus] = useState<LittleThingsStatus | null>(null);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  // Invite (only relevant while solo)
  const [inviteLink, setInviteLink] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);

  // Day one
  const [startDate, setStartDate] = useState("");
  const [savingDate, setSavingDate] = useState(false);
  const [dateSaved, setDateSaved] = useState(false);

  // Change password
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    // /api/auth/me doubles as the backend connectivity check
    api
      .get<User>("/api/auth/me")
      .then((r) => {
        setMe(r.data);
        setBackendOk(true);
      })
      .catch(() => setBackendOk(false));
    api
      .get<LittleThingsStatus>("/api/little-things/status")
      .then((r) => {
        setStatus(r.data);
        if (r.data.relationship_started) setStartDate(r.data.relationship_started);
      })
      .catch(() => {});
    api
      .get<{ ai_available: boolean }>("/api/insights/status")
      .then((r) => setAiAvailable(r.data.ai_available))
      .catch(() => setAiAvailable(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasPartner =
    !!status && status.partner_name !== "your partner";

  const generateInvite = async () => {
    try {
      const res = await api.post<{ invite_link: string }>("/api/auth/invite");
      setInviteLink(res.data.invite_link);
    } catch {
      // partner already joined → button hidden anyway
    }
  };

  const copyInvite = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const saveStartDate = async () => {
    if (!startDate || savingDate) return;
    setSavingDate(true);
    try {
      await api.post("/api/little-things/start-date", { start_date: startDate });
      setDateSaved(true);
      setTimeout(() => setDateSaved(false), 2000);
    } finally {
      setSavingDate(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.next.length < 8) {
      setPwMsg({ ok: false, text: "New password must be at least 8 characters." });
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ ok: false, text: "New passwords don't match." });
      return;
    }
    setPwBusy(true);
    try {
      const res = await api.post<{ reencrypted_entries: number; reencrypted_wishes: number }>(
        "/api/auth/change-password",
        { current_password: pwForm.current, new_password: pwForm.next }
      );
      setPwForm({ current: "", next: "", confirm: "" });
      setPwMsg({
        ok: true,
        text: `Password changed. ${res.data.reencrypted_entries} journal entries and ${res.data.reencrypted_wishes} wishes re-encrypted with your new key.`,
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setPwMsg({
        ok: false,
        text: axiosErr.response?.data?.detail || "Couldn't change password.",
      });
    } finally {
      setPwBusy(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("bibi_token");
    router.push("/login");
  };

  return (
    <div className="p-5 max-w-2xl mx-auto space-y-4">
      <div className="animate-fade-in mb-2">
        <h1 className="page-title flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-300" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your account, your look, your day one.
        </p>
      </div>

      <div className="space-y-4 stagger-children">
        {/* Account */}
        <Card icon={UserIcon} title="Account">
          {me ? (
            <div className="space-y-1.5 text-sm">
              <p className="text-foreground font-medium">{me.name}</p>
              <p className="text-muted-foreground">{me.email}</p>
              <p className="text-xs text-muted-foreground">
                {hasPartner ? (
                  <>
                    Connected with{" "}
                    <strong className="text-foreground">{status?.partner_name}</strong>{" "}
                    ❤️
                  </>
                ) : (
                  "No partner connected yet."
                )}
              </p>
              {!hasPartner && (
                <div className="pt-2">
                  {inviteLink ? (
                    <div className="bg-muted rounded-xl p-3 flex items-center gap-2">
                      <p className="text-xs font-mono break-all flex-1">{inviteLink}</p>
                      <button
                        onClick={copyInvite}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors flex-shrink-0"
                      >
                        {inviteCopied ? (
                          <Check className="w-4 h-4 text-sage-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <button onClick={generateInvite} className="btn-secondary text-xs py-2">
                      Generate a fresh invite link
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-12 skeleton" />
          )}
        </Card>

        {/* Appearance */}
        <Card icon={Settings} title="Appearance">
          <AppearancePanel />
        </Card>

        {/* Day one */}
        <Card icon={CalendarHeart} title="Your day one">
          <p className="text-xs text-muted-foreground mb-3">
            The date your story started — used for “days together”.
            {status?.relationship_started &&
              ` Currently ${format(parseISO(status.relationship_started), "MMMM d, yyyy")}.`}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-warm w-auto"
            />
            <button
              onClick={saveStartDate}
              disabled={savingDate || !startDate}
              className="btn-primary py-2 px-4"
            >
              {dateSaved ? <Check className="w-4 h-4" /> : "Save"}
            </button>
          </div>
        </Card>

        {/* Security */}
        <Card icon={KeyRound} title="Password & encryption">
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Your journal and gift vault are encrypted with a key made from your
            password. Changing it re-encrypts everything automatically with the
            new key.
          </p>
          <form onSubmit={changePassword} className="space-y-3">
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                required
                placeholder="Current password"
                value={pwForm.current}
                onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                className="input-warm pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <input
              type={showPw ? "text" : "password"}
              required
              minLength={8}
              placeholder="New password (8+ characters)"
              value={pwForm.next}
              onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
              className="input-warm"
              autoComplete="new-password"
            />
            <input
              type={showPw ? "text" : "password"}
              required
              placeholder="Repeat new password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              className="input-warm"
              autoComplete="new-password"
            />
            {pwMsg && (
              <p
                className={`text-xs rounded-xl px-3 py-2 animate-fade-in ${
                  pwMsg.ok
                    ? "tint-positive text-sage-600 dark:text-sage-300"
                    : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                }`}
              >
                {pwMsg.text}
              </p>
            )}
            <button type="submit" disabled={pwBusy} className="btn-primary">
              {pwBusy ? "Re-encrypting…" : "Change password"}
            </button>
          </form>
        </Card>

        {/* System */}
        <Card icon={Activity} title="System">
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <Server className="w-4 h-4 text-muted-foreground" />
              Backend:{" "}
              {backendOk === null ? (
                <span className="text-muted-foreground">checking…</span>
              ) : backendOk ? (
                <span className="text-sage-500 dark:text-sage-300 font-medium">connected</span>
              ) : (
                <span className="text-red-500 font-medium">unreachable</span>
              )}
            </p>
            <p className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-muted-foreground" />
              Local AI (Ollama):{" "}
              {aiAvailable === null ? (
                <span className="text-muted-foreground">checking…</span>
              ) : aiAvailable ? (
                <span className="text-sage-500 dark:text-sage-300 font-medium">online</span>
              ) : (
                <span className="text-muted-foreground font-medium">
                  offline — app works fine without it
                </span>
              )}
            </p>
          </div>
        </Card>

        {/* Tour + logout */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={replayOnboarding}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <PlayCircle className="w-4 h-4" />
            Replay the tour
          </button>
          <button
            onClick={logout}
            className="btn-secondary flex-1 flex items-center justify-center gap-2 hover:text-red-400"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center pt-2">
        My Bibi · self-hosted · your data, your server ❤️
      </p>
    </div>
  );
}
