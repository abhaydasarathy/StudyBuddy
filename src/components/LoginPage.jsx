import React, { useState, useEffect } from "react";
import { fetchGoogleAuthUrl } from "../services/api";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "error") {
      setErrorMessage(params.get("msg") || "Authentication failed. Please grant Google permissions.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchGoogleAuthUrl();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No authorization URL returned by server.");
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
      if (err.message === "Failed to fetch" || err.name === "TypeError") {
        setErrorMessage("Cannot connect to backend server. If deployed on Vercel, please set VITE_API_URL to your live backend URL in Vercel Project Settings.");
      } else {
        setErrorMessage(err.message || "Failed to initialize Google Sign-In.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="login-viewport">
      {/* Dynamic inline styles for scoped animations & tokens */}
      <style>{`
        :root {
          --color-primary: #4F6EF7;
          --color-bg: #0F1729;
          --color-surface: rgba(255, 255, 255, 0.05);
          --color-text: #E8EDF5;
        }

        .login-viewport {
          position: relative;
          min-height: 100vh;
          width: 100%;
          background-color: var(--color-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: var(--color-text);
          padding: 1.5rem;
          box-sizing: border-box;
        }

        /* Subtle animated background grid */
        .login-grid-bg {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 60%, transparent 100%);
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 60%, transparent 100%);
          pointer-events: none;
        }

        /* Floating background soft orbs */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.35;
          pointer-events: none;
          will-change: transform;
        }

        .orb-1 {
          width: 480px;
          height: 480px;
          background: radial-gradient(circle, #4F6EF7 0%, rgba(79, 110, 247, 0) 70%);
          top: -120px;
          left: -80px;
          animation: floatOrb1 16s ease-in-out infinite alternate;
        }

        .orb-2 {
          width: 520px;
          height: 520px;
          background: radial-gradient(circle, #7928CA 0%, rgba(121, 40, 202, 0) 70%);
          bottom: -150px;
          right: -100px;
          animation: floatOrb2 20s ease-in-out infinite alternate;
        }

        .orb-3 {
          width: 320px;
          height: 320px;
          background: radial-gradient(circle, #00DFD8 0%, rgba(0, 223, 216, 0) 70%);
          top: 45%;
          right: 25%;
          animation: floatOrb3 18s ease-in-out infinite alternate;
          opacity: 0.2;
        }

        @keyframes floatOrb1 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, 80px) scale(1.1); }
          100% { transform: translate(-40px, 40px) scale(0.95); }
        }

        @keyframes floatOrb2 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-80px, -60px) scale(1.15); }
          100% { transform: translate(50px, -30px) scale(0.9); }
        }

        @keyframes floatOrb3 {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-70px, 50px) scale(1.2); }
        }

        /* Glassmorphism Auth Card */
        .auth-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 28px;
          padding: 2.75rem 2.25rem;
          box-shadow: 
            0 25px 60px -15px rgba(0, 0, 0, 0.7),
            0 0 50px rgba(79, 110, 247, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
          text-align: center;
          box-sizing: border-box;
          animation: cardFadeIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes cardFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Pill Badge */
        .feature-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(79, 110, 247, 0.12);
          border: 1px solid rgba(79, 110, 247, 0.3);
          color: #93C5FD;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          margin-bottom: 1.5rem;
        }

        /* Google CTA Button */
        .google-cta-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background-color: #FFFFFF;
          color: #1F2937;
          border: none;
          border-radius: 9999px;
          padding: 0.95rem 1.5rem;
          font-size: 0.98rem;
          font-weight: 600;
          font-family: 'Plus Jakarta Sans', sans-serif;
          cursor: pointer;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 14px 0 rgba(0, 0, 0, 0.25);
          margin-top: 1.75rem;
        }

        .google-cta-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px -2px rgba(255, 255, 255, 0.35), 0 0 15px rgba(255, 255, 255, 0.2);
          background-color: #FFFFFF;
        }

        .google-cta-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .google-cta-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Spinner */
        .btn-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid #D1D5DB;
          border-top-color: #1F2937;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .auth-card {
            padding: 2.25rem 1.5rem;
            border-radius: 22px;
          }
        }
      `}</style>

      {/* Grid Pattern */}
      <div className="login-grid-bg" />

      {/* Soft Glow Orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Glassmorphism Card */}
      <div className="auth-card">
        
        {/* Feature Pill */}
        <div className="feature-pill">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          <span>SRM University Academic Companion</span>
        </div>

        {/* StudyBuddy Brand Logo SVG */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginBottom: "0.5rem" }}>
          <div style={{
            width: "44px",
            height: "44px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #4F6EF7 0%, #2563EB 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 20px -4px rgba(79, 110, 247, 0.5)"
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
              <path d="M6 6h10"/>
              <path d="M6 10h10"/>
              <path d="m9 16 2 2 4-4"/>
            </svg>
          </div>
          <span style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: "1.9rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "#FFFFFF"
          }}>
            Study<span style={{ color: "var(--color-primary)" }}>Buddy</span>
          </span>
        </div>

        {/* Tagline */}
        <p style={{
          fontSize: "1.02rem",
          color: "#94A3B8",
          marginTop: "0.6rem",
          marginBottom: "1.75rem",
          lineHeight: 1.5,
          fontWeight: 400
        }}>
          Find your perfect study partner.<br />
          <strong style={{ color: "#F1F5F9", fontWeight: 600 }}>Powered by AI.</strong>
        </p>

        {/* Error notification if applicable */}
        {errorMessage && (
          <div style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "12px",
            padding: "0.75rem 1rem",
            color: "#FCA5A5",
            fontSize: "0.82rem",
            marginBottom: "1.25rem",
            textAlign: "left",
            lineHeight: 1.4
          }}>
            {errorMessage}
          </div>
        )}

        {/* Single CTA: Continue with Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="google-cta-btn"
          title="Sign in with your Google account"
        >
          {loading ? (
            <>
              <div className="btn-spinner" />
              <span>Connecting to Google...</span>
            </>
          ) : (
            <>
              {/* Official Google 'G' SVG Logo */}
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.27-2.1 3.645-5.18 3.645-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.1-6.68-4.93H1.26v3.15C3.25 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.32 14.27c-.24-.73-.38-1.5-.38-2.27s.14-1.54.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.06-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.64 1.26 6.58l4.06 3.15c.94-2.83 3.58-4.98 6.68-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Terms & Privacy Note */}
        <p style={{
          fontSize: "0.76rem",
          color: "#64748B",
          marginTop: "1.6rem",
          lineHeight: 1.55,
          marginInline: "auto",
          maxWidth: "340px"
        }}>
          By continuing, you agree to our Terms. Your Google account is used only for identity and calendar access.
        </p>

      </div>
    </div>
  );
}
