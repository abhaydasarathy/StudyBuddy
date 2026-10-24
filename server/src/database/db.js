import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, "../../studybuddy.sqlite");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Could not connect to SQLite database:", err.message);
  } else {
    console.log("Connected to StudyBuddy SQLite database at", dbPath);
  }
});

// Helper for promise-based db operations
export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const initDb = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      google_id TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      university TEXT NOT NULL,
      department TEXT NOT NULL,
      degree TEXT,
      year TEXT NOT NULL,
      study_goals TEXT,
      preferred_methods TEXT,     -- JSON array string
      weekly_availability TEXT,   -- JSON array string
      courses TEXT,               -- JSON array string
      bio TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS swipes (
      id TEXT PRIMARY KEY,
      swiper_id TEXT NOT NULL,
      swiped_id TEXT NOT NULL,
      direction TEXT CHECK(direction IN ('LIKE', 'PASS')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(swiper_id, swiped_id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      user_a TEXT NOT NULL,
      user_b TEXT NOT NULL,
      compatibility_score INTEGER NOT NULL,
      shared_subject TEXT,
      chat_space_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_a, user_b)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS study_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT,
      chat_space_url TEXT,
      drive_folder_url TEXT,
      creator_id TEXT NOT NULL,
      max_members INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'MEMBER',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(group_id, user_id),
      FOREIGN KEY (group_id) REFERENCES study_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS availability_polls (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      title TEXT NOT NULL,
      deadline TEXT,
      status TEXT DEFAULT 'OPEN',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES study_groups(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS poll_options (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      is_recommended BOOLEAN DEFAULT 0,
      FOREIGN KEY (poll_id) REFERENCES availability_polls(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS poll_votes (
      id TEXT PRIMARY KEY,
      poll_option_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(poll_option_id, user_id),
      FOREIGN KEY (poll_option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      group_id TEXT,
      match_id TEXT,
      organizer_id TEXT NOT NULL,
      calendar_event_id TEXT,
      meet_url TEXT,
      time_display TEXT NOT NULL,
      start_time DATETIME,
      end_time DATETIME,
      agenda TEXT,                -- JSON array string
      drive_notes_url TEXT,
      status TEXT DEFAULT 'SCHEDULED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS google_integrations (
      user_id TEXT PRIMARY KEY,
      access_token TEXT,
      refresh_token TEXT,
      calendar_connected BOOLEAN DEFAULT 0,
      drive_connected BOOLEAN DEFAULT 0,
      chat_connected BOOLEAN DEFAULT 0,
      gmail_connected BOOLEAN DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      department TEXT,
      conflict_flag BOOLEAN DEFAULT 0,
      conflict_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(code, title)
    )
  `);

  await run(`CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_courses_title ON courses(title)`);

  await run(`
    CREATE TABLE IF NOT EXISTS user_courses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, course_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )
  `);

  // Migrate study_sessions table columns if missing
  try {
    const sessionCols = await all("PRAGMA table_info(study_sessions)");
    const colNames = sessionCols.map((c) => c.name);
    if (!colNames.includes("sync_status")) {
      await run("ALTER TABLE study_sessions ADD COLUMN sync_status TEXT DEFAULT 'SAVED_LOCALLY'");
    }
    if (!colNames.includes("sync_error")) {
      await run("ALTER TABLE study_sessions ADD COLUMN sync_error TEXT");
    }
    if (!colNames.includes("last_synced_at")) {
      await run("ALTER TABLE study_sessions ADD COLUMN last_synced_at DATETIME");
    }

    const intCols = await all("PRAGMA table_info(google_integrations)");
    const intColNames = intCols.map((c) => c.name);
    if (!intColNames.includes("google_email")) {
      await run("ALTER TABLE google_integrations ADD COLUMN google_email TEXT");
    }

    // Ensure avatar column exists on users table
    const userCols = await all("PRAGMA table_info(users)");
    const userColNames = userCols.map((c) => c.name);
    if (!userColNames.includes("avatar")) {
      await run("ALTER TABLE users ADD COLUMN avatar TEXT");
    }

    // Clean up any legacy unsplash stock images so registered users without uploaded photos receive initials avatars
    await run("UPDATE users SET avatar = NULL WHERE avatar LIKE '%images.unsplash.com%'");

    // Clean up any legacy locally-fabricated event IDs
    await run(`
      UPDATE study_sessions 
      SET calendar_event_id = NULL,
          sync_status = 'SAVED_LOCALLY',
          meet_url = CASE 
            WHEN meet_url = 'https://meet.google.com/new' OR meet_url = 'https://meet.google.com' THEN NULL 
            ELSE meet_url 
          END
      WHERE (calendar_event_id LIKE 'cal_evt_%' OR sync_status = 'NOT_SYNCED')
    `);

    // Ensure calendar is marked disconnected if no tokens exist
    await run(`
      UPDATE google_integrations 
      SET calendar_connected = 0 
      WHERE access_token IS NULL AND refresh_token IS NULL
    `);
  } catch (mErr) {
    console.warn("Migration notice for study_sessions:", mErr.message);
  }

  // Idempotently seed SRM Course Catalogue
  await seedSrmCatalogue();

  // Explicit seed data only if users table is empty
  const existingUsers = await all("SELECT COUNT(*) as count FROM users");
  if (existingUsers[0]?.count === 0) {
    console.log("Seeding initial student profiles into SQLite...");

    // Seed primary user
    await run(`
      INSERT INTO users (id, email, name, avatar, university, department, degree, year, study_goals, preferred_methods, weekly_availability, courses, bio)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      "user-me",
      "alex.rivera@stanford.edu",
      "Alex Rivera",
      null,
      "Stanford University",
      "Computer Science",
      "B.S. Computer Science",
      "3rd Year",
      "Preparing for CS145 Database Systems Midterm & Algorithms Practice",
      JSON.stringify(["Pair Programming", "Flashcards", "Practice Exams"]),
      JSON.stringify(["Wednesday 6:00 PM - 9:00 PM", "Thursday 4:00 PM - 7:00 PM", "Saturday 10:00 AM - 2:00 PM"]),
      JSON.stringify(["CS145: Database Systems", "CS161: Algorithms"]),
      "CS Junior passionate about scalable storage engines and distributed algorithms. Looking for peers to study with."
    ]);

    // Seed Candidate 1: Elena
    await run(`
      INSERT INTO users (id, email, name, avatar, university, department, degree, year, study_goals, preferred_methods, weekly_availability, courses, bio)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      "student-1",
      "elena.rostova@stanford.edu",
      "Elena Rostova",
      null,
      "Stanford University",
      "Computer Science",
      "B.S. Computer Science",
      "3rd Year",
      "Master B+ Trees, ACID isolation levels, and score 90%+ on CS145 Midterm",
      JSON.stringify(["Whiteboarding", "Practice Problems", "Deep Concept Explanations"]),
      JSON.stringify(["Wednesday 6:30 PM - 9:00 PM", "Saturday 10:00 AM - 1:00 PM"]),
      JSON.stringify(["CS145: Database Systems", "CS161: Algorithms", "STATS116"]),
      "Passionate about distributed DBs & query optimization. Looking for a committed study partner to drill LeetCode SQL & B-Tree indexing."
    ]);

    // Seed Candidate 2: Marcus
    await run(`
      INSERT INTO users (id, email, name, avatar, university, department, degree, year, study_goals, preferred_methods, weekly_availability, courses, bio)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      "student-2",
      "marcus.vance@berkeley.edu",
      "Marcus Vance",
      null,
      "UC Berkeley",
      "EECS",
      "B.S. EECS",
      "Junior",
      "Crush distributed consensus (Raft/Paxos) and relational schema design",
      JSON.stringify(["Pomodoro 50/10", "Mock Interviews", "Flashcard Quizzing"]),
      JSON.stringify(["Thursday 4:00 PM - 7:00 PM", "Sunday 2:00 PM - 6:00 PM"]),
      JSON.stringify(["CS145: Database Systems", "CS162: Operating Systems"]),
      "EECS major building high-throughput systems. Seeking regular focus sessions with shared Google Meet accountability."
    ]);

    // Seed Candidate 3: Aisha
    await run(`
      INSERT INTO users (id, email, name, avatar, university, department, degree, year, study_goals, preferred_methods, weekly_availability, courses, bio)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      "student-3",
      "aisha.patel@stanford.edu",
      "Aisha Patel",
      null,
      "Stanford University",
      "Data Science & AI",
      "M.S. Data Science",
      "Master's 1st Year",
      "Co-author thorough summary notes on Drive and test each other weekly",
      JSON.stringify(["Shared Google Docs", "Flashcards", "Concept Teaching"]),
      JSON.stringify(["Wednesday 6:00 PM - 9:00 PM", "Saturday 11:00 AM - 3:00 PM"]),
      JSON.stringify(["CS145: Database Systems", "CS229: Machine Learning"]),
      "Math & CS background. I love breaking down complex graph algorithms and query cost estimators."
    ]);

    // Seed Study Squad
    await run(`
      INSERT INTO study_groups (id, name, subject, description, chat_space_url, drive_folder_url, creator_id, max_members)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      "group-1",
      "CS145 Midterm Masters",
      "CS145: Database Systems",
      "Intense collaborative sprint covering relational algebra, B+ Trees, concurrency transactions, and storage layouts.",
      "https://chat.google.com",
      "https://drive.google.com",
      "user-me",
      5
    ]);

    // Seed Members
    await run(`INSERT INTO group_members (id, group_id, user_id, role) VALUES ('gm-1', 'group-1', 'user-me', 'LEAD')`);
    await run(`INSERT INTO group_members (id, group_id, user_id, role) VALUES ('gm-2', 'group-1', 'student-1', 'MEMBER')`);
    await run(`INSERT INTO group_members (id, group_id, user_id, role) VALUES ('gm-3', 'group-1', 'student-2', 'MEMBER')`);

    // Seed Availability Poll
    await run(`
      INSERT INTO availability_polls (id, group_id, title, deadline, status)
      VALUES ('poll-1', 'group-1', 'Confirm Midterm Weekend Mock Exam Slot', 'Closes in 6 hours', 'OPEN')
    `);

    await run(`INSERT INTO poll_options (id, poll_id, time_slot, is_recommended) VALUES ('opt-1', 'poll-1', 'Saturday 10:00 AM - 12:30 PM', 1)`);
    await run(`INSERT INTO poll_options (id, poll_id, time_slot, is_recommended) VALUES ('opt-2', 'poll-1', 'Saturday 2:00 PM - 4:30 PM', 0)`);
    await run(`INSERT INTO poll_options (id, poll_id, time_slot, is_recommended) VALUES ('opt-3', 'poll-1', 'Sunday 4:00 PM - 6:30 PM', 0)`);

    await run(`INSERT INTO poll_votes (id, poll_option_id, user_id) VALUES ('pv-1', 'opt-1', 'student-1')`);
    await run(`INSERT INTO poll_votes (id, poll_option_id, user_id) VALUES ('pv-2', 'opt-1', 'user-me')`);
    await run(`INSERT INTO poll_votes (id, poll_option_id, user_id) VALUES ('pv-3', 'opt-2', 'student-2')`);

    // Seed Study Session (Saved locally until Google Calendar is connected)
    await run(`
      INSERT INTO study_sessions (id, title, group_id, organizer_id, calendar_event_id, meet_url, time_display, agenda, drive_notes_url, status, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      "sess-1",
      "CS145: B-Tree Indexing Deep Dive",
      "group-1",
      "user-me",
      null,
      null,
      "Tomorrow, 6:30 PM - 8:00 PM",
      JSON.stringify(["B-Tree vs Hash indexing tradeoffs", "Range scans & pointer traversal", "Practice quiz on disk block reads"]),
      null,
      "SCHEDULED",
      "SAVED_LOCALLY"
    ]);

    // Initial Google Integrations record
    await run(`
      INSERT INTO google_integrations (user_id, calendar_connected, drive_connected, chat_connected, gmail_connected)
      VALUES ('user-me', 0, 0, 0, 0)
    `);

    console.log("Database initialized & seeded successfully.");
  }
};

export const seedSrmCatalogue = async () => {
  try {
    const cataloguePath = path.resolve(__dirname, "../data/srm-course-catalogue.json");
    if (!fs.existsSync(cataloguePath)) {
      console.warn("SRM course catalogue JSON not found at", cataloguePath);
      return;
    }

    const rawData = fs.readFileSync(cataloguePath, "utf-8");
    const catalogue = JSON.parse(rawData);

    for (const item of catalogue) {
      const existing = await get(
        "SELECT id FROM courses WHERE code = ? AND title = ?",
        [item.code, item.title]
      );

      if (!existing) {
        const id = `course-${item.code.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Math.random().toString(36).substring(2, 7)}`;
        await run(`
          INSERT INTO courses (id, code, title, category, department, conflict_flag, conflict_note)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          id,
          item.code,
          item.title,
          item.category,
          item.department || "Engineering",
          item.conflict_flag ? 1 : 0,
          item.conflict_note || null
        ]);
      } else {
        // Update conflict flag or notes if they changed in the seed file
        await run(`
          UPDATE courses SET
            category = ?,
            department = ?,
            conflict_flag = ?,
            conflict_note = ?
          WHERE id = ?
        `, [
          item.category,
          item.department || "Engineering",
          item.conflict_flag ? 1 : 0,
          item.conflict_note || null,
          existing.id
        ]);
      }
    }

    // Connect user-me to foundational SRM courses if user_courses is empty for user-me
    const myCourses = await all("SELECT * FROM user_courses WHERE user_id = 'user-me'");
    if (myCourses.length === 0) {
      const defaultCourses = await all(
        "SELECT id, code, title FROM courses WHERE code IN ('21CSC201J', '21CSC302P', '21CSC204J')"
      );

      for (const dc of defaultCourses) {
        await run(`
          INSERT OR IGNORE INTO user_courses (id, user_id, course_id)
          VALUES (?, 'user-me', ?)
        `, [`uc-me-${dc.code.toLowerCase()}`, dc.id]);
      }

      // Keep user.courses JSON array aligned with canonical SRM course labels
      const enrolledLabels = defaultCourses.map((c) => `${c.code}: ${c.title}`);
      await run("UPDATE users SET courses = ? WHERE id = 'user-me'", [JSON.stringify(enrolledLabels)]);
    }

    // Also populate student-1, student-2, student-3 enrollments if empty
    const student1Courses = await all("SELECT * FROM user_courses WHERE user_id = 'student-1'");
    if (student1Courses.length === 0) {
      const s1Courses = await all("SELECT id, code, title FROM courses WHERE code IN ('21CSC201J', '21CSC302P', '21MAB204T')");
      for (const sc of s1Courses) {
        await run("INSERT OR IGNORE INTO user_courses (id, user_id, course_id) VALUES (?, 'student-1', ?)", [`uc-s1-${sc.code.toLowerCase()}`, sc.id]);
      }
      await run("UPDATE users SET courses = ? WHERE id = 'student-1'", [JSON.stringify(s1Courses.map(c => `${c.code}: ${c.title}`))]);
    }

    const student2Courses = await all("SELECT * FROM user_courses WHERE user_id = 'student-2'");
    if (student2Courses.length === 0) {
      const s2Courses = await all("SELECT id, code, title FROM courses WHERE code IN ('21CSC302P', '21CSC202J')");
      for (const sc of s2Courses) {
        await run("INSERT OR IGNORE INTO user_courses (id, user_id, course_id) VALUES (?, 'student-2', ?)", [`uc-s2-${sc.code.toLowerCase()}`, sc.id]);
      }
      await run("UPDATE users SET courses = ? WHERE id = 'student-2'", [JSON.stringify(s2Courses.map(c => `${c.code}: ${c.title}`))]);
    }

    const student3Courses = await all("SELECT * FROM user_courses WHERE user_id = 'student-3'");
    if (student3Courses.length === 0) {
      const s3Courses = await all("SELECT id, code, title FROM courses WHERE code IN ('21CSC302P', '21AIAC202J')");
      for (const sc of s3Courses) {
        await run("INSERT OR IGNORE INTO user_courses (id, user_id, course_id) VALUES (?, 'student-3', ?)", [`uc-s3-${sc.code.toLowerCase()}`, sc.id]);
      }
      await run("UPDATE users SET courses = ? WHERE id = 'student-3'", [JSON.stringify(s3Courses.map(c => `${c.code}: ${c.title}`))]);
    }

    console.log("SRM Course Catalogue verified and loaded into SQLite.");
  } catch (err) {
    console.error("Error seeding SRM Course Catalogue:", err.message);
  }
};

export default db;
