import { defineCliConfig } from "sanity/cli";

// Hardcoded for the same reason as sanity.config.ts — env vars don't
// reliably survive into the deploy build step. Not a secret.
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "i0fv16h3";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

export default defineCliConfig({
  api: { projectId, dataset },
  // The hosted Studio URL slug used by `sanity deploy` -> https://priyanshuroy-portfolio.sanity.studio
  studioHost: "priyanshuroy-portfolio",
  deployment: {
    appId: "vlqaf4e6j8kc2jieramxcw3k",
  },
  /**
   * The Studio shares a directory with the Next app, so Vite's dev watcher
   * would otherwise crawl `.next/`. Next's dev image cache rewrites and expires
   * `.avif` entries continuously, and on Windows the watcher eventually
   * `lstat`s a file that has already been removed — chokidar emits an
   * unhandled 'error' and `sanity dev` dies with:
   *
   *   Error: UNKNOWN: unknown error, lstat '...\.next\dev\cache\images\...avif'
   *
   * None of these directories contain Studio source, so scoping the watcher
   * removes the race entirely (and cuts startup work). Vite replaces its
   * default `ignored` list rather than merging, so the usual entries are
   * repeated here.
   */
  vite: (config) => ({
    ...config,
    server: {
      ...config.server,
      watch: {
        ...config.server?.watch,
        ignored: [
          "**/.git/**",
          "**/node_modules/**",
          "**/.next/**",
          "**/dist/**",
        ],
      },
    },
  }),
});
