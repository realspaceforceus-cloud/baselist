import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./global.css";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import { BaseListProvider } from "@/context/BaseListContext";
import { AuthDialogProvider } from "@/context/AuthDialogContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { SignInDialog } from "@/components/auth/SignInDialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ListingDetail from "./pages/ListingDetail";
import Messages from "./pages/Messages";
import Moderation from "./pages/Moderation";
import MyListings from "./pages/MyListings";
import NotFound from "./pages/NotFound";
import Post from "./pages/Post";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import FAQ from "./pages/FAQ";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Guidelines from "./pages/Guidelines";
import Contact from "./pages/Contact";
import Home from "./pages/Home";
import AdminPanel from "./pages/AdminPanel";
import ResetPassword from "./pages/ResetPassword";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import React from "react";

const queryClient = new QueryClient();

const AppContent = (): JSX.Element => {
  return (
    <Routes>
      {/* Main app routes */}
      <Route element={<AppShell />}>
        {/* Public pages - accessible to all */}
        <Route index element={<Home />} />
        <Route path="listing/:listingId" element={<ListingDetail />} />
        <Route path="faq" element={<FAQ />} />
        <Route path="terms" element={<Terms />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="guidelines" element={<Guidelines />} />
        <Route path="contact" element={<Contact />} />
        <Route path="profile/:memberId" element={<Profile />} />
        <Route path="reset-password" element={<ResetPassword />} />

        {/* Protected pages - require authentication */}
        <Route
          path="post"
          element={
            <ProtectedRoute>
              <Post />
            </ProtectedRoute>
          }
        />
        <Route
          path="messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />
        <Route
          path="messages/:threadId"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />
        <Route
          path="my-listings"
          element={
            <ProtectedRoute>
              <MyListings />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Admin pages - require authentication + admin role */}
        <Route
          path="moderation"
          element={
            <ProtectedRoute requireAdmin>
              <Moderation />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = (): JSX.Element => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthDialogProvider>
          <SettingsProvider>
            <BaseListProvider>
              <AppContent />
              <SignInDialog />
              <Toaster />
              <Sonner />
            </BaseListProvider>
          </SettingsProvider>
        </AuthDialogProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
