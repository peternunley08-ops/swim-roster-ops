// Stores and retrieves the shared roster state (students + instructors) in
// Netlify Blobs.
//   GET  -> { data: {students,instructors}|null, etag: string|null }
//   POST -> body { data: {students,instructors}, etag: string|null }
//           Writes with optimistic concurrency: if `etag` is supplied and the
//           stored blob has changed since, responds 409 so the client re-merges
//           instead of silently overwriting a co-instructor's edits.
import { getStore } from "@netlify/blobs";

const KEY = "current";

export default async (req) => {
  const store = getStore("swim-roster");

  if (req.method === "GET") {
    try {
      const r = await store.getWithMetadata(KEY, { type: "json" });
      return json({ data: r?.data ?? null, etag: r?.etag ?? null });
    } catch {
      return json({ data: null, etag: null });
    }
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Bad request" }, 400);
    }

    // New envelope { data, etag }; tolerate the older bare {students,instructors}.
    const payload = body && body.data !== undefined ? body.data : body;
    const etag = body && body.etag != null ? body.etag : null;
    if (!payload || !Array.isArray(payload.students)) {
      return json({ error: "Bad request" }, 400);
    }

    try {
      let writeResult = null;
      if (etag) {
        // Conditional write: only succeed if nobody else wrote in the meantime.
        try {
          writeResult = await store.setJSON(KEY, payload, { onlyIfMatch: etag });
        } catch {
          // Older @netlify/blobs without conditional writes -> safe fallback.
          await store.setJSON(KEY, payload);
          writeResult = { modified: true };
        }
        if (writeResult && writeResult.modified === false) {
          return json({ error: "conflict" }, 409);
        }
      } else {
        await store.setJSON(KEY, payload);
      }
      const meta = await store.getMetadata(KEY).catch(() => null);
      return json({ ok: true, etag: meta?.etag ?? writeResult?.etag ?? null });
    } catch {
      return json({ error: "Could not save" }, 502);
    }
  }

  return json({ error: "Method not allowed" }, 405);
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
