import assert from "assert";
import { 
  getOAuth2Client, 
  getAuthUrl, 
  syncSessionToCalendar, 
  deleteCalendarEvent 
} from "../src/services/googleCalendar.js";
import { run, get, all } from "../src/database/db.js";

async function runCalendarSyncTests() {
  console.log("=== RUNNING GOOGLE CALENDAR SYNC LOGIC TESTS ===");

  // 1. Verify getOAuth2Client loads from server/.env
  const client = getOAuth2Client();
  assert(client !== null, "OAuth2 client initialized from server/.env");
  console.log("[PASS] OAuth2 client initialized successfully");

  // 2. Verify getAuthUrl generates valid Google OAuth consent URL with correct scopes
  const authUrl = getAuthUrl();
  assert(authUrl.startsWith("https://accounts.google.com/o/oauth2/v2/auth"), "Valid Google OAuth URL generated");
  assert(authUrl.includes("calendar.events"), "Auth URL contains calendar.events scope");
  assert(authUrl.includes("prompt=consent"), "Auth URL enforces prompt=consent for offline refresh tokens");
  console.log("[PASS] Auth URL correctly structured with offline consent and calendar scopes");

  // 3. Test sync when disconnected (using an unauthenticated user ID)
  const testSessId = `test-sess-${Date.now()}`;
  await run(`
    INSERT INTO study_sessions (id, title, organizer_id, time_display, sync_status)
    VALUES (?, 'Unit Test Session', 'unauthed-user', 'Monday 10:00 AM', 'SYNC_PENDING')
  `, [testSessId]);

  const localSess = await get("SELECT * FROM study_sessions WHERE id = ?", [testSessId]);
  const syncResult = await syncSessionToCalendar(localSess, "unauthed-user");

  assert(syncResult.synced === false, "Sync correctly returns false when not authorized");
  assert(syncResult.status === "SAVED_LOCALLY", "Status is honest SAVED_LOCALLY");
  
  const updatedSess = await get("SELECT * FROM study_sessions WHERE id = ?", [testSessId]);
  assert(updatedSess.calendar_event_id === null, "calendar_event_id remains NULL without fabrication");
  assert(updatedSess.sync_status === "SAVED_LOCALLY", "Database sync_status updated to SAVED_LOCALLY");
  console.log("[PASS] Disconnected session preserved locally with null calendar_event_id and SAVED_LOCALLY status");

  // 4. Test deleteCalendarEvent with null or local ID
  const delLocal = await deleteCalendarEvent(null, "unauthed-user");
  assert(delLocal.deleted === false, "Local event safely ignored without calling Google API");
  console.log("[PASS] deleteCalendarEvent safely avoids calling API for local-only events");

  // Cleanup test session
  await run("DELETE FROM study_sessions WHERE id = ?", [testSessId]);
  console.log("[PASS] Test cleanup completed");

  console.log("\n=== ALL GOOGLE CALENDAR SYNC TESTS PASSED ===");
  process.exit(0);
}

runCalendarSyncTests().catch((err) => {
  console.error("Calendar sync test failed:", err);
  process.exit(1);
});
