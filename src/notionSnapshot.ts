/* =============================================================================
 * 정적 스냅샷 리더 — `notion-content.json`
 * -----------------------------------------------------------------------------
 * ▸ GitHub Actions(`.github/workflows/notion-sync.yml`)가 게시된 Notion 페이지를
 *   서버에서 읽어 사이트와 같은 폴더에 `notion-content.json` 으로 저장합니다.
 * ▸ 같은 출처(same-origin)의 정적 파일이므로 CORS도, 외부 공개 프록시 장애도
 *   영향을 주지 않습니다. 공개 API가 죽어도 사이트는 계속 최신 글을 보여줍니다.
 * ▸ 파일이 없으면(아직 워크플로를 한 번도 돌리지 않은 경우) 조용히 null 을 돌려주고
 *   기존 공개 API 경로가 그대로 쓰입니다.
 * ========================================================================== */

type R = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type NotionSnapshot = {
  generatedAt: string;
  source: { pageId?: string | null; collectionViewId?: string | null; collectionId?: string | null };
  /** 데이터베이스 행 (속성 이름 → 값) */
  rows: R[];
  /** 글 본문 record map: `{ [pageId]: { [blockId]: { value } } }` */
  pages: Record<string, R>;
};

const FILE = "notion-content.json";
const TTL_MS = 60_000;

let pending: Promise<NotionSnapshot | null> | null = null;
let cached: { at: number; value: NotionSnapshot | null } | null = null;

const undash = (id: unknown): string => String(id ?? "").replace(/-/g, "").toLowerCase();

function snapshotUrl(): string {
  try {
    const url = new URL(FILE, document.baseURI);
    url.searchParams.set("t", String(Math.floor(Date.now() / TTL_MS)));
    return url.toString();
  } catch {
    return FILE;
  }
}

function isSnapshot(value: unknown): value is NotionSnapshot {
  return typeof value === "object" && value !== null && Array.isArray((value as R).rows);
}

/** 스냅샷을 읽습니다. 없거나 오류면 null (호출부에서 공개 API 로 진행) */
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
      return null; // 파일 없음 / 오프라인 / 파싱 실패 → 조용히 무시
    }
  })().then((value) => {
    cached = { at: Date.now(), value };
    pending = null;
    return value;
  });

  return pending;
}

/** 스냅샷이 지금 보고 있는 노션 페이지(또는 그 안의 DB)의 것인지 확인 */
export function snapshotMatches(snapshot: NotionSnapshot, pageId: string): boolean {
  const wanted = undash(pageId);
  if (!wanted) return false;
  const { pageId: p, collectionViewId: v, collectionId: c } = snapshot.source ?? {};
  return [p, v, c].some((id) => id && undash(id) === wanted);
}

/** 캐시 무효화 (수동 새로고침 버튼) */
export function invalidateSnapshot() {
  cached = null;
  pending = null;
}
