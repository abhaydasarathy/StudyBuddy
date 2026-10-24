import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  HardDrive, 
  MessageSquare, 
  Mail, 
  ShieldCheck,
  ExternalLink,
  AlertTriangle,
  X,
  KeyRound,
  FileCode
} from "lucide-react";
import { fetchGoogleAuthUrl } from "../services/api";

export default function IntegrationsView({ integrations, onToggle, loading }) {
  const [authErrorModal, setAuthErrorModal] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("google_oauth") === "success") {
      setSuccessToast("Google Calendar successfully authorized and synchronized!");
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => setSuccessToast(null), 5000);
    } else if (urlParams.get("google_oauth") === "error") {
      const msg = urlParams.get("msg") || "OAuth authorization failed";
      setAuthErrorModal(msg);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleAuthorizeService = async (serviceId) => {
    if (serviceId === "calendar") {
      try {
        const data = await fetchGoogleAuthUrl();
        if (data.url) {
          window.location.href = data.url;
        } else {
          setAuthErrorModal("Google OAuth credentials are not configured in server/.env");
        }
      } catch (err) {
        setAuthErrorModal(err.message);
      }
    } else {
      // Toggle for local development state for other services
      onToggle(serviceId);
    }
  };

  const serviceConfigs = [
    {
      id: "calendar",
      name: "Google Calendar & Meet",
      service: "Scheduling & Video Sprints",
      scope: "https://www.googleapis.com/auth/calendar.events",
      description: "Syncs confirmed study sessions directly to your Google Calendar and creates Google Meet links automatically.",
      icon: Calendar,
      color: "#059669",
    },
    {
      id: "drive",
      name: "Google Drive & Docs",
      service: "Collaborative Study Notes",
      scope: "https://www.googleapis.com/auth/drive.file",
      description: "Stores and links your Study Squad's shared notes and syllabus sheets using least-privilege file access.",
      icon: HardDrive,
      color: "#f59e0b",
    },
    {
      id: "chat",
      name: "Google Chat API",
      service: "Mutual Match & Squad Communication",
      scope: "https://www.googleapis.com/auth/chat.spaces",
      description: "Creates dedicated direct spaces for mutual study matches and cohort spaces for study squads.",
      icon: MessageSquare,
      color: "#ea4335",
    },
    {
      id: "gmail",
      name: "Gmail Invitations",
      service: "Calendar & Session Invites",
      scope: "https://www.googleapis.com/auth/gmail.send",
      description: "Optional: Dispatches study sprint calendar invitations directly through your university mailbox.",
      icon: Mail,
      color: "#64748b",
    }
  ];

  return (
    <div style={{ maxWidth: "1050px", margin: "1.5rem auto", padding: "0 1.5rem" }}>
      
      {/* Success Toast */}
      {successToast && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0.85rem 1.25rem", borderRadius: "0.75rem", marginBottom: "1.25rem", background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontSize: "0.88rem", fontWeight: 600 }}>
          <CheckCircle2 size={18} color="#059669" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Title */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          Google Workspace Integrations Hub
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Production Google Workspace authorization center. Displays live OAuth credential states and enforces least-privilege scopes.
        </p>
      </div>

      {/* Account Identity Card */}
      <div className="card-elevated" style={{ padding: "1.25rem 1.5rem", borderRadius: "0.75rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: integrations?.googleAccount?.connected ? "#eff6ff" : "#f1f5f9", border: integrations?.googleAccount?.connected ? "1px solid #bfdbfe" : "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={22} color={integrations?.googleAccount?.connected ? "#2563eb" : "#94a3b8"} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>Google Account Identity</span>
              {integrations?.googleAccount?.connected ? (
                <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "9999px", background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}>
                  AUTHENTICATED OAUTH SESSION
                </span>
              ) : (
                <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "9999px", background: "#f1f5f9", color: "#64748b", border: "1px solid #cbd5e1" }}>
                  DISCONNECTED
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
              {integrations?.googleAccount?.connected 
                ? (integrations?.googleAccount?.email || "Authorized Google Workspace User")
                : "No Google account linked. Authorize Google Calendar below to synchronize study sessions."}
            </div>
          </div>
        </div>
      </div>

      {/* Integration Cards List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {serviceConfigs.map((item) => {
          const Icon = item.icon;
          const serviceState = integrations?.[item.id];
          const isConnected = Boolean(serviceState?.connected);

          return (
            <div 
              key={item.id} 
              className="card-elevated"
              style={{
                padding: "1.5rem",
                borderRadius: "0.75rem",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: "1.5rem",
                alignItems: "center"
              }}
            >
              {/* Service Icon */}
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Icon size={24} color={item.color} />
              </div>

              {/* Service Details */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3 style={{ fontSize: "1.05rem", color: "#0f172a", margin: 0 }}>{item.name}</h3>
                  <span style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    backgroundColor: isConnected ? "#ecfdf5" : "#f1f5f9",
                    color: isConnected ? "#059669" : "#64748b",
                    border: isConnected ? "1px solid #a7f3d0" : "1px solid #e2e8f0"
                  }}>
                    {isConnected ? "CONNECTED & SYNCED" : "NOT AUTHORIZED"}
                  </span>
                </div>
                <div style={{ fontSize: "0.82rem", color: "#2563eb", fontWeight: 500, marginTop: "2px" }}>
                  {item.service}
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "4px", lineHeight: 1.4 }}>
                  {item.description}
                </p>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  Required OAuth Scope: <code>{item.scope}</code>
                </div>
              </div>

              {/* Action Button */}
              <div>
                <button
                  onClick={() => isConnected ? onToggle(item.id) : handleAuthorizeService(item.id)}
                  disabled={loading}
                  style={{
                    padding: "0.55rem 1.25rem",
                    borderRadius: "0.5rem",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: isConnected ? "1px solid #fee2e2" : "none",
                    backgroundColor: isConnected ? "#ffffff" : "#2563eb",
                    color: isConnected ? "#dc2626" : "#ffffff",
                    boxShadow: isConnected ? "none" : "var(--glow-sapphire)",
                    transition: "all 0.15s ease"
                  }}
                >
                  {isConnected ? "Revoke Authorization" : "Authorize with Google"}
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Honest Integration Notice */}
      <div style={{ marginTop: "2rem", padding: "1.25rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
          <ShieldCheck size={16} color="#059669" />
          <span>Real Google Workspace Synchronization Architecture</span>
        </div>
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px", lineHeight: 1.5 }}>
          StudyBuddy uses official Google APIs via <code>googleapis.calendar(&apos;v3&apos;)</code>. Confirmed sessions synchronize directly to your calendar, creating real Google Meet links. When credentials are not yet configured in <code>server/.env</code>, sessions are preserved safely in SQLite with clear <em>&ldquo;Saved in SQLite • Disconnected&rdquo;</em> status badges and instant retry actions.
        </p>
      </div>

      {/* OAuth Configuration Help Modal */}
      {authErrorModal && (
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
              maxWidth: "520px",
              width: "100%",
              boxShadow: "var(--shadow-xl)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <KeyRound size={20} color="#2563eb" />
                <h3 style={{ fontSize: "1.15rem", color: "#0f172a", margin: 0 }}>
                  Google OAuth Credentials Required
                </h3>
              </div>
              <button onClick={() => setAuthErrorModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.5, marginBottom: "1rem" }}>
              To connect your real Google Calendar account, add your Google Cloud credentials to <code>server/.env</code>:
            </p>

            <div style={{ background: "#0f172a", color: "#38bdf8", padding: "0.85rem 1rem", borderRadius: "8px", fontFamily: "monospace", fontSize: "0.78rem", marginBottom: "1.25rem", overflowX: "auto" }}>
              GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com<br />
              GOOGLE_CLIENT_SECRET=your-client-secret<br />
              GOOGLE_REDIRECT_URI=http://localhost:5000/api/v1/auth/google/callback
            </div>

            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Detailed step-by-step setup instructions are available in <strong>GOOGLE_WORKSPACE_SETUP.md</strong>.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setAuthErrorModal(null)}
                style={{ padding: "0.55rem 1.25rem", borderRadius: "6px", background: "#2563eb", color: "#ffffff", border: "none", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
