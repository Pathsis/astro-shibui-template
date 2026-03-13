/**
 * 上传搜索索引到 Algolia
 *
 * 当 Astro 站点完全独立后，此脚本用于上传生成的索引
 * 运行: pnpm run upload-index
 *
 * 注意：目前索引由 Hugo 站点生成和上传，此脚本暂时不用
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { algoliasearch } from "algoliasearch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Algolia 配置
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID || "9872TK5O1S";
const ALGOLIA_ADMIN_KEY =
  process.env.ALGOLIA_ADMIN_KEY ||
  process.env.ALGOLIA_ADMIN_API_KEY ||
  process.env.ALGOLIA_API_KEY;
const ALGOLIA_INDEX_NAME = process.env.ALGOLIA_INDEX_NAME || "hugo-shibui";

interface SearchRecord {
  objectID: string;
  url: string;
  title: string;
  content: string;
  date: string;
  tags?: string[];
  description?: string;
  summary?: string;
  section?: string;
  language: string;
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortDeep);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => [key, sortDeep(val)] as const);
    return Object.fromEntries(entries);
  }
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function normalizeAndValidateRecords(records: SearchRecord[]): SearchRecord[] {
  const byId = new Map<string, SearchRecord>();
  const duplicateIds: string[] = [];

  for (const record of records) {
    const objectID = String(record?.objectID ?? "").trim();
    if (!objectID) {
      throw new Error("存在缺失 objectID 的记录，无法上传。");
    }
    const normalized = { ...record, objectID };
    if (byId.has(objectID)) {
      duplicateIds.push(objectID);
    }
    byId.set(objectID, normalized);
  }

  if (duplicateIds.length > 0) {
    const sample = duplicateIds.slice(0, 5).join(", ");
    throw new Error(
      `本地索引存在重复 objectID（共 ${duplicateIds.length} 条重复）：${sample}${duplicateIds.length > 5 ? "..." : ""}`
    );
  }

  return [...byId.values()];
}

async function fetchRemoteIndex(client: ReturnType<typeof algoliasearch>, indexName: string): Promise<SearchRecord[]> {
  const remote: SearchRecord[] = [];

  await client.browseObjects<SearchRecord>({
    indexName,
    browseParams: {
      hitsPerPage: 1000,
      attributesToRetrieve: ["*"],
    },
    aggregator: (response) => {
      if (Array.isArray(response.hits)) {
        for (const hit of response.hits) {
          const objectID = String(hit?.objectID ?? "").trim();
          if (!objectID) continue;
          remote.push({ ...hit, objectID });
        }
      }
      return response;
    },
  });

  return remote;
}

async function uploadToAlgolia() {
  // 读取生成的索引文件
  const indexPath = path.resolve(__dirname, "..", "dist", "algolia.json");

  try {
    await fs.access(indexPath);
  } catch {
    console.error("❌ 错误: 索引文件不存在");
    console.error("   路径:", indexPath);
    console.error("   请确保构建时生成了索引文件");
    process.exit(1);
  }

  if (!ALGOLIA_ADMIN_KEY) {
    console.error("❌ 错误: 未设置 ALGOLIA_ADMIN_KEY 环境变量");
    console.error("   请设置: ALGOLIA_ADMIN_KEY=xxx pnpm run upload-index");
    process.exit(1);
  }

  const content = await fs.readFile(indexPath, "utf-8");
  const parsed = JSON.parse(content) as SearchRecord[];
  const records = normalizeAndValidateRecords(parsed);

  console.log(`📤 准备上传 ${records.length} 条记录到 Algolia...`);
  console.log(`   App ID: ${ALGOLIA_APP_ID}`);
  console.log(`   Index: ${ALGOLIA_INDEX_NAME}`);

  // 按语言统计
  const byLang = records.reduce((acc, r) => {
    acc[r.language] = (acc[r.language] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`   语言分布:`, byLang);

  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);

  try {
    // 读取远端索引并计算增量操作（与 atomic-algolia 逻辑一致）
    console.log("📥 拉取远端索引...");
    const remoteRecords = await fetchRemoteIndex(client, ALGOLIA_INDEX_NAME);
    const remoteMap = new Map(remoteRecords.map((r) => [r.objectID, r]));
    const localMap = new Map(records.map((r) => [r.objectID, r]));

    const toAdd: SearchRecord[] = [];
    const toUpdate: SearchRecord[] = [];
    let unchanged = 0;

    for (const [objectID, localRecord] of localMap) {
      const remoteRecord = remoteMap.get(objectID);
      if (!remoteRecord) {
        toAdd.push(localRecord);
        continue;
      }
      if (stableStringify(localRecord) !== stableStringify(remoteRecord)) {
        toUpdate.push(localRecord);
      } else {
        unchanged += 1;
      }
    }

    const toDelete = [...remoteMap.keys()].filter((objectID) => !localMap.has(objectID));

    console.log("🔎 增量计算结果:");
    console.log(`   新增: ${toAdd.length}`);
    console.log(`   更新: ${toUpdate.length}`);
    console.log(`   删除: ${toDelete.length}`);
    console.log(`   不变: ${unchanged}`);

    if (toAdd.length === 0 && toUpdate.length === 0 && toDelete.length === 0) {
      console.log("\n✅ 索引已是最新，无需上传。");
      return;
    }

    const upsertObjects = [...toAdd, ...toUpdate] as unknown as Record<string, unknown>[];
    if (upsertObjects.length > 0) {
      console.log(`⬆️  上传新增/更新记录（${upsertObjects.length}）...`);
      await client.saveObjects({
        indexName: ALGOLIA_INDEX_NAME,
        objects: upsertObjects,
        waitForTasks: true,
      });
    }

    if (toDelete.length > 0) {
      console.log(`🗑️  删除下线记录（${toDelete.length}）...`);
      await client.deleteObjects({
        indexName: ALGOLIA_INDEX_NAME,
        objectIDs: toDelete,
        waitForTasks: true,
      });
    }

    // 终态校验：确保远端 objectID 集合与本地一致，且记录内容一致
    console.log("✅ 校验远端索引状态...");
    const finalRemoteRecords = await fetchRemoteIndex(client, ALGOLIA_INDEX_NAME);
    const finalRemoteMap = new Map(finalRemoteRecords.map((r) => [r.objectID, r]));
    const missing = [...localMap.keys()].filter((objectID) => !finalRemoteMap.has(objectID));
    const extra = [...finalRemoteMap.keys()].filter((objectID) => !localMap.has(objectID));
    const contentMismatch = [...localMap.keys()].filter((objectID) => {
      const localRecord = localMap.get(objectID);
      const remoteRecord = finalRemoteMap.get(objectID);
      if (!localRecord || !remoteRecord) return false;
      return stableStringify(localRecord) !== stableStringify(remoteRecord);
    });

    if (missing.length > 0 || extra.length > 0 || contentMismatch.length > 0) {
      throw new Error(
        `终态校验失败：missing=${missing.length}, extra=${extra.length}, contentMismatch=${contentMismatch.length}`
      );
    }

    console.log("\n✅ 搜索索引上传成功！");
    console.log(`   索引名称: ${ALGOLIA_INDEX_NAME}`);
    console.log(`   记录数量: ${records.length}（无重复，已按 objectID 同步更新）`);
  } catch (error: any) {
    console.error("\n❌ 上传失败:", error.message);
    if (error.message.includes("not enough rights")) {
      console.error("   提示: 请使用 Admin API Key，而不是 Search-Only Key");
    }
    process.exit(1);
  }
}

uploadToAlgolia();
