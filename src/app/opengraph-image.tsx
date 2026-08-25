import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getSiteContent } from "@/lib/sanity/getSiteContent";

export const alt = "Priyanshu Roy — Brand Designer & Web Developer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Matches the rest of the Sanity-backed routes so an edited seoTitle propagates. */
export const revalidate = 60;

const DEFAULT_TITLE = "Brand Designer & Web Developer";

/**
 * The site-wide social card, inherited by every route that doesn't define its
 * own (case studies override it with their cover image).
 *
 * Satori supports only flexbox and a subset of CSS — no grid, no custom
 * properties — so this deliberately does not reuse the app's Tailwind classes.
 * The palette is hardcoded to match globals.css: black on white, the same
 * inversion the site itself wears.
 *
 * Fonts are read from public/fonts rather than next/font because Satori needs
 * raw font bytes. Only ttf/otf/woff parse, so these are the .ttf cuts.
 */
export default async function Image() {
  const content = await getSiteContent();
  const name = content?.settings?.name ?? "Priyanshu Roy";
  const tagline = content?.settings?.seoDescription ?? DEFAULT_TITLE;

  const fontDir = join(process.cwd(), "public/fonts");
  const [medium, light] = await Promise.all([
    readFile(join(fontDir, "HelveticaNeueMedium.ttf")),
    readFile(join(fontDir, "HelveticaNeueLight.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#ffffff",
          color: "#000000",
          padding: "80px",
          fontFamily: "HelveticaLight",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: "0.18em" }}>
          {name.toUpperCase()}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: "HelveticaMedium",
            fontSize: 82,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            maxWidth: "900px",
          }}
        >
          {tagline}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 26,
            letterSpacing: "0.05em",
          }}
        >
          <div style={{ display: "flex" }}>Brand Identity · Web Development</div>
          {/* A rule rather than a logo: keeps the card recognisable without
              shipping an image asset into the 500KB Satori bundle budget. */}
          <div style={{ display: "flex", width: 160, height: 3, backgroundColor: "#000000" }} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "HelveticaMedium", data: medium, weight: 500, style: "normal" },
        { name: "HelveticaLight", data: light, weight: 300, style: "normal" },
      ],
    }
  );
}
