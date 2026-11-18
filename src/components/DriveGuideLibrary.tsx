import { ExternalLink } from "lucide-react";
import { useLang } from "../i18n";
import {
  ALL_DRIVE_VIDEO_LINKS,
  DRIVE_GUIDE_DOCS,
  DRIVE_GUIDE_EXTRA_VIDEOS,
  DRIVE_GUIDE_MASTER_URL,
  DRIVE_GUIDE_TEXT_INDEX_URL,
  DRIVE_GUIDE_UPDATED,
  DRIVE_SOURCE_FOLDER_URL,
  DRIVE_TEXT_FOLDER_URL,
  DRIVE_VIDEO_FOLDER_URL,
  DRIVE_VIDEO_ZIP_URL,
  driveGuideUrlByNo,
  driveVideoUrlByNo,
} from "../content/driveGuides";

const DOC_LANGS = [
  { code: "ko", label: "KO" },
  { code: "en", label: "EN" },
  { code: "ja", label: "JA" },
  { code: "zh", label: "ZH" },
] as const;

const GROUP_LABEL = {
  image: { ko: "이미지", en: "Image" },
  video: { ko: "영상 · 3D", en: "Video · 3D" },
  storyboard: { ko: "스토리보드 · 연출", en: "Storyboard" },
  assets: { ko: "에셋 · 종합 가이드", en: "Assets · Guides" },
} as const;

const VIDEO_LANGS = [{ code: "ko", label: "KO" }, { code: "en", label: "EN" }] as const;

/**
 * 2026-11-18 현재판 가이드 라이브러리.
 * 24주제 × 4개 언어(96문서) + KO/EN 영상 65편을 모두 링크합니다.
 * 이전 버전 링크 · 구버전 보관 폴더 · 내부 대장은 포함하지 않습니다.
 */
export default function DriveGuideLibrary() {
  const { lang, pick, target } = useLang();
  const activeLang = target === "zh-CN" ? "zh" : target;
  const docLinks = DRIVE_GUIDE_DOCS.flatMap((doc) =>
    DOC_LANGS.map((item) => ({ ...doc, ...item, url: driveGuideUrlByNo(doc.no, item.code) })),
  );
  const topicVideos = DRIVE_GUIDE_DOCS.filter((doc) => Number(doc.no) <= 21).flatMap((doc) =>
    VIDEO_LANGS.map((item) => ({ ...doc, ...item, url: driveVideoUrlByNo(doc.no, item.code) })),
  );

  return (
    <section
      id="latest-guides"
      aria-labelledby="latest-guides-title"
      data-drive-guide-count={docLinks.length}
      data-drive-video-count={ALL_DRIVE_VIDEO_LINKS.length}
      className="mt-10 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            XCONDA / CURRENT GUIDE LIBRARY · {DRIVE_GUIDE_UPDATED}
          </p>
          <h3 id="latest-guides-title" className="mt-2 text-lg font-bold tracking-tight text-neutral-950">
            {pick("최신 가이드 문서 · 영상", "Latest guide documents & videos")}
          </h3>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-neutral-600">
            {pick(
              "공유 Drive의 2026-11-18 현재판입니다. 24주제 문서 4개 언어(96개)와 KO/EN 영상 65편을 연결했습니다. 이전 버전 링크는 제거했습니다. Drive에서 HTML 미리보기가 제한되면 다운로드 후 브라우저로 열어 주세요.",
              "These are the 2026-11-18 current files from the shared Drive: 24 topics in four languages (96 documents) plus 65 KO/EN videos. Previous-version links were removed. If Drive limits HTML preview, download the file and open it in a browser.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <a href={DRIVE_SOURCE_FOLDER_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 font-medium text-neutral-700 hover:border-neutral-500">
            {pick("공유 폴더", "Shared folder")}<ExternalLink className="size-3.5" aria-hidden />
          </a>
          <a href={DRIVE_GUIDE_TEXT_INDEX_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 font-medium text-neutral-700 hover:border-neutral-500">
            {pick("다국어 문서 색인", "Guide index")}<ExternalLink className="size-3.5" aria-hidden />
          </a>
          <a href={DRIVE_GUIDE_MASTER_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 font-medium text-neutral-700 hover:border-neutral-500">
            {pick("통합 관리 현재판", "Master status")}<ExternalLink className="size-3.5" aria-hidden />
          </a>
          <a href={DRIVE_VIDEO_ZIP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 font-medium text-neutral-700 hover:border-neutral-500">
            {pick("영상 65편 ZIP", "65-video ZIP")}<ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      </div>

      <details className="group mt-6 rounded-xl border border-neutral-200 bg-white">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-neutral-800 marker:hidden">
          {pick(`문서 24주제 × 4개 언어 (${docLinks.length}개 링크)`, `24 topics × 4 languages (${docLinks.length} links)`)}
          <span className="ml-2 text-xs font-normal text-neutral-500" aria-hidden="true">▾</span>
        </summary>
        <div className="border-t border-neutral-200 px-4 py-4">
          <ul className="grid gap-3 sm:grid-cols-2">
            {DRIVE_GUIDE_DOCS.map((doc) => (
              <li key={doc.no} className="rounded-lg border border-neutral-200 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-[13px] font-semibold text-neutral-900 notranslate">
                    <span className="mr-2 font-mono text-[11px] text-neutral-500">{doc.no}</span>{doc.name}
                  </span>
                  <span className="text-[11px] text-neutral-500">{GROUP_LABEL[doc.group][lang]}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {DOC_LANGS.map((item) => {
                    const url = driveGuideUrlByNo(doc.no, item.code);
                    if (!url) return null;
                    return (
                      <a
                        key={item.code}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-current={activeLang === item.code ? "page" : undefined}
                        className={`rounded-md border px-2 py-1 text-[11px] font-medium transition ${activeLang === item.code ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-500"}`}
                      >
                        {item.label} ↗
                      </a>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <details className="group mt-3 rounded-xl border border-neutral-200 bg-white">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-neutral-800 marker:hidden">
          {pick(`KO/EN 영상 가이드 (${ALL_DRIVE_VIDEO_LINKS.length}편)`, `KO/EN video guides (${ALL_DRIVE_VIDEO_LINKS.length})`)}
          <span className="ml-2 text-xs font-normal text-neutral-500" aria-hidden="true">▾</span>
        </summary>
        <div className="border-t border-neutral-200 px-4 py-4">
          <p className="mb-3 text-xs text-neutral-600">
            {pick("01–21번 툴 영상", "Topic videos 01–21")}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {topicVideos.map((video) =>
              video.url ? (
                <li key={`${video.no}-${video.code}`} className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 px-2.5 py-2 text-[12px]">
                  <span className="truncate text-neutral-700 notranslate">
                    <span className="mr-1.5 font-mono text-[10px] text-neutral-500">{video.no}</span>{video.name}
                  </span>
                  <a href={video.url} target="_blank" rel="noopener noreferrer" className="shrink-0 font-semibold text-neutral-900 hover:underline">
                    {video.label} ↗
                  </a>
                </li>
              ) : null,
            )}
          </ul>
          <p className="mb-3 mt-5 text-xs text-neutral-600">
            {pick("23번 웹사이트 사용설명서 · 24번 웹드라마 · 25번 워크스페이스", "Website manual chapters · Web drama · Workspace")}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DRIVE_GUIDE_EXTRA_VIDEOS.flatMap((video) =>
              VIDEO_LANGS.map((item) => {
                const url = driveVideoUrlByNo(video.no, item.code);
                if (!url) return null;
                return (
                  <li key={`${video.no}-${item.code}`} className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 px-2.5 py-2 text-[12px]">
                    <span className="truncate text-neutral-700 notranslate">
                      <span className="mr-1.5 font-mono text-[10px] text-neutral-500">{video.no}</span>{video.name}
                    </span>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 font-semibold text-neutral-900 hover:underline">
                      {item.label} ↗
                    </a>
                  </li>
                );
              }),
            )}
          </ul>
          <p className="mt-4 text-[11px] text-neutral-500">
            <a href={DRIVE_TEXT_FOLDER_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{pick("문서 폴더", "Document folder")}</a>
            {" · "}
            <a href={DRIVE_VIDEO_FOLDER_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{pick("영상 폴더", "Video folder")}</a>
          </p>
        </div>
      </details>
    </section>
  );
}
