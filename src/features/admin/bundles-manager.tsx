"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2 } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COURSE_STATUSES, type CourseStatus } from "@/lib/lms/constants";
import { api } from "@/lib/lms/api";
import { formatPrice } from "@/lib/plans";
import { STATUS_VARIANT } from "@/features/admin/courses-manager";
import type { BundleDetail } from "@/services/lms-bundles";
import type { AdminCourse } from "@/services/lms-courses";

type BundleView = Omit<BundleDetail, "createdAt"> & { createdAt: string };

export function BundlesManager() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const bundles = useQuery({ queryKey: ["admin-bundles"], queryFn: () => api<{ bundles: BundleView[] }>("/api/admin/bundles") });
  const courses = useQuery({ queryKey: ["admin-courses"], queryFn: () => api<{ courses: AdminCourse[] }>("/api/admin/courses") });

  const create = useMutation({
    mutationFn: () => api("/api/admin/bundles", { method: "POST", json: { title } }),
    onSuccess: () => {
      setTitle("");
      qc.invalidateQueries({ queryKey: ["admin-bundles"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Course bundles</h1>
        <p className="text-sm text-muted-foreground">Sell several courses together at one price. A published bundle needs at least two published courses.</p>
      </div>
      <div className="flex gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New bundle title" maxLength={160} />
        <Button onClick={() => create.mutate()} disabled={create.isPending || title.trim().length < 3}>
          {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create
        </Button>
      </div>
      {bundles.isLoading ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="space-y-4">
          {(bundles.data?.bundles ?? []).map((b) => (
            <BundleEditor key={`${b.id}-${b.courses.length}-${b.priceInr}-${b.status}`} bundle={b} courses={courses.data?.courses ?? []} />
          ))}
          {bundles.data?.bundles.length === 0 && <p className="text-sm text-muted-foreground">No bundles yet.</p>}
        </div>
      )}
    </div>
  );
}

function BundleEditor({ bundle, courses }: { bundle: BundleView; courses: AdminCourse[] }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    title: bundle.title,
    description: bundle.description,
    priceInr: String(bundle.priceInr),
    status: bundle.status,
    courseIds: bundle.courses.map((c) => c.id),
  });

  const save = useMutation({
    mutationFn: () =>
      api(`/api/admin/bundles/${bundle.id}`, {
        method: "PATCH",
        json: { title: f.title.trim(), description: f.description, priceInr: Number(f.priceInr) || 0, status: f.status, courseIds: f.courseIds },
      }),
    onSuccess: () => {
      toast.success("Bundle saved");
      qc.invalidateQueries({ queryKey: ["admin-bundles"] });
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => api(`/api/admin/bundles/${bundle.id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-bundles"] }),
    onError: (e) => toast.error(e.message),
  });

  const toggle = (id: string, on: boolean) => setF((s) => ({ ...s, courseIds: on ? [...s.courseIds, id] : s.courseIds.filter((x) => x !== id) }));

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{bundle.title}</h2>
        <Badge variant={STATUS_VARIANT[bundle.status]} className="capitalize">{bundle.status}</Badge>
        <span className="text-xs text-muted-foreground">Courses cost {formatPrice(bundle.valueInr)} separately</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Title</Label>
          <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Description (Markdown)</Label>
          <Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Bundle price</Label>
          <Input type="number" min={0} value={f.priceInr} onChange={(e) => setF({ ...f, priceInr: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Status</Label>
          <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as CourseStatus })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{COURSE_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Courses in this bundle</Label>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {courses.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <input type="checkbox" checked={f.courseIds.includes(c.id)} onChange={(e) => toggle(c.id, e.target.checked)} />
                <span className="min-w-0 flex-1 truncate">{c.title}</span>
                <span className="text-xs text-muted-foreground">{c.status !== "published" ? c.status : formatPrice(c.isFree ? 0 : c.priceInr)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save bundle
        </Button>
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => confirm("Delete this bundle?") && remove.mutate()}>
          <Trash2 className="size-4" /> Delete
        </Button>
      </div>
    </section>
  );
}
