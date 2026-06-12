/**
 * My Bibi — TypeScript interfaces
 * These types mirror the Pydantic response schemas from the FastAPI backend.
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: "owner" | "partner";
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
  user: User;
}

export interface SetupResponse extends AuthResponse {
  invite_link: string;
}

export interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string | null;
  media_type: "photo" | "voice" | "file" | null;
  media_path: string | null;
  reply_to: string | null;
  created_at: string;
  /** Populated on the frontend — true if sender_id matches current user */
  is_mine?: boolean;
}

export interface MessagesPage {
  messages: Message[];
  has_more: boolean;
  total: number;
}

export interface Memory {
  id: string;
  created_by: string;
  created_by_name: string;
  title: string;
  content: string | null;
  media_path: string | null;
  memory_date: string; // ISO date (YYYY-MM-DD)
  created_at: string;
}

export interface BloomEntry {
  prompt_id: string;
  prompt_text: string;
  date: string; // ISO date
  my_answer: string;
  partner_name: string;
  partner_answer: string;
}

export interface TodayBloom {
  prompt_id: string;
  prompt_text: string;
  my_answer: string | null;
  partner_name: string;
  partner_answered: boolean;
  both_answered: boolean;
  partner_answer: string | null;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface LittleThingsStatus {
  streak: number;
  days_together: number;
  relationship_started: string | null;
  partner_name: string;
  partner_mood: string | null;
  my_mood: string | null;
  partner_online: boolean;
  ping_cooldown_seconds: number;
  unseen_pings: number;
}

export interface MoodDay {
  date: string; // YYYY-MM-DD
  mood: string;
}

// ---- Phase 2 ----

export interface TimeCapsule {
  id: string;
  created_by: string;
  created_by_name: string;
  title: string;
  message: string | null; // null while sealed
  media_path: string | null;
  unlock_at: string;
  opened_at: string | null;
  created_at: string;
  is_unlockable: boolean;
}

export interface Letter {
  id: string;
  author_id?: string;
  author_name?: string;
  title: string | null;
  body: string | null; // null while sealed (sent view)
  deliver_at: string;
  delivered?: boolean;
  read_at: string | null;
  created_at: string;
}

export interface DreamStep {
  id: string;
  title: string;
  done: boolean;
  created_at: string;
}

export interface Dream {
  id: string;
  created_by: string;
  created_by_name: string;
  title: string;
  description: string | null;
  emoji: string | null;
  target_date: string | null;
  status: "dreaming" | "achieved";
  achieved_at: string | null;
  created_at: string;
  steps: DreamStep[];
  progress: number; // 0-100
}

export interface Song {
  id: string;
  shared_by: string;
  shared_by_name: string;
  url: string;
  provider: "youtube" | "spotify" | "other";
  embed_id: string | null;
  title: string | null;
  note: string | null;
  created_at: string;
}

export interface TimelineEvent {
  type: "beginning" | "memory" | "dream" | "capsule" | "song" | "letter";
  date: string;
  title: string;
  subtitle: string;
  emoji: string;
  media_path?: string | null;
  ref_id: string | null;
}

// ---- Phase 3 ----

export interface Insight {
  id: string;
  kind: "noticed" | "resurface";
  content: string;
  created_at: string;
}

export interface ResurfaceResponse {
  memory: Memory | null;
  caption: string | null;
  ai_available: boolean;
}

// ---- Phase 4 ----

export interface GiftWish {
  id: string;
  title: string;
  note: string | null;
  url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScrapbookData {
  month: string;
  memories: {
    id: string;
    title: string;
    content: string | null;
    media_path: string | null;
    memory_date: string;
    by_name: string;
  }[];
  photos: { media_path: string; created_at: string; by_name: string }[];
  blooms: { date: string; prompt: string; answers: { name: string; answer: string }[] }[];
  dreams_achieved: { id: string; title: string; emoji: string; achieved_at: string }[];
  capsules_opened: { id: string; title: string; opened_at: string; by_name: string }[];
  stats: {
    messages: number;
    pings: number;
    songs: number;
    memories: number;
    blooms: number;
  };
}

export interface InviteToken {
  token: string;
  invite_link: string;
  expires_at: string;
}

export interface ApiError {
  detail: string;
}
