/**
 * One GROQ query fetching every site-wide content document in a single request.
 * Image fields are returned as raw Sanity image objects and resolved to URL
 * strings in getSiteContent.
 */
export const siteContentQuery = /* groq */ `{
  "settings": *[_type == "siteSettings"][0]{
    name, email, phone, timezone, seoTitle, seoDescription,
    navColor, navBlend,
    socials[]{ label, href },
    navLinks[]{ label, href }
  },
  "hero": *[_type == "hero"][0]{
    pillLabel, heading, paragraph, marqueeText, loaderText, portrait
  },
  "aboutWork": *[_type == "aboutWork"][0]{
    quote, subParagraph
  },
  "about": *[_type == "about"][0]{
    title,
    paragraphs[]{ text, accents },
    slots[]{ image, alt, blurb{ text, accents } },
    achievements[]{ title, description, badge, image, alt, hidden },
    socials[]{ label, href },
    email, seoTitle, seoDescription
  },
  "contact": *[_type == "contact"][0]{
    heading, successHeading, successBody, submitLabel, submitPendingLabel,
    profileImage, showBackgroundGradient,
    socials[]{ label, href },
    email, phone, seoTitle, seoDescription
  },
  "services": *[_type == "services"][0]{
    heading, ornament, landscape,
    cards[]{ title, copy, iconKey }
  },
  "cta": *[_type == "ctaCollage"][0]{
    headline, revealHeadline, linkText,
    collage, handLeft, handRight, twoHands
  },
  "floatingMenu": *[_type == "floatingMenu"][0]{
    tags, image
  },
  "workProjects": *[_type == "workProject" && visible != false] | order(order asc, id asc){
    _id, id, title, "slug": slug.current, category, services, year,
    tags[]->{ _id, title, "slug": slug.current },
    thumbnail, bgColor,
    hoverImage, "hoverBg": hoverBg.hex
  },
  "homeWork": *[_type == "workProject" && pinnedHome == true && visible != false] | order(order asc, id asc)[0...4]{
    _id, id, title, "slug": slug.current, category, services, year, thumbnail, bgColor,
    hoverImage, "hoverBg": hoverBg.hex
  },
  "tags": *[_type == "tag"] | order(order asc){
    _id, title, "slug": slug.current
  }
}`;

/** Every publishable case-study slug, for generateStaticParams. */
export const workSlugsQuery = /* groq */ `
  *[_type == "workProject" && defined(slug.current) && visible != false].slug.current
`;

/**
 * One case study plus the ordered list of all projects. The list is slim (no
 * bodies) and lets getCaseStudy resolve the "next project" link in TypeScript,
 * including the wrap from the last project back to the first — cheaper and
 * clearer than expressing the wrap in GROQ.
 */
export const caseStudyBySlugQuery = /* groq */ `{
  "project": *[_type == "workProject" && slug.current == $slug && visible != false][0]{
    title, "slug": slug.current, category, services, year,
    // Sanity stamps these on every document, so they need no schema field and
    // cannot drift from reality the way a hand-entered date would. They feed
    // datePublished/dateModified in the case study's JSON-LD; recency is a
    // strong ranking and AI-citation signal, and nothing else in the content
    // model records when a project was actually published or last edited.
    _createdAt, _updatedAt,
    summary, liveUrl, cover,
    challenge, approach,
    galleryHeading, gallerySubheading,
    gallery[]{ image, caption },
    pageBg, accent, textColor, navColor, galleryBg
  },
  "ordered": *[_type == "workProject" && defined(slug.current) && visible != false]
    | order(order asc, id asc){
      title, "slug": slug.current, category, services, year, thumbnail, cover, bgColor,
      pageBg, accent, textColor, navColor
    }
}`;
