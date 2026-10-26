// Pure-logic tests for the 3-way merge. Run: node src/sync.test.mjs
import { mergeStudents, mergeInstructors, mergeState, isDirty } from "./sync.js";

let pass = 0, fail = 0;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function check(name, got, want) {
  if (eq(got, want)) { pass++; console.log("  ok  -", name); }
  else { fail++; console.log("  FAIL-", name, "\n    got :", JSON.stringify(got), "\n    want:", JSON.stringify(want)); }
}

const S = (id, extra = {}) => ({ id, name: id, present: false, level: "Level 1", time: "10am", note: "", ...extra });

// 1. Two phones mark DIFFERENT swimmers present -> both survive (the headline bug).
{
  const base = [S("a"), S("b")];
  const mine = [S("a", { present: true }), S("b")];          // I marked a
  const theirs = [S("a"), S("b", { present: true })];        // they marked b
  check("concurrent edits to different students both kept",
    mergeStudents(base, mine, theirs),
    [S("a", { present: true }), S("b", { present: true })]);
}

// 2. Both edit the SAME swimmer -> mine wins (never lose a local edit silently).
{
  const base = [S("a")];
  const mine = [S("a", { note: "mine" })];
  const theirs = [S("a", { note: "theirs" })];
  check("conflict on same student -> mine wins",
    mergeStudents(base, mine, theirs), [S("a", { note: "mine" })]);
}

// 3. They added a swimmer while I edited another -> their add appears for me.
{
  const base = [S("a")];
  const mine = [S("a", { present: true })];
  const theirs = [S("a"), S("c")];
  check("their add is picked up",
    mergeStudents(base, mine, theirs), [S("a", { present: true }), S("c")]);
}

// 4. I deleted a swimmer; they didn't touch it -> stays deleted (no zombie).
{
  const base = [S("a"), S("b")];
  const mine = [S("a")];           // I removed b
  const theirs = [S("a"), S("b")]; // they still have b
  check("my delete is honored", mergeStudents(base, mine, theirs), [S("a")]);
}

// 5. They deleted a swimmer; I didn't touch it -> stays deleted on my side too.
{
  const base = [S("a"), S("b")];
  const mine = [S("a"), S("b")];
  const theirs = [S("a")];         // they removed b
  check("their delete is honored", mergeStudents(base, mine, theirs), [S("a")]);
}

// 6. I added locally (not on server yet) -> kept.
{
  const base = [S("a")];
  const mine = [S("a"), S("new")];
  const theirs = [S("a")];
  check("my local add is kept", mergeStudents(base, mine, theirs), [S("a"), S("new")]);
}

// 7. Per-field merge: I toggle present, they edit note on the same student -> both.
{
  const base = [S("a")];
  const mine = [S("a", { present: true })];
  const theirs = [S("a", { note: "late" })];
  check("non-overlapping field edits on same student merge",
    mergeStudents(base, mine, theirs), [S("a", { present: true, note: "late" })]);
}

// 8. No local edits (clean) -> server state adopted verbatim.
{
  const base = [S("a")];
  const mine = [S("a")];
  const theirs = [S("a", { present: true }), S("b")];
  check("clean device adopts server",
    mergeStudents(base, mine, theirs), [S("a", { present: true }), S("b")]);
}

// Instructors
check("instructor single-side add kept",
  mergeInstructors({ "10am|Level 1": ["A"] }, { "10am|Level 1": ["A", "B"] }, { "10am|Level 1": ["A"] }),
  { "10am|Level 1": ["A", "B"] });
check("instructor both-changed -> union",
  mergeInstructors({ k: ["A"] }, { k: ["A", "B"] }, { k: ["A", "C"] }),
  { k: ["A", "B", "C"] });

// isDirty
check("isDirty false when equal", isDirty({ x: 1 }, { x: 1 }), false);
check("isDirty true when different", isDirty({ x: 1 }, { x: 2 }), true);

// Whole-state merge smoke test
{
  const base = { students: [S("a")], instructors: {} };
  const mine = { students: [S("a", { present: true })], instructors: { k: ["X"] } };
  const theirs = { students: [S("a"), S("b")], instructors: {} };
  check("mergeState combines both",
    mergeState(base, mine, theirs),
    { students: [S("a", { present: true }), S("b")], instructors: { k: ["X"] } });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
