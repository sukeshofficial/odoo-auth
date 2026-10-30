import * as React from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import LoginPage from "@/pages/LoginPage"
import SignupPage from "@/pages/SignupPage"
import ResetPasswordPage from "@/pages/ResetPasswordPage"
import DashboardPage from "@/pages/DashboardPage"
import UserProfilePage from "@/pages/UserProfilePage"
import WorkspacePlaceholderPage from "@/pages/WorkspacePlaceholderPage"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import AppLayout from "@/components/layout/AppLayout"
import { Calendar, Package, BarChart3 } from "lucide-react"

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/register" element={<SignupPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected Routes with Horizontal Navbar Layout */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout>
              <UserProfilePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/rental"
        element={
          <ProtectedRoute>
            <AppLayout>
              <WorkspacePlaceholderPage
                title="Rentals Workspace"
                description="Manage your ongoing garment rentals, returns, and delivery tracking."
                icon={Calendar}
              />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <AppLayout>
              <WorkspacePlaceholderPage
                title="Product Catalog"
                description="Browse sustainable rental fashion, accessories, and designer wear."
                icon={Package}
              />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reporting"
        element={
          <ProtectedRoute>
            <AppLayout>
              <WorkspacePlaceholderPage
                title="Reporting & Insights"
                description="View your rental activity, sustainability impact, and account statements."
                icon={BarChart3}
              />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Default Fallback Redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
