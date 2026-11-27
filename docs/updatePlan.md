# HackDekh — Product Cleanup & Next Milestone Plan

> **Goal:** Strip away low-value, "teacher-like", and redundant UI/workflows across the entire application so HackDekh feels fast, clean, and genuinely useful for students—without breaking existing routes, database schemas, or production stability.

---

## Core Product Principles

1. **Zero-Noise Convenience:** Keep only what saves a student time or prevents a missed deadline.
2. **Action Over Bureaucracy:** Replace forced journaling ("Pending Reflections"), vanity analytics, and multi-step instruction modals with clear next actions.
3. **Non-Breaking Evolution:** Keep MongoDB schemas and existing API endpoints backward-compatible during cleanup so production data never breaks.

---

## Phase 1: Strict Application Cleanup (Do First)

### 1.1 Remove the Reflections / Pending Reflections Workflow
Students rarely log post-hackathon judge feedback, and "Pending Reflections" counters create dashboard guilt and clutter.

- **Frontend (`frontend/src/`):**
  - `pages/Dashboard.tsx`: Remove the `pendingReflections` state, `userApi.getPendingReflections()` fetch, the "Pending Reflections" KPI card, and the inline reflection submission panel.
  - `pages/Tracker.tsx`: Remove reflection prompts/badges tied to finished stages.
  - `pages/Teams.tsx`: Remove stage reflection prompts and reflection-specific UI noise (keep optional plain stage notes only if lightweight, or remove completely if unused).
  - `context/CacheContext.tsx`: Remove `pendingReflections` from `dashboardData` cache shape.
  - `services/index.ts` & `types/index.ts`: Deprecate/remove `getPendingReflections` and reflection-only UI types.
- **Backend (`backend/src/`):**
  - `modules/identity/controllers/user.controller.ts` & `user.routes.ts`: Deprecate or remove `GET /users/pending-reflections` once the frontend no longer calls it.
  - `modules/tracking/` (`stage.controller.ts`, `stage.service.ts`, `stage.routes.ts`): Remove reflection-specific endpoints/logic while leaving `modules/tracking/models/stage.model.ts` backward-compatible (do **not** drop existing fields in MongoDB so old documents remain readable).
  - `modules/team/services/teamHackathon.service.ts` & `team.routes.ts`: Clean up any reflection aggregation helpers.

### 1.2 Remove Redundant In-App Guide Modals (`TabGuideModal`)
If an app needs a 4-step manual modal on every tab, the UI is doing too much.

- **Frontend (`frontend/src/`):**
  - `components/Sidebar.tsx`: Remove the `(i)` User Guide button from both mobile and desktop headers, and remove the `TabGuideModal` import/state.
  - `components/TabGuideModal.tsx`: Delete the file once unreferenced.
  - Make each page's empty states and primary CTAs self-explanatory with concise 1-line subtitles.

### 1.3 Simplify `Dashboard.tsx` to an Action-First View
Most students enter 2–6 hackathons a year; showing "Win Rate %" and "Eliminated" counters feels empty or discouraging.

- **Keep & Prioritize:**
  1. **Upcoming Deadlines** (sorted by soonest cutoff: 24h / 3d / 7d).
  2. **Active Tracked Hackathons** (quick status & direct link to submit/open).
  3. **Incoming Team Invites** (accept/decline inline).
- **Remove:**
  - Pending Reflections card and inline form.
  - Heavy outcome/win-rate filter clutter that distracts from active deadlines.

### 1.4 Simplify `Tracker.tsx` & `Teams.tsx`
Students coordinate on WhatsApp/Discord and code on GitHub—they use HackDekh as a shared deadline & hackathon source of truth, not a full project-management suite.

- **Tracker (`pages/Tracker.tsx`):**
  - Keep the core states simple and intuitive (`In Queue / Saved` → `Registered / Active` → `Completed`).
  - Keep untracking effortless and safe.
- **Teams (`pages/Teams.tsx`):**
  - Keep team creation, 6-char invite codes, email/magic-link invites, and shared tracked hackathons.
  - Trim unnecessary multi-tab workspace bloat and duplicate filter controls where possible.

### 1.5 Align Landing Page (`Home.tsx`) & Story Animation
- `components/productStory/ProductStoryAnimation.tsx`: Remove `ReflectionScene.tsx` from the story sequence (and delete `scenes/ReflectionScene.tsx`).
- `pages/Home.tsx`:
  - Remove mentions of "Judge Reflections & Notes" and "institutional knowledge".
  - Deduplicate overlapping feature cards between Section 2 and Section 3 so every card communicates one distinct benefit: **Unified Feed**, **Smart Fit Check**, **Deadline Protection**, and **Squad Sync**.

### 1.6 Clean Up Unused Static Assets
- Remove unreferenced demo screenshots in `docs/screenshots/` (`dashboard.png`, `hackathon-listing.png`, `teams.png`, `track.png`) since `README.md` now points directly to the live deployment.

---

## Phase 2: Next Milestone — "Worth It to Participate?" (Smart Fit Engine)

Once Phase 1 is clean and verified, build the flagship convenience feature: a **1-click "Worth It?" fit analyzer** powered by a lightweight student context profile.

### 2.1 Student Context Profile (Zero-Friction Progressive Capture)
Instead of forcing users through a long Settings form upfront:
- **Trigger:** Clicking **"Worth It?"** on any hackathon card opens the Fit Verdict drawer. If the user hasn't set their context yet, show a fast **4-question inline setup** right inside the drawer, save it to their profile, and immediately render the verdict.
- **Editable Anytime:** Expose the same clean section in `Settings.tsx` under **Preferences / Profile**.
- **Fields to Store on `User` (`backend/src/modules/identity/models/user.model.ts`):**
  - `homeCity` (string, e.g., `"Bengaluru"`, `"Delhi"`)
  - `travelPreference`: `"online_only" | "same_city" | "anywhere_reimbursed" | "anywhere"`
  - `maxTravelBudgetINR` (number, optional)
  - `preferredTeamSize` (number, e.g., `2`–`4`)
  - `skills` (string array, e.g., `["React", "Node.js", "AI/ML"]`)
  - `preferredPlatforms` (optional string array)

### 2.2 Deterministic Fit Engine + Optional AI Layer
Keep the core verdict **instant, predictable, and free to run at scale**:
1. **Deterministic Rules (Primary):**
   - **Mode & Travel Fit:** Online vs. Offline city match against `homeCity` + `travelPreference` + `maxTravelBudgetINR`.
   - **Timeline Feasibility:** Days remaining until registration/submission deadline vs. event format.
   - **Team Size Fit:** Hackathon min/max team size (when available) vs. `preferredTeamSize`.
   - **ROI Signal:** Prize pool (already normalized to INR) vs. travel/time commitment.
2. **Optional AI Summary (Secondary, on-demand):**
   - Short 2–3 bullet pitch/track fit comparing the hackathon's description/themes against `skills`.
   - Strictly state when data is missing (e.g., *"Travel reimbursement not specified on listing"*) instead of guessing.

### 2.3 Feed Fit Badges & Verdict Breakdown
- Show a subtle, scannable badge on `HackathonCard` once profile preferences exist (`Strong Fit`, `Travel Required`, `Closes Soon`).
- Clicking **"Worth It?"** opens a crisp breakdown: **Verdict (`Go for it` / `Consider` / `Skip`)**, **Why (3–4 bullet reasons)**, and **1-click Track to Team**.

---

## Phase 3: Effortless Growth & Monetization Readiness

1. **Shareable Hackathon Verdict Links:** Clean OpenGraph metadata on `/hackathons/:slug` (Title, INR Prize, Deadline, Mode) so sharing in WhatsApp/Discord brings teammates directly into HackDekh.
2. **Weekly Digest Export:** 1-click "Copy This Week's Top Hackathons" text formatter for college clubs and Discord moderators.
3. **Sponsored / Featured Slot (B2B):** Reserve a single, clearly labeled `featured` flag on the hackathon catalog model for organizer-sponsored listings—keeping the core student experience 100% free.

---

## Non-Breaking Verification Checklist (Run After Every Phase)

- [ ] **Frontend:** `cd frontend && npm test && npm run build` passes with 0 TypeScript or Vite errors.
- [ ] **Backend:** `cd backend && npm run build` (`tsc`) and `npm test` pass cleanly.
- [ ] **API Compatibility:** Existing `/hackathons`, `/users`, `/teams`, and `/tracker` routes work with existing MongoDB documents without requiring destructive migrations.
- [ ] **Manual Smoke Check:** Guest landing → Browse Hackathons → Login → Dashboard → Teams → Tracker → Settings (Light/Dark + Profile).
