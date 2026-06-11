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
}

export interface InviteToken {
  token: string;
  invite_link: string;
  expires_at: string;
}

export interface ApiError {
  detail: string;
}
