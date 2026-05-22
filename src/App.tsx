import { useState, useEffect } from "react";
import { AuthProvider, useAuth, useBootstrap } from "@/context/AuthContext";
import LoginPage from "@/pages/LoginPage";
import { AppLayout } from "@/components/church/AppLayout";
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
import type { PageId, Member, Cell, Fellowship, Department } from "@/types/church";

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
  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading church data...</p>
      </div>
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
      case "dashboard":
        return <DashboardPage {...props} />;
      case "members":
        return <MembersPage {...props} />;
      case "cells":
        return <CellsPage {...props} />;
      case "departments":
        return <DepartmentsPage {...props} />;
      case "attendance":
        return <AttendancePage {...props} />;
      case "events":
        return <EventsPage {...props} />;
      case "reports":
        return <ReportsPage {...props} />;
      case "settings":
        return <SettingsPage {...props} />;
      case "communications":
        return <CommunicationsPage {...props} />;
      case "finances":
        return <FinancesPage {...props} />;
      case "prayer":
        return <PrayerPage {...props} />;
      case "discipleship":
        return <DiscipleshipPage {...props} />;
      case "announcements":
        return <AnnouncementsPage {...props} />;
      case "tasks":
        return <TasksPage {...props} />;
      case "media":
        return <MediaPage {...props} />;
      case "report-submissions":
        return <ReportSubmissionsPage {...props} />;
      default:
        return <DashboardPage {...props} />;
    }
  };

  return (
    <AppLayout
      activePage={activePage}
      onNavigate={setActivePage}
      pages={pages}
      user={user.member}
      settings={{ name: (data.settings?.name as string) || "Christ Embassy" }}
    >
      {renderPage()}
    </AppLayout>
  );
}

function AppRoot() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }
  if (!user) return <LoginPage />;
  return <ChurchApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  );
}
