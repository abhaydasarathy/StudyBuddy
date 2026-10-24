import React, { useState, useEffect, useRef } from "react";
import { 
  User, 
  BookOpen, 
  Clock, 
  Sparkles, 
  Check, 
  Save, 
  GraduationCap, 
  Mail, 
  MapPin,
  ListPlus,
  Search,
  AlertTriangle,
  X,
  Plus,
  Camera,
  Upload,
  Trash2,
  Loader2
} from "lucide-react";
import { 
  fetchCourses, 
  fetchUserCourses, 
  enrollUserCourse, 
  removeUserCourse,
  uploadUserAvatar,
  removeUserAvatar
} from "../services/api";
import UserAvatar from "./UserAvatar";

export default function SettingsView({ user, onUpdateUser, onAvatarChange }) {
  const [formData, setFormData] = useState({
    name: user?.name || "",
    university: user?.university || "",
    department: user?.department || "",
    year: user?.year || "",
    study_goals: user?.study_goals || "",
    bio: user?.bio || "",
    courses: user?.courses || [],
    preferred_methods: user?.preferred_methods || [],
    weekly_availability: user?.weekly_availability || []
  });

  // Profile Photo Upload State
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  // Keep formData in sync if user changes
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || prev.name,
        university: user.university || prev.university,
        department: user.department || prev.department,
        year: user.year || prev.year,
        study_goals: user.study_goals || prev.study_goals,
        bio: user.bio || prev.bio,
        courses: user.courses || prev.courses,
        preferred_methods: user.preferred_methods || prev.preferred_methods,
        weekly_availability: user.weekly_availability || prev.weekly_availability
      }));
    }
  }, [user]);

  // SRM Course Catalogue State
  const [catalogue, setCatalogue] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loadingCatalogue, setLoadingCatalogue] = useState(false);

  const [newMethod, setNewMethod] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Load SRM catalogue & current student enrollments on mount
  useEffect(() => {
    async function loadCatalogueData() {
      setLoadingCatalogue(true);
      try {
        const [catData, userCourseData] = await Promise.all([
          fetchCourses(),
          fetchUserCourses()
        ]);
        setCatalogue(catData.courses || []);
        setEnrolledCourses(userCourseData.courses || []);
      } catch (err) {
        console.warn("Could not load SRM catalogue:", err.message);
      } finally {
        setLoadingCatalogue(false);
      }
    }
    loadCatalogueData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateUser(formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      alert("Failed to save profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Enroll course from SRM catalogue
  const handleSelectCourse = async (course) => {
    // Check if already enrolled
    const alreadyEnrolled = enrolledCourses.some((c) => c.code === course.code && c.title === course.title);
    if (alreadyEnrolled) {
      setFeedback({ type: "warning", message: `Already enrolled in ${course.code} - ${course.title}` });
      setTimeout(() => setFeedback(null), 3000);
      setIsDropdownOpen(false);
      return;
    }

    try {
      await enrollUserCourse(course.id);
      setEnrolledCourses((prev) => [...prev, course]);
      setFormData((prev) => ({
        ...prev,
        courses: [...prev.courses, `${course.code}: ${course.title}`]
      }));
      setFeedback({ type: "success", message: `Enrolled in ${course.code} (${course.title})` });
      setCourseSearch("");
      setIsDropdownOpen(false);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  // Remove enrolled course
  const handleRemoveCourse = async (course) => {
    try {
      if (course.id) {
        await removeUserCourse(course.id);
      }
      setEnrolledCourses((prev) => prev.filter((c) => c.id !== course.id));
      setFormData((prev) => ({
        ...prev,
        courses: prev.courses.filter((c) => !c.includes(course.code))
      }));
      setFeedback({ type: "success", message: `Removed ${course.code} from profile` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({ type: "error", message: "Failed to remove course: " + err.message });
    }
  };

  const addMethod = () => {
    if (!newMethod.trim()) return;
    setFormData((prev) => ({ ...prev, preferred_methods: [...prev.preferred_methods, newMethod.trim()] }));
    setNewMethod("");
  };

  const removeMethod = (idx) => {
    setFormData((prev) => ({ ...prev, preferred_methods: prev.preferred_methods.filter((_, i) => i !== idx) }));
  };

  // Filter catalogue by search query
  const filteredCourses = catalogue.filter((c) => {
    if (!courseSearch.trim()) return true;
    const q = courseSearch.toLowerCase();
    return c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || (c.department && c.department.toLowerCase().includes(q));
  });

  // Handle local file selection with validation
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    const allowedExts = [".jpg", ".jpeg", ".png", ".webp"];

    if (!allowedTypes.includes(file.type.toLowerCase()) && !allowedExts.includes(ext)) {
      setFeedback({
        type: "error",
        message: "Invalid file format. Please choose a JPG, JPEG, PNG, or WebP image."
      });
      setTimeout(() => setFeedback(null), 4000);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setFeedback({
        type: "error",
        message: `File size too large (${sizeMb} MB). Maximum allowed size is 5 MB.`
      });
      setTimeout(() => setFeedback(null), 4000);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Generate local preview
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSelectedFile(file);
    setFeedback({
      type: "success",
      message: `Selected "${file.name}". Click "Save Photo" to apply.`
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Cancel pending preview
  const handleCancelPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Upload and persist avatar
  const handleSaveAvatar = async () => {
    if (!selectedFile) return;
    setUploadingAvatar(true);
    try {
      const res = await uploadUserAvatar(selectedFile);
      const oldPreview = previewUrl;
      setPreviewUrl(null);
      setSelectedFile(null);
      if (oldPreview) {
        setTimeout(() => URL.revokeObjectURL(oldPreview), 500);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";

      setFeedback({
        type: "success",
        message: "Profile photo uploaded and saved successfully!"
      });
      setTimeout(() => setFeedback(null), 3500);

      if (onAvatarChange) onAvatarChange(res.user);
    } catch (err) {
      setFeedback({
        type: "error",
        message: "Upload failed: " + err.message
      });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Remove existing avatar
  const handleRemoveAvatar = async () => {
    if (!window.confirm("Are you sure you want to remove your profile photo? A neutral initials avatar will be shown instead.")) {
      return;
    }

    setRemovingAvatar(true);
    try {
      const res = await removeUserAvatar();
      handleCancelPreview();
      setFeedback({
        type: "success",
        message: "Profile photo removed."
      });
      setTimeout(() => setFeedback(null), 3500);

      if (onAvatarChange) onAvatarChange(res.user);
    } catch (err) {
      setFeedback({
        type: "error",
        message: "Failed to remove photo: " + err.message
      });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setRemovingAvatar(false);
    }
  };

  return (
    <div style={{ maxWidth: "850px", margin: "2rem auto", padding: "0 1.5rem" }}>
      
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
            backgroundColor: feedback.type === "success" ? "#ecfdf5" : feedback.type === "warning" ? "#fffbeb" : "#fef2f2",
            border: feedback.type === "success" ? "1px solid #a7f3d0" : feedback.type === "warning" ? "1px solid #fde68a" : "1px solid #fecaca",
            color: feedback.type === "success" ? "#065f46" : feedback.type === "warning" ? "#b45309" : "#991b1b",
            fontSize: "0.88rem",
            fontWeight: 500,
            boxShadow: "var(--shadow-sm)"
          }}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Title */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          Student Profile & Matching Settings
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Your profile and SRM course selections determine 40% of mutual match compatibility and study squad focus.
        </p>
      </div>

      <form onSubmit={handleSave} className="card-elevated" style={{ padding: "1.75rem", borderRadius: "1rem" }}>
        
        {/* Profile Photo Management Section */}
        <div style={{
          padding: "1.25rem",
          borderRadius: "0.75rem",
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          marginBottom: "1.5rem"
        }}>
          <label style={{
            display: "block",
            fontSize: "0.82rem",
            fontWeight: 700,
            color: "#0f172a",
            marginBottom: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.03em"
          }}>
            Profile Photo
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            {/* Photo Avatar Preview */}
            <div style={{ position: "relative" }}>
              <div style={{
                width: "88px",
                height: "88px",
                borderRadius: "50%",
                overflow: "hidden",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                border: previewUrl ? "3px solid #2563eb" : "3px solid #ffffff",
                backgroundColor: "#e2e8f0"
              }}>
                <UserAvatar 
                  src={previewUrl || user?.avatar} 
                  name={user?.name || formData.name || "Student"} 
                  size={88}
                />
              </div>

              {previewUrl && (
                <span style={{
                  position: "absolute",
                  bottom: "-6px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: "9999px",
                  whiteSpace: "nowrap"
                }}>
                  Preview
                </span>
              )}
            </div>

            {/* Photo Actions & Validation Guidelines */}
            <div style={{ flex: 1, minWidth: "240px" }}>
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />

              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                {previewUrl ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveAvatar}
                      disabled={uploadingAvatar}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        backgroundColor: "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "0.5rem",
                        padding: "0.55rem 1rem",
                        fontSize: "0.84rem",
                        fontWeight: 600,
                        cursor: uploadingAvatar ? "not-allowed" : "pointer",
                        boxShadow: "var(--glow-sapphire)"
                      }}
                    >
                      {uploadingAvatar ? (
                        <>
                          <Loader2 size={16} className="spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          <span>Save Photo</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelPreview}
                      disabled={uploadingAvatar}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        backgroundColor: "#ffffff",
                        color: "#64748b",
                        border: "1px solid #cbd5e1",
                        borderRadius: "0.5rem",
                        padding: "0.55rem 0.85rem",
                        fontSize: "0.84rem",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      <X size={15} />
                      <span>Cancel</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        backgroundColor: "#ffffff",
                        color: "#0f172a",
                        border: "1px solid #cbd5e1",
                        borderRadius: "0.5rem",
                        padding: "0.55rem 1rem",
                        fontSize: "0.84rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        boxShadow: "var(--shadow-sm)"
                      }}
                    >
                      <Upload size={16} color="#2563eb" />
                      <span>{user?.avatar ? "Change Photo" : "Upload Photo"}</span>
                    </button>

                    {user?.avatar && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        disabled={removingAvatar}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          backgroundColor: "#fff1f2",
                          color: "#be123c",
                          border: "1px solid #fecdd3",
                          borderRadius: "0.5rem",
                          padding: "0.55rem 0.85rem",
                          fontSize: "0.84rem",
                          fontWeight: 600,
                          cursor: removingAvatar ? "not-allowed" : "pointer"
                        }}
                      >
                        {removingAvatar ? (
                          <>
                            <Loader2 size={15} className="spin" />
                            <span>Removing...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 size={15} />
                            <span>Remove Photo</span>
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>

              <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
                Supports JPG, JPEG, PNG, or WebP. Maximum file size: 5 MB.
                {user?.google_id && !user?.avatar?.includes("/uploads/") && user?.avatar && (
                  <span style={{ display: "block", color: "#10b981", marginTop: "2px", fontWeight: 500 }}>
                    ● Initial photo synced from verified Google profile
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
              Full Name
            </label>
            <input 
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
              University
            </label>
            <input 
              type="text"
              value={formData.university}
              onChange={(e) => setFormData({ ...formData, university: e.target.value })}
              style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              required
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
              Department / Major
            </label>
            <input 
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
              Academic Year
            </label>
            <input 
              type="text"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              required
            />
          </div>
        </div>

        {/* Bio */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
            Biography & Study Style
          </label>
          <textarea 
            rows={3}
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", border: "1px solid #cbd5e1", resize: "vertical" }}
          />
        </div>

        {/* Study Goals */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
            Current Sprint Target / Exam Goal
          </label>
          <input 
            type="text"
            value={formData.study_goals}
            onChange={(e) => setFormData({ ...formData, study_goals: e.target.value })}
            placeholder="e.g. Master B+ Trees, ACID transactions, and score 90%+ on CS145 Midterm"
            style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
          />
        </div>

        {/* SRM COURSE CATALOGUE SELECTOR (PHASE 6 & 7) */}
        <div style={{ marginBottom: "1.75rem", background: "#f8fafc", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
              <BookOpen size={16} color="#2563eb" />
              <span>SRM Course Catalogue (Data-Driven Canonical Selection)</span>
            </label>
            <span style={{ fontSize: "0.75rem", color: "#2563eb", fontWeight: 600 }}>
              {catalogue.length} Canonical Courses in SQLite
            </span>
          </div>
          
          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.75rem", lineHeight: 1.4 }}>
            Select courses directly from the official SRM syllabus catalogue. Selecting a course normalizes your enrollment in the database and updates matching compatibility.
          </p>

          {/* Searchable Dropdown Input */}
          <div style={{ position: "relative", marginBottom: "1rem" }}>
            <div style={{ position: "relative" }}>
              <Search size={16} color="#94a3b8" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
              <input 
                type="text"
                value={courseSearch}
                onChange={(e) => {
                  setCourseSearch(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Search courses by code (e.g. 21CSC201J) or title (e.g. Algorithms)..."
                style={{
                  width: "100%",
                  padding: "0.6rem 0.75rem 0.6rem 2.25rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  background: "#ffffff"
                }}
              />
            </div>

            {/* Dropdown Options List */}
            {isDropdownOpen && (
              <div 
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: "4px",
                  maxHeight: "260px",
                  overflowY: "auto",
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  boxShadow: "var(--shadow-lg)",
                  zIndex: 30
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.75rem", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b" }}>
                    Select Course to Enroll ({filteredCourses.length} matches)
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setIsDropdownOpen(false)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "#64748b" }}
                  >
                    Close
                  </button>
                </div>

                {filteredCourses.length === 0 ? (
                  <div style={{ padding: "1rem", textAlign: "center", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    No matching courses found in SRM catalogue.
                  </div>
                ) : (
                  filteredCourses.map((c) => {
                    const isEnrolled = enrolledCourses.some((ec) => ec.code === c.code && ec.title === c.title);

                    return (
                      <div
                        key={c.id}
                        onClick={() => !isEnrolled && handleSelectCourse(c)}
                        style={{
                          padding: "0.65rem 0.85rem",
                          borderBottom: "1px solid #f1f5f9",
                          cursor: isEnrolled ? "default" : "pointer",
                          background: isEnrolled ? "#f8fafc" : "#ffffff",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1e40af" }}>
                              {c.code}
                            </span>
                            <span style={{ fontSize: "0.85rem", color: "#0f172a" }}>
                              {c.title}
                            </span>
                            {c.conflict_flag ? (
                              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#b45309", background: "#fef3c7", padding: "1px 6px", borderRadius: "4px" }} title={c.conflict_note}>
                                Flagged Conflict
                              </span>
                            ) : null}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            {c.category} • {c.department}
                          </div>
                        </div>

                        {isEnrolled ? (
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: "9999px" }}>
                            Enrolled
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#2563eb" }}>
                            + Select
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Currently Enrolled Courses Chips */}
          <div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>
              Active Enrolled Courses ({enrolledCourses.length})
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {enrolledCourses.map((c) => (
                <span 
                  key={c.id || c.code} 
                  style={{ 
                    display: "inline-flex", 
                    alignItems: "center", 
                    gap: "6px", 
                    background: "#eff6ff", 
                    color: "#1e40af", 
                    padding: "4px 10px", 
                    borderRadius: "9999px", 
                    fontSize: "0.8rem", 
                    border: "1px solid #bfdbfe",
                    fontWeight: 500
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{c.code}:</span>
                  <span>{c.title}</span>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveCourse(c)} 
                    style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700, color: "#93c5fd", padding: "0 2px" }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Preferred Learning Methods */}
        <div style={{ marginBottom: "1.75rem" }}>
          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
            Preferred Learning Methods
          </label>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <input 
              type="text"
              value={newMethod}
              onChange={(e) => setNewMethod(e.target.value)}
              placeholder="e.g. Practice Exams, Whiteboarding, Pomodoro 50/10"
              style={{ flex: 1, padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
            />
            <button
              type="button"
              onClick={addMethod}
              style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "#f1f5f9", border: "1px solid #cbd5e1", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem" }}
            >
              Add Method
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {formData.preferred_methods.map((m, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#f1f5f9", color: "#334155", padding: "4px 10px", borderRadius: "9999px", fontSize: "0.8rem", border: "1px solid #e2e8f0" }}>
                <span>{m}</span>
                <span onClick={() => removeMethod(i)} style={{ cursor: "pointer", fontWeight: 700, color: "#94a3b8" }}>×</span>
              </span>
            ))}
          </div>
        </div>

        {/* Save Profile Button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.75rem", borderTop: "1px solid #e2e8f0", paddingTop: "1.25rem" }}>
          {savedSuccess && (
            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#10b981", fontSize: "0.85rem", fontWeight: 600 }}>
              <Check size={16} />
              Saved to SQLite database!
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "0.65rem 1.5rem",
              borderRadius: "0.5rem",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              fontWeight: 600,
              fontSize: "0.88rem",
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "var(--glow-sapphire)"
            }}
          >
            <Save size={16} />
            <span>{saving ? "Saving..." : "Save Profile"}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
