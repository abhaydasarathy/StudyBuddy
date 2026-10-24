# StudyBuddy — Academic Study Group & Partner Finder

StudyBuddy is a full-stack academic study group finder and peer synchronization platform built with **React 19, Vite, Node.js, Express, SQLite, and Google Workspace APIs**.

---

## Key Features

1. **Deterministic Discovery & Swipe Matching**:
   - Multi-factor compatibility scoring (40% shared courses, 30% availability, 20% learning methods, 10% university).
   - Real mutual match creation and instant confetti feedback.
   - Verified candidate deck reset for repeatable testing.

2. **Verified Mutual Matches Hub**:
   - Displays confirmed partners with synergy percentages and shared subject focus.
   - Google Chat Space links and 1-click session scheduler.
   - **Safe Unmatching Flow**: Accessible confirmation dialog, backend ownership verification, simultaneous match and reciprocal swipe cleanup in SQLite, and instant UI state reactivity.

3. **Study Squads & Availability Consensus Polls**:
   - Cohort workspaces with member rosters, linked Google Chat spaces, and shared Drive folders.
   - **Independent Group Polls**: Every squad maintains its own isolated availability polls.
   - **Vote Toggling**: One vote per student per option, supporting instant vote withdrawal and dynamic recommended slot calculation.
   - **Consensus Confirmation**: Confirming a poll slot auto-creates a session in SQLite and synchronizes with Google Calendar.

4. **Schedule & Google Meet Hub**:
   - **Interactive Calendar & Time Picker**: Native HTML5 date & time pickers with validation against past dates and invalid ranges.
   - **Real Google Meet Conference Links**: Generates and copies Meet URLs with animated "Copied!" feedback and clipboard error handling.
   - **Session Cancellation**: Modal confirmation with automatic Google Calendar event deletion and SQLite removal.
   - **Honest Sync Badges**: Displays `SYNCED`, `NOT_SYNCED` (when disconnected), and `FAILED` with 1-click retry.

5. **Normalized SRM Course Catalogue**:
   - Normalized `courses` (63 foundational, elective, intermediate, and advanced courses) and `user_courses` tables.
   - Versioned seed source: `server/src/data/srm-course-catalogue.json`.
   - **Conflict Management**: Flagged ambiguous codes `21CSC303J` (Data Science vs Software Engineering) and `21LEM302L` for verification without discarding data.
   - Searchable, accessible combobox dropdown in Settings for instant enrollment and dynamic synergy recalculation.

6. **Developer Database Inspector**:
   - Built-in live browser for all 12 SQLite tables with row counts, schema definitions, and paginated record inspection.

---

## Architecture & Technology Stack

- **Frontend**: React 19, Vite 8, Lucide React icons, Vanilla CSS tokens.
- **Backend**: Node.js v24, Express 4.21, REST API convention (`/api/v1/...`).
- **Database**: SQLite 3 via `sqlite3` driver v5.1.7 (`server/studybuddy.sqlite`).
- **Integrations**: `googleapis` v144.0.0 (Google Calendar API v3, Google OAuth 2.0).

---

## Getting Started

### 1. Install Dependencies
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd server
npm install
cd ..
```

### 2. Configure Environment (Optional for Real Google OAuth)
Copy `server/.env.example` to `server/.env`:
```env
PORT=5000
CLIENT_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/v1/auth/google/callback
```
*(If credentials are not configured, StudyBuddy operates seamlessly in local SQLite mode with honest disconnected status badges).*

### 3. Run Backend Server
```bash
cd server
npm run dev
```
Backend starts at `http://localhost:5000`. SQLite tables and the SRM Course Catalogue seed automatically.

### 4. Run Frontend Development Server
```bash
npm run dev
```
Frontend runs at `http://localhost:5173`.

### 5. Run Automated Tests
```bash
node server/test/api-test.js
```
Runs 19 end-to-end automated tests verifying course catalogue, match deletion, availability polls, and calendar sync handlers.

### 6. Build for Production
```bash
npm run build
```
Generates production bundle in `dist/` with 0 errors.

---

## Database Schema & Models
The application uses 12 SQLite tables:
- `users`: Student profile, university, availability, bio.
- `courses`: Canonical SRM course catalogue (63 records, conflict flags).
- `user_courses`: Student-course enrollments (`UNIQUE(user_id, course_id)`).
- `swipes`: Like and pass decisions (`UNIQUE(swiper_id, swiped_id)`).
- `matches`: Mutual match pairs and compatibility scores.
- `study_groups`: Study squad cohorts and shared resource links.
- `group_members`: Group rosters and membership roles (`LEAD`, `MEMBER`).
- `availability_polls`: Group-isolated polls (`group_id` foreign key).
- `poll_options`: Time slot options and recommendation flags.
- `poll_votes`: Individual votes (`UNIQUE(poll_option_id, user_id)`).
- `study_sessions`: Confirmed sessions, Google event IDs, sync statuses.
- `google_integrations`: OAuth tokens and service connection states.
