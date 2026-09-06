/**
 * The note for a project that exists but isn't openable yet.
 *
 * Drawn as an admission ticket rather than a plain sticky note: two small caps
 * lines, a script title, a stamped date in red, and a strip of clock hours with
 * one or two ringed. It covers enough of the thumbnail to signal the project
 * isn't ready without hiding the work entirely.
 *
 * Every block is optional and independently omitted, so a project with nothing
 * but a title still gets a note that reads as a note — no reserved gaps, no
 * empty rules. The stack is centred, so dropping a block just makes it shorter.
 *
 * Presentational: no data of its own beyond what it is handed, and static
 * markup throughout — the paper it sits on is a photographed sheet applied as
 * the stylesheet's background, so there is nothing to run on the client. It
 * expects to be dropped into a `relative overflow-hidden` box — the colour box
 * the work card and the home page's mobile card already share.
 */

/** The clock strip is always 1–12; built once at module scope, never per render. */
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);

interface ComingSoonNoteProps {
  /** Small caps lines across the top. At most two; more are ignored by the layout. */
  header?: string[];
  /** The large script line. */
  title?: string;
  /** The red stamped line, e.g. "MAY 11 2024". */
  date?: string;
  /** Which hours get ringed, 1–12. */
  hours?: number[];
  /** Which row the ringed hours sit on. */
  meridiem?: "am" | "pm";
  /** Legacy single-label field: the title fallback, and the sr-only source. */
  label?: string;
}

export default function ComingSoonNote({
  header,
  title,
  date,
  hours,
  meridiem = "pm",
  label,
}: ComingSoonNoteProps) {
  const text = title?.trim() || label?.trim() || "Coming soon";

  /**
   * One span per word, kept for the per-word rotation the stylesheet applies
   * — the title itself always renders on a single line (see --cs-title-scale
   * below and `white-space: nowrap` on .cs-note-title), never wraps.
   */
  const words = text.split(/\s+/);

  const headerLines = header?.filter((line) => line?.trim()) ?? [];
  const circled = new Set(hours ?? []);

  /**
   * A long title has to give back some size or it runs off the paper. Keyed
   * to the total character count, since the whole line has to fit — not just
   * its longest unbreakable word — now that the title never wraps.
   */
  const titleScale =
    text.length > 20 ? 0.6 : text.length > 14 ? 0.72 : text.length > 9 ? 0.86 : 1;

  /** Both rows print the full 1–12; only the named row's hours get the ring. */
  const renderHourRow = (row: "am" | "pm") => (
    <div className="cs-note-hour-row">
      {row === "am" && <span className="cs-note-meridiem">AM</span>}
      {HOURS.map((n) => (
        <span
          key={n}
          className="cs-note-hour"
          data-circled={row === meridiem && circled.has(n) ? "" : undefined}
        >
          {n}
        </span>
      ))}
      {row === "pm" && <span className="cs-note-meridiem">PM</span>}
    </div>
  );

  return (
    <div className="cs-note-layer" aria-hidden="true">
      <div className="cs-note">
        {headerLines.length > 0 && (
          <div className="cs-note-header">
            {headerLines.map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </div>
        )}

        {/* Title and date travel together: on the reference the date sits
            just under the title, and the gap that opens up when a block is
            missing belongs above the pair or below it, never between them. */}
        <div className="cs-note-main">
          <p
            className="cs-note-title"
            style={{ "--cs-title-scale": titleScale } as React.CSSProperties}
          >
            {words.map((word, i) => (
              /* The space sits *between* spans, not inside one: inside, the
                 inline-block wrapper swallows it and the words run together. */
              <span key={i}>
                {i > 0 ? " " : ""}
                <span className="cs-note-word">{word}</span>
              </span>
            ))}
          </p>

          {date?.trim() && <p className="cs-note-date">{date}</p>}
        </div>

        <div className="cs-note-hours">
          {renderHourRow("am")}
          {renderHourRow("pm")}
        </div>
      </div>
    </div>
  );
}
