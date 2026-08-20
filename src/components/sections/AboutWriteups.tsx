import { PortableText, type PortableTextBlock } from "@portabletext/react";

type AboutWriteup = {
  _key?: string;
  title?: string;
  eyebrow?: string;
  body?: PortableTextBlock[];
};

type AboutWriteupsProps = {
  heading?: string;
  intro?: string;
  writeups?: AboutWriteup[];
};

/**
 * CMS-driven long-form content for the About page.
 * Pass the `writeups` array returned by the About document directly to this
 * component; empty entries are ignored so unpublished drafts fail gracefully.
 */
export default function AboutWriteups({
  heading = "A little more about us",
  intro,
  writeups = [],
}: AboutWriteupsProps) {
  const visibleWriteups = writeups.filter((writeup) => writeup.body?.length);

  if (!visibleWriteups.length) return null;

  return (
    <section className="border-t border-current/15 px-5 py-20 md:px-10 md:py-32" aria-labelledby="about-writeups-heading">
      <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[0.8fr_1.4fr] lg:gap-24">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-5 text-xs uppercase tracking-[0.18em] opacity-60">About</p>
          <h2 id="about-writeups-heading" className="max-w-xl text-4xl leading-[0.95] tracking-[-0.04em] md:text-6xl">
            {heading}
          </h2>
          {intro ? <p className="mt-6 max-w-sm text-base leading-relaxed opacity-65">{intro}</p> : null}
        </div>

        <div className="divide-y divide-current/15">
          {visibleWriteups.map((writeup, index) => (
            <article key={writeup._key ?? `${writeup.title ?? "writeup"}-${index}`} className="py-8 first:pt-0 last:pb-0 md:py-12">
              {writeup.eyebrow ? <p className="mb-4 text-xs uppercase tracking-[0.18em] opacity-60">{writeup.eyebrow}</p> : null}
              {writeup.title ? <h3 className="mb-6 text-2xl tracking-[-0.02em] md:text-3xl">{writeup.title}</h3> : null}
              <div className="prose prose-neutral max-w-2xl text-base leading-[1.7] opacity-75 md:text-lg">
                <PortableText value={writeup.body ?? []} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
