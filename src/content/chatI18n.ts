/**
 * 챗봇용 번역 — 허브 화면이 EN/JA/ZH 일 때 Q&A·공지·툴 사용법 글의 제목과 답변을
 * 사람이 검수한 번역(`content/i18n/{en,ja,zh}.json` 의 `entries["qna/<slug>"]`)으로 바꿔 보여 줍니다.
 *
 * - 앱은 한 파일(assets/app.js)로 묶여 있어 번역을 그대로 넣으면 앱이 두 배로 커집니다.
 *   그래서 사이트 빌드(scripts/build-seo.mjs)가 제목·답변만 뽑은 `assets/chat-i18n-<언어>.json` 을 만들고,
 *   한국어가 아닌 화면에서 챗봇을 처음 열 때 그 언어 파일 하나만 받아 옵니다.
 * - 개발 서버(npm run dev)에는 빌드 파일이 없을 수 있어 원본 번역 파일을 대신 읽습니다.
 * - 번역이 없거나 받기에 실패한 글은 한국어 원문을 그대로 씁니다.
 */
import type { Target } from "../i18n";
import { hubAssetUrl } from "./seo";
import { hubAbsolute } from "../seo";

export type ChatTranslation = { title: string; summary: string };
/** "qna/credit-packs-and-price" 같은 키 → 번역 제목·답변 */
export type ChatTranslations = Map<string, ChatTranslation>;

type I18nFile = { entries?: Record<string, { title?: string; summary?: string }> };

/** 목표 언어 → 번역 파일 이름의 언어 코드 */
const fileCodeOf = (target: Exclude<Target, "ko">) => (target === "zh-CN" ? "zh" : target);

const cache = new Map<Target, Promise<ChatTranslations>>();

/** 번역 파일 내용 → 제목·답변이 둘 다 있는 글만 모은 표 */
export function pickChatTranslations(file: unknown): ChatTranslations {
  const out: ChatTranslations = new Map();
  const entries = (file as I18nFile | null)?.entries ?? {};
  for (const [key, e] of Object.entries(entries)) {
    const title = e?.title?.trim();
    const summary = e?.summary?.trim();
    if (title && summary) out.set(key, { title, summary });
  }
  return out;
}

async function fetchChatFile(target: Exclude<Target, "ko">): Promise<unknown> {
  const rel = `assets/chat-i18n-${fileCodeOf(target)}.json`;
  try {
    // 프록시(www.xconda.ai/hub/) 아래에서는 원본 도메인 주소로 읽습니다(i18n-paths.json 과 같은 규칙).
    const res = await fetch(hubAssetUrl(rel) ?? hubAbsolute(rel));
    if (res.ok) return await res.json();
  } catch {
    /* 아래로 */
  }
  if (import.meta.env.DEV) {
    // 개발 서버 전용 — 배포 빌드에서는 이 줄이 통째로 빠집니다.
    const all = {
      en: () => import("../../content/i18n/en.json"),
      ja: () => import("../../content/i18n/ja.json"),
      zh: () => import("../../content/i18n/zh.json"),
    };
    return (await all[fileCodeOf(target)]()).default;
  }
  return null;
}

/** 목표 언어의 번역을 불러옵니다. 한국어거나 불러오기에 실패하면 빈 표(=한국어 원문 사용). */
export function loadChatTranslations(target: Target): Promise<ChatTranslations> {
  if (target === "ko") return Promise.resolve(new Map());
  let p = cache.get(target);
  if (!p) {
    p = fetchChatFile(target)
      .then(pickChatTranslations)
      .then((map) => {
        if (!map.size) cache.delete(target); // 비어 있으면 다음에 다시 시도
        return map;
      })
      .catch(() => {
        cache.delete(target);
        return new Map() as ChatTranslations;
      });
    cache.set(target, p);
  }
  return p;
}

/** AI 에게 "이 언어로 답해 줘"라고 보낼 언어 코드 (Worker 의 LANG_NAMES 와 맞춤) */
export const aiLangOf = (target: Target): string => target;
