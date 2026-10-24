import { google } from "googleapis";
import { get, run } from "../database/db.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

// Scopes: openid, email, profile, calendar.events, drive.file
const SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.file"
];

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/v1/auth/google/callback";

  if (!clientId || !clientSecret || clientId.includes("your_google_client_id")) {
    return null;
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not configured in server/.env");
  }

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES
  });
}

export async function exchangeCodeForTokens(code, userId) {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    throw new Error("OAuth credentials not configured in server/.env");
  }

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Retrieve user email, name, avatar from Google Profile
  let profile = { email: null, name: null, avatar: null, id: null };
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    profile = {
      email: userInfo.data.email || null,
      name: userInfo.data.name || null,
      avatar: userInfo.data.picture || null,
      id: userInfo.data.id || null
    };
  } catch (err) {
    console.warn("Could not fetch Google user profile:", err.message);
  }

  // Upsert user profile into users table
  await run(`
    UPDATE users SET
      google_id = COALESCE(?, google_id),
      name = COALESCE(?, name),
      email = COALESCE(?, email),
      avatar = COALESCE(?, avatar)
    WHERE id = ?
  `, [profile.id, profile.name, profile.email, profile.avatar, userId]);

  await run(`
    INSERT INTO google_integrations (user_id, access_token, refresh_token, calendar_connected, drive_connected, google_email, updated_at)
    VALUES (?, ?, ?, 1, 1, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = COALESCE(excluded.refresh_token, google_integrations.refresh_token),
      calendar_connected = 1,
      drive_connected = 1,
      google_email = COALESCE(excluded.google_email, google_integrations.google_email),
      updated_at = CURRENT_TIMESTAMP
  `, [userId, tokens.access_token, tokens.refresh_token || null, profile.email]);

  return { tokens, email: profile.email, profile };
}

export async function getAuthenticatedCalendar(userId) {
  const integration = await get("SELECT * FROM google_integrations WHERE user_id = ?", [userId]);
  if (!integration || !integration.calendar_connected || (!integration.access_token && !integration.refresh_token)) {
    return null;
  }

  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    return null;
  }

  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token
  });

  oauth2Client.on("tokens", async (newTokens) => {
    if (newTokens.access_token) {
      await run(`
        UPDATE google_integrations 
        SET access_token = ?, 
            refresh_token = COALESCE(?, refresh_token),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [newTokens.access_token, newTokens.refresh_token || null, userId]);
    }
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function syncSessionToCalendar(session, userId) {
  try {
    const calendar = await getAuthenticatedCalendar(userId);
    if (!calendar) {
      await run(`
        UPDATE study_sessions SET
          sync_status = 'SAVED_LOCALLY',
          sync_error = 'Google Calendar is not connected. Authorize in Google Workspace Hub.',
          last_synced_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [session.id]);

      return {
        synced: false,
        status: "SAVED_LOCALLY",
        message: "Session preserved in SQLite database. Google Calendar is not authorized."
      };
    }

    let startIso = session.start_time;
    let endIso = session.end_time;

    // Build ISO timestamp if not explicitly present
    if (!startIso) {
      const now = new Date();
      now.setHours(now.getHours() + 24, 0, 0, 0);
      startIso = now.toISOString();
    }
    if (!endIso) {
      const endTime = new Date(new Date(startIso).getTime() + 90 * 60 * 1000);
      endIso = endTime.toISOString();
    }

    const eventResource = {
      summary: `StudyBuddy: ${session.title}`,
      description: `StudyBuddy Study Session\nAgenda: ${Array.isArray(session.agenda) ? session.agenda.join(", ") : session.agenda || "Peer study"}\nOrganized via StudyBuddy`,
      start: { dateTime: new Date(startIso).toISOString() },
      end: { dateTime: new Date(endIso).toISOString() },
      conferenceData: {
        createRequest: {
          requestId: `sb-${session.id}-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" }
        }
      }
    };

    let calendarEventId = session.calendar_event_id;
    let resultEvent;

    // Check if we should update an existing Google event or insert a new one
    const isRealGoogleId = calendarEventId && !calendarEventId.startsWith("cal_evt_");
    if (isRealGoogleId) {
      try {
        const patchRes = await calendar.events.patch({
          calendarId: "primary",
          eventId: calendarEventId,
          requestBody: eventResource,
          conferenceDataVersion: 1
        });
        resultEvent = patchRes.data;
      } catch (patchErr) {
        if (patchErr.code === 404 || patchErr.code === 410) {
          // Event no longer exists on Google; recreate
          const insertRes = await calendar.events.insert({
            calendarId: "primary",
            requestBody: eventResource,
            conferenceDataVersion: 1
          });
          resultEvent = insertRes.data;
        } else {
          throw patchErr;
        }
      }
    } else {
      const insertRes = await calendar.events.insert({
        calendarId: "primary",
        requestBody: eventResource,
        conferenceDataVersion: 1
      });
      resultEvent = insertRes.data;
    }

    const meetUrl = resultEvent.hangoutLink || resultEvent.conferenceData?.entryPoints?.[0]?.uri || session.meet_url || null;

    // Persist REAL Google Calendar details in SQLite
    await run(`
      UPDATE study_sessions SET
        calendar_event_id = ?,
        meet_url = COALESCE(?, meet_url),
        sync_status = 'SYNCED',
        sync_error = NULL,
        last_synced_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [resultEvent.id, meetUrl, session.id]);

    return {
      synced: true,
      status: "SYNCED",
      calendarEventId: resultEvent.id,
      meetUrl,
      htmlLink: resultEvent.htmlLink
    };
  } catch (err) {
    console.error("Google Calendar sync error:", err.message);

    const isAuthError = err.code === 401 || 
                        err.message?.includes("invalid_grant") || 
                        err.message?.includes("unauthorized") ||
                        err.message?.includes("Token has been expired or revoked");

    const status = isAuthError ? "REAUTH_REQUIRED" : "FAILED";
    const errorMessage = isAuthError 
      ? "Google authorization expired or was revoked. Reauthorization required."
      : (err.message || "Unknown synchronization error");

    if (isAuthError) {
      await run(`UPDATE google_integrations SET calendar_connected = 0 WHERE user_id = ?`, [userId]);
    }

    await run(`
      UPDATE study_sessions SET
        sync_status = ?,
        sync_error = ?,
        last_synced_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, errorMessage, session.id]);

    return {
      synced: false,
      status,
      error: errorMessage
    };
  }
}

export async function deleteCalendarEvent(calendarEventId, userId) {
  if (!calendarEventId || calendarEventId.startsWith("cal_evt_")) {
    return { deleted: false, reason: "Local event ID only" };
  }

  try {
    const calendar = await getAuthenticatedCalendar(userId);
    if (!calendar) return { deleted: false, reason: "Calendar disconnected" };

    await calendar.events.delete({
      calendarId: "primary",
      eventId: calendarEventId
    });

    return { deleted: true };
  } catch (err) {
    if (err.code === 404 || err.code === 410) {
      return { deleted: true, reason: "Already removed on Google Calendar" };
    }
    console.warn("Could not delete Google Calendar event:", err.message);
    return { deleted: false, error: err.message };
  }
}
