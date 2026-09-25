// Receives the portfolio contact form, validates it, rate-limits by IP and
// stores it in public.contact_messages using the service role key, which
// never leaves the server.
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const IP_HASH_SALT = Deno.env.get("IP_HASH_SALT") ?? "";

const RATE_LIMIT_MAX = 3; // submissions per IP...
const RATE_LIMIT_WINDOW_MIN = 10; // ...per this many minutes
const MAX_BODY_BYTES = 10_000;
const LIMITS = { name: 100, email: 254, subject: 200, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0] ?? "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, origin);
  }
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return json({ error: "Forbidden" }, 403, origin);
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json({ error: "Payload too large" }, 413, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON" }, 400, origin);
  }

  // Honeypot filled in: pretend success so bots don't retry.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return json({ ok: true }, 200, origin);
  }

  const fields = {} as Record<keyof typeof LIMITS, string>;
  for (const key of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    const value = typeof body[key] === "string" ? (body[key] as string).trim() : "";
    if (!value || value.length > LIMITS[key]) {
      return json({ error: `Invalid ${key}` }, 400, origin);
    }
    fields[key] = value;
  }
  if (!EMAIL_RE.test(fields.email)) {
    return json({ error: "Invalid email" }, 400, origin);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const ipHash = await sha256(IP_HASH_SALT + ip);

  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60_000).toISOString();
  const { count, error: countError } = await supabase
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (countError) {
    console.error(countError);
    return json({ error: "Server error" }, 500, origin);
  }
  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    return json({ error: "Too many requests" }, 429, origin);
  }

  const { error } = await supabase
    .from("contact_messages")
    .insert({ ...fields, ip_hash: ipHash });
  if (error) {
    console.error(error);
    return json({ error: "Server error" }, 500, origin);
  }

  return json({ ok: true }, 200, origin);
});
