import Image from "next/image";

/**
 * Rendered by CtaCollage as the expanding-dot reveal at the end of the home
 * scroll. Carries no id: "Contact" in the nav is the /contact route now, and an
 * anchor left here would invite a link back to a section that is only a
 * background image.
 */
export default function CtaConversation({ src }: { src?: string }) {
  return (
    <section className="relative w-full h-[100dvh] bg-transparent overflow-hidden">
      {/* Full-bleed background image */}
      <Image
        src={src ?? "/images/cta-2hands.png"}
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
        priority={false}
      />
    </section>
  );
}
