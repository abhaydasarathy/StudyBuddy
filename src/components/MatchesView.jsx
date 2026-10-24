import React, { useState } from "react";
import { 
  HeartHandshake, 
  MessageSquare, 
  Calendar, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X
} from "lucide-react";
import UserAvatar from "./UserAvatar";

export default function MatchesView({ matches, onScheduleSession, onOpenAiModal, onRemoveMatch, loading }) {
  const [confirmMatch, setConfirmMatch] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const handleConfirmDelete = async () => {
    if (!confirmMatch || deletingId) return;

    const matchId = confirmMatch.id;
    const partnerName = confirmMatch.partner?.name || "student";
    setDeletingId(matchId);

    try {
      await onRemoveMatch(matchId);
      setFeedback({
        type: "success",
        message: `Successfully unmatched with ${partnerName}. Records removed from SQLite.`
      });
      setConfirmMatch(null);
      setTimeout(() => {
        setFeedback(null);
      }, 3500);
    } catch (err) {
      setFeedback({
        type: "error",
        message: `Failed to unmatch: ${err.message}`
      });
    } finally {
      setDeletingId(null);
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

      {/* Page Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            Mutual Matches & Compatibility Hub
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Real mutual right swipes stored in SQLite. Coordinate in Google Chat or propose a study session.
          </p>
        </div>
        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#2563eb", background: "#eff6ff", padding: "4px 12px", borderRadius: "9999px", border: "1px solid #bfdbfe" }}>
          {matches.length} Verified {matches.length === 1 ? "Match" : "Matches"}
        </span>
      </div>

      {loading ? (
        <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-muted)" }}>
          Loading your verified matches...
        </div>
      ) : matches.length === 0 ? (
        <div className="card-elevated" style={{ padding: "3rem", textAlign: "center", borderRadius: "1rem" }}>
          <HeartHandshake size={36} color="#94a3b8" style={{ margin: "0 auto 1rem auto" }} />
          <h2 style={{ fontSize: "1.25rem", color: "#0f172a" }}>No mutual matches yet</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginTop: "0.5rem", maxWidth: "450px", margin: "0.5rem auto 1.5rem auto" }}>
            Visit the <strong>Discover</strong> deck and swipe right on students taking matching courses.
          </p>
        </div>
      ) : (
        /* Matches Grid */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(500px, 1fr))", gap: "1.5rem" }}>
          {matches.map((item) => {
            const { partner, compatibilityScore, sharedSubject, chatSpaceUrl } = item;
            const isDeletingThis = deletingId === item.id;

            return (
              <div 
                key={item.id} 
                className="card-elevated" 
                style={{ 
                  padding: "1.5rem", 
                  borderRadius: "1rem",
                  opacity: isDeletingThis ? 0.5 : 1,
                  transition: "opacity 0.2s ease"
                }}
              >
                
                {/* Header: Student Info + Score */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", gap: "0.85rem", alignItems: "center" }}>
                    <UserAvatar 
                      src={partner?.avatar} 
                      name={partner?.name}
                      size={52}
                      style={{ border: "2px solid #2563eb" }}
                    />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <h3 style={{ fontSize: "1.1rem", color: "#0f172a", margin: 0 }}>{partner?.name}</h3>
                        <ShieldCheck size={16} color="#10b981" />
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {partner?.university} • {partner?.year}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{partner?.department}</div>
                    </div>
                  </div>

                  {/* Score Pill */}
                  <div 
                    className="badge-emerald-glow"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 10px",
                      borderRadius: "9999px",
                      fontWeight: 700,
                      fontSize: "0.82rem"
                    }}
                  >
                    <Sparkles size={13} />
                    <span>{compatibilityScore}% Synergy</span>
                  </div>
                </div>

                {/* Shared Subject / Target */}
                <div style={{ background: "#f8fafc", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "1.25rem" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                    Primary Study Focus
                  </span>
                  <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1e40af", marginTop: "2px" }}>
                    {sharedSubject}
                  </div>
                </div>

                {/* Partner availability */}
                <div style={{ marginBottom: "1.25rem", fontSize: "0.8rem", color: "#334155" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>Partner Availability: </span>
                  <span>
                    {Array.isArray(partner?.weekly_availability)
                      ? partner.weekly_availability.join(", ")
                      : typeof partner?.weekly_availability === "string"
                      ? partner.weekly_availability
                      : "Flexible scheduling"}
                  </span>
                </div>

                {/* Action Buttons: Google Chat, Propose Time, AI Plan, Unmatch */}
                <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.3fr 1fr auto", gap: "0.5rem" }}>
                  <a
                    href={chatSpaceUrl || "https://chat.google.com"}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      padding: "0.6rem 0.5rem",
                      borderRadius: "6px",
                      background: "#f1f5f9",
                      color: "#0f172a",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      textDecoration: "none",
                      border: "1px solid #e2e8f0"
                    }}
                  >
                    <MessageSquare size={14} color="#ea4335" />
                    <span>Google Chat</span>
                  </a>

                  <button
                    onClick={() => onScheduleSession?.(item)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      padding: "0.6rem 0.5rem",
                      borderRadius: "6px",
                      background: "#eff6ff",
                      color: "#2563eb",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      border: "1px solid #bfdbfe",
                      cursor: "pointer"
                    }}
                  >
                    <Calendar size={14} />
                    <span>Schedule</span>
                  </button>

                  <button
                    onClick={() => onOpenAiModal?.(item)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      padding: "0.6rem 0.5rem",
                      borderRadius: "6px",
                      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                      color: "#ffffff",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer"
                    }}
                  >
                    <Sparkles size={14} color="#38bdf8" />
                    <span>AI Plan</span>
                  </button>

                  <button
                    onClick={() => setConfirmMatch(item)}
                    disabled={isDeletingThis}
                    title="Unmatch"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0.6rem",
                      borderRadius: "6px",
                      background: "#ffffff",
                      color: "#dc2626",
                      border: "1px solid #fee2e2",
                      cursor: isDeletingThis ? "not-allowed" : "pointer"
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Accessible Confirmation Dialog Modal */}
      {confirmMatch && (
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
                  Unmatch with {confirmMatch.partner?.name}?
                </h3>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Verified mutual match in SQLite
                </span>
              </div>
            </div>

            <p style={{ fontSize: "0.88rem", color: "#475569", lineHeight: 1.5, marginBottom: "1.5rem" }}>
              Are you sure you want to remove this match? This will safely delete the match record and reset swipe history between you and <strong>{confirmMatch.partner?.name}</strong>. Student accounts are preserved.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                onClick={() => setConfirmMatch(null)}
                disabled={Boolean(deletingId)}
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
                Cancel
              </button>

              <button
                onClick={handleConfirmDelete}
                disabled={Boolean(deletingId)}
                style={{
                  padding: "0.55rem 1.25rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "#dc2626",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: deletingId ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Trash2 size={14} />
                <span>{deletingId ? "Unmatching..." : "Yes, Unmatch"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
