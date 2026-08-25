import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/siteUrl";

/**
 * Crawlers get the whole site except the API surface, which holds nothing
 * indexable: /api/image is a Sanity CDN proxy (the images are already reachable
 * at their real URLs, and letting a crawler enumerate the proxy just burns
 * budget on duplicates) and /api/revalidate is a POST-only webhook.
 */
/**
 * Crawlers that answer questions rather than return links: ChatGPT search,
 * Claude, Perplexity, and Google's Gemini grounding. The wildcard rule above
 * already permits them, so naming them changes no behaviour today — it makes
 * the intent explicit, so a future tightening of the wildcard doesn't silently
 * cut the site out of AI answers.
 *
 * Deliberately excludes CCBot and `anthropic-ai`: those are bulk training
 * crawlers, not the retrieval bots that cite you in a live answer, so they're
 * left to the wildcard rather than being singled out as endorsed.
 *
 * Note some AI fetchers (ChatGPT-User, Google-Agent, Google-NotebookLM) are
 * user-triggered and ignore robots.txt entirely by design; no rule here
 * affects them.
 */
const AI_SEARCH_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: "/api/",
      },
      {
        userAgent: AI_SEARCH_CRAWLERS,
        allow: "/",
        disallow: "/api/",
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl(),
  };
}
