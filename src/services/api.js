const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, "")}/api/v1`
  : "http://localhost:5000/api/v1";

export async function fetchCurrentUser() {
  const res = await fetch(`${API_BASE}/users/me`);
  if (!res.ok) throw new Error("Failed to load user profile");
  return res.json();
}

export async function updateCurrentUser(data) {
  const res = await fetch(`${API_BASE}/users/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
}

export async function uploadUserAvatar(file) {
  const formData = new FormData();
  formData.append("avatar", file);

  const res = await fetch(`${API_BASE}/users/me/avatar`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to upload profile photo");
  }
  return res.json();
}

export async function removeUserAvatar() {
  const res = await fetch(`${API_BASE}/users/me/avatar`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to remove profile photo");
  }
  return res.json();
}

export async function fetchDiscoveryCandidates() {
  const res = await fetch(`${API_BASE}/discovery`);
  if (!res.ok) throw new Error("Failed to load discovery students");
  return res.json();
}

export async function submitSwipe(swipedId, direction) {
  const res = await fetch(`${API_BASE}/swipes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ swipedId, direction }),
  });
  if (!res.ok) throw new Error("Failed to record swipe");
  return res.json();
}

export async function resetSwipes() {
  const res = await fetch(`${API_BASE}/swipes/reset`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to reset discovery deck");
  return res.json();
}

export async function cancelSession(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to cancel session");
  return res.json();
}

export async function fetchMatches() {
  const res = await fetch(`${API_BASE}/matches`);
  if (!res.ok) throw new Error("Failed to load matches");
  return res.json();
}

export async function removeMatch(matchId) {
  const res = await fetch(`${API_BASE}/matches/${matchId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to remove match");
  return res.json();
}

export async function fetchGroups() {
  const res = await fetch(`${API_BASE}/groups`);
  if (!res.ok) throw new Error("Failed to load study squads");
  return res.json();
}

export async function createGroup(groupData) {
  const res = await fetch(`${API_BASE}/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(groupData),
  });
  if (!res.ok) throw new Error("Failed to create study squad");
  return res.json();
}

export async function voteOnPoll(pollId, optionId) {
  const res = await fetch(`${API_BASE}/polls/${pollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionId }),
  });
  if (!res.ok) throw new Error("Failed to vote on poll");
  return res.json();
}

export async function fetchSessions() {
  const res = await fetch(`${API_BASE}/sessions`);
  if (!res.ok) throw new Error("Failed to load sessions");
  return res.json();
}

export async function createSession(sessionData) {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sessionData),
  });
  if (!res.ok) throw new Error("Failed to create session");
  return res.json();
}

export async function fetchIntegrations() {
  const res = await fetch(`${API_BASE}/integrations`);
  if (!res.ok) throw new Error("Failed to load integrations");
  return res.json();
}

export async function toggleIntegration(service) {
  const res = await fetch(`${API_BASE}/integrations/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ service }),
  });
  if (!res.ok) throw new Error("Failed to toggle integration");
  return res.json();
}

export async function queryAiCopilot(query, mode, courseContext) {
  const res = await fetch(`${API_BASE}/ai/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, mode, courseContext }),
  });
  if (!res.ok) throw new Error("Failed to query AI copilot");
  return res.json();
}

export async function fetchDatabaseOverview() {
  const res = await fetch(`${API_BASE}/dev/database/overview`);
  if (!res.ok) throw new Error("Failed to fetch database overview");
  return res.json();
}

export async function fetchTableData(tableName, page = 1, limit = 20) {
  const res = await fetch(`${API_BASE}/dev/database/table/${tableName}?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch table data for ${tableName}`);
  return res.json();
}

export async function fetchGroupPolls(groupId) {
  const res = await fetch(`${API_BASE}/groups/${groupId}/polls`);
  if (!res.ok) throw new Error("Failed to load group polls");
  return res.json();
}

export async function createGroupPoll(groupId, pollData) {
  const res = await fetch(`${API_BASE}/groups/${groupId}/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pollData),
  });
  if (!res.ok) throw new Error("Failed to create group poll");
  return res.json();
}

export async function confirmPollSlot(pollId, data) {
  const res = await fetch(`${API_BASE}/polls/${pollId}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to confirm poll slot");
  return res.json();
}

export async function retrySessionSync(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/sync`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to retry calendar synchronization");
  return res.json();
}

export async function fetchCourses(search = "", category = "") {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (category) params.append("category", category);
  const res = await fetch(`${API_BASE}/courses?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load SRM course catalogue");
  return res.json();
}

export async function fetchUserCourses() {
  const res = await fetch(`${API_BASE}/users/me/courses`);
  if (!res.ok) throw new Error("Failed to load enrolled courses");
  return res.json();
}

export async function enrollUserCourse(courseId) {
  const res = await fetch(`${API_BASE}/users/me/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to enroll in course");
  }
  return res.json();
}

export async function removeUserCourse(courseId) {
  const res = await fetch(`${API_BASE}/users/me/courses/${courseId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to remove course");
  return res.json();
}

export async function fetchGoogleAuthUrl() {
  const res = await fetch(`${API_BASE}/auth/google/url`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to generate Google OAuth URL");
  }
  return res.json();
}

export async function fetchAuthMe() {
  const res = await fetch(`${API_BASE}/auth/me`);
  if (!res.ok) {
    if (res.status === 401) {
      const err = new Error("Unauthorized");
      err.status = 401;
      throw err;
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to authenticate");
  }
  return res.json();
}

export async function logoutUser() {
  const res = await fetch(`${API_BASE}/auth/google/disconnect`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to sign out");
  return res.json();
}




