---
name: Burse Phased Roadmap
overview: Phased implementation roadmap for the Burse receipt scanner app. Each phase is a self-contained unit of work that can be planned in detail and executed in its own session.
todos:
  - id: phase-1
    content: "Phase 1: Project Scaffolding & Configuration"
    status: completed
  - id: phase-2
    content: "Phase 2: Data Layer & Type Definitions"
    status: completed
  - id: phase-3
    content: "Phase 3: Gemini API Integration"
    status: pending
  - id: phase-4
    content: "Phase 4: Camera Capture Screen"
    status: pending
  - id: phase-5
    content: "Phase 5: Review Queue Screen"
    status: pending
  - id: phase-6
    content: "Phase 6: Results Table & Inline Editing"
    status: pending
  - id: phase-7
    content: "Phase 7: Export & Sharing"
    status: pending
  - id: phase-8
    content: "Phase 8: Home Dashboard & Navigation Polish"
    status: pending
  - id: phase-9
    content: "Phase 9: Polish, Error Handling & Device Testing"
    status: pending
isProject: false
---

# Burse — Phased Implementation Roadmap

Use this document to track progress across sessions. Open a new session for each phase, reference this roadmap, and create a detailed plan for that phase.

---

## Phase 1: Project Scaffolding & Configuration

**Status**: COMPLETE

**Goal**: Get a blank Expo app running in Expo Go on a physical iPhone.

**What was delivered**:

- Expo SDK 54 project with TypeScript, Expo Router v6, React 19, React Native 0.81
- NativeWind v4 (Tailwind CSS for RN) with custom navy/copper color palette and DM Sans font
- All dependencies installed (expo-camera, expo-sqlite, expo-file-system, expo-sharing, expo-image-manipulator, xlsx, jszip, @google/generative-ai, uuid, nativewind, tailwindcss, @expo-google-fonts/dm-sans)
- `app.json` configured with name "Burse", deep linking scheme, camera + photo library permissions
- 5-screen navigation skeleton: Home (tabs), Receipts (tabs), Camera (modal), Review (stack), Export (stack)
- Project directory structure: `components/`, `lib/`, `constants/`, `types/`
- Verified: Metro compiles all bundles (Web + iOS) with zero errors

**Design decisions made in this phase**:

- **Styling**: NativeWind v4, light mode only
- **Color palette**: Deep navy (`#1B2541`) + burnished copper (`#C27C4E`) on warm ivory (`#FAF8F5`)
- **Typography**: DM Sans (geometric sans-serif) — Regular, Medium, Bold weights loaded via `@expo-google-fonts/dm-sans`
- **SDK version**: Expo SDK 54 (upgraded from HLD's planned SDK 52)

---

## Phase 2: Data Layer & Type Definitions

**Status**: COMPLETE

**Goal**: Build the local persistence layer so all subsequent phases have somewhere to read/write data.

**What was delivered**:

- `types/receipt.ts`: `Receipt` interface, `ReceiptStatus` and `ConfidenceLevel` union types, `EditableReceiptFields` pick type for inline editing, `GeminiParseResult` interface for Gemini response mapping
- `lib/database.ts`: `initDatabase()` opens `burse.db` and creates `receipts` + `_migrations` tables; full CRUD: `insertReceipt`, `updateReceipt` (dynamic partial), `getReceipt`, `getAllReceipts` (sorted by `createdAt DESC`), `deleteReceipt`; `rowToReceipt()` helper for SQLite-to-TypeScript coercion; `__devVerifyDatabase()` runs full CRUD cycle in dev mode
- `lib/storage.ts`: Uses new SDK 54 class-based `expo-file-system` API (`Paths`, `File`, `Directory`); `saveReceiptImage` copies to `receipts/{uuid}.jpg`, `deleteReceiptImage`, `getReceiptImageUri`, `deleteAllReceiptImages`
- `app/_layout.tsx`: Calls `initDatabase()` on mount, gates splash screen on both fonts + DB ready, runs dev verification behind `__DEV__`

**Design decisions made in this phase**:

- **expo-sqlite async API**: Uses `openDatabaseAsync`/`runAsync`/`getAllAsync`/`getFirstAsync` (new unified API in v16, no legacy)
- **expo-file-system class API**: Uses `Paths.document`, `File`, `Directory` classes (SDK 54 new API; legacy `documentDirectory`/`copyAsync` deprecated and throws at runtime)
- **errorMessage as `string | null**`: Not optional, for consistent 1:1 SQLite column mapping
- **GeminiParseResult snake_case**: Matches the JSON schema Gemini will return, kept separate from app's `Receipt` camelCase model

---

## Phase 3: Gemini API Integration

**Status**: NOT STARTED

**Goal**: Send a receipt image to Gemini and get structured expense data back as parsed JSON.

**Scope**:

- Create Gemini API client in `lib/gemini.ts` using `@google/generative-ai`
- Design and iterate on the receipt parsing prompt in `constants/prompts.ts`
- Implement image resizing (max 1024px) via `expo-image-manipulator` before sending to reduce token usage
- Implement base64 encoding of images for the API call
- Parse Gemini's JSON response into the `Receipt` type, handling malformed responses gracefully
- Add rate-limiting logic (max 15 concurrent requests per minute, queue the rest)
- Add retry logic for transient failures
- Obtain a free Gemini API key and store it in a config constant (embedded, since trusted users only)

**Entry criteria**: Phase 2 complete (Receipt type defined)
**Exit criteria**: Can pass a receipt photo and receive a correctly parsed `Receipt` object. Rate limiting and error handling work.

---

## Phase 4: Camera Capture Screen

**Status**: NOT STARTED

**Goal**: Build the rapid-fire camera screen optimized for scanning many receipts quickly.

**Scope**:

- Build `app/camera.tsx` using `expo-camera`
- Full-screen camera preview with a large, responsive shutter button
- Rapid-fire capture: tap to shoot, no review delay, immediately ready for next shot
- Running count badge showing "N captured" (e.g., floating badge in corner)
- Flash toggle button
- "Done" button that navigates to the Review Queue with captured image URIs
- Save each captured photo to the file system via `lib/storage.ts`
- Handle camera permissions gracefully (request on first use, explain if denied)

**Entry criteria**: Phase 2 complete (storage helpers exist)
**Exit criteria**: Can open camera, rapidly capture multiple receipt photos, see count, tap Done and navigate forward with images saved locally

---

## Phase 5: Review Queue Screen

**Status**: NOT STARTED

**Goal**: Let the user review captured photos before sending them for LLM processing.

**Scope**:

- Build `app/review.tsx` with a thumbnail grid of captured photos
- Tap a thumbnail to view full-size
- Swipe-to-delete or long-press to remove bad photos
- "Process All" button that triggers Gemini analysis for each photo
- Per-receipt progress indicator (pending / processing / done / error)
- Overall progress bar or count (e.g., "3 of 12 processed")
- On completion, insert all results into SQLite via `lib/database.ts` and navigate to Results Table
- Handle partial failures gracefully (some succeed, some fail — show errors inline)

**Entry criteria**: Phases 3 and 4 complete (Gemini client + camera both working)
**Exit criteria**: Can review photos, delete unwanted ones, process all through Gemini, see progress, and land on results

---

## Phase 6: Results Table & Inline Editing

**Status**: NOT STARTED

**Goal**: Build the main workhorse screen where the user views, verifies, and corrects extracted data.

**Scope**:

- Build `app/(tabs)/history.tsx` — scrollable list/table of all receipts
- Each row shows: thumbnail, date, vendor, description, category, amount, confidence badge
- Tap any text field to edit inline (amount, date, vendor, description, category)
- Color-coded confidence indicator (green/yellow/red)
- Checkbox selection for export (select individual or "select all")
- Tap thumbnail to view full receipt image in a modal
- Filter/sort controls: by date range, by status, by confidence
- Pull-to-refresh to reload from SQLite
- "Export Selected" button navigates to Export screen

**Entry criteria**: Phase 5 complete (receipts exist in SQLite with data)
**Exit criteria**: Can view all receipts, edit any field, select receipts for export, filter and sort

---

## Phase 7: Export & Sharing

**Status**: NOT STARTED

**Goal**: Generate exportable files (Excel + images) and share them via the iOS share sheet.

**Scope**:

- Build `app/export.tsx` — export configuration screen
- Format picker: Excel (.xlsx) or CSV
- Toggle: "Include receipt images"
- Generate `.xlsx` using the `xlsx` library with columns: Date, Vendor, Description, Category, Amount, Currency
- Generate `.csv` as alternative
- If images included: copy receipt photos renamed to match rows (e.g., `receipt_001.jpg`) and bundle into a `.zip` with the spreadsheet using `jszip`
- If no images: share the spreadsheet file directly
- Save to temp directory, invoke iOS share sheet via `expo-sharing`
- Handle large exports gracefully (show progress for zip creation)

**Entry criteria**: Phase 6 complete (receipts selectable and viewable)
**Exit criteria**: Can select receipts, choose format, generate export file, and share via AirDrop/Mail/Files/etc.

---

## Phase 8: Home Dashboard & Navigation Polish

**Status**: NOT STARTED

**Goal**: Build the landing screen and polish the overall navigation flow.

**Scope**:

- Build `app/(tabs)/index.tsx` — home dashboard
- Show quick stats: total receipts, total amount this month, receipts pending processing
- Big prominent "Scan Receipts" button (navigates to camera)
- "View All Receipts" link (navigates to history tab)
- Recent activity feed (last 5 processed receipts)
- Polish tab bar: icons, labels, active states
- Ensure back navigation and screen transitions feel smooth
- Add empty states for when there are no receipts yet

**Entry criteria**: Phases 4-7 complete (all functional screens exist)
**Exit criteria**: App feels cohesive end-to-end. Dashboard shows real data. Navigation is intuitive.

---

## Phase 9: Polish, Error Handling & Device Testing

**Status**: NOT STARTED

**Goal**: Harden the app for real-world use. Make it feel reliable and pleasant.

**Scope**:

- Add loading skeletons/spinners for all async operations
- Add error toasts/alerts with retry options for API failures
- Handle edge cases: no internet, camera permission denied, empty exports, corrupt images
- Test with real receipts (various formats: restaurant, gas station, grocery, online order printouts)
- Tune the Gemini prompt based on real-world accuracy
- Performance pass: ensure camera doesn't lag, large receipt lists scroll smoothly
- Publish via `eas update` and verify it loads correctly in Expo Go on the target user's phone
- Final UX walkthrough: is the capture-to-export flow under 2 minutes for 10 receipts?

**Entry criteria**: Phases 1-8 complete  
**Exit criteria**: App is reliable, handles errors gracefully, tested with real receipts, deployed to Expo Go for the end user