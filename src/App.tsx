import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, useBootstrap } from "@/context/AuthContext";
import LoginPage from "@/pages/LoginPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import { AppLayout } from "@/components/church/AppLayout";
import { DashboardSkeleton, AppShellSkeleton } from "@/components/church/skeletons";
import {
  DashboardPage,
  MembersPage,
  CellsPage,
  DepartmentsPage,
  AttendancePage,
  EventsPage,
  ReportsPage,
  SettingsPage,
  CommunicationsPage,
  FinancesPage,
  PrayerPage,
  DiscipleshipPage,
  AnnouncementsPage,
  TasksPage,
  MediaPage,
  ReportSubmissionsPage,
} from "@/pages/church/ChurchPages";
import type { PageId, Member, Cell, Fellowship, Department, Role } from "@/types/church";
import { useState, useEffect } from "react";

function isPastoralRole(role: Role) {
  return role === "Senior Pastor" || role === "Associate Pastor" || role === "Admin";
}

function ChurchApp() {
  const { user, pages } = useAuth();
  const { data, loading, reload } = useBootstrap(!!user);
  const [activePage, setActivePage] = useState<PageId>("dashboard");

  useEffect(() => {
    if (pages.length && !pages.includes(activePage)) {
      setActivePage(pages[0]);
    }
  }, [pages, activePage]);

  if (!user) return null;

  const layoutSettings = {
    name: (data?.settings?.name as string) || "Christ Embassy",
    logoUrl: data?.settings?.logoUrl as string | undefined,
    tagline: data?.settings?.tagline as string | undefined,
  };

  if (loading || !data) {
    return (
      <AppLayout
        activePage={activePage}
        onNavigate={setActivePage}
        pages={pages}
        user={user.member}
        settings={layoutSettings}
      >
        <DashboardSkeleton pastoral={isPastoralRole(user.member.role)} />
      </AppLayout>
    );
  }

  const props = {
    members: data.members as Member[],
    cells: data.cells as Cell[],
    fellowships: data.fellowships as Fellowship[],
    departments: data.departments as Department[],
    settings: data.settings,
    currentUser: user.member,
    onRefresh: reload,
  };

  const renderPage = () => {
    switch (activePage) {
      case "dashboard": return <DashboardPage {...props} />;
      case "members": return <MembersPage {...props} />;
      case "cells": return <CellsPage {...props} />;
      case "departments": return <DepartmentsPage {...props} />;
      case "attendance": return <AttendancePage {...props} />;
      case "events": return <EventsPage {...props} />;
      case "reports": return <ReportsPage {...props} />;
      case "settings": return <SettingsPage {...props} userAccount={user} />;
      case "communications": return <CommunicationsPage {...props} />;
      case "finances": return <FinancesPage {...props} />;
      case "prayer": return <PrayerPage {...props} />;
      case "discipleship": return <DiscipleshipPage {...props} />;
      case "announcements": return <AnnouncementsPage {...props} />;
      case "tasks": return <TasksPage {...props} />;
      case "media": return <MediaPage {...props} />;
      case "report-submissions": return <ReportSubmissionsPage {...props} />;
      default: return <DashboardPage {...props} />;
    }
  };

  return (
    <AppLayout
      activePage={activePage}
      onNavigate={setActivePage}
      pages={pages}
      user={user.member}
      settings={layoutSettings}
    >
      {renderPage()}
    </AppLayout>
  );
}

function ProtectedApp() {
  const { user, loading } = useAuth();
  if (loading) {
    return <AppShellSkeleton />;
  }
  if (!user) return <Navigate to="/" replace />;
  return <ChurchApp />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/app/*" element={<ProtectedApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
