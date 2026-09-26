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
 * (워크플로가 10분 주기로 도므로, 6시간이면 서버 측 문제로 간주)
 */
export const SNAPSHOT_STALE_MS = 6 * 60 * 60 * 1000;

let pending: Promise<NotionSnapshot | null> | null = null;
let cached: { at: number; value: NotionSnapshot | null } | null = null;

const undash = (id: unknown): string => String(id ?? "").replace(/-/g, "").toLowerCase();

function snapshotUrl(): string {
  try {
    // dev.html / index.html 어느 경로든 문서 기준으로 파일 위치를 계산합니다.
    return new URL(FILE, document.baseURI).toString();
  } catch {
    return FILE;
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

/** 스냅샷을 읽습니다. 없거나 오류면 null (호출부에서 공개 API 경로로 진행) */
export function loadSnapshot(force = false): Promise<NotionSnapshot | null> {
  if (!force && cached && Date.now() - cached.at < TTL_MS) return Promise.resolve(cached.value);
  if (!force && pending) return pending;

  pending = (async () => {
    try {
      const res = await fetch(snapshotUrl(), { cache: "no-store", headers: { Accept: "application/json" } });
      if (!res.ok) return null;
      const data: unknown = await res.json();
      return isSnapshot(data) ? data : null;
    } catch {
      return null; // 파일 없음 · 오프라인 · 파싱 실패 → 조용히 무시
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
