import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lmsEnabled } from "@/lib/lms/flag";
import { CoursesManager } from "@/features/admin/courses-manager";

export const metadata: Metadata = { title: "Admin · Courses" };

export default function AdminCoursesPage() {
  if (!lmsEnabled()) notFound();
  return <CoursesManager />;
}
