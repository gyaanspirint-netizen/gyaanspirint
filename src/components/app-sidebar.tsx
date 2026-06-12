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

const adminItems = [
  { title: "Institute Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Students", url: "/students", icon: Users },
  { title: "Batches", url: "/batches", icon: CalendarClock },
  { title: "Homework", url: "/homework", icon: NotebookPen },
  { title: "Schedule", url: "/schedule", icon: Calendar },
  { title: "Attendance", url: "/attendance", icon: ClipboardCheck },
  { title: "Tests", url: "/tests", icon: FileText },
  { title: "Fees", url: "/fees", icon: Wallet },
  { title: "Help Desk", url: "/help-desk", icon: LifeBuoy },
] as const;

const studentItems = [
  { title: "Dashboard", url: "/student", icon: LayoutDashboard },
  { title: "My Batches", url: "/my-batches", icon: CalendarClock },
  { title: "Homework", url: "/homework", icon: NotebookPen },
  { title: "Schedule", url: "/schedule", icon: Calendar },
  { title: "Attendance", url: "/attendance", icon: ClipboardCheck },
  { title: "Tests", url: "/tests", icon: FileText },
  { title: "Help Desk", url: "/help-desk", icon: LifeBuoy },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { role } = useAuth();
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  const items = role === "admin" ? adminItems : studentItems;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md text-primary-foreground shadow-sm shrink-0"
            style={{ background: "var(--gradient-brand)" }}
          >
            <GraduationCap className="h-4 w-4" />
          </div>
          {!collapsed && <span className="font-semibold tracking-tight">Gyanspirint</span>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {role === "admin" ? "Admin" : "Student"}
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