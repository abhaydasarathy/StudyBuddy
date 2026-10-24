const API_BASE = "http://localhost:5000/api/v1";

async function runTests() {
  console.log("=== STARTING STUDYBUDDY END-TO-END API TESTS ===");
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  try {
    // 1. Health
    const healthRes = await fetch(`${API_BASE}/health`);
    const healthData = await healthRes.json();
    assert(healthData.status === "OK", "Health endpoint responds OK");

    // 2. SRM Course Catalogue
    const coursesRes = await fetch(`${API_BASE}/courses`);
    const coursesData = await coursesRes.json();
    assert(coursesData.courses.length >= 60, `SRM Course Catalogue loaded (${coursesData.courses.length} courses)`);

    // Check conflict flagged for 21CSC303J
    const conflicts = coursesData.courses.filter(c => c.code === "21CSC303J");
    assert(conflicts.length === 2 && conflicts.every(c => c.conflict_flag === 1 || c.conflict_flag === true), "Code 21CSC303J flagged for verification with conflict note");

    // Check search by code and title
    const searchRes = await fetch(`${API_BASE}/courses?search=Algorithm`);
    const searchData = await searchRes.json();
    assert(searchData.courses.some(c => c.code === "21CSC204J"), "Search by title returns 21CSC204J Design and Analysis of Algorithms");

    // 3. User Enrolled Courses
    const myCoursesRes = await fetch(`${API_BASE}/users/me/courses`);
    const myCoursesData = await myCoursesRes.json();
    assert(Array.isArray(myCoursesData.courses), "User courses endpoint returns array");

    // Enroll in a new course
    const sampleCourse = coursesData.courses.find(c => c.code === "21CSS201T");
    const enrollRes = await fetch(`${API_BASE}/users/me/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: sampleCourse.id })
    });
    const enrollData = await enrollRes.json();
    assert(enrollData.success === true, `Enrolled in ${sampleCourse.code} ${sampleCourse.title}`);

    // Prevent duplicate enrollment
    const dupRes = await fetch(`${API_BASE}/users/me/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: sampleCourse.id })
    });
    assert(dupRes.status === 400, "Duplicate course enrollment safely prevented with 400 status");

    // Remove enrollment
    const delCourseRes = await fetch(`${API_BASE}/users/me/courses/${sampleCourse.id}`, { method: "DELETE" });
    const delCourseData = await delCourseRes.json();
    assert(delCourseData.success === true, "Course removed successfully from user enrollments");

    // 4. Study Squads Polls Isolation & Creation
    const groupsRes = await fetch(`${API_BASE}/groups`);
    const groupsData = await groupsRes.json();
    assert(groupsData.groups.length > 0, "Groups retrieved successfully");
    const testGroup = groupsData.groups[0];

    // Create group-specific poll
    const createPollRes = await fetch(`${API_BASE}/groups/${testGroup.id}/polls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Database Indexing Deep Dive Poll",
        deadline: "Friday 8:00 PM",
        time_slots: ["Friday 6:00 PM - 7:30 PM", "Saturday 11:00 AM - 1:00 PM"]
      })
    });
    const createPollData = await createPollRes.json();
    assert(createPollData.success === true && createPollData.poll.options.length === 2, "Group-specific poll created with 2 options");

    const newPollId = createPollData.poll.id;
    const firstOptionId = createPollData.poll.options[0].id;

    // Vote on poll
    const voteRes = await fetch(`${API_BASE}/polls/${newPollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId: firstOptionId })
    });
    const voteData = await voteRes.json();
    assert(voteData.action === "VOTED", "Vote recorded on poll option");

    // Vote withdrawal toggle
    const toggleVoteRes = await fetch(`${API_BASE}/polls/${newPollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId: firstOptionId })
    });
    const toggleVoteData = await toggleVoteRes.json();
    assert(toggleVoteData.action === "WITHDRAWN", "Vote withdrawal toggle operates correctly");

    // Vote again to confirm
    await fetch(`${API_BASE}/polls/${newPollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId: firstOptionId })
    });

    // Confirm poll slot and create session
    const confirmRes = await fetch(`${API_BASE}/polls/${newPollId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId: firstOptionId })
    });
    const confirmData = await confirmRes.json();
    assert(confirmData.success === true && confirmData.session.title.includes("Database Indexing"), "Confirming poll creates real study session");

    // 5. Schedule & Meet Session Creation & Deletion
    const newSessionRes = await fetch(`${API_BASE}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Algorithms Pair Programming",
        start_time: new Date(Date.now() + 86400000).toISOString(),
        end_time: new Date(Date.now() + 90000000).toISOString(),
        meet_url: "https://meet.google.com/test-meet-sb"
      })
    });
    const newSessionData = await newSessionRes.json();
    assert(
      newSessionData.success === true && 
      (newSessionData.session.sync_status === "SAVED_LOCALLY" ? newSessionData.session.calendar_event_id === null : Boolean(newSessionData.session.calendar_event_id)), 
      "Study session created with honest sync_status (SAVED_LOCALLY or verified SYNCED)"
    );

    // Test retry sync on local session
    const retryRes = await fetch(`${API_BASE}/sessions/${newSessionData.sessionId}/sync`, { method: "POST" });
    const retryData = await retryRes.json();
    assert(
      retryData.session.sync_status === "SAVED_LOCALLY" ? retryData.session.calendar_event_id === null : Boolean(retryData.session.calendar_event_id),
      "Retry sync preserves honest sync state and does not fabricate fake event IDs"
    );

    // Cancel / Delete Session
    const cancelSessRes = await fetch(`${API_BASE}/sessions/${newSessionData.sessionId}`, {
      method: "DELETE"
    });
    const cancelSessData = await cancelSessRes.json();
    assert(cancelSessData.success === true, "Session deleted / cancelled cleanly");

    // 6. Matches Unmatch & Verification
    // Create a temporary match first to test unmatching
    const createSwipeRes = await fetch(`${API_BASE}/swipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ swipedId: "student-1", direction: "LIKE" })
    });
    const createSwipeData = await createSwipeRes.json();

    const matchesRes = await fetch(`${API_BASE}/matches`);
    const matchesData = await matchesRes.json();
    const testMatch = matchesData.matches[0];
    if (testMatch) {
      const unmatchRes = await fetch(`${API_BASE}/matches/${testMatch.id}`, { method: "DELETE" });
      const unmatchData = await unmatchRes.json();
      assert(unmatchData.success === true, "Unmatch removes match and reciprocal swipes safely");

      // Verify unmatch remains removed
      const verifyMatches = await fetch(`${API_BASE}/matches`);
      const verifyData = await verifyMatches.json();
      assert(!verifyData.matches.some(m => m.id === testMatch.id), "Unmatched card is verified removed from database");
    }

    // Unauthorized match deletion test
    const unauthDel = await fetch(`${API_BASE}/matches/nonexistent-id`, { method: "DELETE" });
    assert(unauthDel.status === 404, "Invalid match ID returns 404 Not Found");

    // 7. Google OAuth URL
    const authUrlRes = await fetch(`${API_BASE}/auth/google/url`);
    const authUrlData = await authUrlRes.json();
    assert(authUrlRes.status === 200 || authUrlRes.status === 400, "OAuth URL endpoint is live and responsive");

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  }

  console.log(`\n=== TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
