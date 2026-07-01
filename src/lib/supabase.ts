import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Single shared browser client. Pragmatic MVP: the app talks to Supabase with
// the publishable (anon) key + permissive RLS. Harden with server routes before
// public production.
export const supabase = createClient(url, anon, {
  auth: { persistSession: false },
});
