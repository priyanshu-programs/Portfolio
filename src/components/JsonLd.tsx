/**
 * Renders a JSON-LD structured-data block.
 *
 * A server component by default, so the markup lands in the initial HTML where
 * crawlers read it — several of this site's pages are client components, and
 * structured data injected after hydration is unreliable for indexing.
 *
 * `<` is escaped because a literal `</script>` inside the payload (from a CMS
 * string an editor typed) would otherwise close this tag early and spill the
 * rest into the document as markup. Escaping it keeps the JSON valid — parsers
 * read < as `<` — while stopping the HTML parser from ever seeing one.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
