/* =============================================================================
 * 동기화 생존 신호 — GitHub Actions 실행 상태
 * -----------------------------------------------------------------------------
 * 예전에는 워크플로가 **1시간마다 스냅샷 파일을 다시 커밋**(하트비트)해서
 * 사이트 상단 배지의 "n시간 전"이 곧 "동기화가 살아 있다"는 신호였습니다.
 * 그런데 그 하트비트 때문에 내용이 그대로여도 하루 24회 사이트 전체가
 * 재빌드·재배포됐습니다(2026-11-10 정리).
 *
 * 이제 스냅샷은 **콘텐츠가 바뀔 때만** 커밋되고, 동기화 생존 여부는
 * 공개 저장소의 Actions 실행 상태를 브라우저에서 직접 확인합니다.
 *   - 공개 저장소라 토큰이 필요 없습니다(익명, IP당 시간 60회).
 *   - 실패하면(오프라인·차단·레이트리밋) **조용히 null** 을 돌려주고,
 *     호출부는 스냅샷 생성 시각으로 예전과 똑같이 동작합니다.
 *   - 그래서 이 파일이 하는 일은 "있으면 더 정확한 정보"뿐입니다.
 * ========================================================================== */

import { toSyncHealth } from "./content/syncHealth.js";

export const SYNC_REPO = "hanahchafilmaker/XCONDA_info";
export const SYNC_WORKFLOW_FILE = "notion-sync.yml";

export type SyncHealth = {
  /** 가장 최근에 끝난 실행이 끝난 시각 (ms) */
  at: number;
  /** 가장 최근에 끝난 실행이 성공했는지 */
  ok: boolean;
  /** 마지막 **성공** 실행이 끝난 시각 (ms) — 없으면 NaN */
  lastSuccessAt: number;
};

/** 같은 방문 안에서 반복 호출을 막습니다. (배지가 여러 곳에 있어도 요청은 1회) */
const TTL_MS = 5 * 60_000;

let cached: { at: number; value: SyncHealth | null } | null = null;
let pending: Promise<SyncHealth | null> | null = null;

const RUNS_URL = `https://api.github.com/repos/${SYNC_REPO}/actions/workflows/${SYNC_WORKFLOW_FILE}/runs?per_page=5`;

/** 이미 받아 둔 값(있으면) — 첫 렌더에서 깜빡임을 줄이는 용도 */
export function cachedSyncHealth(): SyncHealth | null {
  return cached?.value ?? null;
}

/** 동기화 상태를 읽습니다. 실패하면 null (배지는 스냅샷 시각으로 폴백). */
export function loadSyncHealth(force = false): Promise<SyncHealth | null> {
  if (!force && cached && Date.now() - cached.at < TTL_MS) return Promise.resolve(cached.value);
  if (!force && pending) return pending;

  pending = (async () => {
    try {
      const res = await fetch(RUNS_URL, {
        headers: { Accept: "application/vnd.github+json" },
        cache: "no-store", // 분 단위 최신성
      });
      if (!res.ok) return null; // 404/403/429 → 조용히 포기
      const data: unknown = await res.json();
      return toSyncHealth((data as { workflow_runs?: unknown } | null)?.workflow_runs);
    } catch {
      return null;
    }
  })().then((value) => {
    cached = { at: Date.now(), value };
    pending = null;
    return value;
  });

  return pending;
}
