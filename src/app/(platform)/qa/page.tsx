import type { Metadata } from "next";
import { QaDashboard } from "@/features/qa/qa-dashboard";

export const metadata: Metadata = {
  title: "QA Program",
  description: "Report and track bugs as a Setups Works Lab QA contributor.",
};

export default function QaPage() {
  return <QaDashboard />;
}
