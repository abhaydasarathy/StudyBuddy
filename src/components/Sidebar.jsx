import React from "react";
import { 
  Users, 
  HeartHandshake, 
  BookOpen, 
  Calendar, 
  Sparkles, 
  Cloud, 
  Settings, 
  LogOut, 
  GraduationCap,
  X,
  ChevronRight,
  Database
} from "lucide-react";
import UserAvatar from "./UserAvatar";

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  user, 
  matchesCount = 0, 
  sessionsCount = 0,
  isOpen = true,
  onClose,
  onLogout
}) {
  const navItems = [
    { id: "discover", label: "Discover", icon: Users },
    { id: "matches", label: "My Matches", icon: HeartHandshake, badge: matchesCount },
    { id: "groups", label: "Study Squads", icon: BookOpen },
    { id: "sessions", label: "Schedule & Meet", icon: Calendar, badge: sessionsCount },
    { id: "ai-assistant", label: "AI Copilot", icon: Sparkles, highlight: true },
    { id: "workspace", label: "Google Workspace", icon: Cloud },
    { id: "database", label: "Database Inspector", icon: Database, devOnly: true },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside 
      className={`sidebar-container ${isOpen ? "sidebar-open" : "sidebar-closed"}`}
      style={{
        width: "260px",
        height: "100vh",
        backgroundColor: "#ffffff",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        zIndex: 40,
        flexShrink: 0
      }}
    >
      {/* Brand Header */}
      <div style={{ padding: "1.25rem 1.25rem 1rem 1.25rem", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div 
            onClick={() => setActiveTab("discover")}
            style={{ display: "flex", alignItems: "center", gap: "0.65rem", cursor: "pointer" }}
          >
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #0f172a 0%, #2563eb 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 4px 10px rgba(37,99,235,0.25)"
            }}>
              <GraduationCap size={20} />
            </div>
            <div>
              <span style={{ fontSize: "1.15rem", fontWeight: 800, fontFamily: "var(--font-headline)", letterSpacing: "-0.03em", color: "#0f172a" }}>
                Study<span style={{ color: "#2563eb" }}>Buddy</span>
              </span>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "-3px" }}>
                Workspace Hub
              </div>
            </div>
          </div>

          {/* Mobile close button */}
          {onClose && (
            <button 
              onClick={onClose}
              className="mobile-only-btn"
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, padding: "1rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.35rem", overflowY: "auto" }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (onClose) onClose();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.65rem 0.85rem",
                borderRadius: "0.5rem",
                fontSize: "0.88rem",
                fontWeight: isActive ? 600 : 500,
                border: "none",
                backgroundColor: isActive ? "#eff6ff" : "transparent",
                color: isActive ? "#2563eb" : "#475569",
                cursor: "pointer",
                transition: "all 0.15s ease",
                textAlign: "left"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Icon size={18} color={isActive ? "#2563eb" : item.highlight ? "#3b82f6" : "#64748b"} />
                <span>{item.label}</span>
              </div>

              {item.badge ? (
                <span style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  backgroundColor: isActive ? "#2563eb" : "#e2e8f0",
                  color: isActive ? "#ffffff" : "#475569",
                  borderRadius: "9999px",
                  padding: "1px 7px"
                }}>
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* User Account / Footer */}
      <div style={{ padding: "0.85rem 1rem", borderTop: "1px solid var(--border-subtle)", background: "#fafafa" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div 
            onClick={() => setActiveTab("settings")}
            style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", overflow: "hidden" }}
          >
            <UserAvatar 
              src={user?.avatar} 
              name={user?.name || "Student"}
              size={34}
            />
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                {user?.name || "Alex Rivera"}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#10b981", fontWeight: 600 }}>
                ● {user?.university?.split(" ")[0] || "Stanford"} Verified
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (window.confirm("Sign out of StudyBuddy?")) {
                if (onLogout) onLogout();
              }
            }}
            title="Sign Out"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: "4px" }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
