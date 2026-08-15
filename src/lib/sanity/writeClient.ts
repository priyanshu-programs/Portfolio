import { createClient, type SanityClient } from "@sanity/client";
import { projectId, dataset, apiVersion } from "./client";

/**
 * Privileged Sanity client for writes (create/update/delete + asset uploads).
 * Reads the token from SANITY_API_TOKEN — a secret that lives only in
 * `.env.local`, never in this repo. This module is imported ONLY by one-off
 * scripts under `scripts/sanity/` — never by the Next app — so the token never
 * reaches the browser bundle. (`SANITY_API_TOKEN` also has no NEXT_PUBLIC_
 * prefix, so Next would refuse to inline it client-side even if it tried.)
 */
const token = process.env.SANITY_API_TOKEN;

export const canWrite = Boolean(projectId && token);

export function getWriteClient(): SanityClient {
  if (!projectId) {
    throw new Error(
      "NEXT_PUBLIC_SANITY_PROJECT_ID is not set — check .env.local."
    );
  }
  if (!token) {
    throw new Error(
      "SANITY_API_TOKEN is not set — add an Editor token to .env.local (see SANITY_SETUP.md)."
    );
  }
  return createClient({
    projectId,
    dataset,
    apiVersion,
    token,
    useCdn: false, // writes must hit the live API, never the CDN
  });
}
