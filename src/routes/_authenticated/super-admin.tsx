import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listInstitutes,
  superAdminStats,
  approveInstitute,
  rejectInstitute,
  suspendInstitute,
  reactivateInstitute,
} from "@/lib/institutes.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  Clock,
  CheckCircle2,
  Pause,
  XCircle,
  Users,
  GraduationCap,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/super-admin")({
  head: () => ({ meta: [{ title: "Super Admin — Gyanspirint" }] }),
  component: SuperAdminPage,
});

type Institute = {
  id: string;
  name: string;
  owner_name: string;
  email: string;
  mobile: string;
  city: string;
  status: string;
  created_at: string;
  rejection_reason: string | null;
};

function StatusBadge({ status }: { status: string }) {
  const variant: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
    active: "bg-green-500/15 text-green-700 dark:text-green-400",
    suspended: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
    rejected: "bg-red-500/15 text-red-700 dark:text-red-400",
  };
  return <Badge className={variant[status] ?? ""} variant="secondary">{status}</Badge>;
}

function SuperAdminPage() {
  const list = useServerFn(listInstitutes);
  const stats = useServerFn(superAdminStats);
  const approve = useServerFn(approveInstitute);
  const reject = useServerFn(rejectInstitute);
  const suspend = useServerFn(suspendInstitute);
  const reactivate = useServerFn(reactivateInstitute);

  const [data, setData] = useState<{ institutes: Institute[] } | null>(null);
  const [statData, setStatData] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState<Institute | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [detail, setDetail] = useState<Institute | null>(null);

  const reload = async () => {
    try {
      const [d, s] = await Promise.all([list(), stats()]);
      setData(d);
      setStatData(s);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.institutes.filter((i) => {
      if (filter !== "all" && i.status !== filter) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q) ||
        i.city.toLowerCase().includes(q) ||
        i.owner_name.toLowerCase().includes(q)
      );
    });
  }, [data, search, filter]);

  const doApprove = async (inst: Institute) => {
    setBusy(inst.id);
    try {
      const res = await approve({ data: { id: inst.id } });
      // Send password setup email via Supabase
      await supabase.auth.resetPasswordForEmail(res.email, {
        redirectTo: `${window.location.origin}/setup-password`,
      });
      toast.success(`Approved. Password setup email sent to ${res.email}`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setBusy(null);
    }
  };

  const doReject = async () => {
    if (!rejectOpen) return;
    setBusy(rejectOpen.id);
    try {
      await reject({ data: { id: rejectOpen.id, reason: rejectReason } });
      toast.success("Institute rejected");
      setRejectOpen(null);
      setRejectReason("");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rejection failed");
    } finally {
      setBusy(null);
    }
  };

  const doSuspend = async (inst: Institute) => {
    setBusy(inst.id);
    try {
      await suspend({ data: { id: inst.id } });
      toast.success("Institute suspended");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Suspend failed");
    } finally {
      setBusy(null);
    }
  };

  const doReactivate = async (inst: Institute) => {
    setBusy(inst.id);
    try {
      await reactivate({ data: { id: inst.id } });
      toast.success("Institute reactivated");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reactivate failed");
    } finally {
      setBusy(null);
    }
  };

  const statCards = [
    { label: "Total Institutes", value: statData?.total ?? "—", icon: Building2 },
    { label: "Pending", value: statData?.pending ?? "—", icon: Clock },
    { label: "Active", value: statData?.active ?? "—", icon: CheckCircle2 },
    { label: "Suspended", value: statData?.suspended ?? "—", icon: Pause },
    { label: "Total Students", value: statData?.students ?? "—", icon: Users },
    { label: "Total Teachers", value: statData?.teachers ?? "—", icon: GraduationCap },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage all registered institutes on the platform.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <s.icon className="h-5 w-5 text-muted-foreground" />
                <div className="text-2xl font-bold">{s.value}</div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Institutes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Search by name, email, owner or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institute</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No institutes found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((inst) => (
                    <TableRow key={inst.id}>
                      <TableCell className="font-medium">{inst.name}</TableCell>
                      <TableCell>{inst.owner_name}</TableCell>
                      <TableCell>{inst.city}</TableCell>
                      <TableCell className="text-xs">{inst.email}</TableCell>
                      <TableCell>
                        <StatusBadge status={inst.status} />
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => setDetail(inst)}>
                          View
                        </Button>
                        {inst.status === "pending" && (
                          <>
                            <Button size="sm" onClick={() => doApprove(inst)} disabled={busy === inst.id}>
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setRejectOpen(inst)}
                              disabled={busy === inst.id}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {inst.status === "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => doSuspend(inst)}
                            disabled={busy === inst.id}
                          >
                            Suspend
                          </Button>
                        )}
                        {(inst.status === "suspended" || inst.status === "rejected") && (
                          <Button
                            size="sm"
                            onClick={() => doReactivate(inst)}
                            disabled={busy === inst.id}
                          >
                            Reactivate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!rejectOpen} onOpenChange={(o) => !o && setRejectOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Institute</DialogTitle>
            <DialogDescription>
              Optionally provide a reason. The institute owner will see this on their account status page.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={doReject} disabled={busy === rejectOpen?.id}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detail?.name}</DialogTitle>
            <DialogDescription>Institute details</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Owner: </span>{detail.owner_name}</div>
              <div><span className="text-muted-foreground">Email: </span>{detail.email}</div>
              <div><span className="text-muted-foreground">Mobile: </span>{detail.mobile}</div>
              <div><span className="text-muted-foreground">City: </span>{detail.city}</div>
              <div><span className="text-muted-foreground">Status: </span><StatusBadge status={detail.status} /></div>
              <div><span className="text-muted-foreground">Registered: </span>{new Date(detail.created_at).toLocaleString()}</div>
              {detail.rejection_reason && (
                <div><span className="text-muted-foreground">Rejection reason: </span>{detail.rejection_reason}</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
