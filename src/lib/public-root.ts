import { existsSync } from "node:fs";
import { join } from "node:path";

export function resolvePublicRoot(cwd = process.cwd()): string {
  const rootPublic = join(cwd, "public");
  if (existsSync(rootPublic)) {
    return rootPublic;
  }

  const themePublic = join(cwd, "theme", "public");
  return existsSync(themePublic) ? themePublic : rootPublic;
}
