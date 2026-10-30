import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  Home,
  LayoutGrid,
  Calendar,
  Package,
  BarChart3,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon,
  Loader2,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useTheme } from "@/components/theme/theme-provider"

/**
 * Reusable horizontal Navbar matching the reference design.
 * Order: Home icon, Dashboard, Rental, Products, Reporting
 * Right: Theme toggle, User pill avatar + dropdown (My Profile, Sign Out)
 */
export default function Navbar() {
  const { user, logoutUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const dropdownRef = useRef(null)
  const userButtonRef = useRef(null)

  // Track path to close menus on navigation (React recommended render adjustment pattern)
  const [prevPath, setPrevPath] = useState(location.pathname)
  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname)
    setIsDropdownOpen(false)
    setIsMobileMenuOpen(false)
  }

  // Determine user initial and truncated display name
  const displayName = user?.name || user?.email?.split("@")[0] || "User"
  const userInitial = (displayName.charAt(0) || "U").toUpperCase()

  // Resolve profile avatar image URL (from user object or persisted cache)
  const avatarUrl =
    user?.profilePic ||
    user?.avatar ||
    user?.profile_avatar?.url ||
    user?.profile_avatar?.secure_url ||
    user?.avatarUrl ||
    (typeof window !== "undefined" ? localStorage.getItem("user_profile_pic") : null) ||
    ""

  // Format short email/name with ellipsis (e.g., "prithivi.code...")
  const emailPrefix = user?.email ? user.email.split("@")[0] : displayName
  const truncatedHandle =
    emailPrefix.length > 13
      ? `${emailPrefix.slice(0, 12)}…`
      : emailPrefix

  // Navigation items strictly in required order
  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutGrid },
    { name: "Rental", href: "/rental", icon: Calendar },
    { name: "Products", href: "/products", icon: Package },
    { name: "Reporting", href: "/reporting", icon: BarChart3 },
  ]

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        userButtonRef.current &&
        !userButtonRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsDropdownOpen(false)
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await logoutUser()
      navigate("/login")
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setLoggingOut(false)
    }
  }

  const isProfileActive = location.pathname === "/profile"

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-card/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section: Home button + Main Navigation */}
          <div className="flex items-center gap-6 sm:gap-8">
            {/* Home Icon: Black rounded square in reference */}
            <Link
              to="/dashboard"
              className="group flex items-center justify-center size-9 rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 active:scale-95 transition-all shadow-xs shrink-0"
              aria-label="Home"
            >
              <Home className="size-4 transition-transform group-hover:scale-110" />
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 sm:gap-2" aria-label="Main navigation">
              {navItems.map((item) => {
                const Icon = item.icon
                // Highlight based on current route. Do NOT highlight Dashboard when on /profile
                const isActive = location.pathname === item.href

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "text-foreground font-semibold bg-neutral-100 dark:bg-neutral-800 shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60"
                    }`}
                  >
                    <Icon className={`size-4 ${isActive ? "text-foreground" : "text-muted-foreground"}`} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right section: Theme Toggle + User Dropdown */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center size-9 rounded-xl border border-border/80 bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 cursor-pointer"
              aria-label="Toggle theme"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <Moon className="size-4 text-blue-400 transition-transform rotate-0" />
              ) : (
                <Sun className="size-4 text-amber-500 transition-transform rotate-0" />
              )}
            </button>

            {/* User Dropdown Trigger */}
            <div className="relative">
              <button
                ref={userButtonRef}
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl border transition-all text-xs sm:text-sm font-medium select-none cursor-pointer ${
                  isDropdownOpen || isProfileActive
                    ? "border-blue-200/80 bg-blue-50/60 dark:border-blue-900/60 dark:bg-blue-950/30 text-foreground"
                    : "border-border/80 bg-background hover:bg-muted text-foreground"
                }`}
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
              >
                {/* User Avatar: image or initials badge */}
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="size-6 sm:size-7 rounded-full object-cover shrink-0 border border-blue-200/60 dark:border-blue-800/60"
                  />
                ) : (
                  <span className="size-6 sm:size-7 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-800/60">
                    {userInitial}
                  </span>
                )}

                {/* Truncated Name / Email */}
                <span className="font-medium max-w-[100px] sm:max-w-[130px] truncate text-foreground">
                  {truncatedHandle}
                </span>

                {/* Dropdown Chevron */}
                <ChevronDown
                  className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div
                  ref={dropdownRef}
                  className="absolute right-0 mt-2 w-48 rounded-2xl border border-border/80 bg-card p-1.5 shadow-xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95 z-50 text-foreground"
                  role="menu"
                >
                  {/* My Profile */}
                  <Link
                    to="/profile"
                    onClick={() => setIsDropdownOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm transition-colors ${
                      isProfileActive
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 font-semibold border border-blue-200/50 dark:border-blue-800/40"
                        : "text-foreground hover:bg-muted font-medium"
                    }`}
                    role="menuitem"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="size-4 rounded-full object-cover"
                      />
                    ) : (
                      <User className="size-4 text-blue-600 dark:text-blue-400" />
                    )}
                    <span>My profile</span>
                  </Link>

                  {/* Sign Out */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors mt-0.5 cursor-pointer"
                    role="menuitem"
                  >
                    {loggingOut ? (
                      <Loader2 className="size-4 animate-spin text-red-500" />
                    ) : (
                      <LogOut className="size-4 text-red-500" />
                    )}
                    <span>{loggingOut ? "Signing out…" : "Sign out"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="md:hidden flex items-center justify-center size-9 rounded-xl border border-border/80 bg-background text-foreground hover:bg-muted cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border/80 bg-card px-4 pt-3 pb-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                  isActive
                    ? "text-foreground font-semibold bg-neutral-100 dark:bg-neutral-800"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>
      )}
    </header>
  )
}
