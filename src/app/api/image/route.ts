/**
 * Same-origin image proxy for the WebGL liquid effect.
 *
 * The <LiquidImage> canvas needs to read image pixels as a WebGL texture, which
 * requires the image to be same-origin or CORS-readable. Sanity's CDN returns
 * 403 (no Access-Control-Allow-Origin) for cross-origin requests unless the
 * exact origin is allowlisted in the project settings. Streaming the bytes back
 * through our own origin sidesteps CORS entirely, so the effect works in every
 * environment without any Sanity dashboard configuration.
 *
 * Only cdn.sanity.io is allowed as an upstream host (SSRF guard).
 */
export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("url");

  if (!target) {
    return new Response("Missing url parameter", { status: 400 });
  }

  let upstream: URL;
  try {
    upstream = new URL(target);
  } catch {
    return new Response("Invalid url parameter", { status: 400 });
  }

  if (upstream.protocol !== "https:" || upstream.hostname !== "cdn.sanity.io") {
    return new Response("Forbidden host", { status: 400 });
  }

  let res: Response;
  try {
    // `redirect: "manual"` so the allowlist above can't be walked around: the
    // host check runs on the URL we were handed, but fetch would by default
    // follow a 3xx to anywhere, and only the first hop is validated. Sanity's
    // CDN serves content-hashed assets and shouldn't redirect, so treating a
    // redirect as an error costs nothing and closes the hole.
    res = await fetch(upstream.toString(), { redirect: "manual" });
  } catch {
    return new Response("Upstream fetch failed", { status: 502 });
  }

  if (res.status >= 300 && res.status < 400) {
    return new Response("Upstream redirected", { status: 502 });
  }

  if (!res.ok || !res.body) {
    return new Response("Upstream error", { status: res.status || 502 });
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      // Sanity asset URLs are content-hashed, so the bytes never change.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
