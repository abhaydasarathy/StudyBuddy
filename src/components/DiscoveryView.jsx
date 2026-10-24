import React, { useState } from "react";
import { 
  Heart, 
  X, 
  Sparkles, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  MessageSquare,
  FileText,
  ShieldCheck,
  Zap,
  Filter,
  RefreshCw,
  RotateCcw
} from "lucide-react";
import confetti from "canvas-confetti";
import UserAvatar from "./UserAvatar";

export default function DiscoveryView({ candidates, onSwipe, onRefresh, onResetDeck, loading }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterCourse, setFilterCourse] = useState("ALL");
  const [swipeFeedback, setSwipeFeedback] = useState(null); // 'like' | 'pass'
  const [actionLoading, setActionLoading] = useState(false);

  // Available unique courses across real candidates
  const availableCourses = ["ALL", ...new Set(candidates.flatMap((c) => c.courses || []))];

  // Filter candidates by selected course
  const filteredCandidates = candidates.filter((c) => {
    if (filterCourse === "ALL") return true;
    return (c.courses || []).some((course) => course.toLowerCase().includes(filterCourse.toLowerCase()));
  });

  const currentCandidate = filteredCandidates[currentIndex % Math.max(1, filteredCandidates.length)];

  const handleAction = async (direction) => {
    if (!currentCandidate || actionLoading) return;
    setActionLoading(true);
    setSwipeFeedback(direction === "LIKE" ? "like" : "pass");

    if (direction === "LIKE") {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#2563eb", "#10b981", "#3b82f6"]
      });
    }

    try {
      await onSwipe(currentCandidate.id, direction);
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setSwipeFeedback(null);
        setActionLoading(false);
      }, 250);
    } catch (err) {
      alert("Swipe failed: " + err.message);
      setSwipeFeedback(null);
      setActionLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "1150px", margin: "1.5rem auto", padding: "0 1.5rem" }}>
      {/* Header bar with filters */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            Student Discovery & Swipe Matching
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Deterministic compatibility computed on syllabus overlap, availability, and learning methods.
          </p>
        </div>

        {/* Filter Chips & Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {availableCourses.slice(0, 4).map((course) => (
            <button
              key={course}
              onClick={() => {
                setFilterCourse(course);
                setCurrentIndex(0);
              }}
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                padding: "0.4rem 0.85rem",
                borderRadius: "9999px",
                border: filterCourse === course ? "1px solid #2563eb" : "1px solid #e2e8f0",
                backgroundColor: filterCourse === course ? "#eff6ff" : "#ffffff",
                color: filterCourse === course ? "#2563eb" : "#475569",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {course}
            </button>
          ))}

          {/* Refresh Candidates Button */}
          <button
            onClick={() => {
              setCurrentIndex(0);
              onRefresh?.();
            }}
            disabled={loading}
            title="Refresh candidate list from database"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "0.4rem 0.75rem",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "9999px",
              cursor: loading ? "not-allowed" : "pointer",
              color: "#334155",
              fontSize: "0.78rem",
              fontWeight: 600,
              boxShadow: "var(--shadow-sm)",
              transition: "all 0.15s ease"
            }}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          {/* Reset Deck Button */}
          <button
            onClick={() => {
              if (window.confirm("Reset your swipe history to rediscover all students?")) {
                setCurrentIndex(0);
                onResetDeck?.();
              }
            }}
            disabled={loading}
            title="Reset all swipe history in SQLite"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "0.4rem 0.75rem",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "9999px",
              cursor: loading ? "not-allowed" : "pointer",
              color: "#1e40af",
              fontSize: "0.78rem",
              fontWeight: 600,
              boxShadow: "var(--shadow-sm)",
              transition: "all 0.15s ease"
            }}
          >
            <RotateCcw size={13} />
            <span>Reset Deck</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-muted)" }}>
          Loading compatible students from database...
        </div>
      ) : !currentCandidate ? (
        <div className="card-elevated" style={{ padding: "3rem", textAlign: "center", borderRadius: "1rem" }}>
          <Sparkles size={36} color="#2563eb" style={{ margin: "0 auto 1rem auto" }} />
          <h2 style={{ fontSize: "1.3rem", color: "#0f172a" }}>You have viewed all matching candidates!</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.5rem", maxWidth: "450px", margin: "0.5rem auto 1.5rem auto" }}>
            Check <strong>My Matches</strong> to coordinate in Google Chat or click below to reset your swipes and review candidates again.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
            <button
              onClick={() => {
                setCurrentIndex(0);
                onRefresh?.();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "0.6rem 1.25rem",
                borderRadius: "0.5rem",
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#334155",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <RefreshCw size={15} />
              <span>Refresh Candidates</span>
            </button>

            <button
              onClick={() => {
                setCurrentIndex(0);
                onResetDeck?.();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "0.6rem 1.25rem",
                borderRadius: "0.5rem",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "var(--glow-sapphire)"
              }}
            >
              <RotateCcw size={15} />
              <span>Reset Discovery Deck</span>
            </button>
          </div>
        </div>
      ) : (
        /* Main Swipe Deck Container */
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "2rem", alignItems: "start" }}>
          
          {/* Candidate Profile Card */}
          <div 
            className="card-elevated"
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: "1rem",
              transform: swipeFeedback === "like" ? "translateX(50px) rotate(3deg)" : swipeFeedback === "pass" ? "translateX(-50px) rotate(-3deg)" : "none",
              opacity: swipeFeedback ? 0.5 : 1,
              transition: "all 0.25s ease"
            }}
          >
            {/* Card Image Banner */}
            <div style={{ position: "relative", height: "260px", overflow: "hidden" }}>
              <UserAvatar 
                src={currentCandidate.avatar} 
                name={currentCandidate.name}
                variant="banner"
              />
              <div style={{ 
                position: "absolute", 
                inset: 0, 
                background: "linear-gradient(to top, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.2) 60%, transparent 100%)" 
              }} />

              {/* Top Badges */}
              <div style={{ position: "absolute", top: "1rem", left: "1rem", right: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: "4px",
                  background: "rgba(15,23,42,0.75)",
                  backdropFilter: "blur(8px)",
                  color: "#ffffff",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: "9999px",
                  border: "1px solid rgba(255,255,255,0.2)"
                }}>
                  <ShieldCheck size={14} color="#10b981" />
                  Verified Student
                </span>

                {/* Compatibility Tier Badge */}
                <div 
                  className="badge-emerald-glow"
                  style={{ 
                    display: "inline-flex", 
                    alignItems: "center", 
                    gap: "6px",
                    padding: "4px 12px",
                    borderRadius: "9999px",
                    fontWeight: 700,
                    fontSize: "0.82rem"
                  }}
                >
                  <Sparkles size={14} />
                  <span>{currentCandidate.compatibilityScore}% Synergy</span>
                </div>
              </div>

              {/* Name and University over banner */}
              <div style={{ position: "absolute", bottom: "1rem", left: "1.25rem", right: "1.25rem", color: "#ffffff" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                  <h2 style={{ color: "#ffffff", fontSize: "1.6rem", fontWeight: 700 }}>{currentCandidate.name}</h2>
                  <span style={{ fontSize: "0.95rem", opacity: 0.9 }}>• {currentCandidate.year}</span>
                </div>
                <p style={{ fontSize: "0.85rem", opacity: 0.85 }}>{currentCandidate.university} — {currentCandidate.department}</p>
              </div>
            </div>

            {/* Card Body */}
            <div style={{ padding: "1.5rem" }}>
              
              {/* Bio */}
              <p style={{ fontSize: "0.92rem", color: "var(--text-secondary)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
                "{currentCandidate.bio || "Active learner looking for study partners."}"
              </p>

              {/* Courses Enrolled */}
              <div style={{ marginBottom: "1.25rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                  Shared Courses & Targets
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.4rem" }}>
                  {(currentCandidate.courses || []).map((course) => (
                    <span 
                      key={course}
                      style={{
                        backgroundColor: "#eff6ff",
                        color: "#1e40af",
                        border: "1px solid #bfdbfe",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "0.8rem",
                        fontWeight: 600
                      }}
                    >
                      {course}
                    </span>
                  ))}
                </div>
              </div>

              {/* Learning Goals */}
              <div style={{ marginBottom: "1.25rem", background: "#f8fafc", padding: "0.85rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", fontWeight: 700, color: "#0f172a" }}>
                  <Zap size={14} color="#2563eb" />
                  <span>Study Target:</span>
                </div>
                <p style={{ fontSize: "0.85rem", color: "#334155", marginTop: "3px" }}>
                  {currentCandidate.study_goals || "Collaborative exam preparation and assignment review."}
                </p>
              </div>

              {/* Study Methods & Availability */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Preferred Methods
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.35rem" }}>
                    {(currentCandidate.preferred_methods || []).map((method) => (
                      <span key={method} style={{ fontSize: "0.75rem", color: "#475569", background: "#f1f5f9", padding: "2px 8px", borderRadius: "9999px" }}>
                        {method}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Self-Reported Availability
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "0.35rem" }}>
                    {(currentCandidate.weekly_availability || ["Flexible"]).map((slot, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.78rem", color: "#059669", fontWeight: 600 }}>
                        <Clock size={12} />
                        <span>{slot}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Actions: Swipe Pass or Connect */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
                <button
                  onClick={() => handleAction("PASS")}
                  disabled={actionLoading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #fee2e2",
                    background: "#ffffff",
                    color: "#dc2626",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
                >
                  <X size={18} />
                  <span>Pass</span>
                </button>

                <button
                  onClick={() => handleAction("LIKE")}
                  disabled={actionLoading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "#ffffff",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    cursor: "pointer",
                    boxShadow: "var(--glow-emerald)",
                    transition: "all 0.15s ease"
                  }}
                >
                  <Heart size={18} fill="#ffffff" />
                  <span>Connect & Match</span>
                </button>
              </div>

            </div>
          </div>

          {/* Explainable AI Compatibility & Google Readiness Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            
            {/* AI Explainability Box */}
            <div className="card-elevated" style={{ padding: "1.25rem", borderLeft: "4px solid #10b981" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <Sparkles size={18} color="#10b981" />
                <h3 style={{ fontSize: "1rem", color: "#0f172a" }}>Why This Recommendation?</h3>
              </div>
              <p style={{ fontSize: "0.85rem", color: "#334155", lineHeight: 1.6 }}>
                {currentCandidate.compatibilityReason || `${currentCandidate.compatibilityScore}% synergy calculated from course syllabus and schedule overlap.`}
              </p>
              
              {/* Synergy breakdown */}
              {currentCandidate.synergyBreakdown && (
                <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      <span>Syllabus Alignment</span>
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>{currentCandidate.synergyBreakdown.subjectOverlap}%</span>
                    </div>
                    <div style={{ height: "4px", background: "#f1f5f9", borderRadius: "9999px", overflow: "hidden", marginTop: "2px" }}>
                      <div style={{ width: `${currentCandidate.synergyBreakdown.subjectOverlap}%`, height: "100%", background: "#2563eb" }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      <span>Schedule Alignment</span>
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>{currentCandidate.synergyBreakdown.availabilityOverlap}%</span>
                    </div>
                    <div style={{ height: "4px", background: "#f1f5f9", borderRadius: "9999px", overflow: "hidden", marginTop: "2px" }}>
                      <div style={{ width: `${currentCandidate.synergyBreakdown.availabilityOverlap}%`, height: "100%", background: "#10b981" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Google Workspace Readiness Widget */}
            <div className="card-elevated" style={{ padding: "1.25rem" }}>
              <h3 style={{ fontSize: "0.95rem", color: "#0f172a", marginBottom: "0.75rem" }}>
                Google Workspace Readiness
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.82rem" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                    <Calendar size={14} color="#2563eb" />
                    Google Calendar Overlap:
                  </span>
                  <span style={{ fontWeight: 700, color: "#10b981" }}>
                    {currentCandidate.synergyBreakdown?.availabilityOverlap || 85}%
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.82rem" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                    <FileText size={14} color="#059669" />
                    Shared Google Drive:
                  </span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>1-Click Setup</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.82rem" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                    <MessageSquare size={14} color="#ea4335" />
                    Google Chat Room:
                  </span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>Auto-Created on Match</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
