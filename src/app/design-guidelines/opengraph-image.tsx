import { OG_ALT, OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/app/_shared/og-card";

export const runtime = "edge";
export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgCard({
    eyebrow: "Brand & product",
    title: "The Setups Works Lab design system",
    subtitle: "Logo, typography, color, illustration and motion",
    tags: ["Design tokens","Components","Brand kit"],
  });
}
