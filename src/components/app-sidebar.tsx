import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardCheck,
  FileText,
  Wallet,
  CalendarClock,
  Settings,
  LogOut,
  GraduationCap,
  NotebookPen,
  LifeBuoy,
  Shield,
  UserCog,
  Activity,
  Megaphone,
  MessageSquare,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/gyanspirint-logo.png.asset.json";

const adminItems = [
  { title: "Institute Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Students", url: "/students", icon: Users },
  { title: "Teachers", url: "/teachers", icon: UserCog },
  { title: "Batches", url: "/batches", icon: CalendarClock },
  { title: "Class Updates", url: "/homework", icon: NotebookPen },
  { title: "Schedule", url: "/schedule", icon: Calendar },
  { title: "Attendance", url: "/attendance", icon: ClipboardCheck },
  { title: "Tests", url: "/tests", icon: FileText },
  { title: "Fees", url: "/fees", icon: Wallet },
  { title: "Activity Log", url: "/activity", icon: Activity },
  { title: "Help Desk", url: "/help-desk", icon: LifeBuoy },
] as const;

const studentItems = [
  { title: "Dashboard", url: "/student", icon: LayoutDashboard },
  { title: "My Batches", url: "/my-batches", icon: CalendarClock },
  { title: "Class Updates", url: "/homework", icon: NotebookPen },
  { title: "Schedule", url: "/schedule", icon: Calendar },
  { title: "Attendance", url: "/attendance", icon: ClipboardCheck },
  { title: "Tests", url: "/tests", icon: FileText },
  { title: "Help Desk", url: "/help-desk", icon: LifeBuoy },
] as const;

const teacherItems = [
  { title: "Dashboard", url: "/teacher", icon: LayoutDashboard },
  { title: "Attendance", url: "/teacher/attendance", icon: ClipboardCheck },
  { title: "Class Updates", url: "/teacher/updates", icon: NotebookPen },
  { title: "Tests", url: "/teacher/tests", icon: FileText },
  { title: "Students", url: "/teacher/students", icon: Users },
  { title: "Remarks", url: "/teacher/remarks", icon: MessageSquare },
  { title: "Announcements", url: "/teacher/announcements", icon: Megaphone },
  { title: "Schedule", url: "/teacher/schedule", icon: Calendar },
  { title: "My Profile", url: "/teacher/profile", icon: UserCog },
] as const;

const superAdminItems = [
  { title: "Institutes", url: "/super-admin", icon: Shield },
] as const;


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { role } = useAuth();
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  const items =
    role === "super_admin"
      ? superAdminItems
      : role === "admin"
        ? adminItems
        : role === "teacher"
          ? teacherItems
          : studentItems;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <img
            src={logoAsset.url}
            alt="Gyanspirint"
            className="h-8 w-8 rounded-md object-contain bg-white shrink-0"
          />
          {!collapsed && <span className="font-semibold tracking-tight">Gyanspirint</span>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {role === "super_admin" ? "Platform" : role === "admin" ? "Admin" : role === "teacher" ? "Teacher" : "Student"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={currentPath === item.url}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={currentPath === "/settings"}>
                  <Link to="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    {!collapsed && <span>Settings</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sign out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}