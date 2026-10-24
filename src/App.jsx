import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import DiscoveryView from "./components/DiscoveryView";
import MatchesView from "./components/MatchesView";
import GroupsView from "./components/GroupsView";
import SessionsView from "./components/SessionsView";
import AiAssistantView from "./components/AiAssistantView";
import IntegrationsView from "./components/IntegrationsView";
import SettingsView from "./components/SettingsView";
import DatabaseInspectorView from "./components/DatabaseInspectorView";
import LoginPage from "./components/LoginPage";
import { Menu } from "lucide-react";

import {
  fetchAuthMe,
  logoutUser,
  fetchCurrentUser,
  updateCurrentUser,
  fetchDiscoveryCandidates,
  submitSwipe,
  fetchMatches,
  removeMatch,
  fetchGroups,
  createGroup,
  voteOnPoll,
  fetchSessions,
  createSession,
  cancelSession,
  fetchIntegrations,
  toggleIntegration,
  resetSwipes
} from "./services/api";

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    if (view === "schedule" || view === "sessions") return "sessions";
    if (view === "workspace") return "workspace";
    if (view === "matches") return "matches";
    if (view === "groups") return "groups";
    return "discover";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // Authoritative State from backend
  const [user, setUser] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [matches, setMatches] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [integrations, setIntegrations] = useState(null);

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Initial Load from SQLite Backend
  const loadInitialData = useCallback(async (authedUser) => {
    setLoading(true);
    setApiError(null);
    try {
      const [cData, mData, gData, sData, iData] = await Promise.all([
        fetchDiscoveryCandidates(),
        fetchMatches(),
        fetchGroups(),
        fetchSessions(),
        fetchIntegrations(),
      ]);

      if (authedUser) {
        setUser(authedUser);
      }
      setCandidates(cData.candidates);
      setMatches(mData.matches);
      setGroups(gData.groups);
      setSessions(sData.sessions);
      setIntegrations(iData);
    } catch (err) {
      console.error("Failed to load StudyBuddy database:", err);
      setApiError("Backend database connection failed. Make sure the backend is running on port 5000.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Authentication check on mount or redirect
  const checkAuth = useCallback(async () => {
    setAuthChecking(true);
    const params = new URLSearchParams(window.location.search);
    const isAuthSuccess = params.get("auth") === "success";

    try {
      const data = await fetchAuthMe();
      if (data && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        if (isAuthSuccess) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        await loadInitialData(data.user);
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      setIsAuthenticated(false);
    } finally {
      setAuthChecking(false);
    }
  }, [loadInitialData]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Sign out handler
  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn("Logout notice:", err);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  // Handle Swipe (Like/Pass)
  const handleSwipe = async (swipedId, direction) => {
    const res = await submitSwipe(swipedId, direction);
    if (res.isMutualMatch && res.match) {
      setMatches((prev) => [res.match, ...prev]);
    }
    // Remove swiped candidate from current view
    setCandidates((prev) => prev.filter((c) => c.id !== swipedId));
  };

  // Handle Unmatch
  const handleRemoveMatch = async (matchId) => {
    await removeMatch(matchId);
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
  };

  // Handle Group Creation
  const handleCreateGroup = async (groupData) => {
    await createGroup(groupData);
    const gData = await fetchGroups();
    setGroups(gData.groups);
  };

  // Handle Poll Voting
  const handleVote = async (pollId, optId) => {
    await voteOnPoll(pollId, optId);
    const gData = await fetchGroups();
    setGroups(gData.groups);
  };

  // Handle Session Creation
  const handleCreateSession = async (sessionData) => {
    await createSession(sessionData);
    const sData = await fetchSessions();
    setSessions(sData.sessions);
  };

  // Handle Session Cancellation
  const handleCancelSession = async (sessionId) => {
    await cancelSession(sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  // Handle Reset Discovery Deck
  const handleResetDeck = async () => {
    await resetSwipes();
    const cData = await fetchDiscoveryCandidates();
    setCandidates(cData.candidates);
  };

  // Handle Profile Update
  const handleUpdateUser = async (formData) => {
    const res = await updateCurrentUser(formData);
    setUser(res.user);
    // Refresh candidates with new profile weights
    const cData = await fetchDiscoveryCandidates();
    setCandidates(cData.candidates);
  };

  // Handle Profile Photo Upload / Removal
  const handleAvatarChange = async (updatedUser) => {
    setUser(updatedUser);
    try {
      const cData = await fetchDiscoveryCandidates();
      setCandidates(cData.candidates);
    } catch (err) {
      console.warn("Could not refresh discovery candidates after photo update:", err);
    }
  };

  // Handle Integrations Toggle
  const handleToggleIntegration = async (service) => {
    await toggleIntegration(service);
    const iData = await fetchIntegrations();
    setIntegrations(iData);
  };

  // Splash loader during initial auth verification
  if (authChecking) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0F1729",
        color: "#E8EDF5",
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif"
      }}>
        <div style={{
          width: "44px",
          height: "44px",
          border: "3px solid rgba(79, 110, 247, 0.2)",
          borderTopColor: "#4F6EF7",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite"
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ marginTop: "1.25rem", fontSize: "0.95rem", color: "#94A3B8" }}>
          Connecting to StudyBuddy...
        </p>
      </div>
    );
  }

  // Single Auth Gate: If unauthenticated, show stunning Google OAuth LoginPage
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--surface)" }}>
      
      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 35 }}
        />
      )}

      {/* Fixed Vertical Left Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user}
        matchesCount={matches.length}
        sessionsCount={sessions.length}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowX: "hidden" }}>
        
        {/* Mobile Top Bar */}
        <div className="mobile-header" style={{ display: "none", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", borderBottom: "1px solid var(--border-subtle)", background: "#ffffff" }}>
          <button 
            onClick={() => setSidebarOpen(true)}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-primary)" }}
          >
            <Menu size={22} />
          </button>
          <span style={{ fontWeight: 800, fontFamily: "var(--font-headline)", color: "#0f172a" }}>
            Study<span style={{ color: "#2563eb" }}>Buddy</span>
          </span>
          <div style={{ width: "22px" }} />
        </div>

        {/* Global Error Banner if API down */}
        {apiError && (
          <div style={{ background: "#fef2f2", color: "#991b1b", padding: "0.75rem 1.5rem", borderBottom: "1px solid #fee2e2", fontSize: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{apiError}</span>
            <button 
              onClick={loadInitialData}
              style={{ background: "#dc2626", color: "#ffffff", border: "none", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "0.78rem" }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Dynamic Views */}
        <main style={{ flex: 1, paddingBottom: "3rem" }}>
          {activeTab === "discover" && (
            <DiscoveryView 
              candidates={candidates} 
              onSwipe={handleSwipe}
              onRefresh={loadInitialData}
              onResetDeck={handleResetDeck}
              loading={loading}
            />
          )}

          {activeTab === "matches" && (
            <MatchesView 
              matches={matches}
              onScheduleSession={() => setActiveTab("sessions")}
              onOpenAiModal={() => setActiveTab("ai-assistant")}
              onRemoveMatch={handleRemoveMatch}
              loading={loading}
            />
          )}

          {activeTab === "groups" && (
            <GroupsView 
              groups={groups} 
              onVote={handleVote}
              onCreateGroup={handleCreateGroup}
              onConfirmSessionSlot={async () => {
                const sData = await fetchSessions();
                setSessions(sData.sessions);
                setActiveTab("sessions");
              }}
              loading={loading}
            />
          )}

          {activeTab === "sessions" && (
            <SessionsView 
              sessions={sessions}
              onCreateSession={handleCreateSession}
              onCancelSession={handleCancelSession}
              loading={loading}
            />
          )}

          {activeTab === "ai-assistant" && (
            <AiAssistantView user={user} />
          )}

          {activeTab === "workspace" && (
            <IntegrationsView 
              integrations={integrations}
              onToggle={handleToggleIntegration}
              loading={loading}
            />
          )}

          {activeTab === "settings" && (
            <SettingsView 
              user={user}
              onUpdateUser={handleUpdateUser}
              onAvatarChange={handleAvatarChange}
            />
          )}

          {activeTab === "database" && (
            <DatabaseInspectorView />
          )}
        </main>
      </div>

    </div>
  );
}
