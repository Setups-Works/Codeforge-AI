"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, CreditCard } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/lms/api";
import { formatPrice } from "@/lib/plans";
import { isRefundable } from "@/lib/lms/refund";
import type { AdminOrder, OrderStatus } from "@/services/lms-orders";

const VARIANT: Record<OrderStatus, "default" | "secondary" | "outline" | "destructive"> = {
  paid: "default",
  created: "outline",
  failed: "destructive",
  refunded: "secondary",
};

export function OrdersManager() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-course-orders"],
    queryFn: () => api<{ orders: (Omit<AdminOrder, "createdAt" | "paidAt"> & { createdAt: string; paidAt: string | null })[] }>("/api/admin/orders"),
  });
  const orders = data?.orders ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Course orders</h1>
        <p className="text-sm text-muted-foreground">Every course checkout, newest first.</p>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <CreditCard className="size-6" />
            <p className="text-sm">No orders yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Learner</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Refundable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(o.createdAt), "MMM d, yyyy HH:mm")}</TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{o.userName ?? o.userId}</p>
                    {o.userEmail && <p className="text-xs text-muted-foreground">{o.userEmail}</p>}
                  </TableCell>
                  <TableCell className="text-sm">{o.courseTitle ?? "—"}</TableCell>
                  <TableCell className="text-sm tabular-nums">{formatPrice(o.amountInr)}</TableCell>
                  <TableCell><Badge variant={VARIANT[o.status]} className="capitalize">{o.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {o.status === "paid" ? (isRefundable(o.paidAt ? new Date(o.paidAt) : null) ? "Yes" : "Window closed") : "—"}
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
