import { all } from "./src/database/db.js";

async function inspect() {
  try {
    const tables = await all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    console.log("=== SQLITE DATABASE AUDIT ===");
    for (const t of tables) {
      const rows = await all(`SELECT COUNT(*) as c FROM ${t.name}`);
      console.log(`Table: ${t.name} -> ${rows[0].c} records`);
    }
  } catch (err) {
    console.error("Error inspecting DB:", err);
  } finally {
    process.exit(0);
  }
}

inspect();
