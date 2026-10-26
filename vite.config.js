import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev-only emulation of the Netlify Functions so `npm run dev` exercises the
// full sync flow (load / save / live refresh / conflict) and the photo-import
// path WITHOUT needing the Netlify CLI or a deploy. In production the real
// functions in netlify/functions/ are used; this plugin does nothing there.
function devFunctions() {
  let store = null; // { students, instructors }
  let version = 0; // bumped on each write -> stands in for the Blobs ETag
  const etag = () => (store == null ? null : `v${version}`);

  const send = (res, status, obj) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(obj));
  };
  const readBody = (req) =>
    new Promise((resolve) => {
      let b = "";
      req.on("data", (c) => (b += c));
      req.on("end", () => {
        try { resolve(JSON.parse(b || "{}")); } catch { resolve({}); }
      });
    });

  return {
    name: "dev-netlify-functions",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url || "").split("?")[0];

        if (path === "/.netlify/functions/roster-store") {
          if (req.method === "GET") return send(res, 200, { data: store, etag: etag() });
          if (req.method === "POST") {
            const body = await readBody(req);
            const payload = body.data !== undefined ? body.data : body;
            const inEtag = body.etag ?? null;
            if (!payload || !Array.isArray(payload.students)) return send(res, 400, { error: "Bad request" });
            if (inEtag && inEtag !== etag()) return send(res, 409, { error: "conflict" }); // optimistic concurrency
            store = payload;
            version++;
            return send(res, 200, { ok: true, etag: etag() });
          }
          return send(res, 405, { error: "Method not allowed" });
        }

        if (path === "/.netlify/functions/read-roster") {
          // No real AI in dev — return a small sample so the import flow works.
          return send(res, 200, {
            time: "11am",
            level: "Level 1",
            instructors: ["Dev Coach"],
            students: [{ name: "Sample Swimmer", guardian: "Sample Parent", age: 7, level: "Level 1", balance: 0, crossedOut: false }],
          });
        }

        return next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devFunctions()],
});
