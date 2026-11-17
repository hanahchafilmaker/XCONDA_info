import { hubBaseFromPathname } from "./content/seo";
/* =============================================================================
 * 정적 스냅샷 리더 — `notion-content.json`
 * -----------------------------------------------------------------------------
 * GitHub Actions(`.github/workflows/notion-sync.yml`)가 게시된 Notion 페이지를
 * 서버(CORS 없음)에서 읽어, 사이트와 같은 폴���에 `notion-content.json` 으로
 * 커밋합니다. 사이트는 같은 출처의 정적 파일만 읽으면 되므로
 *   - 브라우저 CORS 차단
 *   - 무료 공개 프록시(notion-api.splitbee.io) 장애
 * 의 영향을 받지 않고 항상 콘텐츠를 표시할 수 있습니다.
 *
 * 스냅샷이 없거나(워크플로 미실행) 지금 보는 페이지의 것이 아니면 조용히
 * null 을 반환하고, 호출부가 공개 API 경로로 이어서 처리합니다.
 * ========================================================================== */

type R = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type NotionSnapshot = {
  generatedAt: string;
  source: {
    pageId?: string | null;
    collectionViewId?: string | null;
    collectionId?: string | null;
  };
  /** 데이터베이스 행 (속성 이름 → 값) — splitbee /table 응답과 같은 평면 형태 */
  rows: R[];
  /** 글 본문 record map: `{ [pageId]: { [blockId]: { value } } }` */
  pages: Record<string, R>;
};

const FILE = "notion-content.json";

/** 짧은 TTL — 같은 순간에 겹치는 읽기(목록+본문)를 한 번의 요청으로 묶습니다. */
const TTL_MS = 60_000;

/**
 * 이 시간 이상 오래된 스냅샷은 "낡음(stale)"으로 취급해 공개 API 를 먼저 시도합니다.
 *
 * ⚠️ 2026-11-10 부터 스냅샷은 **콘텐츠가 바뀔 때만** 커밋됩니다(1시간 하트비트 제거).
 *    그래서 "스냅샷이 6시간 넘게 그대로"는 **정상**이고(그동안 노션에 새 글이 없었다는 뜻),
 *    동기화가 살아 있는지는 `syncHealth.ts` 가 Actions 실행 상태로 따로 확인합니다.
 *    여기 값은 "스냅샷이 아예 만들어지지 않은 사이트"를 구제하는 최후 수단이라 넉넉히 둡니다.
 */
export const SNAPSHOT_STALE_MS = 7 * 24 * 60 * 60 * 1000;

let pending: Promise<NotionSnapshot | null> | null = null;
let cached: { at: number; value: NotionSnapshot | null } | null = null;

/**
 * 스냅샷 파일이 **이 배포본에 아예 없는지** (-1 판정 전).
 * -----------------------------------------------------------------------------
 * 프록시(`/hub/*` → `hub.xconda.ai/en/*`) 아래에서 스냅샷 파일이 빠져 있으면 서버는 404 대신
 * 제품 사이트 catch-all 의 **200 + 앱 셸 HTML** 을 돌려줍니다. 그때마다 공개 프록시
 * (notion-api.splitbee.io)로 폴백하는데, `/table` 8초 + `/page` 8초 타임아웃을 기다린 뒤에야
 * 실패합니다 — 영어 허브가 16초 넘게 비어 있던 원인.
 * 파일이 없다는 사실은 배포 단위로 고정이므로, 이 방문 동안은 같은 요청을 반복하지 않고
 * 폴백 대기 시간도 줄입니다.
 */
let missing = false;
let missingAt = 0;

const undash = (id: unknown): string => String(id ?? "").replace(/-/g, "").toLowerCase();

function snapshotUrl(force = false): string {
  try {
    // dev.html / index.html 어느 경로든 문서 기준으로 파일 위치를 계산합니다.
    const url = new URL(`${hubBaseFromPathname(window.location.pathname)}${FILE}`, window.location.origin);
    if (force) url.searchParams.set("t", String(Date.now()));
    return url.toString();
  } catch {
    return force ? `${FILE}?t=${Date.now()}` : FILE;
  }
}

function isSnapshot(value: unknown): value is NotionSnapshot {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as R).rows) &&
    typeof (value as R).pages === "object"
  );
}

/**
 * 이 배포본에 스냅샷 파일이 아예 없을 가능성이 큰가.
 * 파일이 없으면 `loadSnapshot()` 이 네트워크를 다시 치지 않고 즉시 null 을 돌려주고,
 * 호출부(notionPublic)는 공개 프록시 폴백의 타임아웃을 8초 → 2.5초로 줄입니다 (2026-11-17).
 */
export function snapshotUnavailable(): boolean {
  return missing;
}

/** 한 번 "없음"으로 판정된 뒤 재확인하기까지의 시간 (재배포로 파일이 생길 수 있으므로) */
const MISSING_RECHECK_MS = 10 * 60_000;

/**
 * 스냅샷을 읽습니다. 없거나 오류면 null (호출부에서 공개 API 경로로 진행)
 *
 * `cache: "no-store"` 를 쓰지 않습니다 — 스냅샷은 1.9MB 라서 매 폴링마다 캐시를
 * 비우면 모바일에서 다운로드가 반복됩니다. 대신 아래 두 가지로 최신성을 지킵니다.
 *   1) HTTP 조건부 요청(ETag·Last-Modified) → 내용이 그대로면 304 로 끝나 본문이 없습니다.
 *   2) 강제 갱신(`force`)일 때만 주소에 `?t=` 를 붙여 캐시를 건너뜁니다.
 */
export function loadSnapshot(force = false): Promise<NotionSnapshot | null> {
  if (force) {
    cached = null;
    pending = null;
  } else if (cached && Date.now() - cached.at < TTL_MS) {
    return Promise.resolve(cached.value);
  }
  // 파일이 없다고 이미 판정된 배포본이면 네트워크를 다시 치지 않습니다(16초 폴백 방지).
  if (!force && missing && Date.now() - missingAt < MISSING_RECHECK_MS) return Promise.resolve(null);
  if (!force && pending) return pending;

  pending = (async () => {
    try {
      const res = await fetch(snapshotUrl(force), {
        cache: "default",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        missing = true;
        missingAt = Date.now();
        return null;
      }
      const data: unknown = await res.json().catch(() => null);
      if (!isSnapshot(data)) {
        // 200 이지만 JSON 이 아님 = 프록시 catch-all 이 앱 셸 HTML 을 준 경우.
        // 이 배포본에는 스냅샷 파일이 없다는 뜻이므로 같은 판정을 내립니다.
        missing = true;
        missingAt = Date.now();
        return null;
      }
      missing = false;
      return data;
    } catch {
      return null; // 오프라인 · 일시 오류 → 판정을 바꾸지 않고 조용히 무시
    }
  })().then((value) => {
    cached = { at: Date.now(), value };
    pending = null;
    return value;
  });

  return pending;
}

/** 캐시 무효화 (수동 새로고침 버튼) */
export function invalidateSnapshot() {
  cached = null;
  pending = null;
}

/** 가장 최근에 읽은 스냅샷 생성 시각 */
export function getLastSnapshotGeneratedAt(): string | undefined {
  return cached?.value?.generatedAt;
}

/** 이 스냅샷이 지금 연동 중인 노션 페이지(또는 그 안의 데이터베이스)의 것인지 확인 */
export function snapshotMatches(snapshot: NotionSnapshot, pageId: string): boolean {
  const wanted = undash(pageId);
  if (!wanted) return false;
  const { pageId: p, collectionViewId: v, collectionId: c } = snapshot.source ?? {};
  return [p, v, c].some((id) => id && undash(id) === wanted);
}

/** 오래된 스냅샷인지 (신선하면 우선 사용, 낡았으면 공개 API 보조 수단으로만 사용) */
export function snapshotIsStale(snapshot: NotionSnapshot, now = Date.now()): boolean {
  const at = Date.parse(snapshot.generatedAt ?? "");
  return !Number.isFinite(at) || now - at > SNAPSHOT_STALE_MS;
}

/** 스냅샷에 담긴 특정 글의 본문 record map (없으면 undefined) */
export function snapshotPageMap(snapshot: NotionSnapshot, pageId: string): R | undefined {
  if (!snapshot?.pages) return undefined;
  const wanted = undash(pageId);
  if (!wanted) return undefined;
  const key = Object.keys(snapshot.pages).find((k) => undash(k) === wanted);
  return key ? snapshot.pages[key] : undefined;
}
