"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Plus, Tag, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { cn } from "@/lib/utils";

interface Coupon {
  id: string;
  code: string;
  description: string;
  type: "percent" | "flat";
  value: number;
  minAmount: number;
  maxRedemptions: number;
  usedCount: number;
  oncePerUser: boolean;
  plans: string[];
  appliesTo: "plan" | "course" | "all";
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

const EMPTY = {
  code: "",
  description: "",
  type: "percent" as "percent" | "flat",
  value: "",
  minAmount: "",
  maxRedemptions: "",
  oncePerUser: true,
  appliesTo: "plan" as "plan" | "course" | "all",
  expiresAt: "",
};

export function CouponsManager() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const res = await fetch("/api/admin/coupons");
      if (!res.ok) throw new Error("Failed to load coupons");
      return (await res.json()) as { coupons: Coupon[] };
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          description: form.description,
          type: form.type,
          value: Number(form.value),
          minAmount: form.minAmount ? Number(form.minAmount) : 0,
          maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : -1,
          oncePerUser: form.oncePerUser,
          appliesTo: form.appliesTo,
          expiresAt: form.expiresAt || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to create");
    },
    onSuccess: () => {
      toast.success("Coupon created");
      setForm({ ...EMPTY });
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create"),
  });

  const patch = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-coupons"] }),
    onError: () => toast.error("Failed to update coupon"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      toast.success("Coupon deleted");
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: () => toast.error("Failed to delete coupon"),
  });

  const coupons = data?.coupons ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Coupons</h1>
        <p className="text-sm text-muted-foreground">
          Create discount codes users can apply at checkout.
        </p>
      </div>

      {/* create */}
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Plus className="size-4 text-primary" /> New coupon
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Code">
            <Input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="LAUNCH20"
            />
          </Field>
          <Field label="Type">
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as "percent" | "flat" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percent (%)</SelectItem>
                <SelectItem value="flat">Flat (₹)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={form.type === "percent" ? "Percent off" : "Amount off (₹)"}>
            <Input type="number" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder={form.type === "percent" ? "20" : "100"} />
          </Field>
          <Field label="Min order (₹, optional)">
            <Input type="number" value={form.minAmount} onChange={(e) => setForm((f) => ({ ...f, minAmount: e.target.value }))} placeholder="0" />
          </Field>
          <Field label="Max redemptions (blank = ∞)">
            <Input type="number" value={form.maxRedemptions} onChange={(e) => setForm((f) => ({ ...f, maxRedemptions: e.target.value }))} placeholder="∞" />
          </Field>
          <Field label="Applies to">
            <Select value={form.appliesTo} onValueChange={(v) => setForm((f) => ({ ...f, appliesTo: v as "plan" | "course" | "all" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="plan">Subscription plans</SelectItem>
                <SelectItem value="course">Courses</SelectItem>
                <SelectItem value="all">Plans and courses</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Expires (optional)">
            <Input type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Launch promo" />
          </Field>
          <div className="flex items-end gap-2">
            <div className="flex items-center gap-2">
              <Switch checked={form.oncePerUser} onCheckedChange={(v) => setForm((f) => ({ ...f, oncePerUser: v }))} />
              <Label className="text-xs">Once per user</Label>
            </div>
          </div>
        </div>
        <Button className="mt-4" onClick={() => create.mutate()} disabled={create.isPending || !form.code || !form.value}>
          {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Create coupon
        </Button>
      </section>

      {/* list */}
      <div className="overflow-x-auto rounded-xl border bg-card">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Tag className="size-6" /><p className="text-sm">No coupons yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>For</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="font-mono text-sm font-semibold">{c.code}</p>
                    {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.type === "percent" ? `${c.value}%` : `₹${c.value}`}
                    {c.oncePerUser && <span className="ml-1 text-[11px] text-muted-foreground">· 1/user</span>}
                  </TableCell>
                  <TableCell className="text-xs capitalize text-muted-foreground">{c.appliesTo === "all" ? "Plans + courses" : c.appliesTo === "course" ? "Courses" : "Plans"}</TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {c.usedCount}{c.maxRedemptions >= 0 ? ` / ${c.maxRedemptions}` : ""}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.expiresAt ? format(new Date(c.expiresAt), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={c.active}
                      onCheckedChange={(v) => patch.mutate({ id: c.id, body: { active: v } })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("size-8 text-muted-foreground hover:text-destructive")}
                      onClick={() => remove.mutate(c.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
