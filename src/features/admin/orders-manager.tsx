"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Loader2, CreditCard } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/lms/api";
import { formatPrice } from "@/lib/plans";
import { isRefundable } from "@/lib/lms/refund";
import { COURSE_REFUND_DAYS } from "@/lib/lms/constants";
import type { AdminOrder, OrderStatus } from "@/services/lms-orders";

const VARIANT: Record<OrderStatus, "default" | "secondary" | "outline" | "destructive"> = {
  paid: "default",
  created: "outline",
  failed: "destructive",
  refunded: "secondary",
};

export function OrdersManager() {
  const qc = useQueryClient();
  const refund = useMutation({
    mutationFn: (id: string) => api(`/api/admin/orders/${id}/refund`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Order refunded and access removed");
      qc.invalidateQueries({ queryKey: ["admin-course-orders"] });
    },
    onError: (e) => toast.error(e.message),
  });
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
                <TableHead></TableHead>
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
                  <TableCell>
                    {o.status === "paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={refund.isPending}
                        onClick={() =>
                          confirm(
                            `Refund ${formatPrice(o.amountInr)} to ${o.userName ?? "this learner"} and remove their access?${isRefundable(o.paidAt ? new Date(o.paidAt) : null) ? "" : "\n\nThe ${COURSE_REFUND_DAYS}-day refund window has closed; refunding anyway."}`,
                          ) && refund.mutate(o.id)
                        }
                      >
                        Refund
                      </Button>
                    )}
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
