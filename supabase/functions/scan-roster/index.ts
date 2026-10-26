// Supabase Edge Function: scan-roster
// ---------------------------------------------------------------------------
// Owner-only roster-photo OCR. The app sends ONE downscaled photo of a printed
// swim-lesson roster (with a handwritten class label at the top), and this
// function asks Google Gemini Vision to read it and return STRICT JSON:
//   { level, time, students: [{ name, guardian, age, balance }] }
// One photo = one class (one level + one time) with its swimmers. The browser
// then lets the owner review/edit and import the swimmers into the week roster.
//
// Mirrors the auth pattern of create-instructor (bright-api): it runs the
// caller's token through the ANON client to confirm they're an authenticated
// OWNER (auth.getUser + rpc is_owner) and refuses everyone else. The Gemini key
// lives ONLY in this server-side env, never in the browser.
//
// Deploy:
//   - Deploy as slug:  scan-roster
//       supabase functions deploy scan-roster
//       (or paste this file via Dashboard -> Edge Functions -> New function)
//   - Set the secret:  GEMINI_API_KEY  (a Google AI Studio / Gemini API key)
//       supabase secrets set GEMINI_API_KEY=...   (or set it in the Dashboard)
//   - Verify JWT: OFF  (the function verifies the owner itself, like bright-api)
// SUPABASE_URL, SUPABASE_ANON_KEY are injected by the platform automatically —
// you do NOT set them yourself.
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

const GEMINI_MODEL = "gemini-2.0-flash";

// Instruct Gemini to read a printed swim-lesson roster (handwritten class label
// at the top + a table of swimmers) and emit STRICT JSON. Kept verbose on
// purpose: the handwritten label is the source of truth for level + time.
const PROMPT = [
  "You are reading a printed swim-lesson class roster that was photographed.",
  "At the TOP there is a HANDWRITTEN class label, e.g. \"Level 5 2pm\", \"Level 3\", or \"Diving\".",
  "Below it is a printed TABLE of swimmers. Columns vary between report types but usually include:",
  "Participant Name, Primary P/G Name (the parent/guardian), Participant Age, and Balance (e.g. $0.00).",
  "A Session name may hold the level (e.g. \"Level 5 - Advanced Stroke\", \"Week 3: Diving\").",
  "The time may appear handwritten (\"2pm\"), as a filter (\"Tuitions: 2:00pm - 2:45pm\"), or as a session time (\"12:00 PM - 12:45 PM\").",
  "",
  "Return STRICT JSON, and ONLY JSON, in exactly this shape:",
  "{",
  "  \"level\": \"<one of: Level 1, Level 2, Level 3, Level 4, Level 5, Level 6, Diving>\",",
  "  \"time\": \"<one of: 10am, 11am, 12pm, 1pm, 2pm>\",",
  "  \"students\": [ { \"name\": \"\", \"guardian\": \"\", \"age\": <number or null>, \"balance\": <number> } ]",
  "}",
  "",
  "Rules:",
  "- Prefer the HANDWRITTEN label at the top for the level and time.",
  "- Map any time to the NEAREST of these five slots: 10am, 11am, 12pm, 1pm, 2pm.",
  "  Examples: \"2:00pm\" -> \"2pm\"; \"12:00 PM\" -> \"12pm\"; \"1:15 PM\" -> \"1pm\"; \"10:30am\" -> \"10am\".",
  "- Level comes from the handwritten label, or from the Session name if the label is unclear.",
  "  \"Level 5 - Advanced Stroke\" -> \"Level 5\"; anything about diving -> \"Diving\".",
  "- Include EVERY swimmer row in the table.",
  "- name is the Participant Name. guardian is the Primary P/G Name (empty string if none).",
  "- age is the Participant Age as a number (null if missing/unreadable).",
  "- balance is a number: \"$0.00\" -> 0, \"$25.50\" -> 25.5. Use 0 if there is no balance column.",
  "- If you are unsure about a field, leave it empty (\"\") or null rather than guessing wildly.",
  "- Do NOT include any commentary, markdown, or code fences. Output raw JSON only.",
].join("\n");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

  // 0) The Gemini key must be configured server-side. Fail clearly if it isn't,
  //    so the owner knows to set the secret rather than seeing a vague 500.
  if (!GEMINI_API_KEY) {
    return json({ error: "Scanning isn't set up yet: the GEMINI_API_KEY secret is missing on the server." }, 500);
  }

  // 1) Verify the caller is an authenticated OWNER, using THEIR token only.
  //    Mirrors create-instructor exactly: ANON client scoped to the caller's
  //    Authorization header, then getUser() + is_owner RPC.
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
  if (isOwner !== true) return json({ error: "Only an owner can scan rosters." }, 403);

  // 2) Validate the request body. The browser sends a single downscaled photo
  //    as base64 (no data: prefix) plus its mime type.
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const imageBase64 = String(body.imageBase64 ?? "").trim();
  const mimeType = String(body.mimeType ?? "image/jpeg").trim() || "image/jpeg";
  if (!imageBase64) return json({ error: "No image was provided." }, 400);

  // 3) Call the Gemini REST API. temperature 0 + JSON response mime keeps the
  //    output deterministic and parseable.
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  let gemRes: Response;
  try {
    gemRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
              { text: PROMPT },
            ],
          },
        ],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
    });
  } catch (e) {
    return json({ error: "Couldn't reach the vision service: " + (e instanceof Error ? e.message : String(e)) }, 502);
  }

  if (!gemRes.ok) {
    // Surface Gemini's own error text when we can (quota, bad key, etc.).
    let detail = "";
    try {
      const errJson = await gemRes.json();
      detail = errJson?.error?.message || "";
    } catch {
      try { detail = await gemRes.text(); } catch { /* ignore */ }
    }
    const status = gemRes.status === 429 ? 429 : 502;
    return json({ error: "Vision service error" + (detail ? ": " + detail : ` (HTTP ${gemRes.status}).`) }, status);
  }

  // 4) Pull the model's JSON text out of the candidate and parse it.
  let gem: unknown;
  try {
    gem = await gemRes.json();
  } catch {
    return json({ error: "The vision service returned an unreadable response." }, 502);
  }

  const text = extractText(gem);
  if (!text) {
    return json({ error: "The photo couldn't be read (no text came back). Try a clearer photo." }, 422);
  }

  const parsed = parseModelJson(text);
  if (!parsed) {
    return json({ error: "The photo couldn't be read as a roster. Try a clearer, straight-on photo." }, 422);
  }

  // 5) Normalize lightly and hand back to the app for owner review.
  return json(normalizeResult(parsed));
});

// candidates[0].content.parts[0].text — defensively walk the shape.
function extractText(gem: unknown): string {
  const g = gem as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const parts = g?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("").trim();
}

// Gemini in JSON mode returns raw JSON, but strip stray code fences just in case.
function parseModelJson(text: string): Record<string, unknown> | null {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  try {
    const obj = JSON.parse(t);
    return obj && typeof obj === "object" ? (obj as Record<string, unknown>) : null;
  } catch {
    // Last resort: grab the first {...} block.
    const m = t.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as Record<string, unknown>;
      } catch { /* fall through */ }
    }
    return null;
  }
}

function normalizeResult(parsed: Record<string, unknown>) {
  const rawStudents = Array.isArray(parsed.students) ? parsed.students : [];
  const students = rawStudents.map((s) => {
    const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
    const ageNum = Number(o.age);
    const balNum = Number(o.balance);
    return {
      name: String(o.name ?? "").trim(),
      guardian: String(o.guardian ?? "").trim(),
      age: Number.isFinite(ageNum) && ageNum >= 0 ? ageNum : null,
      balance: Number.isFinite(balNum) && balNum >= 0 ? balNum : 0,
    };
  }).filter((s) => s.name);

  return {
    level: String(parsed.level ?? "").trim(),
    time: String(parsed.time ?? "").trim(),
    students,
  };
}
