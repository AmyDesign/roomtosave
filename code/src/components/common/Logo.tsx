/**
 * The mark: a container filled part-way up.
 *
 * The empty part is the point. Every other number in this tool exists to answer
 * "how much room do I have left", so the mark says that rather than saying
 * "money" -- a dollar sign would put us in the same bucket as every other tax
 * and loan service in the country, which is exactly the bucket the name was
 * chosen to escape.
 *
 * Two elements only, so it survives being shrunk. Drawn with an explicit path
 * for the fill rather than a clipPath, so there's no element id to collide with
 * when the mark is rendered more than once, and so it can be pasted straight
 * into a favicon or an OG image.
 *
 * Colour comes from `currentColor` -- set it on the parent (`text-prog`), and
 * it inverts correctly on a dark background without a second copy.
 */
export function Mark({
  size = 30,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect
        x="1.2"
        y="1.2"
        width="21.6"
        height="21.6"
        rx="6.1"
        stroke="currentColor"
        strokeWidth={STROKE}
      />
      <path
        d={`M1.2 ${FILL_TOP} H22.8 V16.7 A6.1 6.1 0 0 1 16.7 22.8 H7.3 A6.1 6.1 0 0 1 1.2 16.7 Z`}
        fill="currentColor"
      />
    </svg>
  );
}

/*
 * The mark's whole meaning lives in these two numbers, so they're named rather
 * than buried in the path data.
 *
 * The first draft used STROKE 2.9 / FILL_TOP 13.2 and read as a solid blue
 * block with a notch cut out -- more than half the shape was ink, so "there is
 * space left here" was the one thing it failed to say. Thinning the outline and
 * dropping the fill line fixes that: the emptiness now dominates, which is the
 * point.
 */
/** Outline weight. Below ~2 it starts breaking up at favicon sizes. */
const STROKE = 2.2;
/**
 * Where the fill starts, in a box spanning y 1.2–22.8. Higher = less filled.
 * 12.8 ≈ 46% full: reads as clearly settled without hitting the exact half,
 * where the shape starts to look like a generic contrast/dark-mode icon.
 * Provisional — the mark direction (square vs. bottle) is still open.
 */
const FILL_TOP = 12.8;
