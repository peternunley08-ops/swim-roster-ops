// Supabase Edge Function: create-instructor
// ---------------------------------------------------------------------------
// Owner-only account creation. Replaces the old client-side supa.auth.signUp,
// which required public signup to be ON (anyone with the URL could register and
// read student PII). This runs server-side with the service_role key, which is
// NEVER exposed to the browser, and refuses anyone who is not an owner.
//
// Deploy:  supabase functions deploy create-instructor
//   (or paste this file via the Supabase dashboard -> Edge Functions -> New)
// SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY are injected by the
// platform automatically — you do NOT set them yourself.
// After deploying, turn OFF "Allow new users to sign up" in Auth settings.
// ---------------------------------------------------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 1) Verify the caller is an authenticated OWNER, using THEIR token only.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Not signed in." }, 401);

  const caller = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: who, error: whoErr } = await caller.auth.getUser();
  if (whoErr || !who?.user) return json({ error: "Not signed in." }, 401);

  const { data: isOwner, error: ownErr } = await caller.rpc("is_owner");
  if (ownErr) return json({ error: "Could not verify permissions." }, 500);
  if (isOwner !== true) return json({ error: "Only an owner can create accounts." }, 403);

  // 2) Validate the request body.
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  // The privileged service_role client. NEVER exposed to the browser. Used for
  // both account creation (below) and deletion (next block).
  const admin = createClient(SUPABASE_URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 2a) DELETE action — owner removes another account entirely. Back-compatible:
  //     the existing app sends no `action`, so creation (below) is untouched.
  if (body.action === "delete") {
    const userId = String(body.userId ?? "").trim();
    if (!userId) return json({ error: "A userId is required." }, 400);
    // Self-delete guard: never let an owner delete themselves. Guarantees at
    // least one owner always remains, so the org can't be locked out.
    if (userId === who.user.id) return json({ error: "You can't delete your own account." }, 400);
    // Deleting the auth user cascades to profiles + instructor_writes via the
    // ON DELETE CASCADE FKs, so no extra cleanup is needed.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return json({ error: delErr.message }, 400);
    return json({ ok: true, deleted: userId });
  }

  const username = String(body.username ?? "").trim();
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const wantOwner = body.role === "owner";

  if (!email || !email.includes("@")) return json({ error: "A valid email is required." }, 400);
  if (password.length < 6) return json({ error: "Password must be at least 6 characters." }, 400);

  // 3) Create the user with the privileged client (declared above; bypasses the
  //    signup toggle, auto-confirms the email). The handle_new_user trigger makes
  //    an 'instructor' profile; role is never taken from this metadata.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (createErr) return json({ error: createErr.message }, 400);

  // 4) If the owner explicitly asked for an owner account, promote it now
  //    (service_role bypasses RLS; the guard trigger allows it because the
  //    service context has auth.uid() = null).
  if (wantOwner && created?.user?.id) {
    const { error: promoteErr } = await admin
      .from("profiles")
      .update({ role: "owner" })
      .eq("id", created.user.id);
    if (promoteErr) return json({ error: "Account created, but promotion to owner failed: " + promoteErr.message }, 207);
  }

  return json({ ok: true, id: created?.user?.id ?? null });
});
