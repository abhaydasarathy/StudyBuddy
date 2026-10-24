import React, { useState, useEffect } from "react";
import { 
  Users, 
  MessageSquare, 
  HardDrive, 
  Vote, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  ExternalLink,
  Plus,
  Sparkles,
  FileText,
  AlertCircle,
  Check,
  X
} from "lucide-react";
import UserAvatar from "./UserAvatar";
import { fetchGroupPolls, createGroupPoll, confirmPollSlot } from "../services/api";

export default function GroupsView({ groups, onVote, onCreateGroup, onConfirmSessionSlot, loading }) {
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupSubject, setNewGroupSubject] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  // Poll state
  const [polls, setPolls] = useState([]);
  const [loadingPolls, setLoadingPolls] = useState(false);
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [newPollTitle, setNewPollTitle] = useState("");
  const [newPollDeadline, setNewPollDeadline] = useState("Closes in 24 hours");
  const [newPollSlots, setNewPollSlots] = useState([
    "Saturday 10:00 AM - 12:30 PM",
    "Saturday 2:00 PM - 4:30 PM",
    "Sunday 4:00 PM - 6:30 PM"
  ]);

  const [votingLoading, setVotingLoading] = useState(false);
  const [confirmingLoading, setConfirmingLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];

  // Fetch group-specific isolated polls when selected group changes
  const loadGroupPolls = async (groupId) => {
    if (!groupId) return;
    setLoadingPolls(true);
    try {
      const data = await fetchGroupPolls(groupId);
      setPolls(data.polls || []);
    } catch (err) {
      console.warn("Could not load group polls:", err.message);
    } finally {
      setLoadingPolls(false);
    }
  };

  useEffect(() => {
    if (selectedGroup?.id) {
      loadGroupPolls(selectedGroup.id);
    }
  }, [selectedGroup?.id]);

  const handleVoteToggle = async (pollId, optId) => {
    if (votingLoading) return;
    setVotingLoading(true);
    try {
      await onVote(pollId, optId);
      await loadGroupPolls(selectedGroup.id);
    } catch (err) {
      setFeedback({ type: "error", message: "Vote failed: " + err.message });
    } finally {
      setVotingLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupSubject.trim()) return;
    try {
      await onCreateGroup({
        name: newGroupName.trim(),
        subject: newGroupSubject.trim(),
        description: newGroupDesc.trim()
      });
      setIsCreatingGroup(false);
      setNewGroupName("");
      setNewGroupSubject("");
      setNewGroupDesc("");
      setFeedback({ type: "success", message: "Study squad created successfully!" });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({ type: "error", message: "Group creation failed: " + err.message });
    }
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    if (!newPollTitle.trim() || !selectedGroup?.id) return;
    const validSlots = newPollSlots.filter((s) => s.trim().length > 0);
    if (validSlots.length === 0) {
      alert("Please provide at least one time slot option.");
      return;
    }

    try {
      await createGroupPoll(selectedGroup.id, {
        title: newPollTitle.trim(),
        deadline: newPollDeadline.trim(),
        time_slots: validSlots
      });
      setIsCreatingPoll(false);
      setNewPollTitle("");
      setNewPollDeadline("Closes in 24 hours");
      setNewPollSlots(["Saturday 10:00 AM - 12:30 PM", "Sunday 2:00 PM - 4:30 PM"]);
      setFeedback({ type: "success", message: `Availability poll created for ${selectedGroup.name}!` });
      await loadGroupPolls(selectedGroup.id);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      setFeedback({ type: "error", message: "Poll creation failed: " + err.message });
    }
  };

  const handleConfirmPoll = async (poll, option) => {
    if (confirmingLoading || !poll || !option) return;
    setConfirmingLoading(true);
    try {
      const res = await confirmPollSlot(poll.id, {
        optionId: option.id,
        title: `${selectedGroup.name}: ${poll.title}`
      });

      setFeedback({
        type: "success",
        message: res.message || "Poll confirmed and study session scheduled!"
      });
      await loadGroupPolls(selectedGroup.id);
      if (onConfirmSessionSlot) {
        onConfirmSessionSlot(option.time_slot, `${selectedGroup.name}: ${poll.title}`);
      }
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({ type: "error", message: "Failed to confirm poll: " + err.message });
    } finally {
      setConfirmingLoading(false);
    }
  };

  const activePoll = polls.find((p) => p.status === "OPEN") || selectedGroup?.activePoll;
  const pastPolls = polls.filter((p) => p.status !== "OPEN");

  return (
    <div style={{ maxWidth: "1200px", margin: "1.5rem auto", padding: "0 1.5rem" }}>
      
      {/* Toast Feedback */}
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
              <AlertCircle size={18} color="#dc2626" />
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
            Study Squads & Workspace
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Collaborative cohort groups with independent availability polls, Google Chat spaces, and shared Drive notes.
          </p>
        </div>
        
        <div style={{ display: "flex", gap: "0.6rem" }}>
          {selectedGroup && (
            <button 
              onClick={() => setIsCreatingPoll(!isCreatingPoll)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                border: "1px solid #bfdbfe",
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer"
              }}
            >
              <Vote size={16} />
              <span>{isCreatingPoll ? "Close Poll Form" : "Create Squad Poll"}</span>
            </button>
          )}

          <button 
            onClick={() => setIsCreatingGroup(!isCreatingGroup)}
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
            <span>{isCreatingGroup ? "Cancel" : "New Study Squad"}</span>
          </button>
        </div>
      </div>

      {/* Group Creation Form */}
      {isCreatingGroup && (
        <form onSubmit={handleCreateGroup} className="card-elevated" style={{ padding: "1.5rem", borderRadius: "1rem", marginBottom: "1.5rem", background: "#f8fafc" }}>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "0.75rem", color: "#0f172a" }}>Create a New Study Squad</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>Squad Name</label>
              <input 
                type="text" 
                value={newGroupName} 
                onChange={(e) => setNewGroupName(e.target.value)} 
                placeholder="e.g. CS161 Algorithm Sprints" 
                style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                required 
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>Course / Subject Focus</label>
              <input 
                type="text" 
                value={newGroupSubject} 
                onChange={(e) => setNewGroupSubject(e.target.value)} 
                placeholder="e.g. 21CSC204J: Design and Analysis of Algorithms" 
                style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                required 
              />
            </div>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>Squad Description</label>
            <input 
              type="text" 
              value={newGroupDesc} 
              onChange={(e) => setNewGroupDesc(e.target.value)} 
              placeholder="e.g. Weekly problem set solving and Google Meet mock exams" 
              style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
            />
          </div>
          <button 
            type="submit"
            style={{ padding: "0.5rem 1.25rem", borderRadius: "6px", background: "#2563eb", color: "#ffffff", border: "none", fontWeight: 600, cursor: "pointer" }}
          >
            Create Squad
          </button>
        </form>
      )}

      {/* Poll Creation Form */}
      {isCreatingPoll && selectedGroup && (
        <form onSubmit={handleCreatePoll} className="card-elevated" style={{ padding: "1.5rem", borderRadius: "1rem", marginBottom: "1.5rem", background: "#eff6ff", border: "1px solid #bfdbfe" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: "1.1rem", color: "#1e40af", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
              <Vote size={18} />
              <span>Create Independent Poll for {selectedGroup.name}</span>
            </h3>
            <button type="button" onClick={() => setIsCreatingPoll(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#1e3a8a", marginBottom: "4px" }}>Poll Title / Sprint Objective</label>
              <input 
                type="text" 
                value={newPollTitle} 
                onChange={(e) => setNewPollTitle(e.target.value)} 
                placeholder="e.g. B-Tree Problem Set Mock Exam" 
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #93c5fd", background: "#ffffff" }}
                required 
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#1e3a8a", marginBottom: "4px" }}>Voting Deadline</label>
              <input 
                type="text" 
                value={newPollDeadline} 
                onChange={(e) => setNewPollDeadline(e.target.value)} 
                placeholder="e.g. Friday 8:00 PM" 
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #93c5fd", background: "#ffffff" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#1e3a8a", marginBottom: "6px" }}>
              Proposed Time Slots (Members vote on consensus)
            </label>
            {newPollSlots.map((slot, idx) => (
              <div key={idx} style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                <input 
                  type="text" 
                  value={slot} 
                  onChange={(e) => {
                    const updated = [...newPollSlots];
                    updated[idx] = e.target.value;
                    setNewPollSlots(updated);
                  }}
                  placeholder="e.g. Saturday 10:00 AM - 12:30 PM" 
                  style={{ flex: 1, padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", fontSize: "0.85rem" }}
                  required
                />
                {newPollSlots.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => setNewPollSlots(newPollSlots.filter((_, i) => i !== idx))}
                    style={{ padding: "0.4rem 0.6rem", background: "#ffffff", border: "1px solid #fee2e2", color: "#dc2626", borderRadius: "6px", cursor: "pointer" }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button 
              type="button"
              onClick={() => setNewPollSlots([...newPollSlots, "Sunday 10:00 AM - 12:00 PM"])}
              style={{ fontSize: "0.78rem", color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: "4px 0" }}
            >
              + Add another slot option
            </button>
          </div>

          <button 
            type="submit"
            style={{ padding: "0.55rem 1.25rem", borderRadius: "6px", background: "#2563eb", color: "#ffffff", border: "none", fontWeight: 600, cursor: "pointer" }}
          >
            Publish Poll to Squad
          </button>
        </form>
      )}

      {loading ? (
        <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-muted)" }}>
          Loading your study squads...
        </div>
      ) : groups.length === 0 ? (
        <div className="card-elevated" style={{ padding: "3rem", textAlign: "center", borderRadius: "1rem" }}>
          <Users size={36} color="#94a3b8" style={{ margin: "0 auto 1rem auto" }} />
          <h2 style={{ fontSize: "1.25rem", color: "#0f172a" }}>No study squads yet</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginTop: "0.5rem" }}>
            Click <strong>New Study Squad</strong> above to create your first collaborative cohort.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "1.75rem" }}>
          
          {/* Left Side: Squad Info & Google Workspace Hub */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            
            {/* Squad Selector Pill List if multiple */}
            {groups.length > 1 && (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroupId(g.id)}
                    style={{
                      padding: "0.4rem 0.8rem",
                      borderRadius: "9999px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      border: selectedGroup?.id === g.id ? "1px solid #2563eb" : "1px solid #e2e8f0",
                      background: selectedGroup?.id === g.id ? "#eff6ff" : "#ffffff",
                      color: selectedGroup?.id === g.id ? "#2563eb" : "#475569",
                      cursor: "pointer"
                    }}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}

            <div className="card-elevated" style={{ padding: "1.5rem", borderRadius: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "2px 8px", borderRadius: "9999px" }}>
                  {selectedGroup.subject}
                </span>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {(selectedGroup.members || []).length}/{selectedGroup.max_members || 5} Members
                </span>
              </div>

              <h2 style={{ fontSize: "1.35rem", color: "#0f172a", marginBottom: "0.5rem" }}>
                {selectedGroup.name}
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "1.25rem" }}>
                {selectedGroup.description || "Active study cohort."}
              </p>

              {/* Member Avatars */}
              <div style={{ marginBottom: "1.5rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Squad Roster
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.5rem" }}>
                  {(selectedGroup.members || []).map((member, idx) => (
                    <div key={idx} title={`${member.name} (${member.role})`}>
                      <UserAvatar 
                        src={member.avatar} 
                        name={member.name}
                        size={36}
                        style={{ border: "2px solid #ffffff", boxShadow: "var(--shadow-sm)" }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Google Workspace Hub Actions */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.75rem", padding: "1rem" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.75rem" }}>
                  Linked Google Workspace Hub
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  <a 
                    href={selectedGroup.chat_space_url || "https://chat.google.com"} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.5rem 0.75rem",
                      background: "#ffffff",
                      borderRadius: "6px",
                      border: "1px solid #e2e8f0",
                      textDecoration: "none",
                      color: "#0f172a",
                      fontSize: "0.82rem",
                      fontWeight: 600
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <MessageSquare size={15} color="#ea4335" />
                      Open Google Chat Space
                    </span>
                    <ExternalLink size={13} color="#94a3b8" />
                  </a>

                  <a 
                    href={selectedGroup.drive_folder_url || "https://drive.google.com"} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.5rem 0.75rem",
                      background: "#ffffff",
                      borderRadius: "6px",
                      border: "1px solid #e2e8f0",
                      textDecoration: "none",
                      color: "#0f172a",
                      fontSize: "0.82rem",
                      fontWeight: 600
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <HardDrive size={15} color="#fbbc04" />
                      Open Shared Drive Folder
                    </span>
                    <ExternalLink size={13} color="#94a3b8" />
                  </a>
                </div>
              </div>

            </div>
          </div>

          {/* Right Side: Availability Polling Matrix */}
          <div className="card-elevated" style={{ padding: "1.5rem", borderRadius: "1rem" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Vote size={20} color="#2563eb" />
                <h2 style={{ fontSize: "1.2rem", color: "#0f172a", margin: 0 }}>
                  Availability Polls & Session Consensus
                </h2>
              </div>
              {activePoll && (
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#ea580c", background: "#fff7ed", padding: "3px 8px", borderRadius: "9999px", border: "1px solid #ffedd5" }}>
                  {activePoll.deadline}
                </span>
              )}
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
              Independent poll isolated to <strong>{selectedGroup.name}</strong>. Click an option to vote or toggle withdrawal. Confirmed slot auto-creates a session in SQLite and synchronizes to Google Calendar.
            </p>

            {loadingPolls ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                Loading squad availability polls...
              </div>
            ) : activePoll ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                  <h3 style={{ fontSize: "1.05rem", color: "#0f172a", margin: 0 }}>
                    {activePoll.title}
                  </h3>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: "9999px", border: "1px solid #a7f3d0" }}>
                    POLL OPEN
                  </span>
                </div>

                {/* Poll Options List */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1.5rem" }}>
                  {(activePoll.options || []).map((opt) => {
                    const hasVoted = Boolean(opt.has_voted);

                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleVoteToggle(activePoll.id, opt.id)}
                        style={{
                          padding: "1rem",
                          borderRadius: "0.75rem",
                          border: hasVoted ? "2px solid #2563eb" : opt.is_recommended ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                          background: hasVoted ? "#eff6ff" : opt.is_recommended ? "#f0fdf4" : "#ffffff",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          boxShadow: hasVoted ? "var(--shadow-sm)" : "none"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontWeight: 600, fontSize: "0.92rem", color: "#0f172a" }}>
                                {opt.time_slot}
                              </span>
                              {hasVoted && (
                                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#1d4ed8", background: "#dbeafe", padding: "1px 6px", borderRadius: "9999px" }}>
                                  Your Vote (Click to withdraw)
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "3px" }}>
                              Voters: {(opt.voters || []).join(", ") || "No votes yet"}
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {opt.is_recommended && (
                              <span style={{ 
                                fontSize: "0.7rem", 
                                fontWeight: 700, 
                                color: "#15803d", 
                                background: "#dcfce7", 
                                padding: "2px 8px", 
                                borderRadius: "9999px",
                                border: "1px solid #bbf7d0" 
                              }}>
                                Recommended Slot
                              </span>
                            )}
                            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
                              {opt.votes_count || 0} {opt.votes_count === 1 ? "vote" : "votes"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Confirm Action Bar */}
                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    One vote per student per option. Votes persist directly in SQLite.
                  </div>
                  <button
                    onClick={() => {
                      const selectedOption = activePoll.options.find((o) => o.is_recommended) || activePoll.options[0];
                      handleConfirmPoll(activePoll, selectedOption);
                    }}
                    disabled={confirmingLoading}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "#ffffff",
                      border: "none",
                      padding: "0.6rem 1.25rem",
                      borderRadius: "0.5rem",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: confirmingLoading ? "not-allowed" : "pointer",
                      boxShadow: "var(--glow-emerald)"
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{confirmingLoading ? "Synchronizing Session..." : "Confirm Recommended Slot & Sync"}</span>
                  </button>
                </div>
              </>
            ) : (
              <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                <Vote size={32} color="#cbd5e1" style={{ margin: "0 auto 0.75rem auto" }} />
                <h4 style={{ fontSize: "1rem", color: "#334155", margin: "0 0 0.5rem 0" }}>No active poll for this squad</h4>
                <p style={{ fontSize: "0.82rem", maxWidth: "380px", margin: "0 auto 1.25rem auto" }}>
                  Launch a new poll to coordinate meeting times with members of {selectedGroup.name}.
                </p>
                <button
                  onClick={() => setIsCreatingPoll(true)}
                  style={{
                    padding: "0.45rem 1rem",
                    borderRadius: "6px",
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    cursor: "pointer"
                  }}
                >
                  Create Availability Poll
                </button>
              </div>
            )}

            {/* Past / Confirmed Polls Section */}
            {pastPolls.length > 0 && (
              <div style={{ marginTop: "2rem", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                  Past Confirmed Polls ({pastPolls.length})
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {pastPolls.map((p) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.85rem", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.82rem" }}>
                      <span style={{ fontWeight: 600, color: "#334155" }}>{p.title}</span>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 6px", borderRadius: "4px" }}>
                        CONFIRMED & SCHEDULED
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      )}
    </div>
  );
}
