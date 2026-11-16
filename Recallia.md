# Recallia — Spaced-Repetition Learning Application

Act as a senior TypeScript engineer, software architect, and product designer. Your task is to design and build **Recallia**, an original, substantial, premium-quality spaced-repetition learning application.

**Product tagline:** Learn it. Recall it. Remember it.

Recallia helps students learn and retain information through structured flashcards, intelligent spaced repetition, and measurable learning progress.

The application should be suitable for:
- Language learning.
- GCSE and A-level subjects.
- University studies.
- Professional qualifications.
- Technical certifications.
- General knowledge and personal learning.

The central functionality is a reliable spaced-repetition engine, supported by an intuitive interface for managing courses, subjects, topics, decks, flashcards, and daily reviews.

---

# 1. Initial Instructions and Codebase Inspection

Before implementation:

1. Inspect the existing codebase, project structure, dependencies, and available tooling.
2. Inspect all supplied CSV files containing flashcard data.
3. Understand their structure, column names, encoding, delimiters, and data formats.
4. Identify whether different CSV files represent different subjects, topics, decks, or card formats.
5. Use the supplied CSV files as the initial learning content. Do not invent replacement flashcard content.
6. Identify existing application conventions and preserve useful existing functionality.

Create a comprehensive `PLAN.md` documenting:

- Recallia's product vision and requirements.
- Application architecture and technology decisions.
- Data model and relationships.
- Feature breakdown in logically ordered implementation phases.
- Dependencies between features.
- Implementation details.
- Edge cases and error handling.
- Completion criteria for every feature.
- Progress tracking and implementation decisions.

The plan must be the single source of truth throughout development.

# 2. Recallia — Product Identity and Design Direction

Build a distinctive, professional application under the name **Recallia**.

The application should feel like a polished commercial learning product rather than a generic CRUD application.

Brand identity:

- Product name: Recallia.
- Tagline: Learn it. Recall it. Remember it.
- Core concept: Long-term knowledge retention through active recall and spaced repetition.
- Visual identity: Intelligent, calm, motivating, modern, and professional.

Design principles:

- Sophisticated tropical-inspired colour palette.
- Deep teal, emerald, warm neutrals, and restrained golden accents.
- Vibrant but controlled gradients.
- Beautiful, readable typography.
- Refined spacing and exceptional visual hierarchy.
- Subtle transitions and animations.
- Responsive layouts for desktop, tablet, and mobile.
- Consistent reusable components.
- Thoughtful empty states, loading states, and error handling.
- Clear visual feedback during flashcard reviews.

Prioritise usability during daily study sessions.

The actual flashcard reviewing experience must be fast, distraction-free, and intuitive.

Avoid generic dashboard templates and unnecessary interface complexity.

# 3. Core Application Objectives

## Objective 1 — Student Accounts and Authentication

Implement student registration, authentication, and account management.

Requirements:

- Student registration and login.
- Secure password hashing.
- Session management or JWT authentication.
- Logout and session expiration.
- Password reset workflow.
- Student-specific data ownership.
- Appropriate authentication and authorisation rules.

Students must only access their own personal learning data.

Completion criteria:

A student can register, log in, maintain a session, and securely access their own courses, subjects, topics, decks, and review history.

## Objective 2 — Courses and Enrollments

Allow students to organise their learning around courses.

Examples:
- GCSE Biology.
- Spanish A2.
- French B1.
- AWS Solutions Architect.
- Professional qualifications.

Requirements:

- Create and manage courses.
- Enroll in and withdraw from courses.
- Support enrollment states: enrolled, paused, completed, withdrawn.
- Prevent duplicate or invalid enrollment transitions.
- Preserve learning and review history when enrollment status changes.

Completion criteria:

Students can manage their course enrollments, and the application consistently enforces valid enrollment transitions.

## Objective 3 — Subjects and Topic Selection

Organise learning material into a hierarchical structure.

Suggested structure:

Course → Subjects → Topics → Decks → Flashcards.

Requirements:

- A course can contain multiple subjects.
- Subjects can contain multiple topics.
- Students can select which topics they want to study.
- Allow students to enable or disable individual topics.
- Due-card queues must only include selected topics.
- Changing topic selections must never delete or reset existing review history.
- Support studying an individual topic, subject, or entire course.
- Support standalone decks without requiring a formal course.

Completion criteria:

Students can control exactly which learning material appears in their daily review queue without losing historical progress.

## Objective 4 — Flashcard and Question Bank

This is one of Recallia's central features.

### Flashcard management

- Create, edit, and delete flashcards.
- Front and back content.
- Support tags, difficulty, and optional descriptions.
- Associate cards with subjects, topics, and decks.
- Search and filter cards.
- Maintain version history when cards are edited.
- Support individual and bulk card management.

### CSV Import

The application must support the supplied CSV flashcard files as its initial content source.

Requirements:

- Bulk CSV importing.
- Support different CSV structures and column names.
- Provide column mapping where formats differ.
- Handle different delimiters and character encodings.
- Validate mandatory fields.
- Handle missing or malformed data.
- Detect duplicate cards.
- Provide an import preview before committing.
- Report successful imports, skipped records, and validation errors.
- Preserve original source data where appropriate.
- Allow imported cards to be assigned to courses, subjects, topics, and decks.

Do not assume every supplied CSV has an identical schema.

Inspect the actual files before designing the import implementation.

### CSV Export

- Export individual decks.
- Export subjects or entire courses.
- Preserve card content and relevant metadata.
- Ensure exported CSV files can be imported again.

### JSON Import/Export

- Support JSON for structured backups and data interchange.
- Preserve identifiers and relevant metadata when restoring data.
- Handle invalid or incompatible backup files gracefully.

Completion criteria:

A student can import the supplied CSV files, inspect and organise their flashcards, edit them, search them, and export their collections without data loss.

## Objective 5 — Spaced Repetition and Daily Engagement

Implement a reliable spaced-repetition scheduling engine.

Use SM-2 or a well-defined variation of the algorithm.

The scheduler is one of Recallia's most important components. Keep scheduling logic completely independent of the UI.

### Review experience

- Display cards that are due for review.
- Reveal the answer on demand.
- Allow the student to rate recall.
- Support Again, Hard, Good, and Easy ratings.
- Update the next review date based on the selected rating.
- Display review progress during a session.
- Support daily review sessions.
- Avoid showing cards that are not due unless explicitly requested.
- Allow students to study new cards separately from scheduled reviews.
- Provide a clear session completion summary.

### Scheduling engine

Implement:

- Ease factor calculations.
- Review intervals.
- Repetition counts.
- Due dates.
- Failed review handling.
- New-card scheduling.
- Review history.
- Configurable daily limits.
- Handling of cards that are overdue.
- Consistent date and timezone handling.

Use an injectable clock rather than directly depending on the system clock throughout the application.

This ensures deterministic scheduling behaviour and makes manual verification possible.

### Engagement and statistics

- Daily study goals.
- Current streak and longest streak.
- Daily review counts.
- Total cards learned.
- Cards due and upcoming.
- Retention statistics.
- Learning progress over time.
- Course and subject progress.
- Study activity history.
- Review accuracy and performance trends.

### Reminders

Provide an appropriate mechanism for daily study reminders, subject to the chosen application architecture.

Completion criteria:

A student can complete a sequence of reviews and see consistent due dates, review history, streaks, and progress statistics.

# 4. Architecture and Engineering Requirements

Use TypeScript throughout Recallia.

Follow sound engineering principles:

- Clear separation of concerns.
- Reusable components.
- Strong typing and explicit interfaces.
- Maintainable application structure.
- Appropriate abstraction without overengineering.
- Consistent error handling.
- Input validation.
- Secure handling of authentication and user data.
- Appropriate persistence and database relationships.

Separate core business logic from presentation.

In particular, keep these components independent of the UI:

- Spaced-repetition scheduler.
- Review history and statistics calculations.
- Streak calculations.
- Enrollment state transitions.
- Topic selection rules.
- CSV parsing and validation.
- Import/export operations.

Design the scheduling engine around predictable inputs and outputs, with an injectable clock.

Do not introduce unnecessary external dependencies. Choose libraries that provide genuine value.

Document significant architectural decisions in `PLAN.md`.

# 5. Strict Implementation Workflow

Follow `PLAN.md` as the single source of truth.

Feature-by-feature development is mandatory.

### Initial setup

1. Inspect the codebase.
2. Inspect all supplied CSV files.
3. Create the complete `PLAN.md`.
4. Create a `README.md` containing:
   - Recallia introduction.
   - Product overview.
   - Architecture overview.
   - Prerequisites.
   - Installation instructions.
   - How to build.
   - How to run.
   - How to import the supplied flashcard CSV files.
   - Manual verification instructions.

### Feature implementation

1. Implement exactly one feature at a time.
2. Complete its UI, business logic, persistence, integration, and edge cases.
3. Do not leave placeholders or unfinished functionality within a feature.
4. Perform manual verification of the completed functionality.
5. Update `PLAN.md` with:
   - Feature completion status.
   - Implementation details.
   - Important decisions.
   - Known limitations.
   - The next incomplete feature.

6. Summarise the completed feature and identify what comes next.
7. Stop and wait for my explicit instruction to continue.

When I say **"Continue"**, resume with the next incomplete feature without repeating previously completed work.

Do not interrupt implementation of the current feature with questions or approval requests. Make sensible engineering decisions independently.

If a feature is too large, divide it into manageable sub-features and seek approval between them.

# 6. Testing Restrictions — Important

**DO NOT GENERATE UNIT TESTS.**

The objective is to build the actual Recallia application, not a test suite.

Explicitly:

- Do not create unit test files.
- Do not create integration test files.
- Do not create end-to-end test suites.
- Do not scaffold testing frameworks or test infrastructure.
- Do not spend implementation time writing automated tests.
- Do not create test-only applications or test projects.
- Do not generate test data or test fixtures solely for automated testing.

Build the actual production application and its functionality.

You must still perform sensible manual verification of implemented features, including checking application behaviour, error handling, and important edge cases.

The architecture should remain clean and modular, but do not implement features solely to support automated testing.

# 7. Quality Standards

Every completed feature must be functional and integrated into Recallia.

Do not:

- Substitute mock functionality for real functionality.
- Use hardcoded dashboard statistics as a replacement for actual calculations.
- Create buttons that do nothing.
- Leave placeholder pages.
- Ignore CSV validation errors.
- Reset review history when cards or topics are reorganised.
- Implement scheduling logic inside UI components.
- Compromise data integrity during import/export.
- Automatically advance to the next feature.

Prioritise:

1. Correctness of the spaced-repetition engine.
2. Preservation of learning history.
3. Reliable CSV import/export.
4. Secure student data management.
5. Exceptional daily review experience.
6. Professional visual design.
7. Maintainable TypeScript architecture.

# 8. Starting Instructions

Start by inspecting the existing codebase and all supplied CSV files.

Then create the complete `PLAN.md`, with all objectives divided into practical implementation phases and a clear dependency order.

Immediately implement the first feature after creating the plan.

Fully implement and manually verify that feature before stopping.

Do not automatically proceed to the next feature.

Create Git Commit after each feature with the suitable gitignore file.

Wait for my explicit instruction:

**Continue.**

---

**Recallia — Learn it. Recall it. Remember it.**