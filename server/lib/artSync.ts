/**
 * artSync.ts
 * Multi-Agent 素材同步核心邏輯
 *
 * 功能：
 * 1. 從 GitHub 拉取 ART/MANIFEST.json
 * 2. 比對哪些素材是新的（status: "ready"）
 * 3. 記錄同步日誌
 * 4. 回報整合結果（實際整合由各功能模組負責）
 *
 * 設計原則：
 * - 此模組只負責「偵測」和「記錄」，不直接修改網站檔案
 * - 整合邏輯由各功能模組（如 LandingPage 素材替換）自行實作
 * - 每次巡邏結果都會記錄在 sync log 中
 */

const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/hiyomarket/oracleres/main";
const MANIFEST_PATH = "ART/MANIFEST.json";

// ─── 型別定義 ────────────────────────────────────────────────────────────────

export type AssetStatus = "pending" | "ready" | "integrated" | "error";

export interface AssetEntry {
  task: string;
  name: string;
  description: string;
  file: string;
  format: string;
  dimensions: string;
  status: AssetStatus;
  version: string;
  created_at: string;
  notes?: string;
}

export interface ManifestSyncStatus {
  last_checked_by_system: string | null;
  last_integrated_version: string | null;
}

export interface ArtManifest {
  version: string;
  schema: string;
  last_updated: string;
  updated_by: string;
  sync_status: ManifestSyncStatus;
  assets: Record<string, AssetEntry>;
}

export interface SyncResult {
  checked_at: string;
  manifest_version: string;
  manifest_last_updated: string;
  ready_assets: ReadyAsset[];
  total_assets: number;
  ready_count: number;
  integrated_count: number;
  pending_count: number;
  error?: string;
}

export interface ReadyAsset {
  id: string;
  task: string;
  name: string;
  description: string;
  file_url: string;
  format: string;
  dimensions: string;
  version: string;
  notes?: string;
}

// ─── 主要函數 ────────────────────────────────────────────────────────────────

/**
 * 從 GitHub 拉取最新的 MANIFEST.json
 */
export async function fetchManifest(): Promise<ArtManifest> {
  const url = `${GITHUB_RAW_BASE}/${MANIFEST_PATH}?t=${Date.now()}`;
  const response = await fetch(url, {
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(
      `無法拉取 MANIFEST.json：HTTP ${response.status} ${response.statusText}`
    );
  }

  const manifest = (await response.json()) as ArtManifest;

  if (!manifest.assets || typeof manifest.assets !== "object") {
    throw new Error("MANIFEST.json 格式錯誤：缺少 assets 欄位");
  }

  return manifest;
}

/**
 * 從 MANIFEST 中找出所有 status: "ready" 的素材
 */
export function findReadyAssets(manifest: ArtManifest): ReadyAsset[] {
  const ready: ReadyAsset[] = [];

  for (const [id, asset] of Object.entries(manifest.assets)) {
    if (asset.status === "ready") {
      ready.push({
        id,
        task: asset.task,
        name: asset.name,
        description: asset.description,
        file_url: `${GITHUB_RAW_BASE}/${asset.file}`,
        format: asset.format,
        dimensions: asset.dimensions,
        version: asset.version,
        notes: asset.notes,
      });
    }
  }

  return ready;
}

/**
 * 統計各狀態的素材數量
 */
export function countAssetsByStatus(manifest: ArtManifest): {
  total: number;
  ready: number;
  integrated: number;
  pending: number;
  error: number;
} {
  const counts = { total: 0, ready: 0, integrated: 0, pending: 0, error: 0 };

  for (const asset of Object.values(manifest.assets)) {
    counts.total++;
    if (asset.status === "ready") counts.ready++;
    else if (asset.status === "integrated") counts.integrated++;
    else if (asset.status === "pending") counts.pending++;
    else if (asset.status === "error") counts.error++;
  }

  return counts;
}

/**
 * 執行一次完整的巡邏掃描
 * 回傳巡邏結果，包含所有 ready 素材的清單
 */
export async function runPatrol(): Promise<SyncResult> {
  const checked_at = new Date().toISOString();

  try {
    const manifest = await fetchManifest();
    const readyAssets = findReadyAssets(manifest);
    const counts = countAssetsByStatus(manifest);

    const result: SyncResult = {
      checked_at,
      manifest_version: manifest.version,
      manifest_last_updated: manifest.last_updated,
      ready_assets: readyAssets,
      total_assets: counts.total,
      ready_count: counts.ready,
      integrated_count: counts.integrated,
      pending_count: counts.pending,
    };

    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      checked_at,
      manifest_version: "unknown",
      manifest_last_updated: "unknown",
      ready_assets: [],
      total_assets: 0,
      ready_count: 0,
      integrated_count: 0,
      pending_count: 0,
      error: errorMessage,
    };
  }
}

/**
 * 格式化巡邏結果為人類可讀的摘要文字
 */
export function formatPatrolSummary(result: SyncResult): string {
  const time = new Date(result.checked_at).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
  });

  if (result.error) {
    return `[${time}] 巡邏失敗：${result.error}`;
  }

  const lines = [
    `[${time}] 巡邏完成`,
    `MANIFEST 版本：${result.manifest_version}（最後更新：${result.manifest_last_updated}）`,
    `素材統計：共 ${result.total_assets} 個 | 待整合 ${result.ready_count} 個 | 已整合 ${result.integrated_count} 個 | 製作中 ${result.pending_count} 個`,
  ];

  if (result.ready_count > 0) {
    lines.push(`\n待整合素材清單：`);
    for (const asset of result.ready_assets) {
      lines.push(`  - [${asset.task}] ${asset.name} (${asset.format} ${asset.dimensions})`);
      lines.push(`    ${asset.description}`);
      if (asset.notes) lines.push(`    備注：${asset.notes}`);
    }
  } else {
    lines.push("目前無待整合素材。");
  }

  return lines.join("\n");
}
