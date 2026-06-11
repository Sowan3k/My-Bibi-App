"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Mic, Image as ImageIcon, Square, Smile } from "lucide-react";
import api from "@/lib/api";
import type { Message, User } from "@/lib/types";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";

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

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageId = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch current user
  useEffect(() => {
    api.get<User>("/api/auth/me").then((r) => setMe(r.data)).catch(() => {});
  }, []);

  // Load messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get<Message[]>("/api/chat/messages", {
        params: { limit: 100 },
      });
      const newMessages = res.data;

      // Only update if something changed
      const latestId = newMessages[newMessages.length - 1]?.id;
      if (latestId !== lastMessageId.current) {
        lastMessageId.current = latestId ?? null;
        setMessages(newMessages);
        setTimeout(scrollToBottom, 50);
      }
    } catch {
      // Silently fail during polling
    }
  }, [scrollToBottom]);

  useEffect(() => {
    fetchMessages();
    // Poll every 3 seconds for new messages
    pollingRef.current = setInterval(fetchMessages, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchMessages]);

  const sendMessage = async () => {
    const content = text.trim();
    if (!content || sending) return;

    setText("");
    setSending(true);

    // Optimistic update
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
      // Real message will come in via polling
    } catch {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setText(content); // restore text
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("media_type", "photo");

      const res = await api.post<{ media_path: string; message_id: string }>(
        "/api/chat/media",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      // Photo was sent as a message — reload messages
      await fetchMessages();
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="text-4xl mb-3">💌</div>
            <p className="text-lg font-medium text-foreground mb-1">
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
              <div className="flex-1 h-px bg-cream-200" />
              <span className="text-xs text-muted-foreground px-2">
                {group.date}
              </span>
              <div className="flex-1 h-px bg-cream-200" />
            </div>

            {group.messages.map((msg) => {
              const isMine = msg.is_mine || msg.sender_id === me?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex mb-2 ${
                    isMine ? "justify-end" : "justify-start"
                  }`}
                >
                  <div className="max-w-xs md:max-w-md space-y-0.5">
                    {/* Media */}
                    {msg.media_type === "photo" && msg.media_path && (
                      <div
                        className={`rounded-2xl overflow-hidden ${
                          isMine ? "rounded-br-sm" : "rounded-bl-sm"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/chat/media/${encodeURIComponent(
                            msg.media_path
                          )}`}
                          alt="Shared photo"
                          className="max-w-[240px] max-h-[300px] object-cover"
                        />
                      </div>
                    )}

                    {msg.media_type === "voice" && msg.media_path && (
                      <div
                        className={`${
                          isMine ? "bubble-own" : "bubble-partner"
                        } flex items-center gap-2`}
                      >
                        <Mic className="w-4 h-4 opacity-70" />
                        <audio
                          controls
                          src={`/api/chat/media/${encodeURIComponent(
                            msg.media_path
                          )}`}
                          className="h-6 max-w-[180px]"
                        />
                      </div>
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

                    {/* Timestamp */}
                    <p
                      className={`text-[10px] text-muted-foreground ${
                        isMine ? "text-right" : "text-left"
                      }`}
                    >
                      {formatMessageTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-cream-200 bg-white px-4 py-3">
        {uploadingMedia && (
          <div className="text-xs text-muted-foreground mb-2 animate-pulse">
            Uploading…
          </div>
        )}

        {recording && (
          <div className="flex items-center gap-2 mb-2 text-sm text-red-500">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Recording… tap stop when done
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Media buttons */}
          <div className="flex gap-1 flex-shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={recording || uploadingMedia}
              className="p-2.5 rounded-xl hover:bg-cream-100 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              title="Send photo"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={uploadingMedia}
              className={`p-2.5 rounded-xl transition-colors disabled:opacity-40 ${
                recording
                  ? "bg-red-100 text-red-500 hover:bg-red-200"
                  : "hover:bg-cream-100 text-muted-foreground hover:text-foreground"
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
            className="p-2.5 rounded-xl bg-rose-300 text-white hover:bg-rose-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            title="Send"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
