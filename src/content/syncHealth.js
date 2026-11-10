/* =============================================================================
 * 동기화 상태 판정 — GitHub Actions 실행 목록 → 배지용 상태
 * -----------------------------------------------------------------------------
 * 사이트(src/syncHealth.ts)와 테스트(scripts/syncHealth.test.mjs)가 같은 규칙을 씁니다.
 * (저장소 관례: 판정 규칙은 src/content/*.js 에 두고 사이트·스크립트가 함께 씁니다)
 * ========================================================================== */

/**
 * @typedef {{ status?: string, conclusion?: string | null, updated_at?: string }} GitHubRun
 * @typedef {{ at: number, ok: boolean, lastSuccessAt: number }} SyncHealth
 */

/**
 * 완료된 실행만 세어 동기화 상태를 만듭니다.
 *  - 최근 실행이 실패면 `ok: false` 이고 `lastSuccessAt` 은 그 이전 성공 시각입니다.
 *  - 진행 중(queued/in_progress) 실행은 "마지막 성공"을 가리지 않습니다.
 *  - 응답이 이상하면 null — 호출부는 스냅샷 시각으로 폴백합니다.
 *
 * @param {unknown} runs
 * @param {number} [now]
 * @returns {SyncHealth | null}
 */
export function toSyncHealth(runs, now = Date.now()) {
  if (!Array.isArray(runs)) return null;
  const at = (run) => {
    const t = Date.parse(String(run?.updated_at ?? ""));
    return Number.isFinite(t) && t <= now + 60_000 ? t : NaN;
  };
  const done = runs.filter((run) => run?.status === "completed" && Number.isFinite(at(run)));
  if (!done.length) return null;
  const latest = done[0];
  const success = done.find((run) => run.conclusion === "success");
  return {
    at: at(latest),
    ok: latest.conclusion === "success",
    lastSuccessAt: success ? at(success) : NaN,
  };
}
