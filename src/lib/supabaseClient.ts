import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = !!url && !!anonKey;

export const supabase = supabaseConfigured
  ? createClient(url!, anonKey!)
  : null;

export const HOUSEHOLD_ID = "00000000-0000-0000-0000-000000000001";
