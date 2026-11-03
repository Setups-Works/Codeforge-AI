"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Send,
  ShieldCheck,
  ShieldAlert,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Kept local so this client bundle stays free of server-only code.
const FOCUS_AREAS = [
  "Problems / Editor", "Compiler", "AI Tools", "Contests",
  "Auth / Account", "Billing", "Mobile / Responsive", "Performance",
];
const BUG_AREAS = [
  "Problems / Editor", "Compiler", "AI Tools", "Contests",
  "Auth / Account", "Billing", "UI / Layout", "Performance", "Other",
];
const SEVERITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const SEVERITY_CLS: Record<string, string> = {
  low: "text-muted-foreground",
  medium: "text-blue-500",
  high: "text-amber-500",
  critical: "text-red-500",
};
const BUG_STATUS_LABEL: Record<string, string> = {
  new: "New", triaged: "Triaged", in_progress: "In progress",
  fixed: "Fixed", wontfix: "Won't fix", duplicate: "Duplicate",
};
const BUG_STATUS_CLS: Record<string, string> = {
  new: "text-blue-500", triaged: "text-violet-500", in_progress: "text-amber-500",
  fixed: "text-green-500", wontfix: "text-muted-foreground", duplicate: "text-muted-foreground",
};

interface MeResponse {
  contributor: { status: "pending" | "approved" | "rejected"; focusAreas: string[]; appliedAt: string } | null;
  bugs: { id: string; title: string; area: string; severity: string; status: string; createdAt: string }[];
}

export function QaDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["qa-me"],
    queryFn: async () => {
      const res = await fetch("/api/qa/me");
      if (!res.ok) throw new Error("Failed to load");
      return (await res.json()) as MeResponse;
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight">QA Program</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Help improve product quality — report bugs, track issues, and shape what ships.
        </p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : !data?.contributor ? (
        <ApplyForm />
      ) : data.contributor.status === "pending" ? (
        <StatusCard
          icon={Clock} tone="amber"
          title="Application under review"
          body="Thanks for applying to the QA program. We'll email you as soon as you're approved — then you can start reporting bugs."
        />
      ) : data.contributor.status === "rejected" ? (
        <StatusCard
          icon={AlertTriangle} tone="muted"
          title="Application not approved"
          body="Your QA application wasn't approved this time. Feel free to reach out via the feedback page if you'd like to discuss it."
        />
      ) : (
        <ApprovedView bugs={data.bugs} />
      )}
    </div>
  );
}

/* ── Apply ─────────────────────────────────────────────────────────────── */

function ApplyForm() {
  const qc = useQueryClient();
  const [motivation, setMotivation] = useState("");
  const [experience, setExperience] = useState("");
  const [github, setGithub] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [error, setError] = useState("");

  const toggle = (a: string) =>
    setAreas((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));

  const apply = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/qa/apply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivation, experience, github, focusAreas: areas }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Could not submit");
    },
    onSuccess: () => { toast.success("Application submitted"); qc.invalidateQueries({ queryKey: ["qa-me"] }); },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not submit"),
  });

  return (
    <div className="rounded-2xl border bg-card p-6 sm:p-8">
      <h2 className="text-lg font-bold">Become a QA contributor</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tell us a bit about yourself. Once approved, you can report and track bugs from here.
      </p>

      <div className="mt-6 space-y-5">
        <div className="space-y-1.5">
          <Label>Why do you want to join? <span className="text-red-500">*</span></Label>
          <Textarea
            value={motivation} onChange={(e) => setMotivation(e.target.value)} rows={4} maxLength={2000}
            placeholder="What draws you to QA? How do you like to test software?"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Areas you want to focus on</Label>
          <div className="flex flex-wrap gap-2">
            {FOCUS_AREAS.map((a) => (
              <button
                key={a} type="button" onClick={() => toggle(a)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  areas.includes(a)
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Testing / QA experience <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Textarea
            value={experience} onChange={(e) => setExperience(e.target.value)} rows={3} maxLength={2000}
            placeholder="Any prior QA, bug-hunting, or testing experience."
          />
        </div>

        <div className="space-y-1.5">
          <Label>GitHub <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/…" />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          className="gap-2"
          disabled={apply.isPending || motivation.trim().length < 20}
          onClick={() => { setError(""); apply.mutate(); }}
        >
          {apply.isPending && <Loader2 className="size-4 animate-spin" />}
          Submit application
        </Button>
      </div>
    </div>
  );
}

/* ── Status cards ──────────────────────────────────────────────────────── */

function StatusCard({
  icon: Icon, title, body, tone,
}: { icon: typeof Clock; title: string; body: string; tone: "amber" | "muted" | "green" }) {
  const toneCls = tone === "amber" ? "bg-amber-500/15 text-amber-500"
    : tone === "green" ? "bg-green-500/15 text-green-500"
    : "bg-muted text-muted-foreground";
  return (
    <div className="rounded-2xl border bg-card p-8 text-center">
      <div className={cn("mx-auto mb-4 flex size-14 items-center justify-center rounded-full", toneCls)}>
        <Icon className="size-7" />
      </div>
      <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

/* ── Approved: report + my bugs ────────────────────────────────────────── */

function ApprovedView({ bugs }: { bugs: MeResponse["bugs"] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-2.5 text-sm">
        <CheckCircle2 className="size-4 text-green-500" />
        <span className="font-medium text-green-600 dark:text-green-400">You&rsquo;re an approved QA contributor.</span>
      </div>

      <BugForm />

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          My reports ({bugs.length})
        </h2>
        {bugs.length === 0 ? (
          <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
            No bugs reported yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            {bugs.map((b, i) => (
              <div key={b.id} className={cn("flex items-center gap-3 px-4 py-3", i !== 0 && "border-t")}>
                <ShieldAlert className={cn("size-4 shrink-0", SEVERITY_CLS[b.severity])} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {b.area} · {format(new Date(b.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
                <span className={cn("shrink-0 text-xs font-medium", BUG_STATUS_CLS[b.status])}>
                  {BUG_STATUS_LABEL[b.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const EMPTY_BUG = { title: "", area: "Other", severity: "medium", steps: "", expected: "", actual: "", environment: "", url: "", screenshotUrl: "" };

function BugForm() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY_BUG });
  const [error, setError] = useState("");
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/qa/bugs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Could not submit");
    },
    onSuccess: () => {
      toast.success("Bug reported — thank you!");
      setForm({ ...EMPTY_BUG });
      qc.invalidateQueries({ queryKey: ["qa-me"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not submit"),
  });

  return (
    <div className="rounded-2xl border bg-card p-6">
      <h2 className="text-base font-bold">Report a bug</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Title *</Label>
          <Input value={form.title} onChange={set("title")} placeholder="Short summary of the bug" maxLength={160} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Area</Label>
          <Select value={form.area} onValueChange={(v) => setForm((f) => ({ ...f, area: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{BUG_AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Severity</Label>
          <Select value={form.severity} onValueChange={(v) => setForm((f) => ({ ...f, severity: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Steps to reproduce *</Label>
          <Textarea value={form.steps} onChange={set("steps")} rows={3} maxLength={4000} placeholder={"1. Go to…\n2. Click…\n3. See…"} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Expected result</Label>
          <Textarea value={form.expected} onChange={set("expected")} rows={2} maxLength={2000} placeholder="What should happen" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Actual result</Label>
          <Textarea value={form.actual} onChange={set("actual")} rows={2} maxLength={2000} placeholder="What actually happens" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Environment</Label>
          <Input value={form.environment} onChange={set("environment")} placeholder="e.g. Chrome 149, macOS" maxLength={300} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Page URL</Label>
          <Input value={form.url} onChange={set("url")} placeholder="https://labs.setups.works/…" maxLength={500} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Screenshot URL <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Input value={form.screenshotUrl} onChange={set("screenshotUrl")} placeholder="Link to a screenshot" maxLength={500} />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <Button
        className="mt-4 gap-2"
        disabled={submit.isPending || form.title.trim().length < 5 || form.steps.trim().length < 10}
        onClick={() => { setError(""); submit.mutate(); }}
      >
        {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Submit bug report
      </Button>
    </div>
  );
}
