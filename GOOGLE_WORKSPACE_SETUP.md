# Google Workspace Setup & Architecture Guide for StudyBuddy

This document provides step-by-step guidance to set up the Google Cloud Project, OAuth 2.0 consent, credentials, and API connections for StudyBuddy.

---

## 1. Google Cloud Project Setup

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Click **Select a project** > **New Project**.
3. Name your project: `StudyBuddy`.
4. Click **Create** and ensure the project is selected.

---

## 2. Enabling Required Google Workspace APIs

Navigate to **APIs & Services** > **Library** and search for & enable:
- **Google Calendar API** (for scheduling sessions, attendee synchronization, Meet conferences)
- **Google Drive API** (for sharing study materials, syllabus links, group folders)
- **Google Chat API** (for study squad spaces and collaboration links)
- **Gmail API** (for session invitation dispatches, if enabled)

---

## 3. Configuring OAuth Consent Screen

1. In the Google Cloud Console, navigate to **APIs & Services** > **OAuth consent screen**.
2. **User Type**:
   - Choose **External** (unless testing solely inside an institutional Google Workspace domain).
3. **App Information**:
   - App name: `StudyBuddy`
   - User support email: Select your email.
   - Developer contact email: Enter your email.
4. **Test Users**:
   - In "Testing" mode, add the Gmail accounts of team members / testers as **Test Users**.
5. Save and continue.

---

## 4. Creating OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**.
2. Click **+ Create Credentials** > **OAuth client ID**.
3. **Application type**: `Web application`.
4. **Name**: `StudyBuddy Web Client`.
5. **Authorized JavaScript origins**:
   - `http://localhost:5173` (Vite Frontend)
   - `http://localhost:5000` (Backend)
6. **Authorized redirect URIs**:
   - `http://localhost:5000/api/v1/auth/google/callback`
7. Click **Create** and copy your **Client ID** and **Client Secret** into `server/.env`.

---

## 5. Least-Privilege OAuth Scopes & Strategy

StudyBuddy enforces **incremental authorization** (Identity first, services on demand):

| Phase | Purpose | Scopes |
|---|---|---|
| **Identity & Login** | Authentication | `openid`, `email`, `profile` |
| **Calendar & Meet** | Session Scheduling | `https://www.googleapis.com/auth/calendar.events` |
| **Google Drive** | Resource Sharing | `https://www.googleapis.com/auth/drive.file` |
| **Google Chat** | Study Squad Spaces | `https://www.googleapis.com/auth/chat.spaces` |
| **Gmail (Optional)**| Notifications | `https://www.googleapis.com/auth/gmail.send` |

---

## 6. Principle: Graceful Fallbacks & Honest Status
Even if a user does not connect Google Workspace, StudyBuddy's core features (student discovery, swipe matching, compatibility scoring, local study squad organization, and AI assistance) remain 100% operational with manual Meet/Doc link paste options. When disconnected, sessions are saved with `sync_status = 'NOT_SYNCED'` and never display simulated synchronization.

---

## 7. Synchronization Lifecycle & Retry Workflow
1. **Initiation**: When a user creates a study session or confirms a squad availability poll, the backend checks for valid OAuth tokens in `google_integrations`.
2. **Success Flow**:
   - Backend calls `calendar.events.insert` with conferenceData request.
   - Saves real `calendar_event_id` and Google Meet URL.
   - Marks `sync_status = 'SYNCED'` and records `last_synced_at`.
3. **Failure / Disconnected Flow**:
   - If unconfigured or disconnected, marks `sync_status = 'NOT_SYNCED'` with message.
   - If token expired or network fails, marks `sync_status = 'FAILED'` with error details.
   - The user can click **Retry Sync** on the session card or trigger `POST /api/v1/sessions/:id/sync`.
4. **Cancellation**:
   - Cancelling a session calls `DELETE /api/v1/sessions/:id`.
   - Backend deletes the event on Google Calendar using `calendar.events.delete`, then removes the record from SQLite.
