import React from "react";
import { 
  Sparkles, 
  Users, 
  HeartHandshake, 
  Calendar, 
  Video, 
  MessageSquare, 
  HardDrive, 
  Settings, 
  BookOpen,
  GraduationCap
} from "lucide-react";

export default function Navbar({ activeTab, setActiveTab, unreadMatchesCount = 2, pendingSessionsCount = 2 }) {
  const navItems = [
    { id: "discovery", label: "Discover", icon: Users },
    { id: "matches", label: "My Matches", icon: HeartHandshake, badge: unreadMatchesCount },
    { id: "groups", label: "Study Squads", icon: BookOpen },
    { id: "sessions", label: "Schedule & Meet", icon: Calendar, badge: pendingSessionsCount },
    { id: "ai-assistant", label: "AI Copilot", icon: Sparkles, highlight: true },
    { id: "integrations", label: "Google Hub", icon: Settings },
  ];

  return (
    <header className="glass-panel" style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid var(--border-subtle)" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveTab("discovery")}
          style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}
        >
          <div style={{ 
            width: "40px", 
            height: "40px", 
            borderRadius: "10px", 
            background: "linear-gradient(135deg, #0f172a 0%, #2563eb 100%)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            color: "#ffffff", 
            boxShadow: "0 4px 10px rgba(37,99,235,0.3)" 
          }}>
            <GraduationCap size={22} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "1.25rem", fontWeight: 800, fontFamily: "var(--font-headline)", letterSpacing: "-0.03em", color: "#0f172a" }}>
                Study<span style={{ color: "#2563eb" }}>Buddy</span>
              </span>
              <span style={{ 
                fontSize: "0.65rem", 
                fontWeight: 700, 
                backgroundColor: "#eff6ff", 
                color: "#2563eb", 
                padding: "2px 6px", 
                borderRadius: "9999px",
                border: "1px solid #bfdbfe",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}>
                Google Hub
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "-2px" }}>
              AI Student Matching & Workspace
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 0.85rem",
                  borderRadius: "9999px",
                  fontSize: "0.85rem",
                  fontWeight: isActive ? 600 : 500,
                  border: isActive ? "1px solid #bfdbfe" : "1px solid transparent",
                  backgroundColor: isActive ? "#eff6ff" : "transparent",
                  color: isActive ? "#2563eb" : "#475569",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  position: "relative"
                }}
              >
                <Icon size={17} color={isActive ? "#2563eb" : "#64748b"} />
                <span>{item.label}</span>
                {item.badge ? (
                  <span style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    borderRadius: "9999px",
                    padding: "1px 6px",
                    lineHeight: 1.2
                  }}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* User Profile Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            padding: "0.35rem 0.75rem 0.35rem 0.45rem",
            background: "#ffffff",
            border: "1px solid var(--border-subtle)",
            borderRadius: "9999px",
            boxShadow: "var(--shadow-sm)"
          }}>
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" 
              alt="Alex Rivera"
              style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }} 
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>Alex Rivera</span>
              <span style={{ fontSize: "0.68rem", color: "#10b981", fontWeight: 600 }}>● Stanford CS</span>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
