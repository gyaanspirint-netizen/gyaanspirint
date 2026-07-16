import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, ClipboardCheck, Wallet, FileText, CalendarClock, NotebookPen, MessageSquare, Megaphone } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const adminTabs = [
  { title: "Home", url: "/admin", icon: LayoutDashboard },
  { title: "Students", url: "/students", icon: Users },
  { title: "Attendance", url: "/attendance", icon: ClipboardCheck },
  { title: "Fees", url: "/fees", icon: Wallet },
  { title: "Tests", url: "/tests", icon: FileText },
] as const;

const studentTabs = [
  { title: "Home", url: "/student", icon: LayoutDashboard },
  { title: "Batches", url: "/my-batches", icon: CalendarClock },
  { title: "Attendance", url: "/attendance", icon: ClipboardCheck },
  { title: "Updates", url: "/homework", icon: NotebookPen },
  { title: "Tests", url: "/tests", icon: FileText },
] as const;

const teacherTabs = [
  { title: "Home", url: "/teacher", icon: LayoutDashboard },
  { title: "Attendance", url: "/teacher/attendance", icon: ClipboardCheck },
  { title: "Updates", url: "/teacher/updates", icon: NotebookPen },
  { title: "Students", url: "/teacher/students", icon: Users },
  { title: "More", url: "/teacher/profile", icon: MessageSquare },
] as const;

export function MobileBottomNav() {
  const { role } = useAuth();
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  if (role === "super_admin" || role === null) return null;
  const tabs = role === "admin" ? adminTabs : role === "teacher" ? teacherTabs : studentTabs;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {tabs.map((t) => {
          const active = currentPath === t.url;
          return (
            <li key={t.url}>
              <Link
                to={t.url}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-[11px] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className={cn("h-5 w-5", active && "scale-110")} />
                <span className="leading-none">{t.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
