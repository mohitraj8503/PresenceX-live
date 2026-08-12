import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface FaceProfileRecord {
  id?: string;
  organization_id?: string;
  person_id: string;
  full_name: string;
  role: string;
  photo_url?: string | null;
  embedding?: number[] | null;
  verification_method?: "RETINAFACE" | "PHOTO" | "UNKNOWN";
  quality_score?: number | null;
  created_at?: string;
}

export interface AttendanceSessionRecord {
  session_id: string;
  session_name: string;
  started_by?: string;
  is_active: boolean;
  started_at: string;
  ended_at?: string;
  total_marked: number;
}
