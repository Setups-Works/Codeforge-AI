import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { lmsEnabled } from "@/lib/lms/flag";

/** Every /learn route is hidden until the LMS flag is on. */
export default function LearnLayout({ children }: { children: ReactNode }) {
  if (!lmsEnabled()) notFound();
  return children;
}
