import path from "node:path";

const GENERATED_ROOT = path.join(process.cwd(), "public", "generated");

/** Maps a `/generated/...` URL to a file path, or null if it would escape the generated directory. */
export function resolveGeneratedClip(clipUrl: unknown): string | null {
  if (typeof clipUrl !== "string" || !clipUrl.startsWith("/generated/")) return null;
  const resolved = path.resolve(path.join(process.cwd(), "public"), `.${clipUrl}`);
  return resolved.startsWith(GENERATED_ROOT + path.sep) ? resolved : null;
}
