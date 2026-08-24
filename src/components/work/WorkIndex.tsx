"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import Link from "@/components/transition/SmartLink";
import HoverPreviewCard from "@/components/ui/HoverPreviewCard";
import type { WorkProject, Tag } from "@/lib/sanity/types";

type View = "list" | "grid";

/**
 * Rows link to their case study when the project has a slug, and stay
 * non-interactive when it doesn't — a half-filled CMS entry shouldn't produce a
 * dead link. Both branches take the same props, so the GSAP hover popout works
 * either way.
 */
function ProjectRow({
  slug,
  className,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  slug?: string;
  className: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children: React.ReactNode;
}) {
  if (!slug) {
    return (
      <div
        className={className}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </div>
    );
  }

  return (
    <Link
      href={`/work/${slug}`}
      className={className}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </Link>
  );
}

interface WorkIndexProps {
  projects: WorkProject[];
  tags: Tag[];
}

const ListIcon = () => (
  <svg width="24" height="23" viewBox="0 0 20 19" aria-hidden="true">
    <g fill="currentColor" fillRule="evenodd">
      <path d="M0 6h20v1H0zM0 0h20v1H0zM0 12h20v1H0zM0 18h20v1H0z" />
    </g>
  </svg>
);

const GridIcon = () => (
  <svg width="24" height="24" viewBox="0 0 20 20" aria-hidden="true">
    <g fill="currentColor" fillRule="nonzero">
      <path d="M8 0H0v8h8V0zM7 1v6H1V1h6zM8 12H0v8h8v-8zm-1 1v6H1v-6h6zM20 0h-8v8h8V0zm-1 1v6h-6V1h6zM20 12h-8v8h8v-8zm-1 1v6h-6v-6h6z" />
    </g>
  </svg>
);

/**
 * `t?.slug` rather than `t.slug`: the optional chain on `tags` only proves the
 * array exists. A tag reference that doesn't resolve comes back as a null
 * *element*, which getSiteContent now strips — but this component is also fed
 * by callers that don't go through it.
 */
const hasTag = (project: WorkProject, slug: string) =>
  project.tags?.some((t) => t?.slug === slug) ?? false;

/**
 * `project.id` is an editor-entered display number ("01"), not an identifier —
 * two documents can carry the same one. `_id` is the Sanity document id; the
 * suffixed fallbacks keep the key unique when it is missing.
 */
const projectKey = (project: WorkProject, index: number) =>
  project._id ?? `${project.slug ?? project.title ?? "project"}-${index}`;

export default function WorkIndex({ projects, tags }: WorkIndexProps) {
  const [filter, setFilter] = useState<string>("all");
  const [view, setView] = useState<View>("list");

  // Hover tracking for the list-view preview card
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const filters = useMemo(
    () => [
      { key: "all", label: "All" },
      ...tags
        .filter((t): t is Tag & { slug: string } => Boolean(t?.slug))
        .map((t) => ({ key: t.slug, label: t.title ?? t.slug })),
    ],
    [tags]
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: projects.length };
    for (const { key } of filters) {
      if (key !== "all") map[key] = projects.filter((p) => hasTag(p, key)).length;
    }
    return map;
  }, [projects, filters]);

  const visible = useMemo(
    () =>
      filter === "all"
        ? projects
        : projects.filter((p) => hasTag(p, filter)),
    [projects, filter]
  );

  // Re-run the row stagger whenever the visible set or the view changes
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".work-row",
        { y: 18, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.04,
          overwrite: true,
          clearProps: "transform,opacity",
        }
      );
    }, bodyRef);
    return () => ctx.revert();
  }, [filter, view]);

  /**
   * Filter and view only change from the toolbar buttons, so the hover reset
   * belongs in the click path rather than an effect — the hovered index points
   * at a row in the *previous* list.
   */
  const resetHover = () => {
    setHoveredIndex(null);
  };

  // Memoised so the preview card's parking effect only re-runs when the set of
  // thumbnails actually changes, not on every render.
  const previewItems = useMemo(
    () =>
      visible.map((project, index) => ({
        key: projectKey(project, index),
        image: project.hoverImage ?? project.thumbnail,
        bgColor: project.hoverBg ?? project.bgColor,
      })),
    [visible]
  );

  const handleRowEnter = (index: number) => {
    setHoveredIndex(index);
  };

  const handleRowLeave = () => {
    setHoveredIndex(null);
  };

  return (
    <div className="w-full">
      {/* Filter pills + view toggle */}
      <div className="fade-in-up flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-3">
          {filters.map(({ key, label }) => {
            const isActive = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setFilter(key);
                  resetHover();
                }}
                aria-pressed={isActive}
                className={`h-[57px] rounded-full border px-[35px] text-[17px] transition-colors duration-300 flex items-center justify-center ${isActive
                    ? "border-[#1d1d1f] bg-[#1d1d1f] text-white"
                    : "border-[#e5e5e5] text-[#1d1d1f] hover:border-[#1d1d1f]"
                  }`}
              >
                <span className="font-medium tracking-tight">{label}</span>
                <span className="ml-3 mb-2.5 text-[11px] opacity-70">
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {(
            [
              { key: "list" as const, Icon: ListIcon, label: "List view" },
              { key: "grid" as const, Icon: GridIcon, label: "Grid view" },
            ]
          ).map(({ key, Icon, label }) => {
            const isActive = view === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setView(key);
                  resetHover();
                }}
                aria-label={label}
                aria-pressed={isActive}
                className={`flex h-[57px] w-[57px] items-center justify-center rounded-full border transition-colors duration-300 ${isActive
                    ? "border-[#1d1d1f] bg-[#1d1d1f] text-white"
                    : "border-[#e5e5e5] text-[#1d1d1f] hover:border-[#1d1d1f]"
                  }`}
              >
                <Icon />
              </button>
            );
          })}
        </div>
      </div>

      <div ref={bodyRef} className="mt-16 relative">
        {/* Cursor-following preview card — list view only. It is mounted
            conditionally rather than hidden with an inline display, so GSAP's
            transforms never outlive a view switch. */}
        <HoverPreviewCard
          items={previewItems}
          activeIndex={hoveredIndex}
          containerRef={bodyRef}
          enabled={view === "list"}
          scale={0.8}
        />

        {/* Both branches render a plain <div> in the same slot, so without
            distinct keys React reuses the node and diffs in place — which left
            grid cards stranded under the list container's styles. */}
        {view === "list" ? (
          <div key="list" onPointerLeave={handleRowLeave}>
            {/* Column labels */}
            <div className="hidden grid-cols-[1.8fr_1.1fr_1.4fr_0.4fr] gap-4 pb-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#8c8c8c] border-b border-[#e5e5e5] md:grid">
              <span>CLIENT</span>
              <span>CATEGORY</span>
              <span className="text-[15.6px]">SERVICES</span>
              <span className="justify-self-end">YEAR</span>
            </div>

            <div>
              {visible.map((project, i) => (
                <ProjectRow
                  key={projectKey(project, i)}
                  slug={project.slug}
                  onMouseEnter={() => handleRowEnter(i)}
                  onMouseLeave={handleRowLeave}
                  className="work-row group grid cursor-pointer grid-cols-[1fr_auto] items-center gap-4 border-b border-[#e5e5e5] py-14 md:grid-cols-[1.8fr_1.1fr_1.4fr_0.4fr]"
                >
                  <h2 className="text-[34px] font-medium leading-none tracking-[-0.02em] text-[#1d1d1f] transition-transform duration-300 ease-out group-hover:translate-x-3 sm:text-[40px] md:text-[46px]">
                    <span>{project.title}</span>
                    <sup className="ml-1 text-[0.4em] leading-none">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="inline-block opacity-60 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </sup>
                  </h2>
                  <span className="hidden text-[17px] font-normal text-[#1d1d1f] md:inline">
                    {project.category || "Design"}
                  </span>
                  <span className="hidden text-[17px] font-normal text-[#1d1d1f] md:inline">
                    {project.services || "Design & development"}
                  </span>
                  <span className="justify-self-end text-[17px] font-semibold text-[#1d1d1f]">
                    {project.year || "2026"}
                  </span>
                </ProjectRow>
              ))}
            </div>
          </div>
        ) : (
          <div key="grid" className="grid grid-cols-1 gap-x-10 gap-y-16 sm:grid-cols-2">
            {visible.map((project, i) => (
              <ProjectRow
                key={projectKey(project, i)}
                slug={project.slug}
                className="work-row group block cursor-pointer"
              >
                <div
                  className="relative aspect-[400/360] w-full overflow-hidden rounded-[2px]"
                  style={{ backgroundColor: project.hoverBg ?? project.bgColor ?? "#f1f1f1" }}
                >
                  {/* Inset window matches the cursor-following preview card's
                      exact geometry (400x360 card, 352x220 window) so the grid
                      boxes are the same shape, just scaled up. */}
                  <div className="absolute inset-x-[6%] inset-y-[19.44%] overflow-hidden rounded-[2px]">
                    {(project.hoverImage ?? project.thumbnail) && (
                      <Image
                        src={(project.hoverImage ?? project.thumbnail)!}
                        alt={project.title ?? ""}
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                      />
                    )}
                  </div>
                </div>
                <h2 className="mt-6 text-[39px] font-medium leading-[1.05] tracking-[-0.02em] text-[#1d1d1f] sm:text-[45px]">
                  {project.title}
                </h2>
                <div className="mt-3 flex items-center justify-between border-t border-[#e5e5e5] pt-3">
                  <span className="text-[18px] font-medium text-[#1d1d1f]/60">
                    {project.category}
                  </span>
                  <span className="text-[18px] font-medium text-[#1d1d1f]/60">{project.year}</span>
                </div>
              </ProjectRow>
            ))}
          </div>
        )}

        {visible.length === 0 && (
          <p className="py-16 text-[15px] text-[#a3a3a3]">
            No projects in this category yet.
          </p>
        )}
      </div>
    </div>
  );
}
