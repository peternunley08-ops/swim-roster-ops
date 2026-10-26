// Reliability / sync helpers for the shared roster store.
//
// All the tricky logic lives here as PURE functions so the merge rules can be
// unit-tested in isolation (see sync.test.mjs) without React or the network.
//
// The store holds one shared blob: { students: [...], instructors: {...} }.
// Multiple instructors edit it from different phones, so the central problem is
// reconciling concurrent edits without a real database transaction. We do a
// 3-way merge (base / mine / theirs) on every save instead of blindly
// overwriting the whole blob.

export const CACHE_KEY = "swim-roster-cache-v1";

// ---------------------------------------------------------------------------
// Durable local cache. Written on every edit BEFORE the network call so an
// unsynced change survives a reload / tab close even with no signal.
// ---------------------------------------------------------------------------
export function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCache(state) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota exceeded — non-fatal */
  }
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const sameJSON = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function indexById(list) {
  const m = new Map();
  for (const s of list || []) if (s && s.id != null) m.set(s.id, s);
  return m;
}

// True when `current` has edits not yet reconciled with `base`.
export function isDirty(base, current) {
  return !sameJSON(base, current);
}

// Per-field 3-way merge of a single student. A field is taken from the side
// that changed it relative to base; if BOTH changed it, MINE wins (we never
// silently drop a local edit — it will be pushed on the next save).
function mergeStudentFields(b, m, t) {
  const out = {};
  const keys = new Set([...Object.keys(b), ...Object.keys(m), ...Object.keys(t)]);
  for (const k of keys) {
    const myChange = !sameJSON(m[k], b[k]);
    const theirChange = !sameJSON(t[k], b[k]);
    if (myChange) out[k] = m[k]; // mine wins on true conflict
    else if (theirChange) out[k] = t[k];
    else out[k] = b[k];
  }
  return out;
}

// 3-way merge of the students array.
//   base   = last server state this device reconciled with
//   mine   = this device's current state (may contain unsaved edits)
//   theirs = latest server state just fetched
// Deletions are honored when the other side did not also edit that record.
export function mergeStudents(base, mine, theirs) {
  const B = indexById(base);
  const M = indexById(mine);
  const T = indexById(theirs);
  const merged = new Map(); // id -> record

  const allIds = new Set([...M.keys(), ...T.keys(), ...B.keys()]);
  for (const id of allIds) {
    const b = B.get(id);
    const m = M.get(id);
    const t = T.get(id);
    const inB = !!b, inM = !!m, inT = !!t;

    if (inB && !inM) continue;          // I deleted it -> stays deleted
    if (inB && inM && !inT) continue;   // they deleted it -> stays deleted
    if (!inM && !inT) continue;         // gone from both

    if (inM && inT) {
      if (!inB) merged.set(id, m);                       // both added same id -> mine
      else if (sameJSON(m, b) && sameJSON(t, b)) merged.set(id, b);
      else if (!sameJSON(m, b) && sameJSON(t, b)) merged.set(id, m);
      else if (sameJSON(m, b) && !sameJSON(t, b)) merged.set(id, t);
      else merged.set(id, mergeStudentFields(b, m, t)); // both changed
    } else if (inM) {
      merged.set(id, m);                // I added (no base, not theirs)
    } else {
      merged.set(id, t);               // they added (no base, not mine)
    }
  }

  // Stable order: keep MINE's order for surviving ids, then append
  // server-only survivors in theirs order. Minimizes visual reshuffle.
  const order = [];
  const seen = new Set();
  for (const s of mine || []) if (merged.has(s.id) && !seen.has(s.id)) { order.push(merged.get(s.id)); seen.add(s.id); }
  for (const s of theirs || []) if (merged.has(s.id) && !seen.has(s.id)) { order.push(merged.get(s.id)); seen.add(s.id); }
  return order;
}

// 3-way merge of instructors (map of "time|level" -> [names]). Single-side
// changes win; if both changed a class, union the names (additive is the least
// surprising outcome for instructor lists, which are rarely pruned).
export function mergeInstructors(base, mine, theirs) {
  base = base || {}; mine = mine || {}; theirs = theirs || {};
  const out = {};
  const keys = new Set([...Object.keys(base), ...Object.keys(mine), ...Object.keys(theirs)]);
  for (const k of keys) {
    const b = base[k], m = mine[k], t = theirs[k];
    const inM = m !== undefined, inT = t !== undefined;
    if (inM && inT) {
      if (sameJSON(m, t)) out[k] = m;
      else if (sameJSON(m, b)) out[k] = t;
      else if (sameJSON(t, b)) out[k] = m;
      else out[k] = Array.from(new Set([...(m || []), ...(t || [])])); // both changed -> union
    } else if (inM) {
      if (b !== undefined && sameJSON(m, b) && !inT) continue; // they removed the key
      out[k] = m;
    } else if (inT) {
      if (b !== undefined && sameJSON(t, b)) continue; // I removed the key
      out[k] = t;
    }
  }
  return out;
}

// Merge a whole {students, instructors} snapshot.
export function mergeState(base, mine, theirs) {
  return {
    students: mergeStudents(base?.students || [], mine?.students || [], theirs?.students || []),
    instructors: mergeInstructors(base?.instructors, mine?.instructors, theirs?.instructors),
  };
}
