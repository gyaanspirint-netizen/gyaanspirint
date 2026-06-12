import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Mail, Trash2, Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/help-desk")({
  head: () => ({ meta: [{ title: "Help Desk — Gyanspirint" }] }),
  component: HelpDeskPage,
});

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved";
  created_by: string;
  owner_id: string;
  created_at: string;
};

const STATUS_LABELS: Record<Ticket["status"], string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};
const STATUS_VARIANT: Record<Ticket["status"], "default" | "secondary" | "destructive"> = {
  open: "destructive",
  in_progress: "secondary",
  resolved: "default",
};

function HelpDeskPage() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setTickets((data ?? []) as Ticket[]);
    setLoading(false);
  };

  useEffect(() => {
    if (role) load();
  }, [role]);

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      return toast.error("Subject and message are required");
    }
    if (!user) return;
    setSubmitting(true);
    let ownerId = user.id;
    if (!isAdmin) {
      const { data: s } = await supabase
        .from("students").select("owner_id").eq("user_id", user.id).maybeSingle();
      if (s?.owner_id) ownerId = s.owner_id;
    }
    const { error } = await supabase.from("support_tickets").insert({
      subject: subject.trim(),
      message: message.trim(),
      created_by: user.id,
      owner_id: ownerId,
      status: "open",
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Ticket submitted");
    setSubject("");
    setMessage("");
    load();
  };

  const updateStatus = async (id: string, status: Ticket["status"]) => {
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    load();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("support_tickets").delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) return toast.error(error.message);
    toast.success("Ticket deleted");
    load();
  };

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  }), [tickets]);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!t.subject.toLowerCase().includes(q) && !t.message.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tickets, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Help Desk</h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin ? "Manage support tickets from your students." : "Need help? Reach out below."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4" /> Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            For any technical issue, account issue, batch issue, or payment issue, contact us at:
          </p>
          <a
            href="mailto:gyaansprint@gmail.com"
            className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
          >
            <Mail className="h-4 w-4" /> gyaansprint@gmail.com
          </a>
        </CardContent>
      </Card>

      {!isAdmin && (
        <Card>
          <CardHeader><CardTitle>Submit a ticket</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submitTicket} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={2000} />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit ticket"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Tickets</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Open</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{stats.open}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">In Progress</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.in_progress}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Resolved</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{stats.resolved}</div></CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{isAdmin ? "All tickets" : "My tickets"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <Input placeholder="Search subject or message..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading...</div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No tickets yet.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.subject}</TableCell>
                      <TableCell>{format(new Date(t.created_at), "PP")}</TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Select value={t.status} onValueChange={(v) => updateStatus(t.id, v as Ticket["status"])}>
                            <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={STATUS_VARIANT[t.status]}>{STATUS_LABELS[t.status]}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setViewTicket(t)}><Eye className="h-4 w-4" /></Button>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewTicket} onOpenChange={(o) => !o && setViewTicket(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewTicket?.subject}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewTicket?.message}</p>
          <p className="text-xs text-muted-foreground">
            {viewTicket ? `Status: ${STATUS_LABELS[viewTicket.status]} · ${format(new Date(viewTicket.created_at), "PPp")}` : ""}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTicket(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete ticket?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This permanently removes the ticket.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={remove}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}