import React, { useState } from "react";
import { 
  Sparkles, 
  Send, 
  BookOpen, 
  HelpCircle, 
  ListOrdered, 
  Copy,
  Check
} from "lucide-react";
import { queryAiCopilot } from "../services/api";

export default function AiAssistantView({ user }) {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState("explain"); // 'explain' | 'quiz' | 'plan'
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "m-1",
      sender: "ai",
      text: `Hello ${user?.name || "Alex"}! I am your StudyBuddy AI Copilot. I have context on your target courses (${(user?.courses || ["CS145: Database Systems"]).join(", ")}) and your study goals. How can I help you and your study partners learn today?`,
      suggestedQuestions: [
        "Explain B+ Tree insertion vs deletion with an example",
        "Generate a 3-question quiz on ACID transactions",
        "Create a 4-day revision schedule for CS145 midterm"
      ]
    }
  ]);

  const handleSend = async (textToSend) => {
    const query = textToSend || prompt;
    if (!query.trim() || loading) return;

    const userMsg = { id: `u-${Date.now()}`, sender: "user", text: query };
    setMessages((prev) => [...prev, userMsg]);
    setPrompt("");
    setLoading(true);

    try {
      const res = await queryAiCopilot(query, mode, user?.courses?.[0]);
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, sender: "ai", text: res.text }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, sender: "ai", text: "Error connecting to AI service: " + err.message }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "1050px", margin: "1.5rem auto", padding: "0 1.5rem" }}>
      {/* Title */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Sparkles size={24} color="#2563eb" />
          AI Study Copilot & Planner
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Academic assistant running against backend AI endpoint. Explain algorithms, generate peer quizzes, and build study roadmaps.
        </p>
      </div>

      {/* Main Chat Container */}
      <div className="card-elevated" style={{ borderRadius: "1rem", overflow: "hidden", display: "flex", flexDirection: "column", height: "640px" }}>
        
        {/* Mode Selector Header */}
        <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {[
              { id: "explain", label: "Concept Explainer", icon: BookOpen },
              { id: "quiz", label: "Peer Quiz Generator", icon: HelpCircle },
              { id: "plan", label: "Study Sprint Roadmap", icon: ListOrdered }
            ].map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "9999px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    border: mode === m.id ? "1px solid #2563eb" : "1px solid #e2e8f0",
                    background: mode === m.id ? "#eff6ff" : "#ffffff",
                    color: mode === m.id ? "#2563eb" : "#475569",
                    cursor: "pointer"
                  }}
                >
                  <Icon size={14} />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
            Context: {(user?.courses || ["CS145"])[0]}
          </span>
        </div>

        {/* Message Stream */}
        <div style={{ flex: 1, padding: "1.25rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {messages.map((msg) => {
            const isUser = msg.sender === "user";
            return (
              <div 
                key={msg.id}
                style={{
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  maxWidth: isUser ? "75%" : "85%",
                  display: "flex",
                  gap: "0.75rem"
                }}
              >
                {!isUser ? (
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #0f172a 0%, #2563eb 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", flexShrink: 0 }}>
                    <Sparkles size={16} />
                  </div>
                ) : null}

                <div style={{
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  background: isUser ? "#2563eb" : "#f8fafc",
                  color: isUser ? "#ffffff" : "#0f172a",
                  border: isUser ? "none" : "1px solid #e2e8f0",
                  fontSize: "0.88rem",
                  lineHeight: 1.6,
                  boxShadow: "var(--shadow-sm)"
                }}>
                  <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>

                  {/* Suggested Quick Questions */}
                  {msg.suggestedQuestions ? (
                    <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                        Suggested Questions
                      </span>
                      {msg.suggestedQuestions.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(q)}
                          style={{
                            textAlign: "left",
                            background: "#ffffff",
                            border: "1px solid #bfdbfe",
                            borderRadius: "6px",
                            padding: "0.4rem 0.75rem",
                            fontSize: "0.8rem",
                            color: "#1e40af",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                          }}
                        >
                          → {q}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
          {loading && (
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic", marginLeft: "2.5rem" }}>
              Copilot is generating response...
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div style={{ padding: "1rem", borderTop: "1px solid #e2e8f0", background: "#ffffff", display: "flex", gap: "0.75rem" }}>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about B+ Trees, ACID, query tuning, or create a mock quiz..."
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #cbd5e1",
              fontSize: "0.9rem",
              outline: "none"
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "0.75rem 1.25rem",
              borderRadius: "0.5rem",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              fontWeight: 600,
              fontSize: "0.88rem",
              cursor: "pointer",
              boxShadow: "var(--glow-sapphire)"
            }}
          >
            <Send size={15} />
            <span>Send</span>
          </button>
        </div>

      </div>
    </div>
  );
}
