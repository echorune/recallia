# Recallia — Spaced-Repetition Learning Application

> **Tagline:** *Learn it. Recall it. Remember it.*  
> Recallia is a premium, full-stack spaced-repetition learning platform built with TypeScript, React, Express, and an SM-2 scheduling engine.

---

## Overview

Recallia helps students and lifelong learners achieve durable, long-term knowledge retention through active recall and intelligent spaced repetition. Designed with a calm, motivating, tropical-inspired visual identity, Recallia balances powerful cognitive science principles with an intuitive, distraction-free user experience.

### Key Features
- **Intelligent Spaced Repetition (SM-2):** Deterministic review intervals, ease factor adaptation, and review rating grades (`Again`, `Hard`, `Good`, `Easy`) using an injectable clock.
- **Hierarchical Learning Organization:** Structured into Courses → Subjects → Topics → Decks → Flashcards.
- **Selective Topic Mastery:** Students can toggle specific topics on or off in their daily review queues without losing past learning history.
- **1,172 Science Questions Preloaded:** Sourced from the supplied ARC Science dataset, classified into 5 subjects (Biology, Physics, Earth & Space, Chemistry, Scientific Inquiry) across 16 focused topics.
- **Robust CSV & JSON Import/Export:** Import cards with interactive column mapping, validation, duplicate detection, and instant preview.
- **Student Privacy & Isolation:** Per-student data segregation with salted `scrypt` password hashing and secure token-based sessions.
- **Learning Analytics & Streaks:** Study heatmaps, daily retention metrics, upcoming review forecasts, and streak counters.

---

## Architecture Overview

Recallia is built cleanly as a modular TypeScript project:

- **`src/core/` (Domain Logic):** Pure, framework-agnostic TypeScript modules:
  - `scheduler/`: SM-2 spaced repetition algorithm with injectable `Clock`.
  - `stats/`: Retention calculations, daily review streak, and accuracy metrics.
  - `enrollment/`: State transitions for courses and topics.
  - `csv/`: CSV parsing, validation, column mapping, and export.
- **`src/server/` (Backend):**
  - Express REST API with TypeScript.
  - Embedded `node:sqlite` database with strict foreign key constraints and WAL mode.
  - Salted `scrypt` password hashing and session management.
- **`src/client/` (Frontend):**
  - React 18 SPA with React Router.
  - Vite dev server and production builder.
  - Custom Tailwind CSS design system with Recallia's signature tropical color scheme (deep teal, emerald, warm sand, amber gold).
- **`data/seeds/`:**
  - Subject-split JSON datasets extracted from `test.csv` (Biology, Physics, Earth & Space, Chemistry, Scientific Inquiry).

---

## Prerequisites

- **Node.js:** v20+ (Node v26 recommended with native `node:sqlite`)
- **npm:** v9+
- **Python:** v3.8+ (used for the dataset extraction script)

---

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd recallia
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Convert Dataset (if modifying `test.csv`):**
   ```bash
   npm run convert-data
   ```
   *This extracts `test.csv` into subject-split JSON files in `data/seeds/` without runtime code reading raw CSV.*

4. **Seed the Database:**
   ```bash
   npm run seed
   ```

---

## Running the Application

### Development Mode (Concurrent Backend & Frontend)

Start the Express API server (port 3001):
```bash
npm run dev:server
```

In a second terminal, start the Vite client (port 5173):
```bash
npm run dev:client
```

Open your browser at `http://localhost:5173`. Requests to `/api/*` are automatically proxied to the backend on `http://localhost:3001`.

### Production Build

```bash
npm run build
npm run preview
```

---

## Importing Flashcards

### 1. Preloaded Science Question Bank
The supplied `test.csv` has already been converted and split into 5 subject files in `data/seeds/`:
- `biology-and-life-sciences.json` (330 cards)
- `physics-and-mechanics.json` (275 cards)
- `earth-and-space-sciences.json` (236 cards)
- `chemistry-and-matter.json` (164 cards)
- `scientific-inquiry-and-applied-science.json` (167 cards)

Running `npm run seed` automatically populates the database with these categorized cards.

### 2. Custom CSV Import via UI
Students can import any standard flashcard or Q&A CSV file directly via the Recallia web application:
1. Navigate to the **Decks** or **Cards** section.
2. Click **Import CSV**.
3. Select any CSV file.
4. Recallia auto-detects headers or lets you map columns (`Front / Question`, `Back / Answer`, `Subject`, `Topic`, `Tags`, `Difficulty`).
5. Review the validation summary and preview table before committing.

---

## Manual Verification Instructions

### 1. Student Authentication Verification
1. Open `http://localhost:5173`.
2. Register a new student account (`alice@example.com` / password `Password123!`).
3. Verify that registration succeeds and redirects to the authenticated workspace.
4. Reload the page and ensure the session is preserved.
5. Log out and confirm access is revoked.
6. Attempt to log in with an incorrect password and confirm a 401 error message displays cleanly.
7. Test the password reset workflow.

---

## License

Recallia is proprietary software. All rights reserved.
