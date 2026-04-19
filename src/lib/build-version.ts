import { createHash } from "node:crypto";

const getBuildVersionSeed = () =>
  process.env.PUBLIC_BUILD_VERSION ||
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.BUILD_TIME ||
  "dev";

export const getBuildVersionToken = () =>
  createHash("sha1").update(getBuildVersionSeed()).digest("hex").slice(0, 12);
