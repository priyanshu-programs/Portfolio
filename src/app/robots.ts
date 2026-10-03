import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/siteUrl";

/**
 * Crawlers get the whole site except the API surface, which holds nothing
 * indexable: /api/revalidate is a POST-only webhook.
 */
/**
 * Crawlers that answer questions rather than return links. The wildcard rule
 * above already permits them, so naming them changes no behaviour today — it
 * makes the intent explicit, so a future tightening of the wildcard doesn't
 * silently cut the site out of AI answers.
 *
 * Search citability and model training are separate capabilities governed by
 * separate user-agents, and the pairs below are routinely conflated — each bot
 * only ever supports a claim about itself:
 *
 *   OAI-SearchBot      ChatGPT Search citability   (GPTBot does NOT imply it)
 *   Claude-SearchBot   Claude search citability    (ClaudeBot does NOT imply it)
 *   PerplexityBot      Perplexity search
 *   GPTBot             OpenAI model training
 *   ClaudeBot          Anthropic model training
 *   Google-Extended    Gemini/Vertex training and grounding — NOT Google Search
 *                      inclusion, and NOT AI Overviews, which are served from
 *                      the Googlebot index
 *   Applebot-Extended  Apple Intelligence training opt-in. Not a crawler: it
 *                      labels what Applebot already fetched, and Siri/Spotlight
 *                      discovery depends on Applebot, not on this.
 *
 * CCBot is left to the wildcard: it is a bulk training crawler, not a retrieval
 * bot that cites you in a live answer, so it isn't singled out as endorsed.
 *
 * Some AI fetchers are user-triggered and ignore robots.txt by design
 * (ChatGPT-User, Google-Agent, Google-GeminiNotebook); no rule here affects
 * them — that needs server-side access control.
 */
const AI_SEARCH_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
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
    // No `host`. It is a Yandex-only extension that Google and Bing both
    // ignore, so it stated a host preference to almost nobody — and when the
    // apex and www disagreed about which one served, it stated the wrong one.
    // Canonical tags carry host preference to the crawlers that matter.
  };
}
