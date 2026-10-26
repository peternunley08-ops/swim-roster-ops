# 🏊‍♂️ DeckHand — Swim Roster & Lifeguard Sync

[![CI](https://github.com/peternunley08-ops/swim-roster-ops/actions/workflows/ci.yml/badge.svg)](https://github.com/peternunley08-ops/swim-roster-ops/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-13_passed-2DD4BF)](./src/sync.test.mjs)
[![Live Product Page](https://img.shields.io/badge/demo-live_product_page-E8A23C)](https://peternunley08-ops.github.io/swim-roster-ops/docs/swim-ops-landing.html)

A real-time roster, attendance, instructor assignment, and AI photo-import web application built for aquatics programs and poolside operations.

Organizes swimmers by time slot (`10am`–`2pm`) and skill level (`Level 1`–`Level 6`), tracks live attendance across multiple instructors' phones simultaneously, and imports printed/handwritten roster sheets using **Claude Vision**.

---

## ✨ Key Features

- **📊 Live Day Dashboard:** Instant overview of total swimmers, active classes, attendance percentages, level distribution, and a timeline grid flagging empty or over-capacity (7+) classes.
- **🔄 3-Way Multi-Device Sync (`src/sync.js`):** Multiple instructors can edit attendance, notes, and class placements from different phones at the same time. Every save performs an **ETag-guarded 3-way merge** against the latest server snapshot so one instructor's update never clobbers another's.
- **📸 Claude Vision Roster Import (`netlify/functions/read-roster.js`):** Snap a photo of a printed or handwritten roster clipboard; a serverless function extracts swimmer names, ages, guardians, and levels into an interactive review queue before merging.
- **🛡️ Hardened Role Security (`supabase/`):** Supabase Row-Level Security (RLS) policies and Edge Functions prevent privilege escalation, restrict account creation to program owners, and clear local PII caches on sign-out.
- **🖨️ One-Click Exports:** Export per-slot or full-day CSVs, or generate a print-ready multi-page attendance packet.

---

## 🗂️ Repository Structure

```text
swim-roster-ops/
├── src/
│   ├── App.jsx                 # Main React application (Dashboard, Slot views, Photo import UI)
│   ├── sync.js                 # 3-way state reconciliation & offline localStorage cache engine
│   ├── sync.test.mjs           # Automated unit test suite for concurrent edits & merges
│   └── main.jsx                # React DOM entry point
├── netlify/
│   └── functions/
│       ├── roster-store.js     # Serverless state store backed by Netlify Blobs + ETag locking
│       └── read-roster.js      # Anthropic Claude Vision endpoint for photo-to-JSON parsing
├── supabase/
│   ├── 01_security_hardening.sql                  # RLS policies & role-lock triggers
│   └── functions/create-instructor/index.ts       # Owner-only instructor provisioning Edge Function
├── docs/
│   ├── swim-ops-landing.html   # DeckHand product landing page (standalone preview)
│   ├── swim-ops-onepager.html  # Printable 1-page program overview
│   └── swim-system-map.html    # Visual architecture & sync-flow interactive diagram
├── index.html                  # App shell
├── netlify.toml                # Netlify build & functions configuration
└── vite.config.js              # Vite bundler config
```

---

## 🚀 Running Locally

### 1. Install dependencies & start dev server
```bash
npm install
npm run dev
```

### 2. Run the 3-way sync unit test suite
```bash
node --test src/sync.test.mjs
```

### 3. Test with Netlify Functions (optional, for AI photo import)
```bash
npm install -g netlify-cli
export ANTHROPIC_API_KEY="sk-ant-..."
netlify dev
```

> **Note on Sample Data:** All default seed records in `src/App.jsx` use synthetic demo names so the app can be explored safely out of the box.
