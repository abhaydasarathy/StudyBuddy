import { all } from "./src/database/db.js";

async function inspect() {
  try {
    const sessions = await all("SELECT id, title, calendar_event_id, meet_url, sync_status, sync_error, last_synced_at FROM study_sessions");
    console.log("=== SESSIONS ===");
    console.log(JSON.stringify(sessions, null, 2));

    const google = await all("SELECT * FROM google_integrations");
    console.log("=== GOOGLE INTEGRATIONS ===");
    console.log(JSON.stringify(google, null, 2));
  } catch (err) {
    console.error("Error inspecting:", err);
  } finally {
    process.exit(0);
  }
}

inspect();
