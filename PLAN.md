# Recallia — Spaced-Repetition Learning Application
## Architecture, Master Implementation Plan & Tracking Document

> **Product Tagline:** *Learn it. Recall it. Remember it.*  
> **Repository:** `recallia`  
> **Status:** Active Implementation  
> **Current Phase:** Completed Phase 3 (Feature 2: Courses, Enrollments & Topic Selection Engine)  
> **Next Phase:** Phase 4 — Feature 3 (Flashcard Question Bank & Advanced CSV/JSON Import/Export)

---

## 1. Product Vision & Requirements

Recallia is an original, premium-quality spaced-repetition learning platform designed to help students, professionals, and lifelong learners achieve long-term knowledge retention through active recall and intelligent spaced repetition.

### Target Audiences
- **Language learning** (vocabulary, idioms, grammar rules).
- **GCSE and A-level subjects** (Sciences, Humanities, Mathematics).
- **University and postgraduate studies** (Medicine, Law, Engineering).
- **Professional qualifications & technical certifications** (AWS, CompTIA, CFA, Bar exam).
- **General knowledge & competitive exams** (ARC Science question bank, trivia, Olympiads).

### Brand & Visual Identity
- **Personality:** Intelligent, calm, motivating, modern, distraction-free.
- **Palette:** Tropical-inspired palette with deep teal (`#0F4C5C`), radiant emerald (`#0A9396`), soft sage (`#94D2BD`), warm sand (`#E9D8A6`), amber gold (`#EE9B00`), and terracotta (`#CA6702`).
- **Typography:** Refined, accessible sans-serif with strong visual hierarchy and high contrast.
- **Design Philosophy:** Clean, fast interactions; distraction-free study cards; instant feedback; responsive on mobile, tablet, and desktop.

---

## 2. Architecture & Technology Decisions

### Technology Stack
1. **Frontend:**
   - React 18 with TypeScript.
   - Vite for ultra-fast compilation and instant HMR.
   - Tailwind CSS for responsive styling, custom color system, and subtle micro-interactions.
   - Lucide Icons for clean, consistent iconography.
   - Client-side routing with React Router v6.

2. **Backend API:**
   - Node.js (v26) with Express and TypeScript.
   - RESTful API design with structured JSON responses, input validation, and HTTP status codes.
   - Modular route architecture (`/api/auth`, `/api/courses`, `/api/subjects`, `/api/decks`, `/api/cards`, `/api/review`, `/api/analytics`, `/api/io`).

3. **Database & Persistence:**
   - Native `node:sqlite` (`DatabaseSync` engine built into Node v26).
   - Zero external binary compilation dependencies; embedded high-performance relational storage.
   - Strict foreign key constraints (`PRAGMA foreign_keys = ON;`), transactions, indexes, and WAL mode enabled.
   - Automatic schema initialization and seed migration runner.

4. **Security & Cryptography:**
   - Native `node:crypto` with `scryptSync` (key derivation with random salt) for secure password hashing.
   - Secure timing-safe comparisons (`timingSafeEqual`) to prevent timing attacks.
   - Token-based bearer authentication with session expiry and user isolation.

5. **Spaced-Repetition Core (SM-2):**
   - Independent pure TypeScript domain engine (`src/core/scheduler/`).
   - Completely decoupled from UI and persistence.
   - Injectable `Clock` interface (`SystemClock` for production, `SimulatedClock` for manual verification and testing).
   - SuperMemo SM-2 algorithm:
     - Rating grades: `Again` (0), `Hard` (3), `Good` (4), `Easy` (5).
     - Minimum ease factor: 1.30. Default: 2.50.
     - Repetition count, intervals (days), due timestamps, failed review resets.

6. **Data Extraction & Ingestion:**
   - Supplied `test.csv` (1,172 ARC Science questions) is pre-processed and converted into clean subject-split JSON seed files (`data/seeds/`).
   - Application code strictly uses the structured JSON seeds and SQLite database—never touching raw `test.csv` in runtime code.
   - Built-in CSV & JSON importer/exporter supporting user file imports, column mapping, validation, duplicate detection, and backups.

---

## 3. Data Model & Entity Relationships

```
+--------------------+           +------------------------+
|      Student       | 1       * |      CourseEnrollment  |
|  (User Account)    +-----------+------------------------+
+---------+----------+           | status: enrolled/      |
          |                      |   paused/completed/    |
          |                      |   withdrawn            |
          |                      +-----------+------------+
          | 1                                | *
          |                                  |
          | *                                v
+---------+----------+           +------------------------+
|   Deck / Course    | 1       * |         Topic          |
|    (Collection)    +-----------+------------------------+
+---------+----------+           | enabledForReview: bool |
          |                      +-----------+------------+
          | 1                                | 1
          |                                  |
          | *                                | *
+---------+----------------------------------+------------+
|                          Flashcard                      |
|  (id, front, back, subject, topic, tags, difficulty)    |
+-----------------------------+---------------------------+
                              | 1
                              |
                              | *
+-----------------------------+---------------------------+
|                      ReviewProgress                     |
|  (studentId, cardId, easeFactor, interval, reps,        |
|   dueDate, lastReviewDate, state)                       |
+-----------------------------+---------------------------+
                              | 1
                              |
                              | *
+-----------------------------+---------------------------+
|                        ReviewLog                        |
|  (studentId, cardId, rating, interval, easeFactor,      |
|   responseTimeMs, reviewedAt)                           |
+---------------------------------------------------------+
```

### Relational Schema Summary
- **users**: `id`, `name`, `email`, `password_hash`, `salt`, `created_at`, `updated_at`, `last_login_at`
- **sessions**: `id`, `user_id`, `token`, `expires_at`, `created_at`
- **courses**: `id`, `user_id`, `code`, `title`, `description`, `color`, `is_public`, `created_at`
- **enrollments**: `id`, `user_id`, `course_id`, `status` (`enrolled`, `paused`, `completed`, `withdrawn`), `enrolled_at`, `updated_at`
- **subjects**: `id`, `course_id`, `name`, `slug`, `code`, `description`, `color`, `display_order`
- **topics**: `id`, `subject_id`, `name`, `slug`, `description`, `display_order`
- **student_topic_preferences**: `id`, `user_id`, `topic_id`, `is_enabled`, `updated_at`
- **cards**: `id`, `user_id`, `course_id`, `subject_id`, `topic_id`, `original_id`, `front`, `back`, `answer_key`, `difficulty`, `tags`, `created_at`, `updated_at`
- **card_reviews**: `id`, `user_id`, `card_id`, `state` (`new`, `learning`, `review`, `relearning`), `ease_factor`, `interval_days`, `repetitions`, `lapses`, `due_date`, `last_reviewed_at`
- **review_logs**: `id`, `user_id`, `card_id`, `rating`, `scheduled_days`, `actual_days`, `ease_factor`, `review_duration_ms`, `reviewed_at`

---

## 4. Feature Breakdown & Implementation Phases

Recallia follows a strictly phased, feature-by-feature implementation workflow. Each feature is delivered completely with UI, backend endpoints, domain business logic, persistence, and verified edge cases.

### Phase 1 — Foundational Architecture & Core Domain Engines (COMPLETED)
- [x] Workspace setup, TypeScript configuration, Vite, Tailwind CSS with tropical palette.
- [x] Extraction and subject-wise conversion of `test.csv` (1,172 questions across 5 subjects and 16 topics) into `data/seeds/*.json`.
- [x] Database schema creation with native `node:sqlite`, foreign keys, and indexes.
- [x] Core domain engines:
  - SM-2 Spaced Repetition engine with injectable `Clock`.
  - Statistics & streak calculation engine.
  - Enrollment state machine and topic filtering rules.
  - CSV parser and validator.

### Phase 2 — Feature 1: Student Accounts, Authentication & Security (COMPLETED)
- [x] User registration with name, email, password validation.
- [x] Cryptographic password hashing (`scryptSync` + 32-byte salt) and constant-time verification.
- [x] Session management with bearer authentication tokens (96 hex chars) and expiry tracking.
- [x] Login and logout workflows with protected session state and revocation.
- [x] Password reset simulation workflow (secure token generation and reset submission).
- [x] User profile and current session viewer (`/api/auth/me`).
- [x] Polished, responsive authentication UI with tab switching, error callouts, and session persistence.
- [x] Manual verification of all registration, login, logout, and password edge cases (25/25 automated manual tests passing).

### Phase 3 — Feature 2: Courses, Enrollments & Topic Selection Engine (COMPLETED)
- [x] Course catalog management (create, view, edit courses).
- [x] Enrollment lifecycle management (`enrolled`, `paused`, `completed`, `withdrawn`).
- [x] Enrollment state transition validations preventing illegal transitions (EnrollmentStateMachine).
- [x] Subject & Topic hierarchy navigation.
- [x] Student topic selector allowing enabling/disabling topics for daily study without losing review history.
- [x] Standalone decks support (`decks` table and management UI).
- [x] Manual verification of enrollment workflows and topic queue filtering (39/39 unit checks + 8 live HTTP tests passing).

### Phase 4 — Feature 3: Flashcard Question Bank & Advanced CSV/JSON Import/Export (NEXT)
- [ ] Interactive flashcard explorer with search, subject filter, topic filter, difficulty filter, and pagination.
- [ ] Flashcard creation, editing, deletion, and tag management.
- [ ] Bulk CSV import modal with column mapping, delimiter detection, preview table, validation error reporting, and duplicate detection.
- [ ] CSV export (deck, subject, or course-level).
- [ ] JSON backup export and restoration.
- [ ] Ingestion of the 1,172 ARC Science cards into the primary catalog.
- [ ] Manual verification of CSV parsing, validation, and export fidelity.

### Phase 5 — Feature 4: Spaced-Repetition Review Experience & Interactive Study Session
- [ ] Daily due-queue generator taking into account topic selections and due dates.
- [ ] Distraction-free review interface with front/back card flip animation.
- [ ] SM-2 response buttons: `Again` (1 min / reset), `Hard` (+1.2x), `Good` (SM-2 interval), `Easy` (+1.5x bonus).
- [ ] Keyboard shortcuts (Space/Enter to flip, 1-4 for ratings).
- [ ] Session progress indicator (remaining cards, review speed, accuracy).
- [ ] Session completion celebratory summary with retention stats.
- [ ] Manual verification with simulated clock advancing dates and verifying intervals.

### Phase 6 — Feature 5: Learning Analytics, Streaks, Daily Goals & Retention Dashboard
- [ ] Daily review goal tracking (e.g. 20 cards/day).
- [ ] Current streak and longest streak calculations with calendar activity heatmap.
- [ ] Retention rate calculation and accuracy breakdown by subject/topic.
- [ ] Upcoming review forecast (due cards over next 7/14/30 days).
- [ ] Daily study reminder notification simulation.
- [ ] Manual verification of streak persistence and statistical accuracy.

---

## 5. Dependencies Between Features

1. **Feature 1 (Auth)** is required first to establish student identity and ensure strict data isolation.
2. **Feature 2 (Courses & Topics)** depends on Auth to associate enrollments and topic preferences with the student.
3. **Feature 3 (Flashcards & CSV/JSON)** relies on Subjects/Topics to organize cards and allow imports into specific decks.
4. **Feature 4 (Spaced Repetition)** relies on Flashcards and Topic Selections to construct the active study queue.
5. **Feature 5 (Analytics & Streaks)** aggregates logs generated by Feature 4 study sessions.

---

## 6. Implementation Decisions & Edge Cases

| Decision / Edge Case | Chosen Strategy | Rationale |
|----------------------|-----------------|-----------|
| **Database Engine** | Native `node:sqlite` | Zero native build issues on modern Node 26; fast, ACID-compliant, file-persisted. |
| **Password Security** | `crypto.scryptSync` + 32-byte salt | Industry standard key derivation resistant to GPU brute-forcing. |
| **Session Model** | 64-character random hex token stored in SQLite with timestamp expiry | Clean, stateless to the client, easy invalidation on logout. |
| **Clock Dependency** | Injectable `Clock` interface | Allows deterministic date-simulation in review tests without altering system clock. |
| **Enrollment State Transitions** | Strict state machine: `enrolled` ⇄ `paused` → `completed` or `withdrawn` | Ensures history is never dropped when student pauses or withdraws. |
| **Topic Disabling** | Soft toggle via `student_topic_preferences` | Disabling a topic excludes its cards from daily queue, but preserves all SM-2 intervals and review logs. |
| **test.csv Handling** | Pre-processed by Python into subject-split JSON seeds | Fulfills requirement: "don't use that test.csv directly from code, convert it to suitable format like json and split it subject wise". |

---

## 7. Feature Status Tracker

### Feature 1: Student Accounts, Authentication & Security Foundation
- **Status:** COMPLETED & VERIFIED
- **Completion Date:** 2026-11-16
- **Delivered Components:**
  - `scripts/convert_test_csv.py`: Converted all 1,172 science questions from `test.csv` into 5 subject-split JSON files (`biology-and-life-sciences.json`, `physics-and-mechanics.json`, `earth-and-space-sciences.json`, `chemistry-and-matter.json`, `scientific-inquiry-and-applied-science.json`) and `manifest.json`. Application code does not touch raw CSV.
  - `src/server/db.ts`: SQLite schema with foreign keys, WAL mode, indexes, and tables: `users`, `sessions`, `courses`, `enrollments`, `subjects`, `topics`, `student_topic_preferences`, `cards`, `card_reviews`, `review_logs`.
  - `src/server/auth/authService.ts`: Salted `scrypt` hashing, constant-time verification, session token generation/invalidation, and reset token lifecycle.
  - `src/server/auth/authMiddleware.ts`: Token extraction and session guard.
  - `src/server/auth/authRoutes.ts`: `/register`, `/login`, `/logout`, `/me`, `/forgot-password`, `/reset-password`.
  - `src/server/seed.ts`: Seed script populating course, subjects, 16 topics, 1,172 flashcards, and default demo student.
  - `src/core/scheduler/sm2.ts`: SM-2 spaced repetition scheduler with injectable `Clock`.
  - `src/client/context/AuthContext.tsx`: React auth state management and persistence.
  - `src/client/components/auth/AuthPage.tsx`: Commercial-quality UI with tabs, validation, alerts, and one-click demo login.
  - `src/client/components/Navbar.tsx` & `src/client/components/dashboard/StudentDashboard.tsx`: Authenticated student workspace.
- **Verification Results:**
  - 25/25 manual verification cases passed (crypto salt/hash, registration inputs, duplicate emails, password reset, login, session expiry, token revocation, live HTTP endpoints).
- **Known Limitations:**
  - Reset tokens returned in response payload for easy manual testing and evaluation in the UI rather than external SMTP delivery.

---

### Feature 2: Courses, Enrollments & Topic Selection Engine
- **Status:** COMPLETED & VERIFIED
- **Completion Date:** 2026-11-16
- **Delivered Components:**
  - `src/core/enrollment/stateMachine.ts`: Pure `EnrollmentStateMachine` implementing valid transitions (`enrolled` ⇄ `paused` → `completed` or `withdrawn`), rejection of invalid transitions, and transition action labeling.
  - `src/core/enrollment/topicSelector.ts`: Pure `TopicSelector` with topic enabling/disabling logic and daily queue filtering (`filterCardsForQueue`), ensuring cards from disabled topics are excluded without touching review history.
  - `src/server/db.ts`: Added `decks` table and `deck_id` foreign key on `cards` table with migrations.
  - `src/server/courses/courseService.ts`: Course creation, course listing with enrollment status, course details with subjects and topics, enrollment status transitions, topic preference management, bulk subject topic toggling, and standalone deck CRUD.
  - `src/server/courses/courseRoutes.ts`: `/api/courses`, `/api/courses/:id`, `/api/courses/:id/status`, `/api/courses/topics/:id/toggle`, `/api/courses/subjects/:id/toggle-all`, `/api/courses/decks/all`, `/api/courses/decks/new`.
  - `src/client/components/courses/CourseCatalog.tsx`: Course catalog with interactive status badges (`enrolled`, `paused`, `completed`, `withdrawn`), state transition action buttons, and course creation modal.
  - `src/client/components/courses/TopicSelector.tsx`: Hierarchical subject/topic navigator with toggle switches, bulk enable/disable buttons, and live review queue counter.
  - `src/client/components/courses/StandaloneDecks.tsx`: Standalone deck management for quick revision cards outside of courses.
  - `src/client/components/dashboard/StudentDashboard.tsx`: Integrated dashboard navigation tabs.
- **Verification Results:**
  - 39/39 manual verification checks passed (state machine rules, illegal transition errors, course creation, auto-enrollment, lifecycle transitions, review history preservation across status changes, topic toggling, queue filtering, standalone decks).
  - 8/8 live HTTP endpoints verified against active server.
  - Production build compiled cleanly with Vite.
- **Known Limitations:**
  - Direct flashcard browsing and bulk CSV file importing into specific decks is the objective of Feature 3.

---

### Next Incomplete Feature: Feature 3 (Flashcard Question Bank & Advanced CSV/JSON Import/Export)
- **Status:** Pending ("Continue" instruction)
- **Planned Scope:**
  - Flashcard management UI (create, edit, delete cards, front/back markdown, difficulty, tags).
  - Bulk CSV import engine with delimiter detection, column mapping, validation, duplicate detection, and preview table.
  - CSV export (deck, subject, or course-level).
  - JSON structured backup export and restore.
