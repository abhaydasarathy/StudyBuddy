import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Video, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  ListChecks, 
  Plus, 
  Copy, 
  Users, 
  Trash2,
  Check,
  AlertTriangle,
  RefreshCw,
  X,
  CalendarCheck,
  CloudOff,
  KeyRound
} from "lucide-react";
import { retrySessionSync, fetchGoogleAuthUrl } from "../services/api";

export default function SessionsView({ sessions, onCreateSession, onCancelSession, loading }) {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  
  // Date and Time picker state
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(tomorrow);
  const [startTime, setStartTime] = useState("18:30");
  const [endTime, setEndTime] = useState("20:00");
  const [meetUrl, setMeetUrl] = useState("");
  const [customAgenda, setCustomAgenda] = useState("Concept Review, Practice Problems, Midterm Prep");

  // Interaction feedback states
  const [copiedId, setCopiedId] = useState(null);
  const [confirmCancelSess, setConfirmCancelSess] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_oauth") === "success") {
      setFeedback({
        type: "success",
        message: "Google Calendar connected and authorized successfully! Sessions will now sync automatically."
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => setFeedback(null), 5000);
    } else if (params.get("google_oauth") === "error") {
      setFeedback({
        type: "error",
        message: "Google Calendar authorization error: " + (params.get("msg") || "Access was not granted.")
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => setFeedback(null), 6000);
    }
  }, []);

  const handleAuthorizeGoogle = async () => {
    try {
      const data = await fetchGoogleAuthUrl();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setFeedback({ type: "error", message: "Failed to initialize Google OAuth: " + err.message });
    }
  };

  // Copy to clipboard with animation
  const copyMeetLink = async (sessId, url) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback
        const textArea = document.createElement("textarea");
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedId(sessId);
      setTimeout(() => {
        setCopiedId(null);
      }, 2500);
    } catch (err) {
      setFeedback({ type: "error", message: "Failed to copy Meet URL: " + err.message });
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !selectedDate || !startTime || !endTime) return;

    // Validate times
    const startIso = new Date(`${selectedDate}T${startTime}:00`).toISOString();
    const endIso = new Date(`${selectedDate}T${endTime}:00`).toISOString();

    if (new Date(endIso) <= new Date(startIso)) {
      alert("Session end time must be after start time.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (selectedDate < todayStr) {
      alert("Session date cannot be in the past.");
      return;
    }

    setSubmitting(true);
    try {
      const agendaArray = customAgenda
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      await onCreateSession({
        title: title.trim(),
        start_time: startIso,
        end_time: endIso,
        meet_url: meetUrl.trim() || "https://meet.google.com/new",
        agenda: agendaArray.length > 0 ? agendaArray : ["Concept Review", "Practice Problems"]
      });

      setIsCreating(false);
      setTitle("");
      setMeetUrl("");
      setFeedback({
        type: "success",
        message: "Study session scheduled and stored in SQLite database."
      });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      setFeedback({ type: "error", message: "Failed to schedule session: " + err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirmCancelSess) return;
    try {
      await onCancelSession(confirmCancelSess.id);
      setFeedback({
        type: "success",
        message: `Cancelled session "${confirmCancelSess.title}". Synchronized with Google Calendar.`
      });
      setConfirmCancelSess(null);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      setFeedback({ type: "error", message: "Failed to cancel session: " + err.message });
    }
  };

  const handleRetrySync = async (sessId) => {
    setRetryingId(sessId);
    try {
      const res = await retrySessionSync(sessId);
      if (res.success) {
        setFeedback({ type: "success", message: "Google Calendar event synchronized successfully!" });
      } else {
        setFeedback({ type: "error", message: "Sync failed: " + (res.syncResult?.error || "Check Google Workspace connection") });
      }
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({ type: "error", message: "Sync retry error: " + err.message });
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div style={{ maxWidth: "1150px", margin: "1.5rem auto", padding: "0 1.5rem" }}>
      
      {/* Toast Feedback Banner */}
      {feedback && (
        <div 
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.85rem 1.25rem",
            borderRadius: "0.75rem",
            marginBottom: "1.25rem",
            backgroundColor: feedback.type === "success" ? "#ecfdf5" : "#fef2f2",
            border: feedback.type === "success" ? "1px solid #a7f3d0" : "1px solid #fecaca",
            color: feedback.type === "success" ? "#065f46" : "#991b1b",
            fontSize: "0.88rem",
            fontWeight: 500,
            boxShadow: "var(--shadow-sm)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {feedback.type === "success" ? (
              <CheckCircle2 size={18} color="#059669" />
            ) : (
              <AlertTriangle size={18} color="#dc2626" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button 
            onClick={() => setFeedback(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: "2px" }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            Schedule & Google Meet Hub
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Confirmed study sessions with Google Calendar synchronization and Google Meet conference links.
          </p>
        </div>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
            boxShadow: "var(--glow-sapphire)"
          }}
        >
          <Plus size={16} />
          <span>{isCreating ? "Cancel" : "New Study Session"}</span>
        </button>
      </div>

      {/* Session Creation Modal Form with Native Date Picker */}
      {isCreating && (
        <form onSubmit={handleCreate} className="card-elevated" style={{ padding: "1.5rem", borderRadius: "1rem", marginBottom: "1.5rem", background: "#f8fafc", border: "1px solid #bfdbfe" }}>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "0.75rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
            <CalendarCheck size={18} color="#2563eb" />
            <span>Schedule a New Study Session</span>
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1rem", marginBottom: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                Session Title / Topic
              </label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g. 21CSC201J B+ Tree & Indexing Practice" 
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff" }}
                required 
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                Calendar Date
              </label>
              <input 
                type="date" 
                min={new Date().toISOString().split("T")[0]}
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: 500 }}
                required 
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                Start Time
              </label>
              <input 
                type="time" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)} 
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: 500 }}
                required 
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                End Time
              </label>
              <input 
                type="time" 
                value={endTime} 
                onChange={(e) => setEndTime(e.target.value)} 
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: 500 }}
                required 
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                Google Meet Link (or leave blank to auto-create)
              </label>
              <input 
                type="url" 
                value={meetUrl} 
                onChange={(e) => setMeetUrl(e.target.value)} 
                placeholder="https://meet.google.com/xyz-stud-bdy" 
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
              Agenda Topics (Comma-separated)
            </label>
            <input 
              type="text" 
              value={customAgenda} 
              onChange={(e) => setCustomAgenda(e.target.value)} 
              placeholder="e.g. Concept Review, Practice Problem Solving, Code Walkthrough" 
              style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff" }}
            />
          </div>

          <button 
            type="submit"
            disabled={submitting}
            style={{ 
              padding: "0.6rem 1.4rem", 
              borderRadius: "6px", 
              background: "#2563eb", 
              color: "#ffffff", 
              border: "none", 
              fontWeight: 600, 
              cursor: submitting ? "not-allowed" : "pointer" 
            }}
          >
            {submitting ? "Saving & Syncing..." : "Confirm & Save Session"}
          </button>
        </form>
      )}

      {loading ? (
        <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-muted)" }}>
          Loading your study sessions...
        </div>
      ) : sessions.length === 0 ? (
        <div className="card-elevated" style={{ padding: "3rem", textAlign: "center", borderRadius: "1rem" }}>
          <Calendar size={36} color="#94a3b8" style={{ margin: "0 auto 1rem auto" }} />
          <h2 style={{ fontSize: "1.25rem", color: "#0f172a" }}>No sessions scheduled</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginTop: "0.5rem" }}>
            Create your first session above or confirm a consensus slot from <strong>Study Squads</strong>.
          </p>
        </div>
      ) : (
        /* Sessions Grid */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(500px, 1fr))", gap: "1.5rem" }}>
          {sessions.map((sess) => {
            const isCopied = copiedId === sess.id;
            const isRetrying = retryingId === sess.id;
            const status = sess.sync_status || "SAVED_LOCALLY";
            const isSynced = status === "SYNCED";
            const isFailed = status === "FAILED";
            const isPending = status === "SYNC_PENDING";
            const isReauth = status === "REAUTH_REQUIRED";
            const isSavedLocally = status === "SAVED_LOCALLY";

            return (
              <div key={sess.id} className="card-elevated" style={{ padding: "1.5rem", borderRadius: "1rem" }}>
                
                {/* Badge & Time Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "8px" }}>
                  
                  {/* Real Sync Status Badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    {isSynced && (
                      <span style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: "4px",
                        fontSize: "0.75rem", 
                        fontWeight: 700, 
                        color: "#059669", 
                        background: "#ecfdf5", 
                        padding: "3px 10px", 
                        borderRadius: "9999px",
                        border: "1px solid #a7f3d0"
                      }}>
                        <CheckCircle2 size={13} />
                        <span>Synced to Google Calendar</span>
                      </span>
                    )}

                    {isSavedLocally && (
                      <span style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: "4px",
                        fontSize: "0.75rem", 
                        fontWeight: 600, 
                        color: "#64748b", 
                        background: "#f1f5f9", 
                        padding: "3px 10px", 
                        borderRadius: "9999px",
                        border: "1px solid #cbd5e1"
                      }}>
                        <CloudOff size={13} />
                        <span>Saved locally — Calendar not connected</span>
                      </span>
                    )}

                    {isPending && (
                      <span style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: "4px",
                        fontSize: "0.75rem", 
                        fontWeight: 600, 
                        color: "#2563eb", 
                        background: "#eff6ff", 
                        padding: "3px 10px", 
                        borderRadius: "9999px",
                        border: "1px solid #bfdbfe"
                      }}>
                        <RefreshCw size={13} className="spin-animation" />
                        <span>Synchronization pending</span>
                      </span>
                    )}

                    {isFailed && (
                      <span style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: "4px",
                        fontSize: "0.75rem", 
                        fontWeight: 700, 
                        color: "#dc2626", 
                        background: "#fef2f2", 
                        padding: "3px 10px", 
                        borderRadius: "9999px",
                        border: "1px solid #fecaca"
                      }}>
                        <AlertTriangle size={13} />
                        <span>Synchronization failed</span>
                      </span>
                    )}

                    {isReauth && (
                      <span style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: "4px",
                        fontSize: "0.75rem", 
                        fontWeight: 700, 
                        color: "#b45309", 
                        background: "#fffbeb", 
                        padding: "3px 10px", 
                        borderRadius: "9999px",
                        border: "1px solid #fde68a"
                      }}>
                        <KeyRound size={13} />
                        <span>Reauthorization required</span>
                      </span>
                    )}

                    {/* Contextual Action Buttons */}
                    {(isFailed || isSavedLocally) && (
                      <button
                        onClick={() => handleRetrySync(sess.id)}
                        disabled={isRetrying}
                        style={{
                          fontSize: "0.72rem",
                          color: "#2563eb",
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: "4px",
                          padding: "2px 8px",
                          cursor: "pointer",
                          fontWeight: 600
                        }}
                      >
                        {isRetrying ? "Retrying..." : "Retry Sync"}
                      </button>
                    )}

                    {isSavedLocally && (
                      <button
                        onClick={handleAuthorizeGoogle}
                        style={{
                          fontSize: "0.72rem",
                          color: "#059669",
                          background: "#ecfdf5",
                          border: "1px solid #a7f3d0",
                          borderRadius: "4px",
                          padding: "2px 8px",
                          cursor: "pointer",
                          fontWeight: 600
                        }}
                      >
                        Connect Calendar
                      </button>
                    )}

                    {isReauth && (
                      <button
                        onClick={handleAuthorizeGoogle}
                        style={{
                          fontSize: "0.72rem",
                          color: "#ffffff",
                          background: "#d97706",
                          border: "none",
                          borderRadius: "4px",
                          padding: "2px 8px",
                          cursor: "pointer",
                          fontWeight: 600
                        }}
                      >
                        Reauthorize
                      </button>
                    )}
                  </div>

                  {/* Distinct Event ID / Local Session ID Rendering */}
                  <div style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>
                    {sess.calendar_event_id ? (
                      <span style={{ color: "#059669", fontWeight: 700, background: "#ecfdf5", padding: "2px 6px", borderRadius: "4px", border: "1px solid #a7f3d0" }}>
                        Google Event: {sess.calendar_event_id}
                      </span>
                    ) : (
                      <span style={{ color: "#64748b", background: "#f8fafc", padding: "2px 6px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                        Local ID: {sess.id}
                      </span>
                    )}
                  </div>
                </div>

                {/* Session Title */}
                <h2 style={{ fontSize: "1.25rem", color: "#0f172a", marginBottom: "0.35rem" }}>
                  {sess.title}
                </h2>
                <div style={{ fontSize: "0.82rem", color: "#2563eb", fontWeight: 600, marginBottom: "0.85rem" }}>
                  {sess.group_name ? `Cohort: ${sess.group_name}` : "1-on-1 Study Partner Sprint"}
                </div>

                {/* Time display */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.88rem", color: "#334155", marginBottom: "1rem", fontWeight: 500 }}>
                  <Clock size={16} color="#64748b" />
                  <span>{sess.time_display}</span>
                </div>

                {/* Sync error note if present */}
                {sess.sync_error && (
                  <div style={{ 
                    fontSize: "0.75rem", 
                    color: isReauth ? "#b45309" : "#dc2626", 
                    background: isReauth ? "#fffbeb" : "#fef2f2", 
                    padding: "0.5rem 0.75rem", 
                    borderRadius: "6px", 
                    border: isReauth ? "1px solid #fde68a" : "1px solid #fecaca",
                    marginBottom: "1rem" 
                  }}>
                    {sess.sync_error}
                  </div>
                )}

                {/* Agenda Box */}
                {(sess.agenda || []).length > 0 && (
                  <div style={{ background: "#f8fafc", padding: "0.85rem 1rem", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "1.25rem" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "5px" }}>
                      <ListChecks size={14} color="#2563eb" />
                      <span>Session Agenda</span>
                    </div>
                    <ul style={{ paddingLeft: "1.2rem", margin: 0, fontSize: "0.82rem", color: "#475569" }}>
                      {sess.agenda.map((item, idx) => (
                        <li key={idx} style={{ marginBottom: "2px" }}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Buttons: Join Meet, Copy link, Cancel */}
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.1fr auto", gap: "0.6rem" }}>
                  {sess.meet_url ? (
                    <a
                      href={sess.meet_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        color: "#ffffff",
                        padding: "0.7rem",
                        borderRadius: "0.5rem",
                        fontWeight: 600,
                        fontSize: "0.88rem",
                        textDecoration: "none",
                        boxShadow: "var(--glow-emerald)"
                      }}
                    >
                      <Video size={16} />
                      <span>Join Google Meet</span>
                      <ExternalLink size={13} />
                    </a>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        background: "#f1f5f9",
                        color: "#64748b",
                        padding: "0.7rem",
                        borderRadius: "0.5rem",
                        fontWeight: 500,
                        fontSize: "0.8rem",
                        border: "1px dashed #cbd5e1"
                      }}
                      title="Google Meet link will be generated when synced to Google Calendar"
                    >
                      <Video size={15} color="#94a3b8" />
                      <span>No Meet Link</span>
                    </div>
                  )}

                  {/* Copy Link Button with Animated Feedback */}
                  <button
                    onClick={() => sess.meet_url ? copyMeetLink(sess.id, sess.meet_url) : null}
                    disabled={!sess.meet_url}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px",
                      background: isCopied ? "#ecfdf5" : !sess.meet_url ? "#f8fafc" : "#ffffff",
                      border: isCopied ? "1px solid #a7f3d0" : "1px solid #e2e8f0",
                      color: isCopied ? "#059669" : !sess.meet_url ? "#94a3b8" : "#334155",
                      padding: "0.7rem",
                      borderRadius: "0.5rem",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: !sess.meet_url ? "not-allowed" : "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {isCopied ? (
                      <>
                        <Check size={14} color="#059669" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>{sess.meet_url ? "Copy Meet Link" : "No Link"}</span>
                      </>
                    )}
                  </button>

                  {/* Cancel Button */}
                  <button
                    onClick={() => setConfirmCancelSess(sess)}
                    title="Cancel Session"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0.7rem",
                      borderRadius: "0.5rem",
                      background: "#ffffff",
                      border: "1px solid #fee2e2",
                      color: "#dc2626",
                      cursor: "pointer"
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Accessible Confirmation Modal for Session Cancellation */}
      {confirmCancelSess && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem"
          }}
        >
          <div 
            className="card-elevated"
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "1rem",
              padding: "1.75rem",
              maxWidth: "460px",
              width: "100%",
              boxShadow: "var(--shadow-xl)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#fef2f2", border: "1px solid #fee2e2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertTriangle size={20} color="#dc2626" />
              </div>
              <div>
                <h3 style={{ fontSize: "1.15rem", color: "#0f172a", margin: 0 }}>
                  Cancel Study Session?
                </h3>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {confirmCancelSess.title}
                </span>
              </div>
            </div>

            <p style={{ fontSize: "0.88rem", color: "#475569", lineHeight: 1.5, marginBottom: "1.5rem" }}>
              Are you sure you want to cancel this session? If connected, this will remove the event from Google Calendar and delete the record in SQLite.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                onClick={() => setConfirmCancelSess(null)}
                style={{
                  padding: "0.55rem 1rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#334155",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                Keep Session
              </button>

              <button
                onClick={handleCancel}
                style={{
                  padding: "0.55rem 1.25rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "#dc2626",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Trash2 size={14} />
                <span>Yes, Cancel Session</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
