import React, { useState, useMemo, useRef, useEffect } from "react";
import { Camera, Check, X, Users, Clock, Search, Trash2, ChevronDown, Loader2, UserPlus, Cloud, CloudOff, Printer, Download, ArrowRightLeft, LayoutGrid, AlertCircle, Sparkles, RefreshCw, FileText } from "lucide-react";
import { loadCache, saveCache, mergeState, isDirty } from "./sync.js";

const STORE_URL = "/.netlify/functions/roster-store";
const SEED_VERSION_KEY = "swim-roster-seed-v2";

const TIME_SLOTS = ["10am", "11am", "12pm", "1pm", "2pm"];
const LEVELS = ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6"];

const LEVEL_COLORS = {
  "Level 1": "#2DD4BF",
  "Level 2": "#1D7A8C",
  "Level 3": "#0B3C5D",
  "Level 4": "#7C5CFF",
  "Level 5": "#FF6B5C",
  "Level 6": "#E8A02C",
};

const seedStudents = () => [
  // 10am · Level 3 (Full 7-swimmer class)
  { id: "s1", name: "Liam Rivera", guardian: "Elena Rivera", age: 8, level: "Level 3", time: "10am", balance: 0, present: true, note: "" },
  { id: "s2", name: "Noah Rivera", guardian: "Elena Rivera", age: 6, level: "Level 3", time: "10am", balance: 0, present: true, note: "" },
  { id: "s3", name: "Mateo Santos", guardian: "Clara Santos", age: 6, level: "Level 3", time: "10am", balance: 0, present: true, note: "" },
  { id: "s4", name: "Maya Chen", guardian: "David Chen", age: 4, level: "Level 3", time: "10am", balance: 0, present: true, note: "" },
  { id: "s5", name: "Lucas Chen", guardian: "David Chen", age: 6, level: "Level 3", time: "10am", balance: 0, present: false, note: "" },
  { id: "s6", name: "Chloe Bennett", guardian: "Sarah Bennett", age: 5, level: "Level 3", time: "10am", balance: 0, present: true, note: "" },
  { id: "s7", name: "Aria Patel", guardian: "Vikram Patel", age: 7, level: "Level 3", time: "10am", balance: 0, present: true, note: "working on rotary breathing" },

  // 10am · Level 2 (4 swimmers)
  { id: "s8", name: "Owen Brooks", guardian: "Hannah Brooks", age: 4, level: "Level 2", time: "10am", balance: 0, present: true, note: "" },
  { id: "s9", name: "Caleb Hayes", guardian: "Morgan Hayes", age: 5, level: "Level 2", time: "10am", balance: 0, present: true, note: "" },
  { id: "s10", name: "Leo Navarro", guardian: "Sofia Navarro", age: 6, level: "Level 2", time: "10am", balance: 0, present: false, note: "" },
  { id: "s11", name: "Zoe Brooks", guardian: "Hannah Brooks", age: 5, level: "Level 2", time: "10am", balance: 0, present: true, note: "moved from Level 3" },

  // 11am · Level 1 (Full 7-swimmer class)
  { id: "s12", name: "Harper Kim", guardian: "Jin Kim", age: 4, level: "Level 1", time: "11am", balance: 0, present: true, note: "first week — uses puddle jumper" },
  { id: "s13", name: "Eli Morales", guardian: "Rosa Morales", age: 4, level: "Level 1", time: "11am", balance: 0, present: true, note: "" },
  { id: "s14", name: "Sadie Vance", guardian: "Claire Vance", age: 5, level: "Level 1", time: "11am", balance: 0, present: true, note: "" },
  { id: "s15", name: "Micah Park", guardian: "Hana Park", age: 4, level: "Level 1", time: "11am", balance: 0, present: false, note: "" },
  { id: "s16", name: "Nora Lindqvist", guardian: "Erik Lindqvist", age: 5, level: "Level 1", time: "11am", balance: 0, present: true, note: "" },
  { id: "s17", name: "Julian Ortiz", guardian: "Marco Ortiz", age: 4, level: "Level 1", time: "11am", balance: 25, present: true, note: "" },
  { id: "s18", name: "Tessa Koury", guardian: "Nadia Koury", age: 5, level: "Level 1", time: "11am", balance: 0, present: false, note: "" },

  // 11am · Level 5 (1 swimmer)
  { id: "s19", name: "Devon Bell", guardian: "Marcus Bell", age: 10, level: "Level 5", time: "11am", balance: 0, present: true, note: "flip turn drill ready" },

  // 12pm · Level 4 (3 swimmers)
  { id: "s20", name: "Sienna Frost", guardian: "Liam Frost", age: 8, level: "Level 4", time: "12pm", balance: 0, present: true, note: "" },
  { id: "s21", name: "Ezra Sterling", guardian: "Naomi Sterling", age: 9, level: "Level 4", time: "12pm", balance: 0, present: false, note: "goggles strap loose" },
  { id: "s22", name: "Camila Solis", guardian: "Diego Solis", age: 8, level: "Level 4", time: "12pm", balance: 0, present: true, note: "" },

  // 12pm · Level 6 (2 swimmers)
  { id: "s23", name: "Kieran Walsh", guardian: "Fiona Walsh", age: 11, level: "Level 6", time: "12pm", balance: 0, present: true, note: "100m IM time trial" },
  { id: "s24", name: "Priya Deshmukh", guardian: "Anil Deshmukh", age: 12, level: "Level 6", time: "12pm", balance: 0, present: true, note: "" },

  // 1pm · Level 2 (3 swimmers)
  { id: "s25", name: "Gavin Mercer", guardian: "Paige Mercer", age: 6, level: "Level 2", time: "1pm", balance: 0, present: true, note: "" },
  { id: "s26", name: "Ruby Alcantara", guardian: "Elena Alcantara", age: 5, level: "Level 2", time: "1pm", balance: 0, present: true, note: "" },
  { id: "s27", name: "Jonah Pike", guardian: "Trevor Pike", age: 6, level: "Level 2", time: "1pm", balance: 15, present: false, note: "" },

  // 1pm · Level 5 (2 swimmers)
  { id: "s28", name: "Auden Cho", guardian: "Min Cho", age: 9, level: "Level 5", time: "1pm", balance: 0, present: true, note: "" },
  { id: "s29", name: "Maren Lindstrom", guardian: "Freja Lindstrom", age: 10, level: "Level 5", time: "1pm", balance: 0, present: false, note: "butterfly dolphin kick focus" },

  // 2pm · Level 1 (2 swimmers)
  { id: "s30", name: "Milo Hendrix", guardian: "Dana Hendrix", age: 4, level: "Level 1", time: "2pm", balance: 0, present: true, note: "" },
  { id: "s31", name: "Clara Winslow", guardian: "Grant Winslow", age: 5, level: "Level 1", time: "2pm", balance: 0, present: false, note: "loves back float" },

  // 2pm · Level 4 (1 swimmer — unassigned instructor showcase)
  { id: "s32", name: "Sawyer Boone", guardian: "Kendall Boone", age: 8, level: "Level 4", time: "2pm", balance: 0, present: true, note: "" },
];

const seedInstructors = () => ({
  "10am|Level 3": ["Jordan", "Taylor", "Casey"],
  "10am|Level 2": ["Morgan"],
  "11am|Level 1": ["Avery", "Sam"],
  "11am|Level 5": ["Riley"],
  "12pm|Level 4": ["Jordan", "Quinn"],
  "12pm|Level 6": ["Taylor"],
  "1pm|Level 2": ["Morgan", "Drew"],
  "1pm|Level 5": ["Riley"],
  "2pm|Level 1": ["Avery"],
  "2pm|Level 4": [],
});

const DEMO_SCAN_SAMPLE = {
  sheetTitle: "11am · Level 4 — Printed Roster + Handwritten Additions",
  time: "11am",
  level: "Level 4",
  instructors: ["Quinn", "Skyler"],
  students: [
    { name: "Rowan Callahan", guardian: "Maeve Callahan", age: 8, level: "Level 4", balance: 0, crossedOut: false, rawLine: "1. Callahan, Rowan (8) — P: Maeve Callahan — Paid" },
    { name: "Talia Mendez", guardian: "Carlos Mendez", age: 9, level: "Level 4", balance: 0, crossedOut: false, rawLine: "2. Mendez, Talia (9) — P: Carlos Mendez — Paid" },
    { name: "Beckett Shaw", guardian: "Lindsey Shaw", age: 7, level: "Level 4", balance: 0, crossedOut: true, rawLine: "3. [CROSSED OUT] Shaw, Beckett (7) — Moved to 1pm" },
    { name: "Keira Takahashi", guardian: "Kenji Takahashi", age: 8, level: "Level 4", balance: 0, crossedOut: false, rawLine: "4. Takahashi, Keira (8) — P: Kenji Takahashi — Paid" },
    { name: "Declan Gallagher", guardian: "Bree Gallagher", age: 9, level: "Level 4", balance: 20, crossedOut: false, rawLine: "✎ [Handwritten walk-in] Declan Gallagher (9) — Bree — $20 due" },
  ],
};

export default function App() {
  const [students, setStudents] = useState(seedStudents);
  const [instructors, setInstructors] = useState(seedInstructors);
  const [activeTime, setActiveTime] = useState("10am");
  const [view, setView] = useState("day"); // "day" | a time slot
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [demoScanning, setDemoScanning] = useState(false);
  const [importError, setImportError] = useState("");
  const [reviewQueue, setReviewQueue] = useState(null);
  const [mergeBanner, setMergeBanner] = useState(null);
  const [syncState, setSyncState] = useState("loading"); // loading | saved | saving | demo | offline
  const fileRef = useRef(null);

  // ---- Sync engine -------------------------------------------------------
  // The store is one shared blob edited from many phones. Instead of blindly
  // overwriting it (which silently wiped a co-instructor's edits), every save
  // does a 3-way merge against the latest server state. See src/sync.js.
  const baseRef = useRef(null);        // last server snapshot we reconciled with
  const etagRef = useRef(null);        // server ETag for optimistic concurrency
  const canSaveRef = useRef(false);    // only after a good load (prevents seed clobber)
  const demoModeRef = useRef(false);   // true when running on static hosting (GitHub Pages)
  const inFlightRef = useRef(false);   // a save is running
  const resaveRef = useRef(false);     // an edit arrived during a save -> save again
  const loadedRef = useRef(false);     // first load attempt finished
  const offlineBaseRef = useRef(null); // cache snapshot to merge against on reconnect
  const saveTimer = useRef(null);
  const retryTimer = useRef(null);

  // Always-fresh state for async callbacks (avoids stale closures).
  const stateRef = useRef({ students, instructors });
  useEffect(() => { stateRef.current = { students, instructors }; }, [students, instructors]);

  const clone = (s) => JSON.parse(JSON.stringify(s));

  async function fetchServer() {
    const res = await fetch(STORE_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("load " + res.status);
    const body = await res.json();
    // New envelope { data, etag }; tolerate the older bare {students,instructors}.
    if (body && (body.data !== undefined || body.etag !== undefined)) {
      return { data: body.data || null, etag: body.etag ?? null };
    }
    return { data: body && Array.isArray(body.students) ? body : null, etag: null };
  }

  function pushServer(data, etag) {
    return fetch(STORE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, etag }),
    });
  }

  // Adopt server state wholesale (first load with no local edits, or clean poll).
  function adoptServer(data, etag) {
    const snap = { students: data.students || [], instructors: data.instructors || {} };
    baseRef.current = clone(snap);
    etagRef.current = etag ?? null;
    setStudents(snap.students);
    setInstructors(snap.instructors);
    saveCache(snap);
    setSyncState("saved");
  }

  // Push local edits, merging in anything that changed on the server meanwhile.
  async function flushSave(attempt = 0) {
    if (demoModeRef.current) {
      const snap = clone(stateRef.current);
      saveCache(snap);
      if (!baseRef.current) baseRef.current = snap;
      setSyncState("demo");
      return;
    }
    if (!canSaveRef.current) return;
    if (inFlightRef.current) { resaveRef.current = true; return; }
    clearTimeout(retryTimer.current);
    inFlightRef.current = true;
    setSyncState("saving");
    const mine = clone(stateRef.current);
    try {
      let theirs = null, etag = etagRef.current;
      try { const r = await fetchServer(); theirs = r.data; etag = r.etag; } catch { /* offline read: merge vs base */ }
      const merged = theirs && Array.isArray(theirs.students)
        ? mergeState(baseRef.current || theirs, mine, theirs)
        : mine;
      const res = await pushServer(merged, etag);
      if (res.status === 409) {                       // someone wrote between our read & write
        inFlightRef.current = false;
        if (attempt < 4) return flushSave(attempt + 1);
        throw new Error("conflict");
      }
      if (!res.ok) throw new Error("save " + res.status);
      const body = await res.json().catch(() => ({}));
      baseRef.current = clone(merged);
      etagRef.current = body.etag ?? null;
      saveCache(merged);
      // Reflect merged-in remote changes on screen, unless the user kept typing.
      if (JSON.stringify(stateRef.current) === JSON.stringify(mine)) {
        if (JSON.stringify(merged) !== JSON.stringify(mine)) {
          setStudents(merged.students);
          setInstructors(merged.instructors);
        }
        setSyncState("saved");
      } else {
        resaveRef.current = true;
      }
    } catch {
      // Transition cleanly into local Demo Mode persistence
      demoModeRef.current = true;
      saveCache(mine);
      setSyncState("demo");
    } finally {
      inFlightRef.current = false;
      if (resaveRef.current) { resaveRef.current = false; flushSave(); }
    }
  }

  // Load on mount, then poll for live updates / reconnect.
  async function tryLoad() {
    try {
      const { data, etag } = await fetchServer();
      demoModeRef.current = false;
      const hasData = data && Array.isArray(data.students);
      if (!canSaveRef.current) {
        // First successful contact this session.
        const mine = clone(stateRef.current);
        if (hasData) {
          const server = { students: data.students, instructors: data.instructors || {} };
          if (offlineBaseRef.current) {
            // We had cached data and may have made edits offline -> reconcile.
            const merged = mergeState(offlineBaseRef.current, mine, server);
            baseRef.current = clone(server);
            etagRef.current = etag ?? null;
            setStudents(merged.students);
            setInstructors(merged.instructors);
            saveCache(merged);
            offlineBaseRef.current = null;
            canSaveRef.current = true; loadedRef.current = true; setSyncState("saved");
            if (isDirty(baseRef.current, merged)) flushSave();
          } else {
            adoptServer(data, etag);            // fresh device -> server wins
            canSaveRef.current = true; loadedRef.current = true;
          }
        } else {
          // Empty store -> seed it from current state.
          baseRef.current = clone({ students: [], instructors: {} });
          etagRef.current = etag ?? null;
          canSaveRef.current = true; loadedRef.current = true; setSyncState("saved");
          if (isDirty(baseRef.current, stateRef.current)) flushSave();
        }
        return;
      }
      // Already live: refresh only when we have no unsaved edits.
      if (inFlightRef.current) return;
      if (isDirty(baseRef.current, stateRef.current)) return;
      const changed =
        (etag != null && etag !== etagRef.current) ||
        (hasData && JSON.stringify({ students: data.students, instructors: data.instructors || {} }) !== JSON.stringify(baseRef.current));
      if (hasData && changed) adoptServer(data, etag);
    } catch {
      // Static host / serverless store unavailable -> seamless Demo Mode (Saved Locally)
      if (!canSaveRef.current) {
        demoModeRef.current = true;
        loadedRef.current = true;
        const cur = clone(stateRef.current);
        if (!baseRef.current) baseRef.current = cur;
        saveCache(cur);
        setSyncState("demo");
      }
    }
  }

  // Mount: paint cached data instantly (upgrading old v1 seed if needed), load from server, then poll + listen.
  useEffect(() => {
    try {
      const seedVer = localStorage.getItem(SEED_VERSION_KEY);
      const cached = loadCache();
      if (seedVer === "true" && cached && Array.isArray(cached.students) && cached.students.length > 0) {
        offlineBaseRef.current = clone(cached);
        baseRef.current = clone(cached);
        setStudents(cached.students);
        setInstructors(cached.instructors || {});
      } else {
        const initial = { students: seedStudents(), instructors: seedInstructors() };
        saveCache(initial);
        baseRef.current = clone(initial);
        localStorage.setItem(SEED_VERSION_KEY, "true");
      }
    } catch {
      baseRef.current = clone({ students: seedStudents(), instructors: seedInstructors() });
    }
    tryLoad();
    const iv = setInterval(() => {
      if (!demoModeRef.current) tryLoad();
    }, 12000);
    const onOnline = () => {
      if (canSaveRef.current && isDirty(baseRef.current, stateRef.current)) flushSave();
      else tryLoad();
    };
    const onVisible = () => { if (document.visibilityState === "visible" && !demoModeRef.current) tryLoad(); };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(iv);
      clearTimeout(saveTimer.current);
      clearTimeout(retryTimer.current);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Edits: cache instantly (offline-safe), then debounce a merged save.
  useEffect(() => {
    if (!loadedRef.current) return;
    const cur = { students, instructors };
    saveCache(cur);
    if (demoModeRef.current) {
      setSyncState("saving");
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setSyncState("demo");
      }, 280);
      return () => clearTimeout(saveTimer.current);
    }
    if (!canSaveRef.current) return;            // gated until a successful load
    if (!isDirty(baseRef.current, cur)) return; // nothing new vs the server
    setSyncState("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => flushSave(), 600);
    return () => clearTimeout(saveTimer.current);
  }, [students, instructors]);

  const classKey = (t, l) => `${t}|${l}`;

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = {};
    students
      .filter((s) => s.time === activeTime)
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.guardian.toLowerCase().includes(q))
      .forEach((s) => {
        (map[s.level] = map[s.level] || []).push(s);
      });
    return map;
  }, [students, activeTime, search]);

  const levelsInSlot = LEVELS.filter((l) => grouped[l]?.length);

  const counts = useMemo(() => {
    const c = {};
    TIME_SLOTS.forEach((t) => (c[t] = students.filter((s) => s.time === t).length));
    return c;
  }, [students]);

  // Day-wide stats, recomputed live as attendance changes.
  const dayStats = useMemo(() => {
    const total = students.length;
    const present = students.filter((s) => s.present).length;
    const byLevel = {};
    LEVELS.forEach((l) => {
      const n = students.filter((s) => s.level === l).length;
      if (n) byLevel[l] = n;
    });
    const classes = new Set(students.map((s) => `${s.time}|${s.level}`)).size;
    const rate = total ? Math.round((present / total) * 100) : 0;
    return { total, present, byLevel, classes, rate };
  }, [students]);

  // Every active class as a {time, level, count, present, instructors} cell.
  const classGrid = useMemo(() => {
    const cells = {};
    students.forEach((s) => {
      const k = `${s.time}|${s.level}`;
      if (!cells[k]) cells[k] = { time: s.time, level: s.level, count: 0, present: 0 };
      cells[k].count++;
      if (s.present) cells[k].present++;
    });
    return cells;
  }, [students]);

  const togglePresent = (id) =>
    setStudents((p) => p.map((s) => (s.id === id ? { ...s, present: !s.present } : s)));

  const removeStudent = (id) => setStudents((p) => p.filter((s) => s.id !== id));

  const updateNote = (id, note) =>
    setStudents((p) => p.map((s) => (s.id === id ? { ...s, note } : s)));

  const moveStudent = (id, time, level) =>
    setStudents((p) => p.map((s) => (s.id === id ? { ...s, time, level } : s)));

  // Export the active time slot as a CSV file.
  // scope = a time slot string, or "day" for everything
  const exportCSV = (scope) => {
    const rows = (scope === "day" ? students : students.filter((s) => s.time === scope)).slice();
    if (!rows.length) return;
    rows.sort((a, b) => TIME_SLOTS.indexOf(a.time) - TIME_SLOTS.indexOf(b.time) || LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.name.localeCompare(b.name));
    const head = ["Time", "Level", "Swimmer", "Age", "Parent/Guardian", "Instructors", "Present", "Balance", "Note"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = rows.map((s) =>
      [
        s.time,
        s.level,
        s.name,
        s.age,
        s.guardian,
        (instructors[classKey(s.time, s.level)] || []).join(" / "),
        s.present ? "Yes" : "No",
        s.balance ? `$${s.balance.toFixed(2)}` : "$0.00",
        s.note || "",
      ].map(esc).join(",")
    );
    const csv = [head.map(esc).join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swim-roster-${scope === "day" ? "full-day" : scope}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // scope = a time slot string, or "day" for the full attendance packet
  const printSheet = (scope) => {
    const slots = scope === "day" ? TIME_SLOTS : [scope];
    const all = students.filter((s) => slots.includes(s.time));
    if (!all.length) return;
    const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    function esc(v) {
      return String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    }
    const slotBlocks = slots
      .map((slot) => {
        const rows = all.filter((s) => s.time === slot);
        if (!rows.length) return "";
        const byLevel = {};
        rows.forEach((s) => (byLevel[s.level] = byLevel[s.level] || []).push(s));
        const levelBlocks = LEVELS.filter((l) => byLevel[l]?.length)
          .map((level) => {
            const inst = (instructors[classKey(slot, level)] || []).join(" / ") || "—";
            const list = byLevel[level]
              .map((s) => `<tr><td class="chk"></td><td>${esc(s.name)}</td><td>${s.age}</td><td>${esc(s.guardian)}</td><td>${esc(s.note || "")}</td></tr>`)
              .join("");
            return `<section><h2>${level} <span>· ${inst}</span></h2>
              <table><thead><tr><th class="chk">✓</th><th>Swimmer</th><th>Age</th><th>Parent / Guardian</th><th>Notes</th></tr></thead>
              <tbody>${list}</tbody></table></section>`;
          })
          .join("");
        const slotHeader = scope === "day" ? `<div class="slot-head">${slot}</div>` : "";
        return `<div class="slot">${slotHeader}${levelBlocks}</div>`;
      })
      .join("");
    const title = scope === "day" ? "Full day" : scope;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Attendance — ${title}</title>
      <style>
        body{font-family:-apple-system,system-ui,sans-serif;color:#0A2233;margin:32px;}
        header{display:flex;justify-content:space-between;align-items:baseline;border-bottom:3px solid #0B3C5D;padding-bottom:10px;margin-bottom:18px;}
        h1{font-size:22px;margin:0;color:#0B3C5D;} .meta{font-size:13px;color:#5B7A88;}
        .slot{margin-bottom:30px;} .slot-head{font-size:18px;font-weight:800;color:#1D7A8C;border-bottom:2px solid #2DD4BF;padding-bottom:4px;margin:0 0 12px;}
        .slot+.slot{break-before:page;}
        section{margin-bottom:20px;break-inside:avoid;}
        h2{font-size:15px;background:#0B3C5D;color:#fff;padding:6px 12px;border-radius:6px;margin:0 0 8px;}
        h2 span{font-weight:400;opacity:.85;}
        table{width:100%;border-collapse:collapse;font-size:13.5px;}
        th,td{text-align:left;padding:7px 10px;border-bottom:1px solid #DCE6E8;}
        th{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#5B7A88;}
        .chk{width:34px;text-align:center;} td.chk{border:1px solid #B9CDD3;height:26px;}
        @media print{body{margin:14px;} button{display:none;}}
      </style></head><body>
      <header><h1>LMUSD Summer Swim 2026</h1><div class="meta">${title} · ${date}</div></header>
      ${slotBlocks}
      <button onclick="window.print()" style="margin-top:16px;padding:10px 18px;background:#0B3C5D;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;">Print</button>
      </body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  const addInstructor = (t, l, name) => {
    if (!name.trim()) return;
    setInstructors((p) => {
      const k = classKey(t, l);
      return { ...p, [k]: [...(p[k] || []), name.trim()] };
    });
  };
  const removeInstructor = (t, l, idx) => {
    setInstructors((p) => {
      const k = classKey(t, l);
      return { ...p, [k]: (p[k] || []).filter((_, i) => i !== idx) };
    });
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError("");
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = () => rej(new Error("Could not read the photo"));
        r.readAsDataURL(file);
      });
      const media_type = file.type || "image/jpeg";

      const response = await fetch("/.netlify/functions/read-roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64, media_type }),
      });
      if (!response.ok) throw new Error("Server error");
      const parsed = await response.json();

      const time = TIME_SLOTS.includes(parsed.time) ? parsed.time : activeTime;
      const fallbackLevel = LEVELS.includes(parsed.level) ? parsed.level : "Level 1";
      const incoming = (parsed.students || []).map((s, i) => ({
        id: `imp-${Date.now()}-${i}`,
        name: s.name || "Unknown",
        guardian: s.guardian || "",
        age: Number(s.age) || 0,
        level: LEVELS.includes(s.level) ? s.level : fallbackLevel,
        time,
        balance: Number(s.balance) || 0,
        present: false,
        note: s.crossedOut ? "crossed out on sheet" : "",
        crossedOut: !!s.crossedOut,
      }));
      setReviewQueue({
        students: incoming,
        instructors: parsed.instructors || [],
        time,
        level: fallbackLevel,
        sheetTitle: `${time} · ${fallbackLevel} — Uploaded Roster Sheet`,
      });
    } catch (err) {
      setImportError("Live AI OCR endpoint is offline in static preview — click '✨ Try Demo Photo Scan' to test the Claude Vision import flow!");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Interactive Demo AI Photo Scan (1.2s simulated Claude Vision OCR extraction)
  const runDemoPhotoScan = () => {
    setImportError("");
    setDemoScanning(true);
    setReviewQueue({
      scanning: true,
      sheetTitle: DEMO_SCAN_SAMPLE.sheetTitle,
      time: DEMO_SCAN_SAMPLE.time,
      level: DEMO_SCAN_SAMPLE.level,
      instructors: DEMO_SCAN_SAMPLE.instructors,
      rawLines: DEMO_SCAN_SAMPLE.students.map((s) => s.rawLine),
      students: [],
    });
    setTimeout(() => {
      const incoming = DEMO_SCAN_SAMPLE.students.map((s, i) => ({
        id: `demo-imp-${Date.now()}-${i}`,
        name: s.name,
        guardian: s.guardian,
        age: s.age,
        level: s.level,
        time: DEMO_SCAN_SAMPLE.time,
        balance: s.balance,
        present: false,
        note: s.crossedOut ? "crossed out on sheet" : s.balance > 0 ? "walk-in addition ($20 balance)" : "",
        crossedOut: !!s.crossedOut,
        rawLine: s.rawLine,
      }));
      setDemoScanning(false);
      setReviewQueue({
        scanning: false,
        sheetTitle: DEMO_SCAN_SAMPLE.sheetTitle,
        time: DEMO_SCAN_SAMPLE.time,
        level: DEMO_SCAN_SAMPLE.level,
        instructors: DEMO_SCAN_SAMPLE.instructors,
        rawLines: DEMO_SCAN_SAMPLE.students.map((s) => s.rawLine),
        students: incoming,
      });
    }, 1200);
  };

  // Interactive Co-Instructor 3-Way Merge Simulation
  const simulateCoInstructorMerge = () => {
    const mine = clone(stateRef.current);
    const base = clone(baseRef.current || mine);

    // Build `theirs` from `base` (simulating Co-Instructor Taylor on another poolside phone)
    const theirs = clone(base);
    const absentCandidates = theirs.students.filter((s) => !s.present);
    const pickedForAttendance = (absentCandidates.length >= 2 ? absentCandidates : theirs.students).slice(0, 2);
    const markedNames = [];

    pickedForAttendance.forEach((target) => {
      const idx = theirs.students.findIndex((s) => s.id === target.id);
      if (idx !== -1) {
        theirs.students[idx].present = true;
        markedNames.push(`${theirs.students[idx].name} (${theirs.students[idx].time} ${theirs.students[idx].level})`);
      }
    });

    // Co-instructor also adds a poolside skill note on a swimmer
    const noteCandidate =
      theirs.students.find((s) => !pickedForAttendance.some((p) => p.id === s.id) && !s.note) ||
      theirs.students[0];
    let notedSwimmer = "";
    const noteText = "Strong streamline & flip turn — Coach Taylor";
    if (noteCandidate) {
      const nIdx = theirs.students.findIndex((s) => s.id === noteCandidate.id);
      if (nIdx !== -1) {
        theirs.students[nIdx].note = noteText;
        notedSwimmer = `${theirs.students[nIdx].name} (${theirs.students[nIdx].time} ${theirs.students[nIdx].level})`;
      }
    }

    // Run the real 3-way merge engine from src/sync.js
    const merged = mergeState(base, mine, theirs);
    baseRef.current = clone(merged);
    setStudents(merged.students);
    setInstructors(merged.instructors);
    saveCache(merged);

    setMergeBanner({
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      markedNames,
      notedSwimmer,
      noteText,
      totalSwimmers: merged.students.length,
    });
  };

  const resetDemoData = () => {
    const fresh = { students: seedStudents(), instructors: seedInstructors() };
    baseRef.current = clone(fresh);
    setStudents(fresh.students);
    setInstructors(fresh.instructors);
    saveCache(fresh);
    setMergeBanner(null);
    setImportError("");
  };

  const confirmImport = () => {
    if (!reviewQueue || reviewQueue.scanning) return;
    const toAdd = reviewQueue.students
      .filter((s) => !s.crossedOut)
      .map(({ crossedOut, rawLine, ...rest }) => rest);
    setStudents((p) => [...p, ...toAdd]);
    if (reviewQueue.instructors.length) {
      const k = classKey(reviewQueue.time, reviewQueue.level);
      setInstructors((p) => ({ ...p, [k]: Array.from(new Set([...(p[k] || []), ...reviewQueue.instructors])) }));
    }
    setActiveTime(reviewQueue.time);
    setView(reviewQueue.time);
    setReviewQueue(null);
  };

  const toggleCrossedOutInReview = (id) =>
    setReviewQueue((p) => ({
      ...p,
      students: p.students.map((s) => (s.id === id ? { ...s, crossedOut: !s.crossedOut } : s)),
    }));

  const updateReviewStudentName = (id, name) =>
    setReviewQueue((p) => ({
      ...p,
      students: p.students.map((s) => (s.id === id ? { ...s, name } : s)),
    }));

  const dropFromReview = (id) =>
    setReviewQueue((p) => ({ ...p, students: p.students.filter((s) => s.id !== id) }));

  return (
    <div style={styles.page}>
      <style>{css}</style>

      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.brand}>
            <div style={styles.wave} aria-hidden />
            <div>
              <div style={styles.kicker}>LMUSD · Summer Swim 2026</div>
              <h1 style={styles.h1}>DeckHand Lesson Rosters</h1>
            </div>
          </div>
          <div style={styles.headerActions}>
            <SyncBadge state={syncState} />
            <button
              style={styles.mergeSimBtn}
              onClick={simulateCoInstructorMerge}
              title="Simulate a co-instructor on another phone marking swimmers present & adding a note, then run 3-way mergeState()"
            >
              <RefreshCw size={15} />
              <span>🔄 Simulate Co-Instructor Sync</span>
            </button>
            <button
              style={styles.demoScanBtn}
              onClick={runDemoPhotoScan}
              disabled={demoScanning}
              title="Simulate Claude Vision OCR reading a photographed poolside clipboard sheet"
            >
              {demoScanning ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              <span>✨ Try Demo Photo Scan</span>
            </button>
            <button style={styles.importBtn} onClick={() => fileRef.current?.click()} disabled={importing}>
              {importing ? <Loader2 size={16} className="spin" /> : <Camera size={16} />}
              <span>{importing ? "Reading sheet…" : "Import from photo"}</span>
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />
        </div>
      </header>

      {importError && <div style={styles.errorBar}>{importError}</div>}

      {mergeBanner && (
        <div style={styles.mergeBanner} role="status" aria-live="polite">
          <div style={styles.mergeBannerTop}>
            <span style={styles.mergeBadgePill}>3-Way Merge (`mergeState(base, mine, theirs)`) · {mergeBanner.timestamp}</span>
            <button style={styles.mergeCloseBtn} onClick={() => setMergeBanner(null)} aria-label="Dismiss merge notice">
              <X size={15} />
            </button>
          </div>
          <div style={styles.mergeBannerBody}>
            <strong>Co-Instructor phone synced without overwriting your local edits:</strong>{" "}
            Marked <strong>{mergeBanner.markedNames.join(" & ")}</strong> present
            {mergeBanner.notedSwimmer && (
              <>
                {" "}and added note on <strong>{mergeBanner.notedSwimmer}</strong> (<em>"{mergeBanner.noteText}"</em>)
              </>
            )}
            . All {mergeBanner.totalSwimmers} swimmers reconciled cleanly!
          </div>
        </div>
      )}

      {syncState === "offline" && (
        <div style={styles.offlineBar} role="alert" aria-live="polite">
          <CloudOff size={16} style={{ flexShrink: 0 }} />
          <span>Not saved — your changes are kept on this phone and will sync automatically when you're back online.</span>
        </div>
      )}

      <nav style={styles.rail}>
        <button
          onClick={() => setView("day")}
          style={{ ...styles.slot, ...(view === "day" ? styles.slotActive : {}) }}
        >
          <LayoutGrid size={15} style={{ opacity: 0.7 }} />
          <span style={styles.slotTime}>Day</span>
          <span style={{ ...styles.slotCount, ...(view === "day" ? styles.slotCountActive : {}) }}>
            {dayStats.total}
          </span>
        </button>
        <span style={styles.railDivider} />
        {TIME_SLOTS.map((t) => (
          <button
            key={t}
            onClick={() => {
              setActiveTime(t);
              setView(t);
            }}
            style={{ ...styles.slot, ...(view === t ? styles.slotActive : {}) }}
          >
            <Clock size={15} style={{ opacity: 0.55 }} />
            <span style={styles.slotTime}>{t}</span>
            <span style={{ ...styles.slotCount, ...(view === t ? styles.slotCountActive : {}) }}>
              {counts[t]}
            </span>
          </button>
        ))}
      </nav>

      <div style={styles.searchWrap}>
        <Search size={17} style={{ color: "#5B7A88" }} />
        <input
          style={styles.search}
          placeholder="Search swimmers or parents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button style={styles.clearSearch} onClick={() => setSearch("")}>
            <X size={15} />
          </button>
        )}
      </div>

      {view === "day" ? (
        <DayView
          stats={dayStats}
          grid={classGrid}
          instructors={instructors}
          counts={counts}
          search={search}
          students={students}
          onOpenSlot={(t) => {
            setActiveTime(t);
            setView(t);
          }}
          onPrintDay={() => printSheet("day")}
          onExportDay={() => exportCSV("day")}
          onImport={() => fileRef.current?.click()}
          onDemoScan={runDemoPhotoScan}
          onSimulateMerge={simulateCoInstructorMerge}
          onResetDemo={resetDemoData}
        />
      ) : (
        <>
          {levelsInSlot.length > 0 && (
            <div style={styles.toolbar}>
              <span style={styles.toolbarLabel}>{activeTime} roster</span>
              <div style={styles.toolbarBtns}>
                <button style={styles.toolBtn} onClick={simulateCoInstructorMerge}>
                  <RefreshCw size={14} /> 3-Way Merge Sim
                </button>
                <button style={styles.toolBtn} onClick={() => printSheet(activeTime)}>
                  <Printer size={15} /> Print sheet
                </button>
                <button style={styles.toolBtn} onClick={() => exportCSV(activeTime)}>
                  <Download size={15} /> Export CSV
                </button>
              </div>
            </div>
          )}

          <main style={styles.main}>
            {levelsInSlot.length === 0 ? (
              <div style={styles.empty}>
                <Users size={28} style={{ color: "#9DB4BF" }} />
                <p style={styles.emptyTitle}>No classes at {activeTime} yet</p>
                <p style={styles.emptySub}>Snap a photo of a roster sheet or try the AI photo scan demo to fill this slot.</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
                  <button style={styles.demoScanBtn} onClick={runDemoPhotoScan}>
                    <Sparkles size={16} /> ✨ Try Demo Photo Scan
                  </button>
                  <button style={styles.emptyBtn} onClick={() => fileRef.current?.click()}>
                    <Camera size={16} /> Import from photo
                  </button>
                </div>
              </div>
            ) : (
              levelsInSlot.map((level) => (
                <ClassCard
                  key={level}
                  level={level}
                  time={activeTime}
                  roster={grouped[level]}
                  instructors={instructors[classKey(activeTime, level)] || []}
                  onToggle={togglePresent}
                  onRemove={removeStudent}
                  onNote={updateNote}
                  onMove={moveStudent}
                  onAddInstructor={addInstructor}
                  onRemoveInstructor={removeInstructor}
                />
              ))
            )}
          </main>
        </>
      )}

      {reviewQueue && (
        <div style={styles.modalWrap} onClick={() => setReviewQueue(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHead}>
              <div>
                <div style={styles.kicker}>Claude Vision OCR · Roster Import</div>
                <h2 style={styles.modalTitle}>
                  {reviewQueue.sheetTitle || `${reviewQueue.time} · ${reviewQueue.level}`}
                </h2>
              </div>
              <button style={styles.iconBtn} onClick={() => setReviewQueue(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Photographed Clipboard Sheet Preview */}
            {reviewQueue.rawLines && (
              <div style={styles.clipboardPreview}>
                <div style={styles.clipboardHeader}>
                  <FileText size={14} />
                  <span>Photographed Clipboard Sheet — {reviewQueue.time} · {reviewQueue.level}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.8 }}>Instructors: {reviewQueue.instructors.join(", ")}</span>
                </div>
                <div style={styles.clipboardLines}>
                  {reviewQueue.rawLines.map((line, i) => (
                    <div
                      key={i}
                      style={{
                        ...styles.clipboardLine,
                        ...(line.includes("[CROSSED OUT]") ? { textDecoration: "line-through", color: "#B23A2C" } : {}),
                        ...(line.includes("[Handwritten") ? { color: "#1D4ED8", fontStyle: "italic", fontWeight: 600 } : {}),
                      }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reviewQueue.scanning ? (
              <div style={styles.scanningBox}>
                <Loader2 size={28} className="spin" style={{ color: "#1D7A8C" }} />
                <div style={{ fontWeight: 700, fontSize: 15, color: "#0B3C5D" }}>
                  Extracting swimmers &amp; handwritten notes with Claude Vision…
                </div>
                <div style={{ fontSize: 13, color: "#5B7A88" }}>
                  Detecting crossed-out names, ages, parent guardians, and walk-in additions
                </div>
              </div>
            ) : (
              <>
                {reviewQueue.instructors.length > 0 && (
                  <div style={styles.reviewInstructors}>
                    Assigned Instructors: {reviewQueue.instructors.join(", ")}
                  </div>
                )}
                <div style={styles.reviewList}>
                  {reviewQueue.students.map((s) => (
                    <div key={s.id} style={styles.reviewRow}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input
                            style={{
                              ...styles.reviewNameInput,
                              ...(s.crossedOut ? styles.struck : {}),
                            }}
                            value={s.name}
                            onChange={(e) => updateReviewStudentName(s.id, e.target.value)}
                            aria-label="Swimmer name"
                          />
                        </div>
                        <div style={styles.rSub}>
                          {s.guardian} · age {s.age} · {s.level}
                          {s.balance > 0 && <span style={{ color: "#E8A02C", fontWeight: 700 }}> · ${s.balance} due</span>}
                          {s.crossedOut && <span style={styles.crossTag}> · crossed out (skipped)</span>}
                        </div>
                      </div>
                      <button
                        style={styles.crossToggleBtn}
                        onClick={() => toggleCrossedOutInReview(s.id)}
                        title={s.crossedOut ? "Include swimmer" : "Mark crossed out"}
                      >
                        {s.crossedOut ? "Include" : "Strike"}
                      </button>
                      <button style={styles.iconBtn} onClick={() => dropFromReview(s.id)} title="Remove from import">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
                <div style={styles.modalFoot}>
                  <button style={styles.ghostBtn} onClick={() => setReviewQueue(null)}>
                    Cancel
                  </button>
                  <button style={styles.primaryBtn} onClick={confirmImport}>
                    <Check size={16} /> Import Swimmers ({reviewQueue.students.filter((s) => !s.crossedOut).length})
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DayView({ stats, grid, instructors, counts, search, students, onOpenSlot, onPrintDay, onExportDay, onImport, onDemoScan, onSimulateMerge, onResetDemo }) {
  const classKey = (t, l) => `${t}|${l}`;
  const q = search.trim().toLowerCase();

  // When searching, surface matching swimmers across the whole day.
  const matches = q
    ? students.filter((s) => s.name.toLowerCase().includes(q) || s.guardian.toLowerCase().includes(q))
    : [];

  if (stats.total === 0) {
    return (
      <main style={styles.main}>
        <div style={styles.empty}>
          <Users size={28} style={{ color: "#9DB4BF" }} />
          <p style={styles.emptyTitle}>No swimmers yet</p>
          <p style={styles.emptySub}>Snap a photo of a roster sheet or load the demo seed to get started.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
            <button style={styles.demoScanBtn} onClick={onDemoScan}>
              <Sparkles size={16} /> ✨ Try Demo Photo Scan
            </button>
            <button style={styles.emptyBtn} onClick={onResetDemo}>
              <RefreshCw size={16} /> Restore 32-Swimmer Seed
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.main}>
      {/* Stat band */}
      <div style={styles.statBand}>
        <Stat label="Swimmers" value={stats.total} />
        <Stat label="Classes" value={stats.classes} />
        <Stat label="Here now" value={`${stats.present}`} accent="#2DD4BF" />
        <Stat label="Attendance" value={`${stats.rate}%`} accent={stats.rate >= 80 ? "#2DD4BF" : stats.rate >= 50 ? "#E8A02C" : "#FF6B5C"} />
      </div>

      {/* Attendance bar */}
      <div style={styles.attWrap}>
        <div style={styles.attTrack}>
          <div style={{ ...styles.attFill, width: `${stats.rate}%` }} />
        </div>
        <span style={styles.attText}>
          {stats.present} of {stats.total} marked present
        </span>
      </div>

      {/* Level distribution */}
      <div style={styles.levelDist}>
        {Object.entries(stats.byLevel).map(([lvl, n]) => (
          <span key={lvl} style={styles.distChip}>
            <span style={{ ...styles.distDot, background: LEVEL_COLORS[lvl] }} />
            {lvl}
            <strong style={styles.distNum}>{n}</strong>
          </span>
        ))}
      </div>

      {/* Day exports & interactive controls */}
      <div style={styles.toolbar}>
        <span style={styles.toolbarLabel}>Whole day operations</span>
        <div style={styles.toolbarBtns}>
          <button style={styles.toolBtn} onClick={onSimulateMerge} title="Simulate co-instructor edits & run 3-way merge">
            <RefreshCw size={14} /> Simulate 3-Way Sync
          </button>
          <button style={styles.toolBtn} onClick={onPrintDay}>
            <Printer size={15} /> Print packet
          </button>
          <button style={styles.toolBtn} onClick={onExportDay}>
            <Download size={15} /> Export CSV
          </button>
          <button style={styles.toolBtn} onClick={onResetDemo} title="Reset roster back to the initial 32 synthetic swimmers">
            Reset Demo
          </button>
        </div>
      </div>

      {/* Search results across the day */}
      {q && (
        <div style={styles.searchResults}>
          {matches.length === 0 ? (
            <p style={styles.emptySub}>No swimmers match "{search}".</p>
          ) : (
            matches.map((s) => (
              <button key={s.id} style={styles.resultRow} onClick={() => onOpenSlot(s.time)}>
                <span style={{ ...styles.distDot, background: LEVEL_COLORS[s.level] }} />
                <span style={styles.resultName}>{s.name}</span>
                <span style={styles.resultMeta}>
                  {s.time} · {s.level}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Timeline grid */}
      {!q &&
        TIME_SLOTS.map((slot) => {
          const levelsHere = LEVELS.filter((l) => grid[classKey(slot, l)]);
          return (
            <div key={slot} style={styles.timeRow}>
              <div style={styles.timeRowHead}>
                <Clock size={14} style={{ color: "#5B7A88" }} />
                <span style={styles.timeRowLabel}>{slot}</span>
                <span style={styles.timeRowCount}>{counts[slot]} swimmers</span>
              </div>
              {levelsHere.length === 0 ? (
                <div style={styles.gap}>
                  <AlertCircle size={14} style={{ color: "#C9B07A" }} /> No classes scheduled
                </div>
              ) : (
                <div style={styles.classCells}>
                  {levelsHere.map((lvl) => {
                    const cell = grid[classKey(slot, lvl)];
                    const inst = instructors[classKey(slot, lvl)] || [];
                    const full = cell.count >= 7;
                    return (
                      <button
                        key={lvl}
                        style={{ ...styles.cell, borderLeftColor: LEVEL_COLORS[lvl] }}
                        onClick={() => onOpenSlot(slot)}
                      >
                        <div style={styles.cellTop}>
                          <span style={{ ...styles.cellLevel, color: LEVEL_COLORS[lvl] }}>{lvl}</span>
                          <span style={{ ...styles.cellCount, ...(full ? styles.cellFull : {}) }} title={full ? "Full capacity (7+ swimmers)" : "Swimmers enrolled"}>
                            {cell.count}{full ? " · FULL" : ""}
                          </span>
                        </div>
                        <div style={styles.cellInst}>{inst.length ? inst.join(", ") : "⚠ No instructor"}</div>
                        <div style={styles.cellBar}>
                          <div
                            style={{
                              ...styles.cellBarFill,
                              width: `${cell.count ? (cell.present / cell.count) * 100 : 0}%`,
                              background: LEVEL_COLORS[lvl],
                            }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
    </main>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={styles.stat}>
      <div style={{ ...styles.statValue, ...(accent ? { color: accent } : {}) }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function SyncBadge({ state }) {
  const map = {
    loading: { icon: <Loader2 size={13} className="spin" />, text: "Loading…", color: "#8FC9CE" },
    saving: { icon: <Loader2 size={13} className="spin" />, text: "Saving…", color: "#2DD4BF" },
    saved: { icon: <Cloud size={13} />, text: "Saved", color: "#8FC9CE" },
    demo: { icon: <Check size={13} />, text: "Demo Mode (Saved Locally)", color: "#2DD4BF" },
    offline: { icon: <CloudOff size={13} />, text: "Not saved", color: "#FFB4AC" },
  };
  const s = map[state] || map.saved;
  return (
    <span style={{ ...styles.syncBadge, color: s.color }} title="All changes persist automatically in your browser localStorage and reconcile via 3-way merge">
      {s.icon}
      {s.text}
    </span>
  );
}

function MovePicker({ currentTime, currentLevel, onPick, onClose }) {
  const [time, setTime] = useState(currentTime);
  return (
    <div style={styles.movePop} onClick={(e) => e.stopPropagation()}>
      <div style={styles.moveHead}>
        Move to
        <button style={styles.moveClose} onClick={onClose}>
          <X size={13} />
        </button>
      </div>
      <div style={styles.moveRow}>
        {TIME_SLOTS.map((t) => (
          <button
            key={t}
            style={{ ...styles.moveChip, ...(time === t ? styles.moveChipOn : {}) }}
            onClick={() => setTime(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div style={styles.moveLevels}>
        {LEVELS.map((l) => {
          const isCurrent = time === currentTime && l === currentLevel;
          return (
            <button
              key={l}
              disabled={isCurrent}
              style={{
                ...styles.moveLevelBtn,
                ...(isCurrent ? styles.moveLevelCurrent : {}),
                borderColor: LEVEL_COLORS[l],
              }}
              onClick={() => onPick(time, l)}
            >
              <span style={{ ...styles.moveDot, background: LEVEL_COLORS[l] }} />
              {l}
              {isCurrent && <span style={styles.moveHere}>here now</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ClassCard({ level, time, roster, instructors, onToggle, onRemove, onNote, onMove, onAddInstructor, onRemoveInstructor }) {
  const [open, setOpen] = useState(true);
  const [addingInst, setAddingInst] = useState(false);
  const [instName, setInstName] = useState("");
  const [noteFor, setNoteFor] = useState(null);
  const [moveFor, setMoveFor] = useState(null);
  const accent = LEVEL_COLORS[level] || "#1D7A8C";
  const present = roster.filter((s) => s.present).length;

  return (
    <section style={styles.card}>
      <div style={{ ...styles.cardBar, background: accent }} />
      <div style={styles.cardBody}>
        <div style={styles.cardHead}>
          <button style={styles.cardTitleBtn} onClick={() => setOpen((o) => !o)}>
            <ChevronDown
              size={18}
              style={{ transform: open ? "none" : "rotate(-90deg)", transition: "transform .2s", color: "#5B7A88" }}
            />
            <span style={{ ...styles.levelBadge, background: accent }}>{level}</span>
            <span style={styles.cardCount}>
              {present}/{roster.length} here
            </span>
          </button>
        </div>

        <div style={styles.instRow}>
          <span style={styles.instLabel}>Instructors</span>
          {instructors.map((name, i) => (
            <span key={i} style={styles.instChip}>
              {name}
              <button style={styles.chipX} onClick={() => onRemoveInstructor(time, level, i)}>
                <X size={11} />
              </button>
            </span>
          ))}
          {addingInst ? (
            <span style={styles.instAddWrap}>
              <input
                autoFocus
                style={styles.instInput}
                value={instName}
                placeholder="Name"
                onChange={(e) => setInstName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onAddInstructor(time, level, instName);
                    setInstName("");
                    setAddingInst(false);
                  }
                  if (e.key === "Escape") setAddingInst(false);
                }}
              />
            </span>
          ) : (
            <button style={styles.instAdd} onClick={() => setAddingInst(true)}>
              <UserPlus size={13} /> Add
            </button>
          )}
        </div>

        {open && (
          <ul style={styles.list}>
            {roster.map((s) => (
              <li key={s.id} style={{ ...styles.row, ...(s.present ? styles.rowPresent : {}) }}>
                <button
                  style={{ ...styles.check, ...(s.present ? { borderColor: accent, background: accent } : {}) }}
                  onClick={() => onToggle(s.id)}
                  aria-label={s.present ? "Mark absent" : "Mark present"}
                >
                  {s.present && <Check size={15} color="#fff" />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.rName}>
                    {s.name}
                    <span style={styles.ageTag}>{s.age}</span>
                  </div>
                  <div style={styles.rSub}>{s.guardian}</div>
                  {noteFor === s.id ? (
                    <input
                      autoFocus
                      style={styles.noteInput}
                      defaultValue={s.note}
                      placeholder="Add a note…"
                      onBlur={(e) => {
                        onNote(s.id, e.target.value);
                        setNoteFor(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                    />
                  ) : s.note ? (
                    <button style={styles.noteTag} onClick={() => setNoteFor(s.id)}>
                      {s.note}
                    </button>
                  ) : (
                    <button style={styles.noteAdd} onClick={() => setNoteFor(s.id)}>
                      + note
                    </button>
                  )}
                  {moveFor === s.id && (
                    <MovePicker
                      currentTime={time}
                      currentLevel={level}
                      onPick={(t, l) => {
                        onMove(s.id, t, l);
                        setMoveFor(null);
                      }}
                      onClose={() => setMoveFor(null)}
                    />
                  )}
                </div>
                {s.balance > 0 && <span style={styles.balance}>${s.balance.toFixed(2)}</span>}
                <button
                  style={{ ...styles.iconBtn, ...(moveFor === s.id ? { color: accent } : {}) }}
                  onClick={() => setMoveFor(moveFor === s.id ? null : s.id)}
                  aria-label="Move to another class"
                  title="Move to another class"
                >
                  <ArrowRightLeft size={15} />
                </button>
                <button style={styles.iconBtn} onClick={() => onRemove(s.id)} aria-label="Remove">
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

const css = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  input:focus { outline: 2px solid #2DD4BF; outline-offset: 1px; }
  button:focus-visible { outline: 2px solid #2DD4BF; outline-offset: 2px; }
  ::placeholder { color: #9DB4BF; }
  @media (prefers-reduced-motion: reduce) { *, .spin { animation: none !important; transition: none !important; } }
`;

const styles = {
  page: { minHeight: "100vh", background: "linear-gradient(180deg, #F4EFE6 0%, #EAF1F2 100%)", fontFamily: "'Inter', system-ui, sans-serif", color: "#0A2233", paddingBottom: 60 },
  header: { background: "#0B3C5D", color: "#fff", padding: "0 16px" },
  headerInner: { maxWidth: 920, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 0", flexWrap: "wrap" },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  wave: { width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: "radial-gradient(circle at 30% 30%, #2DD4BF, #1D7A8C 70%)", boxShadow: "inset 0 -6px 10px rgba(11,60,93,.4)" },
  kicker: { fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "#8FC9CE", fontWeight: 600 },
  h1: { margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.3 },
  importBtn: { display: "flex", alignItems: "center", gap: 7, background: "#2DD4BF", color: "#06283A", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" },
  demoScanBtn: { display: "flex", alignItems: "center", gap: 7, background: "linear-gradient(135deg, #F0B254, #E8A02C)", color: "#231405", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(232,160,44,.32)" },
  mergeSimBtn: { display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,.12)", color: "#EAF1F5", border: "1px solid rgba(143,201,206,.35)", borderRadius: 10, padding: "9px 13px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  headerActions: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  syncBadge: { display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", marginRight: 4 },
  errorBar: { maxWidth: 760, margin: "12px auto 0", background: "#FFE7E3", color: "#B23A2C", padding: "10px 14px", borderRadius: 10, fontSize: 13.5, fontWeight: 600 },
  mergeBanner: { maxWidth: 760, margin: "12px auto 0", background: "linear-gradient(135deg, #0B3C5D, #12526B)", color: "#EAF1F5", padding: "12px 16px", borderRadius: 12, fontSize: 13.5, lineHeight: 1.45, boxShadow: "0 6px 20px rgba(11,60,93,.18)", border: "1px solid #2DD4BF" },
  mergeBannerTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  mergeBadgePill: { background: "rgba(45,212,191,.2)", color: "#2DD4BF", fontSize: 11.5, fontWeight: 800, padding: "2px 9px", borderRadius: 999, letterSpacing: 0.3 },
  mergeCloseBtn: { background: "transparent", border: "none", color: "#8FC9CE", cursor: "pointer", padding: 2, display: "flex" },
  mergeBannerBody: { color: "#E6F4F1" },
  offlineBar: { maxWidth: 760, margin: "12px auto 0", display: "flex", alignItems: "center", gap: 9, background: "#FFEDD5", color: "#9A3412", padding: "11px 14px", borderRadius: 10, fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 },
  rail: { maxWidth: 760, margin: "18px auto 0", padding: "0 16px", display: "flex", gap: 8, overflowX: "auto", alignItems: "center" },
  railDivider: { width: 1, height: 28, background: "#DCE6E8", flexShrink: 0, margin: "0 2px" },
  slot: { display: "flex", alignItems: "center", gap: 7, background: "#fff", border: "1.5px solid #DCE6E8", borderRadius: 12, padding: "9px 13px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0, transition: "all .15s" },
  slotActive: { background: "#0B3C5D", borderColor: "#0B3C5D", color: "#fff" },
  slotTime: { fontWeight: 700, fontSize: 14.5 },
  slotCount: { fontSize: 12, fontWeight: 700, background: "#EAF1F2", color: "#5B7A88", borderRadius: 20, padding: "1px 8px", minWidth: 22, textAlign: "center" },
  slotCountActive: { background: "#2DD4BF", color: "#06283A" },
  searchWrap: { maxWidth: 760, margin: "16px auto 0", padding: "0 16px", display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 12, border: "1.5px solid #DCE6E8" },
  toolbar: { maxWidth: 760, margin: "14px auto 0", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  toolbarLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "#5B7A88", fontWeight: 700 },
  toolbarBtns: { display: "flex", gap: 8 },
  toolBtn: { display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid #DCE6E8", color: "#0B3C5D", borderRadius: 9, padding: "7px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  movePop: { marginTop: 8, background: "#fff", border: "1.5px solid #DCE6E8", borderRadius: 12, padding: 10, boxShadow: "0 8px 24px rgba(11,60,93,.14)", maxWidth: 300 },
  moveHead: { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#9DB4BF", fontWeight: 700, marginBottom: 8 },
  moveClose: { border: "none", background: "transparent", color: "#9DB4BF", cursor: "pointer", padding: 2, display: "flex" },
  moveRow: { display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 },
  moveChip: { border: "1.5px solid #DCE6E8", background: "#fff", color: "#5B7A88", borderRadius: 8, padding: "4px 10px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  moveChipOn: { background: "#0B3C5D", borderColor: "#0B3C5D", color: "#fff" },
  moveLevels: { display: "flex", flexDirection: "column", gap: 4 },
  moveLevelBtn: { display: "flex", alignItems: "center", gap: 8, border: "1.5px solid", background: "#fff", borderRadius: 8, padding: "8px 10px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#0A2233", textAlign: "left" },
  moveLevelCurrent: { opacity: 0.5, cursor: "default", background: "#F4EFE6" },
  moveDot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 },
  moveHere: { marginLeft: "auto", fontSize: 11, color: "#9DB4BF", fontWeight: 600 },
  search: { flex: 1, border: "none", outline: "none", padding: "12px 0", fontSize: 15, fontFamily: "inherit", background: "transparent" },
  clearSearch: { border: "none", background: "transparent", color: "#5B7A88", cursor: "pointer", padding: 6, display: "flex" },
  main: { maxWidth: 760, margin: "16px auto 0", padding: "0 16px", display: "flex", flexDirection: "column", gap: 14 },
  statBand: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
  stat: { background: "#fff", borderRadius: 14, padding: "14px 12px", textAlign: "center", boxShadow: "0 1px 3px rgba(11,60,93,.06)" },
  statValue: { fontSize: 26, fontWeight: 800, color: "#0B3C5D", lineHeight: 1, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: "#5B7A88", fontWeight: 600, marginTop: 5, textTransform: "uppercase", letterSpacing: 0.5 },
  attWrap: { background: "#fff", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 3px rgba(11,60,93,.06)" },
  attTrack: { flex: 1, height: 9, background: "#EAF1F2", borderRadius: 20, overflow: "hidden" },
  attFill: { height: "100%", background: "linear-gradient(90deg, #2DD4BF, #1D7A8C)", borderRadius: 20, transition: "width .4s ease" },
  attText: { fontSize: 12.5, color: "#5B7A88", fontWeight: 600, whiteSpace: "nowrap" },
  levelDist: { display: "flex", flexWrap: "wrap", gap: 7 },
  distChip: { display: "flex", alignItems: "center", gap: 6, background: "#fff", borderRadius: 20, padding: "5px 12px 5px 10px", fontSize: 13, fontWeight: 600, color: "#0A2233", boxShadow: "0 1px 2px rgba(11,60,93,.05)" },
  distDot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 },
  distNum: { fontWeight: 800, color: "#0B3C5D" },
  searchResults: { display: "flex", flexDirection: "column", gap: 6 },
  resultRow: { display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "none", borderRadius: 10, padding: "11px 14px", cursor: "pointer", fontFamily: "inherit", textAlign: "left", boxShadow: "0 1px 2px rgba(11,60,93,.05)" },
  resultName: { fontWeight: 700, fontSize: 14.5, color: "#0A2233" },
  resultMeta: { marginLeft: "auto", fontSize: 12.5, color: "#5B7A88", fontWeight: 600 },
  timeRow: { background: "#fff", borderRadius: 14, padding: "12px 14px", boxShadow: "0 1px 3px rgba(11,60,93,.06)" },
  timeRowHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  timeRowLabel: { fontWeight: 800, fontSize: 16, color: "#0B3C5D" },
  timeRowCount: { marginLeft: "auto", fontSize: 12.5, color: "#5B7A88", fontWeight: 600 },
  gap: { display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#9A7B3A", background: "#FBF4E2", borderRadius: 9, padding: "9px 12px", fontWeight: 600 },
  classCells: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 },
  cell: { background: "#FAFCFC", border: "1px solid #ECF1F2", borderLeft: "3px solid", borderRadius: 10, padding: "10px 12px", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "transform .12s, box-shadow .12s" },
  cellTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cellLevel: { fontWeight: 800, fontSize: 13.5 },
  cellCount: { fontWeight: 800, fontSize: 14, color: "#0B3C5D", background: "#EAF1F2", borderRadius: 7, padding: "1px 9px", minWidth: 26, textAlign: "center" },
  cellFull: { background: "#FFE7E3", color: "#C2412F" },
  cellInst: { fontSize: 12, color: "#5B7A88", marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  cellBar: { height: 5, background: "#EAF1F2", borderRadius: 20, overflow: "hidden", marginTop: 8 },
  cellBarFill: { height: "100%", borderRadius: 20, transition: "width .4s ease" },
  card: { display: "flex", background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(11,60,93,.08), 0 8px 24px rgba(11,60,93,.05)" },
  cardBar: { width: 6, flexShrink: 0 },
  cardBody: { flex: 1, padding: "14px 16px 8px", minWidth: 0 },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitleBtn: { display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 },
  levelBadge: { color: "#fff", fontWeight: 800, fontSize: 13, padding: "4px 11px", borderRadius: 8, letterSpacing: 0.2 },
  cardCount: { fontSize: 13, color: "#5B7A88", fontWeight: 600 },
  instRow: { display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", margin: "12px 0 4px" },
  instLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#9DB4BF", fontWeight: 700 },
  instChip: { display: "flex", alignItems: "center", gap: 4, background: "#EAF1F2", color: "#0B3C5D", fontSize: 13, fontWeight: 600, padding: "4px 6px 4px 10px", borderRadius: 20 },
  chipX: { border: "none", background: "rgba(11,60,93,.12)", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#0B3C5D", padding: 0 },
  instAdd: { display: "flex", alignItems: "center", gap: 4, border: "1.5px dashed #B9CDD3", background: "transparent", color: "#5B7A88", fontSize: 12.5, fontWeight: 600, padding: "4px 10px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit" },
  instAddWrap: { display: "flex" },
  instInput: { border: "1.5px solid #2DD4BF", borderRadius: 20, padding: "4px 12px", fontSize: 13, fontFamily: "inherit", width: 110 },
  list: { listStyle: "none", padding: 0, margin: "8px 0 0" },
  row: { display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 4px", borderTop: "1px solid #F0F0EC" },
  rowPresent: { background: "linear-gradient(90deg, rgba(45,212,191,.07), transparent)" },
  check: { width: 26, height: 26, borderRadius: 8, border: "2px solid #C9D6DA", background: "#fff", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1, transition: "all .12s" },
  rName: { fontWeight: 700, fontSize: 15.5, display: "flex", alignItems: "center", gap: 8 },
  ageTag: { fontSize: 11, fontWeight: 700, color: "#5B7A88", background: "#EAF1F2", borderRadius: 6, padding: "1px 7px" },
  rSub: { fontSize: 13, color: "#5B7A88", marginTop: 1 },
  noteInput: { marginTop: 6, border: "1.5px solid #2DD4BF", borderRadius: 8, padding: "5px 9px", fontSize: 13, fontFamily: "inherit", width: "100%", maxWidth: 280 },
  noteTag: { marginTop: 5, display: "inline-block", background: "#FFF3E0", color: "#9A6212", border: "none", fontSize: 12.5, fontWeight: 600, padding: "3px 9px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit" },
  noteAdd: { marginTop: 4, border: "none", background: "transparent", color: "#9DB4BF", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", padding: 0, fontWeight: 600 },
  balance: { fontSize: 13, fontWeight: 700, color: "#FF6B5C", flexShrink: 0, marginTop: 2 },
  iconBtn: { border: "none", background: "transparent", color: "#B9CDD3", cursor: "pointer", padding: 6, display: "flex", borderRadius: 8, flexShrink: 0 },
  empty: { textAlign: "center", padding: "56px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  emptyTitle: { fontWeight: 700, fontSize: 17, margin: 0 },
  emptySub: { color: "#5B7A88", fontSize: 14, margin: 0 },
  emptyBtn: { display: "flex", alignItems: "center", gap: 7, marginTop: 8, background: "#0B3C5D", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" },
  modalWrap: { position: "fixed", inset: 0, background: "rgba(10,34,51,.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 0, zIndex: 50 },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 620, maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 -10px 40px rgba(0,0,0,.2)" },
  modalHead: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 18px 10px" },
  modalTitle: { margin: 0, fontSize: 18, fontWeight: 800, color: "#0B3C5D" },
  clipboardPreview: { margin: "0 18px 12px", background: "#FAF6EC", border: "1.5px solid #E2D9C5", borderRadius: 12, overflow: "hidden", boxShadow: "inset 0 1px 4px rgba(0,0,0,.04)" },
  clipboardHeader: { display: "flex", alignItems: "center", gap: 6, background: "#0B3C5D", color: "#fff", padding: "7px 12px", fontSize: 12, fontWeight: 700 },
  clipboardLines: { padding: "10px 12px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, lineHeight: 1.6, color: "#2D3B45" },
  clipboardLine: { borderBottom: "1px dashed #E6DEC8", padding: "2px 0" },
  scanningBox: { padding: "32px 20px 40px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center" },
  reviewInstructors: { padding: "0 18px 8px", fontSize: 13.5, color: "#1D7A8C", fontWeight: 600 },
  reviewList: { overflowY: "auto", padding: "0 18px", flex: 1 },
  reviewRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "1px solid #F0F0EC" },
  reviewNameInput: { fontWeight: 700, fontSize: 15, color: "#0A2233", border: "1px solid transparent", borderRadius: 6, padding: "2px 6px", marginLeft: -6, fontFamily: "inherit", background: "transparent", width: "100%", maxWidth: 260 },
  crossToggleBtn: { border: "1px solid #DCE6E8", background: "#FAFCFC", color: "#5B7A88", borderRadius: 7, padding: "4px 9px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  struck: { textDecoration: "line-through", color: "#B9CDD3" },
  crossTag: { color: "#FF6B5C", fontWeight: 700 },
  modalFoot: { display: "flex", gap: 10, padding: 16, borderTop: "1px solid #F0F0EC" },
  ghostBtn: { flex: "0 0 auto", border: "1.5px solid #DCE6E8", background: "#fff", color: "#5B7A88", borderRadius: 10, padding: "11px 18px", fontWeight: 700, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit" },
  primaryBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#2DD4BF", color: "#06283A", border: "none", borderRadius: 10, padding: "11px 18px", fontWeight: 800, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit" },
};
