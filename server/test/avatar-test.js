import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_BASE = "http://localhost:5000/api/v1";

async function runAvatarTests() {
  console.log("=== STARTING STUDYBUDDY PROFILE PHOTO SYSTEM TESTS ===");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Initial State: Check user profile
    const meRes = await fetch(`${API_BASE}/users/me`);
    assert(meRes.status === 200, "GET /api/v1/users/me returns 200 OK");
    const meData = await meRes.json();
    assert(meData.user && meData.user.id === "user-me", "Current user is user-me");

    // 2. Test File Upload: Valid PNG
    // Create a temporary 1x1 valid PNG buffer
    const pngBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
    const form = new FormData();
    const blob = new Blob([pngBuffer], { type: "image/png" });
    form.append("avatar", blob, "test-avatar.png");

    const uploadRes = await fetch(`${API_BASE}/users/me/avatar`, {
      method: "POST",
      body: form
    });
    assert(uploadRes.status === 200, "POST /api/v1/users/me/avatar accepts valid PNG");
    const uploadData = await uploadRes.json();
    assert(uploadData.success === true, "Upload response returns success: true");
    assert(uploadData.avatar && uploadData.avatar.includes("/uploads/avatars/"), `Uploaded avatar URL is valid: ${uploadData.avatar}`);

    // Verify file actually exists on disk
    const filename = path.basename(uploadData.avatar);
    const diskPath = path.resolve(__dirname, "../uploads/avatars", filename);
    assert(fs.existsSync(diskPath), `Uploaded photo verified on disk: ${diskPath}`);

    // 3. Verify Persistence: Check user profile again
    const verifyRes = await fetch(`${API_BASE}/users/me`);
    const verifyData = await verifyRes.json();
    assert(verifyData.user.avatar === uploadData.avatar, "Uploaded photo persisted in database and returned in GET /users/me");

    // 4. Test Cross-User Discover Integrity:
    // Request Discovery feed as User B (student-1) via x-user-id header
    const discRes = await fetch(`${API_BASE}/discovery`, {
      headers: { "x-user-id": "student-1" }
    });
    assert(discRes.status === 200, "GET /api/v1/discovery as User B returns 200 OK");
    const discData = await discRes.json();
    
    // User B should see User A (user-me) in Discover feed with User A's real uploaded photo
    const userAInDiscover = discData.candidates.find((c) => c.id === "user-me");
    assert(userAInDiscover !== undefined, "User A (user-me) is present in User B's Discover feed");
    assert(userAInDiscover && userAInDiscover.avatar === uploadData.avatar, "User A's card in Discover displays their actual uploaded photo");

    // Discover candidates without photo must have avatar = null (for neutral initials avatar)
    const userWithoutPhoto = discData.candidates.find((c) => c.id !== "user-me");
    if (userWithoutPhoto) {
      assert(userWithoutPhoto.avatar === null || userWithoutPhoto.avatar === undefined || !userWithoutPhoto.avatar.includes("unsplash"), 
        `Candidate without custom photo does not have stock photo: avatar is ${userWithoutPhoto.avatar}`);
    }

    // 5. Authorization Check: User A cannot change User B's photo
    const unauthorizedForm = new FormData();
    unauthorizedForm.append("avatar", blob, "hack.png");
    const unauthRes = await fetch(`${API_BASE}/users/student-1/avatar`, {
      method: "POST",
      headers: { "x-user-id": "user-me" },
      body: unauthorizedForm
    });
    assert(unauthRes.status === 403, "User A attempting to modify User B's photo returns 403 Forbidden");

    // 6. Validation: Invalid File Type (e.g. text/plain)
    const textForm = new FormData();
    const textBlob = new Blob(["not an image"], { type: "text/plain" });
    textForm.append("avatar", textBlob, "notes.txt");
    const invalidTypeRes = await fetch(`${API_BASE}/users/me/avatar`, {
      method: "POST",
      body: textForm
    });
    assert(invalidTypeRes.status === 400, "Uploading non-image file (.txt) returns 400 Bad Request");

    // 7. Validation: File Size > 5MB
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024); // 6 MB
    const bigForm = new FormData();
    const bigBlob = new Blob([bigBuffer], { type: "image/png" });
    bigForm.append("avatar", bigBlob, "huge.png");
    const bigRes = await fetch(`${API_BASE}/users/me/avatar`, {
      method: "POST",
      body: bigForm
    });
    assert(bigRes.status === 400, "Uploading file > 5MB returns 400 Bad Request (file size limit)");

    // 8. Test Photo Removal
    const deleteRes = await fetch(`${API_BASE}/users/me/avatar`, {
      method: "DELETE"
    });
    assert(deleteRes.status === 200, "DELETE /api/v1/users/me/avatar returns 200 OK");
    const deleteData = await deleteRes.json();
    assert(deleteData.success === true, "Delete response returns success: true");
    assert(deleteData.user.avatar === null, "Deleted user avatar is null in response");

    // Verify old file unlinked from disk
    assert(!fs.existsSync(diskPath), "Old uploaded photo file successfully removed from disk");

    // Verify database state after deletion
    const afterDeleteRes = await fetch(`${API_BASE}/users/me`);
    const afterDeleteData = await afterDeleteRes.json();
    assert(afterDeleteData.user.avatar === null, "User avatar is null after deletion (reverts to initials avatar)");

    // Re-verify User B's Discover feed after User A removes photo:
    const discAfterDeleteRes = await fetch(`${API_BASE}/discovery`, {
      headers: { "x-user-id": "student-1" }
    });
    const discAfterDeleteData = await discAfterDeleteRes.json();
    const userAAfter = discAfterDeleteData.candidates.find((c) => c.id === "user-me");
    assert(userAAfter && userAAfter.avatar === null, "User A's card in Discover now has avatar = null (falls back to initials)");

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  }

  console.log(`\n=== AVATAR TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runAvatarTests();
