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
  regenerateActivationCode,
} from "@/lib/institutes.functions";
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
  Copy,
  RefreshCw,
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
  activation_code: string | null;
  activated_at: string | null;
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

async function copyCode(code: string) {
  try {
    await navigator.clipboard.writeText(code);
    toast.success("Activation code copied");
  } catch {
    toast.error("Copy failed");
  }
}

function ActivationCodeCell({
  code,
  onRegenerate,
  busy,
}: {
  code: string | null;
  onRegenerate: () => void;
  busy: boolean;
}) {
  if (!code) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-1">
      <code className="px-2 py-0.5 rounded bg-muted text-xs font-mono">{code}</code>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyCode(code)} title="Copy">
        <Copy className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={onRegenerate}
        disabled={busy}
        title="Regenerate"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function SuperAdminPage() {
  const list = useServerFn(listInstitutes);
  const stats = useServerFn(superAdminStats);
  const approve = useServerFn(approveInstitute);
  const reject = useServerFn(rejectInstitute);
  const suspend = useServerFn(suspendInstitute);
  const reactivate = useServerFn(reactivateInstitute);
  const regen = useServerFn(regenerateActivationCode);

  const [data, setData] = useState<{ institutes: Institute[] } | null>(null);
  const [statData, setStatData] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState<Institute | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [detail, setDetail] = useState<Institute | null>(null);
  const [approvedDialog, setApprovedDialog] = useState<{ name: string; code: string } | null>(null);

  const reload = async () => {
    try {
      const [d, s] = await Promise.all([list(), stats()]);
      setData(d as any);
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
        i.owner_name.toLowerCase().includes(q) ||
        (i.activation_code ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, search, filter]);

  const doApprove = async (inst: Institute) => {
    setBusy(inst.id);
    try {
      const res = await approve({ data: { id: inst.id } });
      toast.success("Institute approved");
      setApprovedDialog({ name: inst.name, code: res.activationCode });
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setBusy(null);
    }
  };

  const doRegen = async (inst: Institute) => {
    setBusy(inst.id);
    try {
      const res = await regen({ data: { id: inst.id } });
      toast.success("New activation code generated");
      await copyCode(res.activationCode);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Regenerate failed");
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
              placeholder="Search by name, email, owner, city or code..."
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

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institute</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Activation Code</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
                      <TableCell>
                        <ActivationCodeCell
                          code={inst.activation_code}
                          onRegenerate={() => doRegen(inst)}
                          busy={busy === inst.id}
                        />
                      </TableCell>
                      <TableCell className="text-right space-x-1 whitespace-nowrap">
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

      <Dialog open={!!approvedDialog} onOpenChange={(o) => !o && setApprovedDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Institute Approved
            </DialogTitle>
            <DialogDescription>
              Share this activation code with{" "}
              <span className="font-medium text-foreground">{approvedDialog?.name}</span> via WhatsApp,
              phone, or message. They'll use it to set their password and sign in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Activation Code</div>
            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-4 py-3">
              <code className="font-mono text-xl tracking-wider">{approvedDialog?.code}</code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => approvedDialog && copyCode(approvedDialog.code)}
              >
                <Copy className="h-4 w-4 mr-1.5" /> Copy
              </Button>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={async () => {
                if (!approvedDialog) return;
                const inst = data?.institutes.find((i) => i.name === approvedDialog.name);
                if (!inst) return;
                try {
                  const res = await regen({ data: { id: inst.id } });
                  setApprovedDialog({ name: approvedDialog.name, code: res.activationCode });
                  toast.success("New activation code generated");
                  reload();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Regenerate failed");
                }
              }}
            >
              <RefreshCw className="h-4 w-4 mr-1.5" /> Regenerate Code
            </Button>
            <Button onClick={() => setApprovedDialog(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Activation Code: </span>
                <ActivationCodeCell
                  code={detail.activation_code}
                  onRegenerate={() => doRegen(detail)}
                  busy={busy === detail.id}
                />
              </div>
              <div>
                <span className="text-muted-foreground">Activated: </span>
                {detail.activated_at ? new Date(detail.activated_at).toLocaleString() : "Not yet"}
              </div>
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
