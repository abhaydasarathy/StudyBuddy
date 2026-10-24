import React, { useState } from "react";

// Deterministic aesthetic color generator based on name
function getInitialsColor(name = "") {
  const colors = [
    { bg: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)", text: "#ffffff" }, // Sapphire
    { bg: "linear-gradient(135deg, #312e81 0%, #6366f1 100%)", text: "#ffffff" }, // Indigo
    { bg: "linear-gradient(135deg, #064e3b 0%, #10b981 100%)", text: "#ffffff" }, // Emerald
    { bg: "linear-gradient(135deg, #581c87 0%, #a855f7 100%)", text: "#ffffff" }, // Purple
    { bg: "linear-gradient(135deg, #134e4a 0%, #14b8a6 100%)", text: "#ffffff" }, // Teal
    { bg: "linear-gradient(135deg, #0f172a 0%, #475569 100%)", text: "#ffffff" }, // Slate
  ];

  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Extract clean 1-2 character initials
export function getInitials(name = "") {
  if (!name || typeof name !== "string") return "SB";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SB";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Normalize avatar URL (handles relative /uploads/ URLs from backend)
export function normalizeAvatarUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  // If stored as relative /uploads/ path
  const backendBase = "http://localhost:5000";
  return `${backendBase}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

export default function UserAvatar({
  src,
  name = "Student",
  size = 40,
  variant = "circle", // 'circle' | 'rounded' | 'banner'
  style = {},
  className = "",
  alt
}) {
  const [imgError, setImgError] = useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [src]);

  const normalizedSrc = normalizeAvatarUrl(src);
  const initials = getInitials(name);
  const colorScheme = getInitialsColor(name);

  // If used as a full card banner (e.g. Discover card 260px banner)
  if (variant === "banner") {
    if (normalizedSrc && !imgError) {
      return (
        <img
          src={normalizedSrc}
          alt={alt || name}
          onError={() => setImgError(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            ...style
          }}
          className={className}
        />
      );
    }

    // Neutral initials-based banner fallback (never substitutes a stranger's stock photo)
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0F1729 0%, #1E293B 50%, #0F1729 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          userSelect: "none",
          ...style
        }}
        className={className}
      >
        {/* Subtle grid background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            pointerEvents: "none"
          }}
        />

        {/* Central Initials Circle */}
        <div
          style={{
            width: "92px",
            height: "92px",
            borderRadius: "50%",
            background: colorScheme.bg,
            color: colorScheme.text,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2.2rem",
            fontWeight: 800,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            letterSpacing: "0.02em",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.25)",
            border: "2px solid rgba(255, 255, 255, 0.15)",
            zIndex: 2
          }}
        >
          {initials}
        </div>

        <span
          style={{
            marginTop: "0.6rem",
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "#94a3b8",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            zIndex: 2
          }}
        >
          Student Profile
        </span>
      </div>
    );
  }

  // Standard Avatar (circle or rounded)
  const isCircle = variant === "circle";
  const dim = typeof size === "number" ? `${size}px` : size;
  const fontSize = typeof size === "number" ? `${Math.max(11, Math.round(size * 0.38))}px` : "1rem";
  const borderRadius = isCircle ? "50%" : "10px";

  if (normalizedSrc && !imgError) {
    return (
      <img
        src={normalizedSrc}
        alt={alt || name}
        onError={() => setImgError(true)}
        style={{
          width: dim,
          height: dim,
          borderRadius,
          objectFit: "cover",
          flexShrink: 0,
          display: "block",
          ...style
        }}
        className={className}
      />
    );
  }

  // Fallback Initials Avatar
  return (
    <div
      style={{
        width: dim,
        height: dim,
        borderRadius,
        background: colorScheme.bg,
        color: colorScheme.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize,
        fontWeight: 700,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        flexShrink: 0,
        userSelect: "none",
        boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.2)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        ...style
      }}
      className={className}
      title={name}
    >
      {initials}
    </div>
  );
}
