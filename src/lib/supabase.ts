import { createClient } from "@supabase/supabase-js";

// The Supabase project URL + publishable (anon) key are safe to expose in the
// client — they're inlined into the browser bundle either way. We fall back to
// the project defaults so the app deploys with zero config; set the env vars in
// your host (Vercel) to point at a different project.
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://bfslkjeschidgjwozqcd.supabase.co";
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_hQ5Dg5_VYXHAnCIIqglu-A_vugatFd6";

// Single shared browser client. Pragmatic MVP: the app talks to Supabase with
// the publishable (anon) key + permissive RLS. Harden with server routes before
// public production.
export const supabase = createClient(url, anon, {
  auth: { persistSession: false },
});
