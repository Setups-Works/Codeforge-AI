import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lmsEnabled } from "@/lib/lms/flag";
import { OrdersManager } from "@/features/admin/orders-manager";

export const metadata: Metadata = { title: "Admin · Course orders" };

export default function AdminOrdersPage() {
  if (!lmsEnabled()) notFound();
  return <OrdersManager />;
}
