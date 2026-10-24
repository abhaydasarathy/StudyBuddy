import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { initDb, run, get, all } from "./database/db.js";
import { calculateCompatibility } from "./matching.js";
import { 
  getAuthUrl, 
  exchangeCodeForTokens, 
  syncSessionToCalendar, 
  deleteCalendarEvent 
} from "./services/googleCalendar.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads/avatars");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 5000;
const CURRENT_USER_ID = "user-me"; // Authenticated session user

// Session user resolver supporting test/cross-user requests
const getUserId = (req) => {
  return req.headers["x-user-id"] || req.query.as_user || CURRENT_USER_ID;
};

// Standardized user formatter
function formatUser(user) {
  if (!user) return null;
  const clone = { ...user };
  clone.preferred_methods = typeof clone.preferred_methods === "string" ? JSON.parse(clone.preferred_methods || "[]") : (clone.preferred_methods || []);
  clone.weekly_availability = typeof clone.weekly_availability === "string" ? JSON.parse(clone.weekly_availability || "[]") : (clone.weekly_availability || []);
  clone.courses = typeof clone.courses === "string" ? JSON.parse(clone.courses || "[]") : (clone.courses || []);
  if (clone.avatar && clone.avatar.startsWith("/uploads/")) {
    clone.avatar = `http://localhost:${PORT}${clone.avatar}`;
  }
  clone.avatar_url = clone.avatar || null;
  return clone;
}

// Multer storage engine for avatar photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const userId = getUserId(req);
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";
    cb(null, `avatar-${userId}-${Date.now()}${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const ext = path.extname(file.originalname || "").toLowerCase();
    const allowedExts = [".jpg", ".jpeg", ".png", ".webp"];
    if (allowedMimes.includes(file.mimetype.toLowerCase()) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Supported formats: JPG, JPEG, PNG, WebP"));
    }
  }
});

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());

// Serve uploaded profile photos statically
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

// Initialize SQLite Schema and Seeds
initDb().catch((err) => console.error("Database initialization failed:", err));

// ----------------------------------------------------
// Health Check
// ----------------------------------------------------
app.get("/api/v1/health", (req, res) => {
  res.json({ status: "OK", service: "StudyBuddy Core Backend", timestamp: new Date() });
});

// ----------------------------------------------------
// 1. Current Authenticated User & Profile
// ----------------------------------------------------
app.get("/api/v1/users/me", async (req, res) => {
  try {
    const userId = getUserId(req);
    const user = await get("SELECT * FROM users WHERE id = ?", [userId]);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/v1/users/me", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, university, department, degree, year, study_goals, preferred_methods, weekly_availability, courses, bio } = req.body;
    await run(`
      UPDATE users SET
        name = COALESCE(?, name),
        university = COALESCE(?, university),
        department = COALESCE(?, department),
        degree = COALESCE(?, degree),
        year = COALESCE(?, year),
        study_goals = COALESCE(?, study_goals),
        preferred_methods = COALESCE(?, preferred_methods),
        weekly_availability = COALESCE(?, weekly_availability),
        courses = COALESCE(?, courses),
        bio = COALESCE(?, bio)
      WHERE id = ?
    `, [
      name,
      university,
      department,
      degree,
      year,
      study_goals,
      preferred_methods ? JSON.stringify(preferred_methods) : null,
      weekly_availability ? JSON.stringify(weekly_availability) : null,
      courses ? JSON.stringify(courses) : null,
      bio,
      userId
    ]);

    const updated = await get("SELECT * FROM users WHERE id = ?", [userId]);
    res.json({ success: true, user: formatUser(updated) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Profile Photo Upload & Management (JPG, JPEG, PNG, WebP <= 5MB)
// ----------------------------------------------------
const handleAvatarUpload = [
  (req, res, next) => {
    const currentUserId = getUserId(req);
    const targetUserId = req.params.userId || "me";
    if (targetUserId !== "me" && targetUserId !== currentUserId) {
      return res.status(403).json({ error: "Forbidden: You cannot modify another user's profile photo" });
    }

    upload.single("avatar")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "File size exceeds 5MB limit. Please upload a smaller image." });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Check existing avatar to delete old uploaded file on disk
      const existing = await get("SELECT avatar FROM users WHERE id = ?", [userId]);
      if (existing && existing.avatar && existing.avatar.includes("/uploads/avatars/")) {
        const oldFilename = path.basename(existing.avatar);
        const oldPath = path.join(uploadsDir, oldFilename);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (_) {}
        }
      }

      const relativeUrl = `/uploads/avatars/${req.file.filename}`;
      const photoUrl = `http://localhost:${PORT}${relativeUrl}`;

      await run("UPDATE users SET avatar = ? WHERE id = ?", [relativeUrl, userId]);

      const updated = await get("SELECT * FROM users WHERE id = ?", [userId]);
      const formatted = formatUser(updated);

      res.json({
        success: true,
        avatar: formatted.avatar,
        avatar_url: formatted.avatar_url,
        user: formatted
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
];

const handleAvatarDelete = async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    const targetUserId = req.params.userId || "me";
    if (targetUserId !== "me" && targetUserId !== currentUserId) {
      return res.status(403).json({ error: "Forbidden: You cannot modify another user's profile photo" });
    }

    const userId = currentUserId;
    const existing = await get("SELECT avatar FROM users WHERE id = ?", [userId]);
    if (existing && existing.avatar && existing.avatar.includes("/uploads/avatars/")) {
      const oldFilename = path.basename(existing.avatar);
      const oldPath = path.join(uploadsDir, oldFilename);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (_) {}
      }
    }

    await run("UPDATE users SET avatar = NULL WHERE id = ?", [userId]);

    const updated = await get("SELECT * FROM users WHERE id = ?", [userId]);
    const formatted = formatUser(updated);

    res.json({
      success: true,
      message: "Profile photo removed",
      user: formatted
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

app.post("/api/v1/users/me/avatar", handleAvatarUpload);
app.post("/api/v1/users/:userId/avatar", handleAvatarUpload);

app.delete("/api/v1/users/me/avatar", handleAvatarDelete);
app.delete("/api/v1/users/:userId/avatar", handleAvatarDelete);

// ----------------------------------------------------
// 2. Discover Students with Real Compatibility Scoring
// ----------------------------------------------------
app.get("/api/v1/discovery", async (req, res) => {
  try {
    const userId = getUserId(req);
    const currentUser = await get("SELECT * FROM users WHERE id = ?", [userId]);
    if (!currentUser) return res.status(404).json({ error: "Current user not found" });

    // Exclude current user and students already swiped on
    const candidates = await all(`
      SELECT * FROM users 
      WHERE id != ? 
      AND id NOT IN (SELECT swiped_id FROM swipes WHERE swiper_id = ?)
    `, [userId, userId]);

    const formattedCurrentUser = formatUser(currentUser);

    const scoredCandidates = candidates.map((candidate) => {
      const formattedCandidate = formatUser(candidate);
      const compatibility = calculateCompatibility(formattedCurrentUser, formattedCandidate);

      return {
        ...formattedCandidate,
        compatibilityScore: compatibility.score,
        compatibilityReason: compatibility.explanation,
        synergyBreakdown: compatibility.breakdown
      };
    });

    // Rank by compatibility descending
    scoredCandidates.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    res.json({ candidates: scoredCandidates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 3. Swipes & Mutual Match Detection
// ----------------------------------------------------
app.post("/api/v1/swipes", async (req, res) => {
  try {
    const { swipedId, direction } = req.body;
    if (!swipedId || !["LIKE", "PASS"].includes(direction)) {
      return res.status(400).json({ error: "Invalid swipe payload" });
    }

    const swipeId = `swipe-${Date.now()}`;
    await run(`
      INSERT OR REPLACE INTO swipes (id, swiper_id, swiped_id, direction)
      VALUES (?, ?, ?, ?)
    `, [swipeId, CURRENT_USER_ID, swipedId, direction]);

    let isMutualMatch = false;
    let matchRecord = null;

    if (direction === "LIKE") {
      // Check if target user also liked the current user (or simulate acceptance for seeded demo candidates)
      const reciprocalSwipe = await get(`
        SELECT * FROM swipes WHERE swiper_id = ? AND swiped_id = ? AND direction = 'LIKE'
      `, [swipedId, CURRENT_USER_ID]);

      // Seeded students accept automatically to enable immediate test flow
      const shouldMatch = reciprocalSwipe || swipedId.startsWith("student-");

      if (shouldMatch) {
        isMutualMatch = true;
        const matchId = `match-${Date.now()}`;
        const userA = await get("SELECT * FROM users WHERE id = ?", [CURRENT_USER_ID]);
        const userB = await get("SELECT * FROM users WHERE id = ?", [swipedId]);
        const comp = calculateCompatibility(userA, userB);

        const coursesA = JSON.parse(userA.courses || "[]");
        const coursesB = JSON.parse(userB.courses || "[]");
        const shared = coursesA.find((c) => coursesB.includes(c)) || coursesA[0] || "General Focus";

        await run(`
          INSERT OR REPLACE INTO matches (id, user_a, user_b, compatibility_score, shared_subject, chat_space_url)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          matchId,
          CURRENT_USER_ID,
          swipedId,
          comp.score,
          shared,
          `https://chat.google.com/room/${encodeURIComponent(shared)}`
        ]);

        userB.courses = typeof userB.courses === "string" ? JSON.parse(userB.courses || "[]") : userB.courses;
        userB.preferred_methods = typeof userB.preferred_methods === "string" ? JSON.parse(userB.preferred_methods || "[]") : userB.preferred_methods;
        userB.weekly_availability = typeof userB.weekly_availability === "string" ? JSON.parse(userB.weekly_availability || "[]") : userB.weekly_availability;

        matchRecord = {
          id: matchId,
          partner: userB,
          compatibilityScore: comp.score,
          sharedSubject: shared,
          chatSpaceUrl: `https://chat.google.com/room/${encodeURIComponent(shared)}`
        };
      }
    }

    res.json({ success: true, direction, isMutualMatch, match: matchRecord });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset discovery swipes to allow testing re-discovery cleanly
app.post("/api/v1/swipes/reset", async (req, res) => {
  try {
    await run("DELETE FROM swipes WHERE swiper_id = ?", [CURRENT_USER_ID]);
    res.json({ success: true, message: "Discovery deck reset successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. Mutual Matches
// ----------------------------------------------------
app.get("/api/v1/matches", async (req, res) => {
  try {
    const rawMatches = await all(`
      SELECT m.*, u.id as partner_id, u.name as partner_name, u.avatar as partner_avatar, 
             u.university as partner_university, u.department as partner_department, u.year as partner_year,
             u.courses as partner_courses, u.preferred_methods as partner_methods, u.weekly_availability as partner_availability
      FROM matches m
      JOIN users u ON (m.user_a = ? AND m.user_b = u.id) OR (m.user_b = ? AND m.user_a = u.id)
      ORDER BY m.created_at DESC
    `, [CURRENT_USER_ID, CURRENT_USER_ID]);

    const formatted = rawMatches.map((m) => ({
      id: m.id,
      compatibilityScore: m.compatibility_score,
      sharedSubject: m.shared_subject,
      chatSpaceUrl: m.chat_space_url,
      partner: {
        id: m.partner_id,
        name: m.partner_name,
        avatar: m.partner_avatar,
        university: m.partner_university,
        department: m.partner_department,
        year: m.partner_year,
        courses: JSON.parse(m.partner_courses || "[]"),
        preferred_methods: JSON.parse(m.partner_methods || "[]"),
        weekly_availability: JSON.parse(m.partner_availability || "[]")
      }
    }));

    res.json({ matches: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/v1/matches/:id", async (req, res) => {
  try {
    const matchId = req.params.id;
    const match = await get("SELECT * FROM matches WHERE id = ?", [matchId]);
    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    if (match.user_a !== CURRENT_USER_ID && match.user_b !== CURRENT_USER_ID) {
      return res.status(403).json({ error: "Unauthorized: You can only remove your own matches" });
    }

    const partnerId = match.user_a === CURRENT_USER_ID ? match.user_b : match.user_a;

    // Delete mutual match record
    await run("DELETE FROM matches WHERE id = ?", [matchId]);

    // Clear mutual swipe records so referential integrity is clean
    await run(`
      DELETE FROM swipes 
      WHERE (swiper_id = ? AND swiped_id = ?) 
         OR (swiper_id = ? AND swiped_id = ?)
    `, [CURRENT_USER_ID, partnerId, partnerId, CURRENT_USER_ID]);

    res.json({ success: true, message: "Unmatched successfully", matchId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 5. Study Squads & Availability Polls
// ----------------------------------------------------
app.get("/api/v1/groups", async (req, res) => {
  try {
    const groups = await all("SELECT * FROM study_groups ORDER BY created_at DESC");

    for (const g of groups) {
      // Fetch members
      const members = await all(`
        SELECT u.id, u.name, u.avatar, gm.role
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = ?
      `, [g.id]);
      g.members = members;

      // Fetch active poll if any
      const poll = await get(
        "SELECT * FROM availability_polls WHERE group_id = ? AND status = 'OPEN' ORDER BY created_at DESC LIMIT 1",
        [g.id]
      );
      if (poll) {
        const options = await all("SELECT * FROM poll_options WHERE poll_id = ?", [poll.id]);
        for (const opt of options) {
          const votes = await all(`
            SELECT pv.user_id, u.name 
            FROM poll_votes pv 
            JOIN users u ON pv.user_id = u.id 
            WHERE pv.poll_option_id = ?
          `, [opt.id]);
          opt.voters = votes.map((v) => v.name);
          opt.votes_count = votes.length;
          opt.has_voted = votes.some((v) => v.user_id === CURRENT_USER_ID);
        }

        // Recommend highest-voted option
        const maxVotes = Math.max(0, ...options.map((o) => o.votes_count));
        options.forEach((o) => {
          o.is_recommended = maxVotes > 0 && o.votes_count === maxVotes;
        });

        poll.options = options;
        g.activePoll = poll;
      } else {
        g.activePoll = null;
      }
    }

    res.json({ groups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/v1/groups", async (req, res) => {
  try {
    const { name, subject, description } = req.body;
    if (!name || !subject) return res.status(400).json({ error: "Name and subject are required" });

    const groupId = `group-${Date.now()}`;
    await run(`
      INSERT INTO study_groups (id, name, subject, description, chat_space_url, drive_folder_url, creator_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [groupId, name.trim(), subject.trim(), description?.trim() || "", "https://chat.google.com", "https://drive.google.com", CURRENT_USER_ID]);

    await run(`
      INSERT INTO group_members (id, group_id, user_id, role)
      VALUES (?, ?, ?, 'LEAD')
    `, [`gm-${Date.now()}`, groupId, CURRENT_USER_ID]);

    res.json({ success: true, groupId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Group-specific availability polls list
app.get("/api/v1/groups/:groupId/polls", async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await get("SELECT * FROM study_groups WHERE id = ?", [groupId]);
    if (!group) return res.status(404).json({ error: "Study squad not found" });

    const polls = await all(
      "SELECT * FROM availability_polls WHERE group_id = ? ORDER BY created_at DESC",
      [groupId]
    );

    for (const poll of polls) {
      const options = await all("SELECT * FROM poll_options WHERE poll_id = ?", [poll.id]);
      for (const opt of options) {
        const votes = await all(`
          SELECT pv.user_id, u.name 
          FROM poll_votes pv 
          JOIN users u ON pv.user_id = u.id 
          WHERE pv.poll_option_id = ?
        `, [opt.id]);
        opt.voters = votes.map((v) => v.name);
        opt.votes_count = votes.length;
        opt.has_voted = votes.some((v) => v.user_id === CURRENT_USER_ID);
      }
      const maxVotes = Math.max(0, ...options.map((o) => o.votes_count));
      options.forEach((o) => {
        o.is_recommended = maxVotes > 0 && o.votes_count === maxVotes;
      });
      poll.options = options;
    }

    res.json({ polls });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new availability poll for a specific group
app.post("/api/v1/groups/:groupId/polls", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { title, deadline, time_slots } = req.body;

    if (!title || !time_slots || !Array.isArray(time_slots) || time_slots.length === 0) {
      return res.status(400).json({ error: "Poll title and at least one time slot are required" });
    }

    const group = await get("SELECT * FROM study_groups WHERE id = ?", [groupId]);
    if (!group) return res.status(404).json({ error: "Study squad not found" });

    const pollId = `poll-${Date.now()}`;
    await run(`
      INSERT INTO availability_polls (id, group_id, title, deadline, status)
      VALUES (?, ?, ?, ?, 'OPEN')
    `, [pollId, groupId, title.trim(), deadline?.trim() || "Closes in 24 hours"]);

    const createdOptions = [];
    for (let i = 0; i < time_slots.length; i++) {
      const slot = typeof time_slots[i] === "string" ? time_slots[i].trim() : time_slots[i].time_slot?.trim();
      if (!slot) continue;
      const optId = `opt-${Date.now()}-${i}`;
      await run(`
        INSERT INTO poll_options (id, poll_id, time_slot, is_recommended)
        VALUES (?, ?, ?, ?)
      `, [optId, pollId, slot, i === 0 ? 1 : 0]);
      createdOptions.push({ id: optId, time_slot: slot, votes_count: 0, voters: [], has_voted: false });
    }

    res.json({
      success: true,
      poll: {
        id: pollId,
        group_id: groupId,
        title: title.trim(),
        deadline: deadline?.trim() || "Closes in 24 hours",
        status: "OPEN",
        options: createdOptions
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vote or withdraw vote on a poll option (toggle)
app.post("/api/v1/polls/:pollId/vote", async (req, res) => {
  try {
    const { pollId } = req.params;
    const { optionId } = req.body;

    const poll = await get("SELECT * FROM availability_polls WHERE id = ?", [pollId]);
    if (!poll) return res.status(404).json({ error: "Poll not found" });
    if (poll.status !== "OPEN") return res.status(400).json({ error: "Poll is closed or confirmed" });

    const option = await get("SELECT * FROM poll_options WHERE id = ? AND poll_id = ?", [optionId, pollId]);
    if (!option) return res.status(404).json({ error: "Poll option not found" });

    const existingVote = await get(
      "SELECT * FROM poll_votes WHERE poll_option_id = ? AND user_id = ?",
      [optionId, CURRENT_USER_ID]
    );

    if (existingVote) {
      await run("DELETE FROM poll_votes WHERE id = ?", [existingVote.id]);
      return res.json({ success: true, action: "WITHDRAWN", message: "Vote withdrawn" });
    } else {
      await run(`
        INSERT INTO poll_votes (id, poll_option_id, user_id)
        VALUES (?, ?, ?)
      `, [`pv-${Date.now()}`, optionId, CURRENT_USER_ID]);
      return res.json({ success: true, action: "VOTED", message: "Vote recorded" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm poll slot and create real study session with Calendar sync
app.post("/api/v1/polls/:pollId/confirm", async (req, res) => {
  try {
    const { pollId } = req.params;
    const { optionId, title } = req.body;

    const poll = await get("SELECT * FROM availability_polls WHERE id = ?", [pollId]);
    if (!poll) return res.status(404).json({ error: "Poll not found" });

    const group = await get("SELECT * FROM study_groups WHERE id = ?", [poll.group_id]);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const option = await get("SELECT * FROM poll_options WHERE id = ? AND poll_id = ?", [optionId, pollId]);
    if (!option) return res.status(404).json({ error: "Poll option not found" });

    await run("UPDATE availability_polls SET status = 'CONFIRMED' WHERE id = ?", [pollId]);

    const sessId = `sess-${Date.now()}`;
    const sessTitle = title || `${group.name}: ${poll.title}`;

    await run(`
      INSERT INTO study_sessions (
        id, title, group_id, organizer_id, calendar_event_id, meet_url, 
        time_display, agenda, status, sync_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', 'SYNC_PENDING')
    `, [
      sessId,
      sessTitle,
      group.id,
      CURRENT_USER_ID,
      null, // Real Google event ID is stored only upon verified Google API response
      null, // Real Meet link is populated by Google Calendar if authorized
      option.time_slot,
      JSON.stringify(["Consensus sprint", "Peer problem solving", "Review session"])
    ]);

    const created = await get("SELECT * FROM study_sessions WHERE id = ?", [sessId]);
    created.agenda = JSON.parse(created.agenda || "[]");

    // Perform Google Calendar sync
    const syncResult = await syncSessionToCalendar(created, CURRENT_USER_ID);

    const refreshed = await get("SELECT * FROM study_sessions WHERE id = ?", [sessId]);
    refreshed.agenda = JSON.parse(refreshed.agenda || "[]");

    res.json({
      success: true,
      message: syncResult.synced
        ? "Consensus session created and synced to Google Calendar with Meet conference link."
        : "Consensus session saved locally in SQLite database. Connect Google Calendar to auto-sync events.",
      session: refreshed,
      syncResult
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6. Study Sessions (Google Calendar & Meet links)
// ----------------------------------------------------
app.get("/api/v1/sessions", async (req, res) => {
  try {
    const sessions = await all(`
      SELECT s.*, g.name as group_name 
      FROM study_sessions s
      LEFT JOIN study_groups g ON s.group_id = g.id
      ORDER BY s.created_at DESC
    `);

    sessions.forEach((s) => {
      s.agenda = JSON.parse(s.agenda || "[]");
    });

    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/v1/sessions", async (req, res) => {
  try {
    const { title, time_display, start_time, end_time, group_id, agenda, meet_url } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    let finalTimeDisplay = time_display;
    let finalStartTime = start_time || null;
    let finalEndTime = end_time || null;

    if (start_time && end_time) {
      const start = new Date(start_time);
      const end = new Date(end_time);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: "Invalid date/time format" });
      }
      if (end <= start) {
        return res.status(400).json({ error: "End time must be after start time" });
      }

      if (!finalTimeDisplay) {
        const dateStr = start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        const startStr = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        const endStr = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        finalTimeDisplay = `${dateStr}, ${startStr} - ${endStr}`;
      }
    }

    if (!finalTimeDisplay) {
      return res.status(400).json({ error: "Either date/time or time_display is required" });
    }

    const sessId = `sess-${Date.now()}`;
    await run(`
      INSERT INTO study_sessions (
        id, title, group_id, organizer_id, calendar_event_id, meet_url, 
        time_display, start_time, end_time, agenda, status, sync_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', 'SYNC_PENDING')
    `, [
      sessId,
      title.trim(),
      group_id || null,
      CURRENT_USER_ID,
      null, // Real Google event ID is stored only upon verified Google API response
      meet_url?.trim() || null, // Real Meet link or user URL (never fabricate https://meet.google.com/new)
      finalTimeDisplay,
      finalStartTime,
      finalEndTime,
      JSON.stringify(agenda || ["Concept review", "Practice problems"])
    ]);

    const created = await get("SELECT * FROM study_sessions WHERE id = ?", [sessId]);
    created.agenda = JSON.parse(created.agenda || "[]");

    // Perform Google Calendar sync if connected
    const syncResult = await syncSessionToCalendar(created, CURRENT_USER_ID);

    const refreshed = await get("SELECT * FROM study_sessions WHERE id = ?", [sessId]);
    refreshed.agenda = JSON.parse(refreshed.agenda || "[]");

    res.json({
      success: true,
      sessionId: sessId,
      session: refreshed,
      syncResult
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/v1/sessions/:id", async (req, res) => {
  try {
    const session = await get("SELECT * FROM study_sessions WHERE id = ?", [req.params.id]);
    if (!session) {
      return res.status(404).json({ error: "Study session not found" });
    }

    // Cancel on Google Calendar if event ID is present
    if (session.calendar_event_id) {
      await deleteCalendarEvent(session.calendar_event_id, CURRENT_USER_ID);
    }

    await run("DELETE FROM study_sessions WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "Session cancelled and synchronized" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Retry Google Calendar synchronization for a session
app.post("/api/v1/sessions/:id/sync", async (req, res) => {
  try {
    const session = await get("SELECT * FROM study_sessions WHERE id = ?", [req.params.id]);
    if (!session) return res.status(404).json({ error: "Session not found" });

    session.agenda = JSON.parse(session.agenda || "[]");
    const syncResult = await syncSessionToCalendar(session, CURRENT_USER_ID);

    const updated = await get("SELECT * FROM study_sessions WHERE id = ?", [req.params.id]);
    updated.agenda = JSON.parse(updated.agenda || "[]");

    res.json({ success: syncResult.synced, syncResult, session: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ----------------------------------------------------
// SRM Course Catalogue & Enrolments
// ----------------------------------------------------
app.get("/api/v1/courses", async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = "SELECT * FROM courses";
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push("(code LIKE ? OR title LIKE ?)");
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (category) {
      conditions.push("category = ?");
      params.push(category);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY code ASC";
    const courses = await all(query, params);
    res.json({ courses, total: courses.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/v1/users/me/courses", async (req, res) => {
  try {
    const courses = await all(`
      SELECT c.*, uc.created_at as enrolled_at
      FROM user_courses uc
      JOIN courses c ON uc.course_id = c.id
      WHERE uc.user_id = ?
      ORDER BY c.code ASC
    `, [CURRENT_USER_ID]);

    res.json({ courses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/v1/users/me/courses", async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ error: "Course ID is required" });

    const course = await get("SELECT * FROM courses WHERE id = ?", [courseId]);
    if (!course) return res.status(404).json({ error: "Course not found in SRM catalogue" });

    const existing = await get(
      "SELECT * FROM user_courses WHERE user_id = ? AND course_id = ?",
      [CURRENT_USER_ID, courseId]
    );
    if (existing) {
      return res.status(400).json({ error: "Already enrolled in this course" });
    }

    await run(`
      INSERT INTO user_courses (id, user_id, course_id)
      VALUES (?, ?, ?)
    `, [`uc-${Date.now()}`, CURRENT_USER_ID, courseId]);

    // Keep users.courses JSON in sync
    const allEnrolled = await all(`
      SELECT c.code, c.title FROM user_courses uc JOIN courses c ON uc.course_id = c.id WHERE uc.user_id = ?
    `, [CURRENT_USER_ID]);
    const labels = allEnrolled.map((c) => `${c.code}: ${c.title}`);
    await run("UPDATE users SET courses = ? WHERE id = ?", [JSON.stringify(labels), CURRENT_USER_ID]);

    res.json({ success: true, message: `Enrolled in ${course.code} - ${course.title}`, course });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/v1/users/me/courses/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;
    await run("DELETE FROM user_courses WHERE user_id = ? AND course_id = ?", [CURRENT_USER_ID, courseId]);

    // Keep users.courses JSON in sync
    const allEnrolled = await all(`
      SELECT c.code, c.title FROM user_courses uc JOIN courses c ON uc.course_id = c.id WHERE uc.user_id = ?
    `, [CURRENT_USER_ID]);
    const labels = allEnrolled.map((c) => `${c.code}: ${c.title}`);
    await run("UPDATE users SET courses = ? WHERE id = ?", [JSON.stringify(labels), CURRENT_USER_ID]);

    res.json({ success: true, message: "Course removed from student profile" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 7. Google Workspace Integrations & OAuth 2.0 Flow
// ----------------------------------------------------
app.get("/api/v1/auth/me", async (req, res) => {
  try {
    const integration = await get("SELECT * FROM google_integrations WHERE user_id = ?", [CURRENT_USER_ID]);
    if (!integration || (!integration.access_token && !integration.refresh_token)) {
      return res.status(401).json({ error: "Unauthorized. Google login required." });
    }

    const user = await get("SELECT * FROM users WHERE id = ?", [CURRENT_USER_ID]);
    if (!user) {
      return res.status(401).json({ error: "User profile not found." });
    }

    res.json({ user: formatUser(user), google_email: integration.google_email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/v1/auth/google/url", (req, res) => {
  try {
    const url = getAuthUrl();
    res.json({ url });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/v1/auth/google/callback", async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  try {
    const { code, error } = req.query;
    if (error) {
      console.error("Google OAuth callback returned error:", error);
      return res.redirect(`${clientUrl}/?auth=error&msg=${encodeURIComponent(error)}`);
    }
    if (!code) {
      return res.redirect(`${clientUrl}/?auth=error&msg=No+authorization+code+received`);
    }

    const { tokens, email, profile } = await exchangeCodeForTokens(code, CURRENT_USER_ID);
    console.log("Google OAuth tokens successfully exchanged for user:", CURRENT_USER_ID, email);

    // Redirect to frontend with auth success flag
    res.redirect(`${clientUrl}/?auth=success`);
  } catch (err) {
    console.error("Google OAuth token exchange error:", err.message);
    res.redirect(`${clientUrl}/?auth=error&msg=${encodeURIComponent(err.message)}`);
  }
});

app.post("/api/v1/auth/google/disconnect", async (req, res) => {
  try {
    await run(`
      UPDATE google_integrations 
      SET calendar_connected = 0, drive_connected = 0, chat_connected = 0, gmail_connected = 0,
          access_token = NULL, refresh_token = NULL, google_email = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [CURRENT_USER_ID]);

    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/v1/integrations", async (req, res) => {
  try {
    const integrations = await get("SELECT * FROM google_integrations WHERE user_id = ?", [CURRENT_USER_ID]);
    const isCalendarConnected = Boolean(integrations?.calendar_connected && (integrations?.access_token || integrations?.refresh_token));
    const isGoogleAccountConnected = Boolean(integrations?.access_token || integrations?.refresh_token);

    res.json({
      googleAccount: { 
        connected: isGoogleAccountConnected, 
        email: integrations?.google_email || (isGoogleAccountConnected ? "Connected Google Account" : null)
      },
      calendar: {
        connected: isCalendarConnected,
        scope: "https://www.googleapis.com/auth/calendar.events, https://www.googleapis.com/auth/calendar.readonly",
        status: isCalendarConnected ? "CONNECTED" : "DISCONNECTED",
        last_synced: integrations?.updated_at
      },
      drive: {
        connected: Boolean(integrations?.drive_connected),
        scope: "https://www.googleapis.com/auth/drive.file",
        status: integrations?.drive_connected ? "CONNECTED" : "DISCONNECTED"
      },
      chat: {
        connected: Boolean(integrations?.chat_connected),
        scope: "https://www.googleapis.com/auth/chat.spaces",
        status: integrations?.chat_connected ? "CONNECTED" : "DISCONNECTED"
      },
      gmail: {
        connected: Boolean(integrations?.gmail_connected),
        scope: "https://www.googleapis.com/auth/gmail.send",
        status: integrations?.gmail_connected ? "CONNECTED" : "DISCONNECTED"
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/v1/integrations/toggle", async (req, res) => {
  try {
    const { service } = req.body;
    const valid = ["calendar", "drive", "chat", "gmail"];
    if (!valid.includes(service)) return res.status(400).json({ error: "Invalid service" });

    const curr = await get("SELECT * FROM google_integrations WHERE user_id = ?", [CURRENT_USER_ID]);

    if (service === "calendar") {
      // If disconnecting calendar
      if (curr?.calendar_connected) {
        await run(`
          UPDATE google_integrations 
          SET calendar_connected = 0, access_token = NULL, refresh_token = NULL, google_email = NULL, updated_at = CURRENT_TIMESTAMP 
          WHERE user_id = ?
        `, [CURRENT_USER_ID]);
        return res.json({ success: true, service, connected: false });
      } else {
        // Toggling ON requires actual OAuth tokens; cannot be faked
        if (!curr?.access_token && !curr?.refresh_token) {
          return res.status(400).json({
            error: "Google Calendar requires OAuth authorization. Click 'Authorize with Google' to connect.",
            requireAuth: true
          });
        }
        await run(`UPDATE google_integrations SET calendar_connected = 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`, [CURRENT_USER_ID]);
        return res.json({ success: true, service, connected: true });
      }
    }

    const col = `${service}_connected`;
    const nextVal = curr && curr[col] ? 0 : 1;
    await run(`UPDATE google_integrations SET ${col} = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`, [nextVal, CURRENT_USER_ID]);
    res.json({ success: true, service, connected: Boolean(nextVal) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 8. AI Copilot Endpoint
// ----------------------------------------------------
app.post("/api/v1/ai/query", async (req, res) => {
  try {
    const { query, mode, courseContext } = req.body;
    if (!query) return res.status(400).json({ error: "Query is required" });

    let responseText = "";
    if (query.toLowerCase().includes("b+ tree") || query.toLowerCase().includes("b-tree")) {
      responseText = `### B+ Tree Structure & Tradeoffs
1. **Core Invariant**: All data items are stored exclusively at the leaf level, linked sequentially for high-performance range scans.
2. **Internal Nodes**: Maintain high fanout search keys to minimize disk I/O depth (height usually <= 4).
3. **Study Buddy Tip**: Practice block splits with your partner: when node capacity $M$ is exceeded, the median key is pushed up to the parent.`;
    } else if (query.toLowerCase().includes("acid") || query.toLowerCase().includes("transaction")) {
      responseText = `### ACID Properties & Concurrency
- **Atomicity & Durability**: Handled by Write-Ahead Logging (WAL) and recovery algorithms (ARIES).
- **Isolation**: Prevent Dirty Reads, Non-repeatable Reads, and Phantoms via Multi-Version Concurrency Control (MVCC) or Strict 2-Phase Locking (Strict 2PL).
- **Consistency**: Guaranteed through schema assertions, foreign keys, and application integrity invariants.`;
    } else {
      responseText = `### Study Sprint Plan for "${query}"
- **Module Breakdown**: Divide the topic into fundamental syntax, algorithm walkthroughs, and edge cases.
- **Sprint Duration**: 45-minute focused interval followed by a 10-minute peer review.
- **Recommended Session**: Coordinate with Elena or Marcus to test each other with practical coding prompts.`;
    }

    res.json({ success: true, text: responseText, mode, course: courseContext || "CS145" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 9. Developer-Only Database Inspector Endpoints
// ----------------------------------------------------
app.get("/api/v1/dev/database/overview", async (req, res) => {
  try {
    const tables = await all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const overview = [];

    for (const t of tables) {
      const countResult = await get(`SELECT COUNT(*) as count FROM ${t.name}`);
      const schemaInfo = await all(`PRAGMA table_info(${t.name})`);
      const foreignKeys = await all(`PRAGMA foreign_key_list(${t.name})`);

      overview.push({
        tableName: t.name,
        rowCount: countResult ? countResult.count : 0,
        columns: schemaInfo.map((col) => ({
          name: col.name,
          type: col.type,
          notnull: Boolean(col.notnull),
          pk: Boolean(col.pk),
          dflt_value: col.dflt_value
        })),
        foreignKeys: foreignKeys.map((fk) => ({
          table: fk.table,
          from: fk.from,
          to: fk.to
        }))
      });
    }

    res.json({
      databasePath: "server/studybuddy.sqlite",
      tablesCount: overview.length,
      tables: overview
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/v1/dev/database/table/:tableName", async (req, res) => {
  try {
    const { tableName } = req.params;
    // Validate table name to prevent SQL injection
    const validTables = await all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const exists = validTables.some((t) => t.name === tableName);
    if (!exists) {
      return res.status(404).json({ error: `Table '${tableName}' does not exist` });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const totalRowsRes = await get(`SELECT COUNT(*) as count FROM ${tableName}`);
    const totalRows = totalRowsRes ? totalRowsRes.count : 0;
    const rows = await all(`SELECT * FROM ${tableName} LIMIT ? OFFSET ?`, [limit, offset]);
    const schemaInfo = await all(`PRAGMA table_info(${tableName})`);

    res.json({
      tableName,
      page,
      limit,
      totalRows,
      totalPages: Math.ceil(totalRows / limit) || 1,
      columns: schemaInfo.map((c) => c.name),
      rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`StudyBuddy backend server running on http://localhost:${PORT}`);
});
