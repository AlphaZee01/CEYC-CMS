import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth, useBootstrap } from "@/context/AuthContext";
import LoginPage from "@/pages/LoginPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import { AppLayout } from "@/components/church/AppLayout";
import { DashboardSkeleton, AppShellSkeleton } from "@/components/church/skeletons";
import {
  DashboardPage,
  MembersPage,
  MemberProfilePage,
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
import { PAGE_META } from "@/types/church";
import { useEffect } from "react";
import { Toaster } from "sonner";

const PAGE_IDS = new Set<PageId>(PAGE_META.map((p) => p.id));

function memberIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/app\/members\/([^/]+)/);
  return match?.[1] ?? null;
}

function pageFromPath(pathname: string): PageId {
  if (memberIdFromPath(pathname)) return "members";
  const segment = pathname.replace(/^\/app\/?/, "").split("/")[0];
  if (segment && PAGE_IDS.has(segment as PageId)) return segment as PageId;
  return "dashboard";
}

function pageToPath(page: PageId): string {
  return page === "dashboard" ? "/app" : `/app/${page}`;
}

function isPastoralRole(role: Role) {
  return role === "Senior Pastor" || role === "Associate Pastor" || role === "Admin";
}

function ChurchApp() {
  const { user, pages, branding } = useAuth();
  const { data, loading, reload } = useBootstrap(!!user);
  const location = useLocation();
  const navigate = useNavigate();
  const activePage = pageFromPath(location.pathname);
  const profileMemberId = memberIdFromPath(location.pathname);

  useEffect(() => {
    if (!pages.length || !user) return;
    if (profileMemberId) {
      if (profileMemberId !== user.member.id && !pages.includes("members")) {
        navigate(pageToPath(pages[0]), { replace: true });
      }
      return;
    }
    if (!pages.includes(activePage)) {
      navigate(pageToPath(pages[0]), { replace: true });
    }
  }, [pages, activePage, profileMemberId, navigate, user]);

  const setActivePage = (page: PageId) => {
    navigate(pageToPath(page));
  };

  if (!user) return null;

  const layoutSettings = {
    name: (data?.settings?.name as string) || branding.name,
    logoUrl: (data?.settings?.logoUrl as string | undefined) || branding.logoUrl,
    tagline: (data?.settings?.tagline as string | undefined) || branding.tagline,
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
    if (profileMemberId) {
      return <MemberProfilePage memberId={profileMemberId} {...props} />;
    }
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
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Toaster richColors position="top-center" closeButton />
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
