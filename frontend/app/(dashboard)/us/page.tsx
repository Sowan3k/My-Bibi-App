"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Mic,
  Image as ImageIcon,
  Square,
  Paperclip,
  FileText,
  ExternalLink,
  Smile,
  Check,
  CheckCheck,
} from "lucide-react";
import api from "@/lib/api";
import type { Message, User } from "@/lib/types";
import { format, isToday, isYesterday } from "date-fns";

const REACTION_EMOJI = ["❤️", "😂", "😮", "😢", "🙏", "👍"];

/** Sent / delivered / seen ticks for my own messages. */
function Receipt({ msg }: { msg: Message }) {
  if (msg.id.startsWith("temp-")) {
    return <Check className="w-3 h-3 inline-block opacity-50" />;
  }
  if (msg.seen_at) {
    return (
      <span className="inline-flex items-center gap-0.5 text-brand-500 dark:text-brand-300">
        <CheckCheck className="w-3 h-3" />
        <span className="text-[9px] font-medium">Seen</span>
      </span>
    );
  }
  if (msg.delivered_at) {
    return <CheckCheck className="w-3 h-3 inline-block opacity-60" />;
  }
  return <Check className="w-3 h-3 inline-block opacity-60" />;
}

function formatMessageTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return `Yesterday ${format(d, "h:mm a")}`;
  return format(d, "MMM d, h:mm a");
}

function groupMessagesByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  let currentDate = "";

  for (const msg of messages) {
    const d = new Date(msg.created_at);
    const dateLabel = isToday(d)
      ? "Today"
      : isYesterday(d)
      ? "Yesterday"
      : format(d, "MMMM d, yyyy");

    if (dateLabel !== currentDate) {
      currentDate = dateLabel;
      groups.push({ date: dateLabel, messages: [] });
    }
    groups[groups.length - 1].messages.push(msg);
  }
  return groups;
}

const URL_RE = /(https?:\/\/[^\s<]+)/;

function extractUrl(text: string | null): string | null {
  if (!text) return null;
  const m = text.match(URL_RE);
  return m ? m[1] : null;
}

interface Preview {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
}

/** Rich link preview card (OpenGraph, fetched + cached server-side). */
function LinkPreview({ url }: { url: string }) {
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Preview>("/api/links/preview", { params: { url } })
      .then((r) => {
        if (!cancelled && (r.data.title || r.data.image_url)) {
          setPreview(r.data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!preview) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-1 rounded-2xl overflow-hidden border border-border bg-card hover:bg-muted transition-colors max-w-xs animate-fade-in"
    >
      {preview.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.image_url}
          alt=""
          className="w-full h-32 object-cover"
          loading="lazy"
        />
      )}
      <div className="p-3">
        <p className="text-xs font-medium text-foreground line-clamp-2">
          {preview.title || url}
        </p>
        {preview.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
            {preview.description}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          {preview.site_name || new URL(url).hostname}
        </p>
      </div>
    </a>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const [partner, setPartner] = useState<{ name: string; online: boolean } | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageId = useRef<string | null>(null);
  const markingSeen = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    api.get<User>("/api/auth/me").then((r) => setMe(r.data)).catch(() => {});
  }, []);

  // Partner presence (online/offline) — refreshed every 30s
  useEffect(() => {
    const fetchPresence = async () => {
      try {
        const res = await api.get<{ partner_name: string; partner_online: boolean }>(
          "/api/little-things/status"
        );
        setPartner({
          name: res.data.partner_name,
          online: res.data.partner_online ?? false,
        });
      } catch {
        // ignore
      }
    };
    fetchPresence();
    const interval = setInterval(fetchPresence, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Tell the server I've seen the partner's messages — only while the
  // chat is actually on screen.
  const maybeMarkSeen = useCallback(async (msgs: Message[]) => {
    if (markingSeen.current) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    const unseen = msgs.some((m) => !m.is_mine && !m.seen_at);
    if (!unseen) return;
    markingSeen.current = true;
    try {
      await api.post("/api/chat/messages/seen");
    } catch {
      // ignore
    } finally {
      markingSeen.current = false;
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get<Message[]>("/api/chat/messages", {
        params: { limit: 100 },
      });
      const newMessages = res.data;

      // Always update — receipts and reactions change without new ids
      setMessages(newMessages);

      const latestId = newMessages[newMessages.length - 1]?.id;
      if (latestId !== lastMessageId.current) {
        lastMessageId.current = latestId ?? null;
        setTimeout(scrollToBottom, 50);
      }

      maybeMarkSeen(newMessages);
    } catch {
      // Silently fail during polling
    }
  }, [scrollToBottom, maybeMarkSeen]);

  useEffect(() => {
    fetchMessages();
    pollingRef.current = setInterval(fetchMessages, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchMessages]);

  // Returning to the tab counts as seeing the chat
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchMessages();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [fetchMessages]);

  // Toggle an emoji reaction (optimistic, poll confirms)
  const react = async (messageId: string, emoji: string) => {
    setReactingTo(null);
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const mine = (m.reactions ?? []).find((r) => r.is_mine);
        const others = (m.reactions ?? []).filter((r) => !r.is_mine);
        const next =
          mine && mine.emoji === emoji
            ? others // same emoji → remove
            : [...others, { user_id: me?.id ?? "", emoji, is_mine: true }];
        return { ...m, reactions: next };
      })
    );
    try {
      await api.post(`/api/chat/messages/${messageId}/react`, { emoji });
    } catch {
      // poll will restore the truth
    }
  };

  const sendMessage = async () => {
    const content = text.trim();
    if (!content || sending) return;

    setText("");
    setSending(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      sender_id: me?.id ?? "",
      sender_name: me?.name ?? "You",
      content,
      media_type: null,
      media_path: null,
      reply_to: null,
      created_at: new Date().toISOString(),
      is_mine: true,
    };
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(scrollToBottom, 50);

    try {
      await api.post("/api/chat/messages", { content, media_type: null });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const uploadFile = async (file: File, mediaType: "photo" | "file") => {
    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("media_type", mediaType);
      await api.post("/api/chat/media", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      lastMessageId.current = null; // force refresh
      await fetchMessages();
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploadingMedia(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file, "photo");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file, "file");
    if (docInputRef.current) docInputRef.current.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", blob, `voice-${Date.now()}.webm`);
        formData.append("media_type", "voice");

        setUploadingMedia(true);
        try {
          await api.post("/api/chat/media", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          lastMessageId.current = null;
          await fetchMessages();
        } catch (err) {
          console.error("Voice upload failed", err);
        } finally {
          setUploadingMedia(false);
        }

        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch {
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setMediaRecorder(null);
    setRecording(false);
  };

  const groups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full">
      {/* Chat header — who you're talking to, and whether they're here */}
      {partner && (
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card/60 backdrop-blur-sm transition-colors duration-300">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-sm font-semibold text-brand-500 dark:text-brand-300">
              {partner.name.charAt(0).toUpperCase()}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                partner.online ? "bg-sage-400 animate-pulse" : "bg-muted-foreground/40"
              }`}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">
              {partner.name}
            </p>
            <p
              className={`text-[11px] leading-tight ${
                partner.online
                  ? "text-sage-500 dark:text-sage-300"
                  : "text-muted-foreground"
              }`}
            >
              {partner.online ? "online" : "offline"}
            </p>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 animate-fade-in">
            <div className="text-5xl mb-4 animate-float">💌</div>
            <p className="font-display text-xl font-medium text-foreground mb-1">
              Your space is ready
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Send a message, a photo, or a voice note. Just for the two of you.
            </p>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground px-2">
                {group.date}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {group.messages.map((msg) => {
              const isMine = msg.is_mine || msg.sender_id === me?.id;
              const url = extractUrl(msg.content);
              const reactions = msg.reactions ?? [];
              return (
                <div
                  key={msg.id}
                  className={`group/msg flex mb-2 items-end gap-1.5 ${
                    isMine ? "justify-end" : "justify-start"
                  } ${msg.id.startsWith("temp-") ? "" : "animate-fade-in"}`}
                >
                  {/* React affordance (left of my bubbles) */}
                  {isMine && !msg.id.startsWith("temp-") && (
                    <button
                      onClick={() =>
                        setReactingTo(reactingTo === msg.id ? null : msg.id)
                      }
                      className="mb-5 p-1 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted opacity-60 md:opacity-0 md:group-hover/msg:opacity-100 transition-all"
                      title="React"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                  )}

                  <div className="max-w-xs md:max-w-md space-y-0.5 relative">
                    {/* Emoji picker — in normal flow so it can never clip
                        against the scroll container edge on mobile */}
                    {reactingTo === msg.id && (
                      <div
                        className={`flex gap-0.5 w-fit bg-card border border-border rounded-full px-2 py-1 shadow-warm animate-pop-in mb-1 ${
                          isMine ? "ml-auto" : ""
                        }`}
                      >
                        {REACTION_EMOJI.map((e) => (
                          <button
                            key={e}
                            onClick={() => react(msg.id, e)}
                            className={`text-lg leading-none p-1 rounded-full hover:scale-125 transition-transform ${
                              reactions.some((r) => r.is_mine && r.emoji === e)
                                ? "bg-brand-50 dark:bg-brand-500/20"
                                : ""
                            }`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Photo */}
                    {msg.media_type === "photo" && msg.media_path && (
                      <div
                        className={`rounded-2xl overflow-hidden shadow-card ${
                          isMine ? "rounded-br-sm" : "rounded-bl-sm"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/chat/media/${encodeURIComponent(
                            msg.media_path
                          )}`}
                          alt="Shared photo"
                          className="max-w-[240px] max-h-[300px] object-cover hover:scale-[1.02] transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Voice note */}
                    {msg.media_type === "voice" && msg.media_path && (
                      <div
                        className={`${
                          isMine ? "bubble-own" : "bubble-partner"
                        } flex items-center gap-2`}
                      >
                        <Mic className="w-4 h-4 opacity-70 flex-shrink-0" />
                        <audio
                          controls
                          src={`/api/chat/media/${encodeURIComponent(
                            msg.media_path
                          )}`}
                          className="h-8 max-w-[180px]"
                        />
                      </div>
                    )}

                    {/* Shared file */}
                    {msg.media_type === "file" && msg.media_path && (
                      <a
                        href={`/api/chat/media/${encodeURIComponent(
                          msg.media_path
                        )}`}
                        download
                        className={`${
                          isMine ? "bubble-own" : "bubble-partner"
                        } flex items-center gap-2.5 hover:opacity-90 transition-opacity`}
                      >
                        <FileText className="w-5 h-5 opacity-80 flex-shrink-0" />
                        <span className="text-sm underline underline-offset-2 break-all">
                          {msg.media_path.split("-").slice(2).join("-") ||
                            "Shared file"}
                        </span>
                      </a>
                    )}

                    {/* Text */}
                    {msg.content && (
                      <div
                        className={`${
                          isMine ? "bubble-own" : "bubble-partner"
                        } ${msg.id.startsWith("temp-") ? "opacity-70" : ""}`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      </div>
                    )}

                    {/* Link preview for the first URL */}
                    {url && <LinkPreview url={url} />}

                    {/* Reaction chips */}
                    {reactions.length > 0 && (
                      <div
                        className={`flex gap-1 -mt-1.5 relative z-10 ${
                          isMine ? "justify-end pr-2" : "pl-2"
                        }`}
                      >
                        {reactions.map((r) => (
                          <button
                            key={`${r.user_id}-${r.emoji}`}
                            onClick={() => r.is_mine && react(msg.id, r.emoji)}
                            className={`text-xs bg-card border border-border rounded-full px-1.5 py-0.5 shadow-card animate-pop-in ${
                              r.is_mine
                                ? "ring-1 ring-brand-300 cursor-pointer"
                                : "cursor-default"
                            }`}
                            title={r.is_mine ? "Tap to remove" : "Their reaction"}
                          >
                            {r.emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Timestamp + receipts */}
                    <p
                      className={`text-[10px] text-muted-foreground flex items-center gap-1 ${
                        isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      {formatMessageTime(msg.created_at)}
                      {isMine && <Receipt msg={msg} />}
                    </p>
                  </div>

                  {/* React affordance (right of partner bubbles) */}
                  {!isMine && (
                    <button
                      onClick={() =>
                        setReactingTo(reactingTo === msg.id ? null : msg.id)
                      }
                      className="mb-5 p-1 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted opacity-60 md:opacity-0 md:group-hover/msg:opacity-100 transition-all"
                      title="React"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-card px-4 py-3 transition-colors duration-300">
        {uploadingMedia && (
          <div className="text-xs text-muted-foreground mb-2 animate-pulse">
            Uploading…
          </div>
        )}

        {recording && (
          <div className="flex items-center gap-2 mb-2 text-sm text-red-500 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Recording… tap stop when done
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Media buttons */}
          <div className="flex gap-0.5 flex-shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.zip,.mp4"
              className="hidden"
              onChange={handleDocUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={recording || uploadingMedia}
              className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              title="Send photo"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              disabled={recording || uploadingMedia}
              className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 hidden sm:block"
              title="Share a file"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={uploadingMedia}
              className={`p-2.5 rounded-xl transition-colors disabled:opacity-40 ${
                recording
                  ? "bg-red-100 dark:bg-red-500/20 text-red-500 hover:bg-red-200 animate-glow-pulse"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
              title={recording ? "Stop recording" : "Record voice note"}
            >
              {recording ? (
                <Square className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Say something…"
            rows={1}
            className="flex-1 resize-none input-warm py-2.5 min-h-[42px] max-h-32 overflow-y-auto"
            style={{ height: "auto" }}
            onInput={(e) => {
              const el = e.target as HTMLTextAreaElement;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
          />

          {/* Send button */}
          <button
            type="button"
            onClick={sendMessage}
            disabled={!text.trim() || sending}
            className="p-2.5 rounded-xl bg-brand-300 dark:bg-brand-400 text-white dark:text-[hsl(20,14%,10%)] hover:bg-brand-400 dark:hover:bg-brand-300 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
            title="Send"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2 hidden sm:block">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
