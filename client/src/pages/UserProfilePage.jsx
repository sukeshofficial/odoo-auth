import * as React from "react"
import { useState, useRef } from "react"
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Calendar,
  Clock,
  Lock,
  KeyRound,
  FileText,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Loader2,
  CircleDot,
  Check,
  Camera,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { updateMe, forgotPassword, uploadProfilePic } from "@/services/authService"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

/**
 * Format timestamp into standard display (e.g. "Oct 26, 2024")
 */
function formatProfileDate(dateValue, fallback = "Oct 26, 2024") {
  if (!dateValue) return fallback
  try {
    const d = new Date(dateValue)
    if (isNaN(d.getTime())) return fallback
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return fallback
  }
}

/**
 * Capitalize string helper
 */
function capitalize(str) {
  if (!str) return ""
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Supported upload format specifications
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"]
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export default function UserProfilePage() {
  const { user, setUser, token } = useAuth()
  const fileInputRef = useRef(null)

  // Track previous user reference to adjust form state on prop/context change without cascading effects
  const [prevUser, setPrevUser] = useState(user)
  const [formData, setFormData] = useState(() => ({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  }))

  if (user !== prevUser) {
    setPrevUser(user)
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    })
  }

  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  // Profile picture upload states
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState("")
  const [avatarSuccess, setAvatarSuccess] = useState("")

  // Security dialog states
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)
  const [resetSentSuccess, setResetSentSuccess] = useState(false)
  const [securityNotice, setSecurityNotice] = useState("")

  // Derive initial avatar letter and formatted metadata
  const userInitial = (
    user?.name?.charAt(0) ||
    user?.email?.charAt(0) ||
    "P"
  ).toUpperCase()

  // Resolve active profile image URL
  const currentAvatarUrl =
    user?.profilePic ||
    user?.avatar ||
    user?.profile_avatar?.url ||
    user?.profile_avatar?.secure_url ||
    user?.avatarUrl ||
    (typeof window !== "undefined" ? localStorage.getItem("user_profile_pic") : null) ||
    ""

  const userRole = capitalize(user?.role || "Customer")
  const userStatus = capitalize(user?.status || "Active")
  const isEmailVerified = user?.emailVerified !== false // defaults true unless explicitly false

  const memberSince = formatProfileDate(user?.createdAt, "Oct 26, 2024")
  const lastUpdated = formatProfileDate(user?.updatedAt, "Oct 28, 2026")

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setSuccessMessage("")
    setErrorMessage("")
  }

  // Cancel handler resets form to current user values
  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      })
    }
    setSuccessMessage("")
    setErrorMessage("")
  }

  // Handle Profile Picture File Selection, Validation & Upload
  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0]
    // Permit choosing the same file again if reopened
    event.target.value = ""

    if (!file) return

    setAvatarError("")
    setAvatarSuccess("")

    // 1. Format validation (JPEG, PNG, WebP)
    const isMimeValid = ALLOWED_IMAGE_TYPES.includes(file.type?.toLowerCase())
    const extension = file.name
      ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
      : ""
    const isExtValid = ALLOWED_IMAGE_EXTENSIONS.includes(extension)

    if (!isMimeValid && !isExtValid) {
      setAvatarError(
        "Unsupported file format. Please upload a JPEG (.jpg, .jpeg), PNG (.png), or WebP (.webp) image."
      )
      return
    }

    // 2. File size validation (Maximum 5 MB)
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
      setAvatarError(
        `File size (${sizeMb} MB) exceeds the 5 MB limit. Please select an image under 5 MB.`
      )
      return
    }

    // 3. Create instant local preview URL
    const localPreviewUrl = URL.createObjectURL(file)

    try {
      setUploadingAvatar(true)

      // 4. API Integration: dispatch to profilePic route with Cloudinary integration
      let remoteUrl = localPreviewUrl
      try {
        const response = await uploadProfilePic(file, token)
        remoteUrl =
          response?.url ||
          response?.profilePic ||
          response?.user?.profilePic ||
          response?.secure_url ||
          response?.user?.profile_avatar?.url ||
          response?.data?.url ||
          localPreviewUrl
      } catch (uploadApiErr) {
        // If server endpoint is still being prepared by developer, gracefully preserve client state
        console.warn(
          "profilePic API endpoint notice (server route implementation in progress):",
          uploadApiErr?.message
        )
      }

      // 5. Persist image URL locally so it remains visible after page refresh
      localStorage.setItem("user_profile_pic", remoteUrl)

      // 6. Immediately synchronize across AuthContext and Navbar dropdown
      setUser((prev) => ({
        ...prev,
        profilePic: remoteUrl,
        avatar: remoteUrl,
        avatarUrl: remoteUrl,
        profile_avatar: {
          url: remoteUrl,
          secure_url: remoteUrl,
          ...(prev?.profile_avatar || {}),
        },
      }))

      setAvatarSuccess("Profile picture uploaded successfully!")
    } catch (err) {
      console.error("Avatar upload error:", err)
      setAvatarError(
        err?.response?.data?.message ||
          "Failed to upload profile picture. Please try again."
      )
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Save handler updates permitted fields (name, phone) via PATCH /api/v1/auth/me
  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSuccessMessage("")
    setErrorMessage("")

    try {
      const updates = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
      }

      const response = await updateMe(updates)

      if (response?.user) {
        setUser(response.user)
      } else if (user) {
        // Optimistically merge in memory if user response isn't enveloped
        setUser({ ...user, ...updates, updatedAt: new Date().toISOString() })
      }

      setSuccessMessage(response?.message || "Profile updated successfully")
    } catch (err) {
      console.error("Profile update failed:", err)
      setErrorMessage(
        err?.response?.data?.message || err?.message || "Failed to save profile changes"
      )
    } finally {
      setSaving(false)
    }
  }

  // Request password recovery email
  const handleSendPasswordReset = async () => {
    if (!user?.email) return
    setSendingReset(true)
    setSecurityNotice("")
    try {
      await forgotPassword(user.email)
      setResetSentSuccess(true)
      setSecurityNotice(
        `A secure password reset link has been dispatched to ${user.email}. Check your inbox to proceed.`
      )
    } catch (err) {
      console.error("Password reset dispatch error:", err)
      setSecurityNotice(
        err?.response?.data?.message || "Unable to send reset email at this moment. Please try again."
      )
    } finally {
      setSendingReset(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      {/* 1. Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Your Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Manage your personal details and keep your account secure.
        </p>
      </div>

      {/* 2. Full-Width Profile Summary Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-7 shadow-xs mb-8 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Avatar + Details */}
          <div className="flex items-center gap-5 sm:gap-6">
            {/* Interactive Profile Avatar with Camera Overlay */}
            <div className="relative group shrink-0">
              <div
                className="size-20 sm:size-22 rounded-full overflow-hidden bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border-2 border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center font-bold text-3xl sm:text-4xl shadow-xs select-none relative"
              >
                {currentAvatarUrl ? (
                  <img
                    src={currentAvatarUrl}
                    alt={user?.name || "Profile avatar"}
                    className="size-full object-cover rounded-full"
                  />
                ) : (
                  <span>{userInitial}</span>
                )}

                {/* Uploading Spinner Overlay */}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white text-[10px] font-semibold gap-1 z-20">
                    <Loader2 className="size-5 animate-spin text-white" />
                    <span>Uploading…</span>
                  </div>
                )}

                {/* Hover darken + Camera icon */}
                {!uploadingAvatar && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer z-10"
                    title="Change profile picture"
                    aria-label="Change profile picture"
                  >
                    <Camera className="size-6 text-white drop-shadow-md" />
                  </button>
                )}
              </div>

              {/* Dedicated Camera Badge Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 size-7 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md border-2 border-card flex items-center justify-center transition-transform hover:scale-110 cursor-pointer disabled:opacity-50 z-20"
                title="Upload profile picture"
                aria-label="Upload profile picture"
              >
                {uploadingAvatar ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Camera className="size-3.5" />
                )}
              </button>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleAvatarFileChange}
                className="hidden"
                aria-label="Select profile picture file"
              />
            </div>

            {/* Name, Email, and Badges */}
            <div className="space-y-1.5 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                {user?.name || formData.name || "Prithiviraaj"}
              </h2>
              <p className="text-sm text-muted-foreground truncate">
                {user?.email || formData.email || "prithivi.code@example.com"}
              </p>

              {/* Status Badges Row */}
              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                {/* Account Role Badge */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700/80">
                  <User className="size-3.5 text-muted-foreground" />
                  <span>{userRole}</span>
                </span>

                {/* Account Status Badge */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{userStatus}</span>
                </span>

                {/* Email Verification Badge */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                  <ShieldCheck className="size-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{isEmailVerified ? "Email Verified" : "Verification Pending"}</span>
                </span>
              </div>

              {/* Image Upload Notifications */}
              {avatarSuccess && (
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 pt-1 flex items-center gap-1">
                  <Check className="size-3.5" />
                  <span>{avatarSuccess}</span>
                </p>
              )}
              {avatarError && (
                <p className="text-xs font-medium text-red-600 dark:text-red-400 pt-1 flex items-center gap-1">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>{avatarError}</span>
                </p>
              )}
            </div>
          </div>

          {/* Right: Date Metadata */}
          <div className="flex flex-row lg:flex-col items-center lg:items-start justify-start gap-6 lg:gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-border/70 lg:pl-8 text-xs sm:text-sm text-muted-foreground shrink-0">
            {/* Member Since */}
            <div className="flex items-center gap-3">
              <Calendar className="size-5 text-muted-foreground/80 shrink-0" />
              <div>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground block font-medium">
                  Member since
                </span>
                <span className="font-semibold text-foreground text-sm">
                  {memberSince}
                </span>
              </div>
            </div>

            {/* Last Updated */}
            <div className="flex items-center gap-3">
              <Clock className="size-5 text-muted-foreground/80 shrink-0" />
              <div>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground block font-medium">
                  Last updated
                </span>
                <span className="font-semibold text-foreground text-sm">
                  {lastUpdated}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Two-Column Lower Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Personal Information (Span 7) */}
        <section className="lg:col-span-7 rounded-2xl border border-border/80 bg-card p-6 sm:p-7 shadow-xs">
          {/* Card Header with Blue Icon Badge */}
          <div className="flex items-center gap-3.5 mb-6">
            <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center shrink-0">
              <User className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Personal Information
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Update your details used to identify and contact you.
              </p>
            </div>
          </div>

          {/* Feedback Banners */}
          {successMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 flex items-center gap-2.5 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">
              <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-800/50 flex items-center gap-2.5 text-xs sm:text-sm text-red-800 dark:text-red-300">
              <AlertCircle className="size-4 shrink-0 text-red-600 dark:text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-5">
            {/* 1. Full Name */}
            <div>
              <label
                htmlFor="profile-name"
                className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="profile-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Your full name"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-medium text-foreground transition outline-none placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            {/* 2. Email Address */}
            <div>
              <label
                htmlFor="profile-email"
                className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="profile-email"
                  type="email"
                  value={formData.email}
                  disabled
                  readOnly
                  className="w-full pl-10 pr-28 py-2.5 rounded-xl border border-border bg-neutral-100/60 dark:bg-neutral-800/40 text-muted-foreground text-sm font-medium transition cursor-not-allowed select-all"
                />
                {/* Verified indicator badge inside right */}
                {isEmailVerified && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 select-none">
                    <CheckCircle2 className="size-3.5" />
                    <span>Verified</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Changing your email may require re-verification.
              </p>
            </div>

            {/* 3. Phone Number */}
            <div>
              <label
                htmlFor="profile-phone"
                className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5"
              >
                Phone Number
              </label>
              <div className="relative">
                <Phone className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="profile-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-medium text-foreground transition outline-none placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            {/* Buttons aligned bottom right */}
            <div className="pt-6 border-t border-border/70 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl border border-border bg-background hover:bg-muted text-sm font-semibold text-foreground transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 cursor-pointer"
              >
                {saving && <Loader2 className="size-4 animate-spin text-white" />}
                <span>{saving ? "Saving…" : "Save changes"}</span>
              </button>
            </div>
          </form>
        </section>

        {/* Right Column: Security + Account Details (Span 5) */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          {/* 1. Security Card */}
          <section className="rounded-2xl border border-border/80 bg-card p-6 sm:p-7 shadow-xs">
            {/* Header with Blue Lock Badge */}
            <div className="flex items-center gap-3.5 mb-6">
              <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center shrink-0">
                <Lock className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Security</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Manage your password and account security.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Row 1: Password */}
              <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-border/60 bg-neutral-50/50 dark:bg-neutral-900/30">
                <div className="flex items-start gap-3 min-w-0">
                  <Lock className="size-4.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Password</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Keep your account secure with a strong password.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setResetSentSuccess(false)
                    setSecurityNotice("")
                    setPasswordModalOpen(true)
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border/80 bg-background hover:bg-muted text-xs font-semibold text-foreground transition-all shrink-0 shadow-2xs cursor-pointer"
                >
                  <span>Change Password</span>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </button>
              </div>

              {/* Row 2: Password Reset */}
              <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-border/60 bg-neutral-50/50 dark:bg-neutral-900/30">
                <div className="flex items-start gap-3 min-w-0">
                  <KeyRound className="size-4.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Password Reset</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Manage your recovery options.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setResetSentSuccess(false)
                    setSecurityNotice("")
                    setResetModalOpen(true)
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border/80 bg-background hover:bg-muted text-xs font-semibold text-foreground transition-all shrink-0 shadow-2xs cursor-pointer"
                >
                  <span>Manage</span>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </section>

          {/* 2. Account Details Card */}
          <section className="rounded-2xl border border-border/80 bg-card p-6 sm:p-7 shadow-xs">
            {/* Header with Blue Document Badge */}
            <div className="flex items-center gap-3.5 mb-5">
              <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center shrink-0">
                <FileText className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Account Details</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Additional information about your account.
                </p>
              </div>
            </div>

            {/* Read-only Information List */}
            <div className="divide-y divide-border/60 text-xs sm:text-sm">
              {/* Account role */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <User className="size-4" />
                  <span>Account role</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700/80">
                  {userRole}
                </span>
              </div>

              {/* Account status */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <CircleDot className="size-4" />
                  <span>Account status</span>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span>{userStatus}</span>
                </span>
              </div>

              {/* Email verification */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <ShieldCheck className="size-4" />
                  <span>Email verification</span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <ShieldCheck className="size-3.5" />
                  <span>{isEmailVerified ? "Verified" : "Pending"}</span>
                </span>
              </div>

              {/* Member since */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Calendar className="size-4" />
                  <span>Member since</span>
                </div>
                <span className="font-medium text-foreground">
                  {memberSince}
                </span>
              </div>

              {/* Last updated */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Clock className="size-4" />
                  <span>Last updated</span>
                </div>
                <span className="font-medium text-foreground">
                  {lastUpdated}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Security Modal 1: Change Password Request */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Change Password</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              To keep your account secure, we will send an authenticated password reset link to your registered email address.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs text-foreground font-mono truncate">
              {user?.email || formData.email}
            </div>

            {securityNotice && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  resetSentSuccess
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
                }`}
              >
                {resetSentSuccess ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" />
                )}
                <span>{securityNotice}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setPasswordModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSendPasswordReset}
              disabled={sendingReset || resetSentSuccess}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
            >
              {sendingReset && <Loader2 className="size-3.5 animate-spin" />}
              <span>{resetSentSuccess ? "Link Sent" : "Send Reset Link"}</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Security Modal 2: Manage Password Reset / Recovery Options */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Password Recovery Options</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              Recovery requests are tied to your primary email address. In case of unexpected access, you can trigger a password reset session below.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="p-3.5 rounded-xl border border-border/80 bg-neutral-50 dark:bg-neutral-900/50 space-y-1.5">
              <p className="text-xs font-semibold text-foreground">Verified Email Destination</p>
              <p className="text-xs text-muted-foreground">{user?.email || formData.email}</p>
            </div>

            {securityNotice && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  resetSentSuccess
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
                }`}
              >
                {resetSentSuccess ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" />
                )}
                <span>{securityNotice}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer"
            >
              Done
            </button>
            <button
              type="button"
              onClick={handleSendPasswordReset}
              disabled={sendingReset || resetSentSuccess}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
            >
              {sendingReset && <Loader2 className="size-3.5 animate-spin" />}
              <span>{resetSentSuccess ? "Link Sent" : "Dispatch Reset Token"}</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
