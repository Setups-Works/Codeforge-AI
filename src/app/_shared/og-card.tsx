import { ImageResponse } from "next/og";

/** Shared social-share card, rendered by every route's opengraph-image. */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = "Setups Works Lab — Master coding interviews with AI";
export const OG_CONTENT_TYPE = "image/png";

// Font Awesome "fire" glyph (faFire) on the brand-blue rounded square — matches the favicon/PWA icon.
const FIRE =
  "M160.5-26.4c9.3-7.8 23-7.5 31.9 .9 12.3 11.6 23.3 24.4 33.9 37.4 13.5 16.5 29.7 38.3 45.3 64.2 5.2-6.8 10-12.8 14.2-17.9 1.1-1.3 2.2-2.7 3.3-4.1 7.9-9.8 17.7-22.1 30.8-22.1 13.4 0 22.8 11.9 30.8 22.1 1.3 1.7 2.6 3.3 3.9 4.8 10.3 12.4 24 30.3 37.7 52.4 27.2 43.9 55.6 106.4 55.6 176.6 0 123.7-100.3 224-224 224S0 411.7 0 288c0-91.1 41.1-170 80.5-225 19.9-27.7 39.7-49.9 54.6-65.1 8.2-8.4 16.5-16.7 25.5-24.2zM225.7 416c25.3 0 47.7-7 68.8-21 42.1-29.4 53.4-88.2 28.1-134.4-4.5-9-16-9.6-22.5-2l-25.2 29.3c-6.6 7.6-18.5 7.4-24.7-.5-17.3-22.1-49.1-62.4-65.3-83-5.4-6.9-15.2-8-21.5-1.9-18.3 17.8-51.5 56.8-51.5 104.3 0 68.6 50.6 109.2 113.7 109.2z";

const MARK = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none"><rect width="512" height="512" rx="112" fill="#006bff"/><g transform="translate(121.6 102.4) scale(0.6)"><path fill="#ffffff" d="${FIRE}"/></g></svg>`,
)}`;

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
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARK} width={64} height={64} alt="" />
          <div style={{ fontSize: 30, fontWeight: 600, color: "#171717" }}>Setups Works Lab</div>
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
