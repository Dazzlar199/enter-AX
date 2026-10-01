/** Line icons used instead of emoji or text glyphs. Stroke follows currentColor. */
const paths = {
  check: "M5 12.5l4.5 4.5L19 7.5",
  close: "M6 6l12 12M18 6L6 18",
  plus: "M12 5v14M5 12h14",
  pause: "M9 6v12M15 6v12",
  alert: "M12 7v6M12 17h.01",
  bolt: "M13 3L5 13.5h6L10 21l8-10.5h-6z",
  chevronLeft: "M15 18l-6-6 6-6",
  chevronRight: "M9 18l6-6-6-6",
  chevronDown: "M6 9l6 6 6-6",
  sidebar: "M3 3h18v18H3z M9 3v18",
  maximize: "M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7",
  sparkle: "M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={name === "bolt" ? 1.8 : 2.2} viewBox="0 0 24 24" width={size}>
      <path d={paths[name]} fill={name === "bolt" ? "currentColor" : "none"} />
    </svg>
  );
}
