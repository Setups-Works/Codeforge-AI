import { ImageResponse } from "next/og";
import { OG_LOGO, OG_LOGO_SIZE } from "./og-logo";

/** Shared social-share card, rendered by every route's opengraph-image. */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = "Setups Works Lab — Master coding interviews with AI";
export const OG_CONTENT_TYPE = "image/png";

export interface OgCardOptions {
  /** Small colored label above the title, e.g. a difficulty or section. */
  eyebrow?: string;
  eyebrowColor?: string;
  /** Main headline. Defaults to the homepage message. */
  title?: string;
  /** Optional trailing accent word rendered in brand blue after the title. */
  titleAccent?: string;
  /** One line of supporting copy under the title. */
  subtitle?: string;
  /** Footer chips (rendered blue, dot-separated). */
  tags?: string[];
}

/** Fit the title font to its length so long problem names don't overflow. */
function titleSize(text: string): number {
  const len = text.length;
  if (len <= 22) return 76;
  if (len <= 34) return 64;
  if (len <= 48) return 54;
  if (len <= 66) return 46;
  return 40;
}

export function renderOgCard(opts: OgCardOptions = {}) {
  const title = opts.title ?? "Master coding interviews with";
  const titleAccent = opts.titleAccent ?? (opts.title ? undefined : "AI.");
  const subtitle =
    opts.subtitle ?? "LeetCode-style problems · instant online compiler · AI pair programming";
  const tags = opts.tags ?? ["27+ features", "12 languages", "100% free"];
  const fontSize = opts.title ? titleSize(title) : 74;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          padding: "72px",
          fontFamily: "sans-serif",
          // subtle brand glow in the corner
          backgroundImage:
            "radial-gradient(900px 480px at 100% 0%, rgba(0,107,255,0.12), transparent 60%)",
        }}
      >
        {/* wordmark */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={OG_LOGO} width={Math.round(OG_LOGO_SIZE.width * 0.42)} height={Math.round(OG_LOGO_SIZE.height * 0.42)} alt="" />
          <div style={{ display: "flex", fontSize: 24, fontWeight: 500, color: "#666666" }}>labs.setups.works</div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {opts.eyebrow && (
            <div
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: "1px",
                textTransform: "uppercase",
                color: opts.eyebrowColor ?? "#006bff",
              }}
            >
              {opts.eyebrow}
            </div>
          )}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize,
              fontWeight: 600,
              letterSpacing: "-2px",
              lineHeight: 1.04,
              maxWidth: "1000px",
            }}
          >
            <span style={{ color: "#171717" }}>
              {title}
              {titleAccent ? " " : ""}
            </span>
            {titleAccent && <span style={{ color: "#006bff" }}>{titleAccent}</span>}
          </div>
          {subtitle && (
            <div style={{ display: "flex", fontSize: 29, color: "#666666", maxWidth: "1000px" }}>
              {subtitle}
            </div>
          )}
        </div>

        {/* footer tags */}
        <div style={{ display: "flex", gap: "14px", fontSize: 24, fontWeight: 500, color: "#006bff" }}>
          {tags.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: "14px" }}>
              {i > 0 && <span style={{ color: "#cccccc" }}>·</span>}
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
