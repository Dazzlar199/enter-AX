/** Shown only while the app runs on sample data (demo backend mode). */
export function DemoBadge() {
  if (process.env.NEXT_PUBLIC_BACKEND_MODE === "api") return null;
  return <span className="demo-badge">시연 데이터</span>;
}
