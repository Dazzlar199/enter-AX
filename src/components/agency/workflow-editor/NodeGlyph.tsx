import type { NodeIcon } from "@/features/workflows/catalog";

const glyphPaths: Record<Extract<NodeIcon, { glyph: string }>["glyph"], string> = {
  play: "M8 5.5v13l10-6.5z",
  people: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5 M16 4.3a3.5 3.5 0 0 1 0 6.4 M18 14.8c1.9.7 3.2 2.5 3.5 5.2",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z",
  filter: "M4 5h16l-6 7.5V19l-4 2v-8.5z",
  columns: "M4 4h16v16H4z M9.5 4v16 M14.5 4v16",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z",
  hand: "M8 12V5.5a1.5 1.5 0 0 1 3 0V11 M11 10V4a1.5 1.5 0 0 1 3 0v6 M14 10V5.5a1.5 1.5 0 0 1 3 0V13 M17 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L4.3 14a1.5 1.5 0 0 1 2.4-1.8L8 14",
  board: "M3 4h18v16H3z M9 4v16 M15 4v16 M5 7h2 M11 7h2 M11 10h2 M17 7h2",
  megaphone: "M3 10v4h3l7 4V6l-7 4z M16 9a4 4 0 0 1 0 6 M6 14l1.5 5h2.5l-1-5",
};

export function NodeGlyph({ icon, size }: { icon: NodeIcon; size: number }) {
  if ("logo" in icon) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" className="wf-glyph" height={size} src={icon.logo} width={size} />;
  }
  return (
    <svg aria-hidden="true" className="wf-glyph wf-glyph--line" height={size} viewBox="0 0 24 24" width={size}>
      <path d={glyphPaths[icon.glyph]} />
    </svg>
  );
}
