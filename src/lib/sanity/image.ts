import {
  createImageUrlBuilder,
  type SanityImageSource,
} from "@sanity/image-url";
import { projectId, dataset } from "./client";

const builder = projectId
  ? createImageUrlBuilder({ projectId, dataset })
  : null;

/**
 * Resolve a Sanity image reference to a CDN URL string at a given width.
 * Returns undefined when the source is empty or Sanity isn't configured, so
 * callers can fall back to their local `/images/...` asset.
 */
export function buildImageUrl(
  source: unknown,
  width = 1200,
  options?: { compress?: boolean }
): string | undefined {
  if (!builder || !source) return undefined;
  try {
    const img = builder.image(source as SanityImageSource).width(width);
    if (options?.compress === false) {
      return img.url();
    }
    return img.auto("format").quality(85).url();
  } catch {
    return undefined;
  }
}
