import { OG_ALT, OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/app/_shared/og-card";

export const runtime = "edge";
export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgCard({
    eyebrow: "Community",
    title: "The Setups Works Lab forum",
    subtitle: "Discuss problems, approaches and interview prep",
    tags: ["Ask","Share","Learn"],
  });
}
