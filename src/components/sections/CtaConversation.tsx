import Image from "next/image";

export default function CtaConversation({ src }: { src?: string }) {
  return (
    <section
      id="contact"
      className="relative w-full h-[100dvh] bg-transparent overflow-hidden"
    >
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
