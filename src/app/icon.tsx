import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * PNG app icon, generated rather than checked in as a binary.
 *
 * favicon.ico already covers the browser tab; this is the higher-resolution
 * cut Next emits as <link rel="icon" sizes="180x180">, which is what Android
 * home screens, the web manifest, and link unfurls actually pick up.
 *
 * 180x180 is the Apple touch icon size, and serves the smaller cases too since
 * downscaling a square mark is lossless enough at these dimensions.
 */
export default async function Icon() {
  const font = await readFile(
    join(process.cwd(), "public/fonts/HelveticaNeueMedium.ttf")
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
          color: "#ffffff",
          fontSize: 110,
          fontFamily: "Helvetica",
          letterSpacing: "-0.04em",
        }}
      >
        P
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Helvetica", data: font, weight: 500, style: "normal" }],
    }
  );
}
