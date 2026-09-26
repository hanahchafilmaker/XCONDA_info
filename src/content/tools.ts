import type { Block, Entry, Tool } from "./types";
import type { Lang } from "../i18n/dict";
import { translate } from "../i18n/dict";
import { localizeEntry, localizeTool } from "../i18n/content";
import { TOOL_EN } from "./tools.en";
import { getToolGuide } from "./toolGuides";
import { getToolVideo } from "./toolVideos";

export const STUDIO_URL = "https://www.xconda.ai";
const IMG = `${STUDIO_URL}/assets/img/land`;
/**
 * 스튜디오 랜딩에 대표 이미지가 없는 툴은 이 저장소에 함께 배포되는 자체 커버 아트를 사용합니다.
 * 상대 경로라서 개발 서버(`/dev.html`)와 GitHub Pages(`/XCONDA_info/`) 모두에서 그대로 동작합니다.
 */
const LOCAL_IMG = "assets/img/tools";
const FLOW = "https://media.toolgov.com/media/land";
export const FLOW_GIFS = {
  models: `${FLOW}/flow-01.gif`,
  tools: `${FLOW}/flow-02.gif`,
  storyboard: `${FLOW}/flow-03.gif`,
  continuity: `${FLOW}/flow-04.gif`,
};

const BASE_TOOLS: Tool[] = [
  /* ------------------------------ 핵심 스튜디오 ------------------------------ */
  {
    slug: "turn",
    name: "Turn (턴)",
    group: "핵심 스튜디오",
    tagline: "사진 1장으로 360° 공간 생성 및 배경·공간 고정",
    desc: "사진 한 장으로 공간 한 면을 만들고 여섯 면(큐브맵)을 생성해 360° 배경을 고정합니다. 앙각·부감·동선이 바뀌어도 컷마다 방이 바뀌지 않는 공간 일관성을 제공합니다.",
    href: `${STUDIO_URL}/studio/turn`,
    image: `${LOCAL_IMG}/tool-turn.jpg`,
    badge: "Core",
    steps: [
      "Reference 단계에서 Front / Left / Right / Back 이미지를 넣거나 Description만 작성합니다.",
      "Generate로 360° HDRI 큐브맵을 만들고 3D Preview에서 카메라 시점을 지정합니다.",
      "필요하면 Cube Map의 Inpaint 및 부분 수정 기능으로 방향별 디테일을 수정합니다.",
      "원하는 시점을 Freeze Frame으로 저장합니다.",
      "Production에서 인물·액션·조명·Cinema Style과 캐스트 레퍼런스를 설정해 최종 컷을 완성합니다.",
    ],
    tips: [
      "Turn은 플렉스보드로 들어가기 전 공간을 먼저 고정하는 0단계 필수 도구입니다.",
      "여섯 면이 고정되면 앙각, 부감, 좌우 동선에서도 일관된 공간 렌더링이 가능합니다.",
    ],
  },
  {
    slug: "flexboard",
    name: "FlexBoard (플렉스보드)",
    group: "핵심 스튜디오",
    tagline: "시나리오 기반 9컷 스토리보드 생성 & 원하는 컷만 선택 재생성",
    desc: "시나리오를 입력해 3×3 그리드의 9컷 시네마틱 스토리보드를 한 번에 생성하고, 마음에 들지 않는 컷만 골라 개별 재생성(Selective Regeneration)합니다.",
    href: `${STUDIO_URL}/studio/directors-cut`,
    image: `${LOCAL_IMG}/tool-flexboard.jpg`,
    badge: "Core",
    steps: [
      "Standard 또는 Cinema Pro 엔진을 선택하고 시나리오를 작성합니다.",
      "감독 연출 스타일과 아트 스타일 프리셋을 선택합니다.",
      "Generate 버튼을 눌러 3×3 구성의 9컷 그리드 스토리보드를 일괄 생성합니다.",
      "수정이 필요한 컷만 펜 아이콘을 눌러 프롬프트를 바꾸고 개별 재생성(Regenerate)합니다.",
      "완성된 9컷 보드를 기반으로 Seedance 2.5 / Kling 영상 제작으로 연결합니다.",
    ],
    tips: [
      "전체 보드를 다시 만들 필요 없이 어색한 컷만 횟수 제한 없이 선택 재생성할 수 있습니다.",
      "Claude 스킬(xconda-new-prompt)과 연계하여 10블록 프롬프트로 고도화할 수 있습니다.",
    ],
  },
  {
    slug: "blocking-board",
    name: "Blocking Board (블로킹보드)",
    group: "핵심 스튜디오",
    tagline: "공간 내 인물·카메라 동선 및 공간 연출 블로킹",
    desc: "고정된 360° 가상 공간 위에 인물의 위치, 시선 방향, 카메라 무브먼트 동선을 직관적으로 배치해 장면 간 시각적 연속성을 설계합니다.",
    href: `${STUDIO_URL}`,
    image: `${LOCAL_IMG}/tool-blocking-board.jpg`,
    badge: "Core",
    steps: [
      "Turn에서 고정된 360° 공간 또는 배경 이미지를 불러옵니다.",
      "공간 뷰포트 위에 캐릭터 인물의 위치와 이동 동선을 배치합니다.",
      "카메라 시점(샷 앵글, 화각, 이동 궤적)을 설정합니다.",
      "씬별 인물과 카메라의 공간 관계를 검증하고 다음 렌더링 단계로 전달합니다.",
    ],
    tips: [
      "동선이 벽이나 가구 등 장애물을 관통하지 않도록 블로킹 상태를 확인하세요.",
      "프레임 좌/중/우 및 전경/중경/후경 배치를 명확히 하면 일관성이 극대화됩니다.",
    ],
  },
  {
    slug: "directors-cut",
    name: "Director's Cut",
    group: "핵심 스튜디오",
    tagline: "엔진·연출·아트 스타일로 완성하는 9컷 스토리보드",
    desc: "Standard 또는 Cinema Pro 엔진과 시간·공간, 디렉터 스타일, 아트 스타일을 설정해 하나의 이야기로 이어지는 3×3 스토리보드를 만듭니다.",
    href: `${STUDIO_URL}/studio/directors-cut`,
    image: `${LOCAL_IMG}/tool-directors-cut.jpg`,
    badge: "Most Popular",
    steps: [
      "초안용 Standard 또는 최종 결과용 Cinema Pro 엔진을 선택합니다.",
      "Year, Location과 최소 글자 수를 충족한 Scenario를 입력합니다.",
      "5가지 Director Style과 4가지 Art Style 중 하나씩 선택합니다.",
      "필요하면 Hero Product와 정면에 가까운 Hero Muse 이미지를 첨부합니다.",
      "Generate로 3×3 구성의 9컷 그리드를 만듭니다.",
      "수정할 컷의 펜 아이콘에서 프롬프트를 바꾸고 해당 컷만 Regenerate합니다.",
    ],
    tips: [
      "배경이 없는 제품·모델 이미지를 사용하면 인식 정확도와 컷 간 일관성이 좋아집니다.",
      "개별 다운로드와 Download All을 모두 지원합니다.",
    ],
  },
  {
    slug: "art-director-pro",
    name: "Art Director Pro",
    group: "핵심 스튜디오",
    tagline: "포커스 모드·캐릭터 시트·카메라로 만드는 일관된 9컷",
    desc: "시나리오의 Role Name으로 얼굴·의상을 연결하고, 포커스 모드와 카메라·렌즈를 조합해 캐릭터와 공간의 연속성을 유지하는 시네마틱 컷을 만듭니다.",
    href: STUDIO_URL,
    image: `${LOCAL_IMG}/tool-art-director-pro.jpg`,
    badge: "Core",
    steps: [
      "Dialogue, Action, Atmosphere 중 장면에 맞는 포커스 모드를 선택합니다.",
      "시나리오에 모든 Role Name을 포함하고 공간 구조가 명확한 배경을 업로드합니다.",
      "각 캐스트의 Role Name과 Face ID Source를 설정하고 필요하면 Wardrobe Ref를 추가합니다.",
      "Detect Face로 좌·정면·우 3뷰 캐릭터 시트를 생성합니다.",
      "카메라와 광학 렌즈 중 원하는 룩을 선택합니다.",
      "Generate로 Preview를 만들고 필요한 컷을 재생성·업스케일·다운로드합니다.",
    ],
    tips: [
      "시나리오의 이름과 Role Name은 철자까지 정확히 일치해야 합니다.",
      "밝고 정면에 가까운 얼굴 사진이 Face ID와 캐릭터 시트에 가장 안정적입니다.",
    ],
  },

  /* ------------------------------- 스토리보드 ------------------------------- */
  {
    slug: "scene-snap",
    name: "Scene Snap",
    group: "스토리보드",
    tagline: "이미지 한 장 → 6키프레임 시네마틱 스토리보드",
    desc: "이미지를 업로드하면 6개의 키프레임으로 구성된 시네마틱 스토리보드를 생성합니다.",
    href: `${STUDIO_URL}/studio/scene-snap`,
    image: `${IMG}/tool-scene-snap.png`,
    steps: ["기준이 될 이미지를 업로드합니다.", "필요하면 분위기나 전개를 짧게 입력합니다.", "생성하면 6개의 키프레임 스토리보드가 만들어집니다."],
  },
  {
    slug: "youtube-ref",
    name: "YouTube Ref",
    group: "스토리보드",
    tagline: "유튜브 링크 → 9씬 스토리보드",
    desc: "영상 링크를 붙여넣으면 AI가 9씬 스토리보드를 생성합니다. 캐릭터 레퍼런스는 선택 사항입니다.",
    href: `${STUDIO_URL}/studio/youtube-ref`,
    image: `${IMG}/tool-youtube-ref.png`,
    steps: ["참고할 유튜브 영상 링크를 붙여넣습니다.", "(선택) 캐릭터 레퍼런스 이미지를 업로드합니다.", "생성하면 영상 흐름을 참고한 9씬 스토리보드가 만들어집니다."],
  },
  {
    slug: "drct-seq",
    name: "Directors Sequence",
    group: "스토리보드",
    tagline: "키프레임 하나 → 연속된 8씬",
    desc: "키프레임 한 장을 업로드하면 AI가 이어지는 8개의 씬을 자동 생성해 시네마틱한 시퀀스를 만듭니다.",
    href: `${STUDIO_URL}/studio/drct-seq`,
    image: `${IMG}/tool-drct-seq.png`,
    steps: ["시퀀스의 시작이 될 키프레임을 업로드합니다.", "생성하면 연속된 8개의 씬이 자동으로 만들어집니다.", "필요한 씬만 골라 스토리보드에 활용합니다."],
  },

  /* ------------------------------ 카메라 · 앵글 ------------------------------ */
  {
    slug: "spin-angle",
    name: "SpinAngle",
    group: "카메라 · 앵글",
    tagline: "원과 화살표로 카메라 위치·방향 지정",
    desc: "원으로 카메라 위치를, 화살표로 방향을 표시하면 그 시점의 포토리얼 뷰를 생성합니다.",
    href: `${STUDIO_URL}/studio/spin-angle`,
    image: `${IMG}/tool-spin-angle.png`,
    steps: ["이미지를 업로드합니다.", "원을 그려 카메라 위치를 표시합니다.", "화살표를 그려 카메라가 바라볼 방향을 지정합니다.", "생성하면 해당 시점의 포토리얼 이미지가 만들어집니다."],
  },
  {
    slug: "arw-view",
    name: "Arrow View",
    group: "카메라 · 앵글",
    tagline: "화살표 하나로 새로운 시점",
    desc: "이미지에 화살표를 그려 카메라 방향을 정하면, 3D 모델링 없이 새로운 시점의 장면을 생성합니다.",
    href: `${STUDIO_URL}/studio/arw-view`,
    image: `${IMG}/tool-arw-view.png`,
    steps: ["이미지를 업로드합니다.", "카메라 방향을 화살표로 그립니다.", "생성하면 새로운 시점의 장면이 만들어집니다."],
  },
  {
    slug: "auto-angle",
    name: "Auto Angle Generator",
    group: "카메라 · 앵글",
    tagline: "AI 카메라 샷으로 앵글 자동 변경",
    desc: "AI 카메라 샷으로 이미지의 앵글을 손쉽게 바꿉니다.",
    href: `${STUDIO_URL}/studio/auto-angle`,
    image: `${IMG}/tool-auto-angl.png`,
    steps: ["이미지를 업로드합니다.", "원하는 카메라 샷(앵글)을 선택합니다.", "생성해 다양한 앵글 컷을 얻습니다."],
  },

  /* ------------------------------- 이미지 편집 ------------------------------- */
  {
    slug: "cloth-swap",
    name: "ClothSwap",
    group: "이미지 편집",
    tagline: "칠하고, 올리면 의상 교체",
    desc: "바꾸고 싶은 의상 영역을 칠한 뒤 참조 의상 이미지를 올리면 AI가 의상을 교체합니다.",
    href: `${STUDIO_URL}/studio/cloth-swap`,
    image: `${IMG}/tool-cloth-swap.png`,
    steps: ["인물 이미지를 업로드합니다.", "교체할 의상 영역을 브러시로 칠합니다.", "참조할 의상 이미지를 업로드합니다.", "생성하면 의상이 자연스럽게 교체됩니다."],
  },
  {
    slug: "expression",
    name: "Expression Transformer",
    group: "이미지 편집",
    tagline: "텍스트로 표정 변경, 정체성은 그대로",
    desc: "간단한 텍스트 프롬프트로 얼굴 표정을 바꿉니다. 인물의 정체성은 유지됩니다.",
    href: `${STUDIO_URL}/studio/expression`,
    image: `${IMG}/tool-expr-trfm.png`,
    steps: ["인물 이미지를 업로드합니다.", "원하는 감정·표정을 텍스트로 입력합니다. (예: 놀람, 미소, 분노)", "생성해 표정이 바뀐 이미지를 얻습니다."],
  },
  {
    slug: "face-swap",
    name: "Face Swap",
    group: "이미지 편집",
    tagline: "포즈·의상·배경은 유지하고 지정한 얼굴만 교체",
    desc: "원본에서 얼굴 영역을 브러시로 지정하고 새 얼굴 이미지를 적용해, 배경·의상·포즈·조명·구도를 최대한 유지한 결과를 만듭니다.",
    href: `${STUDIO_URL}/studio/face-swap`,
    image: `${IMG}/tool-face-swap.png`,
    steps: [
      "Nano Banana 2 또는 Nano Banana 모델을 선택합니다.",
      "Original image에 얼굴을 바꿀 원본 이미지를 업로드합니다.",
      "Brush Size를 조절하며 실제 교체할 얼굴 영역을 칠합니다.",
      "Swap to image에 정면 또는 3/4 각도의 새 얼굴 이미지를 업로드합니다.",
      "Generate를 누르고 확인 팝업에서 OK를 선택합니다.",
      "결과 카드에서 비교한 뒤 공유·재생성·다운로드·삭제를 선택합니다.",
    ],
    tips: ["본인 또는 명시적인 사용 동의를 받은 얼굴만 사용해 주세요.", "마스크는 얼굴 주변을 너무 좁거나 넓지 않게 지정하세요."],
  },
  {
    slug: "background-blend",
    name: "Cinematic Image Blender",
    group: "이미지 편집",
    tagline: "인물 + 배경 → 시네마틱 합성",
    desc: "인물 사진과 배경 이미지를 올리면 AI가 자연스럽게 합성해 시네마틱한 룩을 만듭니다.",
    href: `${STUDIO_URL}/studio/background-blend`,
    image: `${LOCAL_IMG}/tool-background-blend.jpg`,
    steps: ["인물 사진을 업로드합니다.", "배경 이미지를 업로드합니다.", "생성하면 조명과 톤이 맞춰진 합성 이미지가 만들어집니다."],
  },

  /* ------------------------------- 생성 · 보정 ------------------------------- */
  {
    slug: "cine-grade",
    name: "CineGrade AI",
    group: "생성 · 보정",
    tagline: "영화 스틸의 색감을 내 사진에",
    desc: "레퍼런스 영화 스틸을 올리면 색보정·콘트라스트·무드를 내 사진에 즉시 이식합니다.",
    href: `${STUDIO_URL}/studio/cine-grade`,
    image: `${IMG}/tool-cine-grade.png`,
    steps: ["보정할 내 사진을 업로드합니다.", "참고할 영화 스틸 이미지를 업로드합니다.", "생성하면 컬러 그레이딩과 무드가 적용됩니다."],
  },
  {
    slug: "image",
    name: "Image Generator",
    group: "생성 · 보정",
    tagline: "7가지 AI 모델과 레퍼런스로 만드는 이미지",
    desc: "Nano Banana, Kling, Z Image, Seedream, Grok Imagine 계열을 한곳에서 사용하고 모델별 레퍼런스·비율·해상도·생성 매수를 세밀하게 설정합니다.",
    href: `${STUDIO_URL}/studio/image`,
    image: `${IMG}/tool-img-gen.png`,
    steps: [
      "목적과 레퍼런스 제한에 맞춰 7가지 모델 중 하나를 선택합니다.",
      "필수 프롬프트를 입력하고 필요하면 @image 형식의 레퍼런스를 첨부합니다.",
      "12가지 비율과 1K·2K·4K 해상도, 1·2·4장 생성 옵션을 설정합니다.",
      "Z Image를 쓴다면 제외할 요소를 Negative prompt에 입력합니다.",
      "Generate를 누르고 결과의 프롬프트 복사·상세 보기·다운로드 기능을 사용합니다.",
    ],
    tips: ["모델 변경 후 지원 비율과 해상도가 자동 조정되었는지 다시 확인하세요.", "영어 프롬프트는 모델의 텍스트 이해 정확도를 높이는 데 도움이 됩니다."],
  },
  {
    slug: "video",
    name: "Video Generator",
    group: "생성 · 보정",
    tagline: "Kling 3.0 등 영상 모델",
    desc: "완성된 스토리보드 컷이나 프롬프트로 영상을 생성합니다.",
    href: `${STUDIO_URL}/studio/video`,
    image: `${LOCAL_IMG}/tool-video.jpg`,
    steps: ["영상 모델을 선택합니다.", "프롬프트를 입력하거나 시작 이미지를 업로드합니다.", "길이·비율 등 옵션을 설정하고 생성합니다."],
  },
  {
    slug: "upscale",
    name: "Upscaler",
    group: "생성 · 보정",
    tagline: "Topaz·Xconda 모델로 2X/4X 디테일 업스케일",
    desc: "저해상도·흐릿한 이미지를 2X 또는 4X로 확대하고, 이미지 유형별 Enhance Model과 Face Enhancement로 디테일을 보강합니다.",
    href: `${STUDIO_URL}/studio/upscale`,
    image: `${IMG}/tool-upsc.png`,
    steps: [
      "세밀한 Topaz 또는 빠른 Xconda 자체 모델을 선택합니다.",
      "원본 이미지를 업로드하고 2X 또는 4X 배율을 고릅니다.",
      "Topaz에서는 Enhance Model, Subject Detection, 출력 형식을 설정합니다.",
      "인물이라면 Face Enhancement와 Creativity를 낮음~중간에서 조정합니다.",
      "Generate 비용을 확인하고 OK를 눌러 생성합니다.",
      "Latest Result를 다운로드하고 History에서 이전 결과와 비교합니다.",
    ],
    tips: ["인물은 Face Enhancement를 중간값에서 시작하면 과도한 보정을 줄일 수 있습니다.", "공유용은 JPG, 합성·후편집용은 PNG가 적합합니다."],
  },
];

export const TOOLS: Tool[] = BASE_TOOLS.map((tool) => ({
  ...tool,
  translations: TOOL_EN[tool.slug] ? { en: TOOL_EN[tool.slug] } : undefined,
}));

export const TOOL_GROUPS = ["전체", "핵심 스튜디오", "스토리보드", "카메라 · 앵글", "이미지 편집", "생성 · 보정"] as const;

function toolBlocks(tool: Tool, lang: Lang): Block[] {
  const manual = getToolGuide(tool.slug, lang);
  const blocks: Block[] = manual
    ? [...manual]
    : [
        { type: "p", text: tool.desc },
        { type: "h2", text: translate("toolentry.howTo", lang) },
        { type: "ol", items: tool.steps },
      ];
  if (!manual && tool.tips?.length) {
    blocks.push({ type: "h2", text: translate("toolentry.tips", lang) });
    tool.tips.forEach((tip) => blocks.push({ type: "callout", icon: "💡", text: tip }));
  }

  /* 공식 영상 가이드가 있으면 맨 위에 임베드합니다. */
  const video = getToolVideo(tool.slug, lang);
  if (video) {
    blocks.unshift({
      type: "video",
      src: video,
      caption: lang === "ko" ? "공식 영상 가이드" : "Official video guide",
    });
  }
  return blocks;
}

/** 툴 → 모달에서 보여줄 양언어 가이드 Entry로 변환 */
export function toolToEntry(tool: Tool, lang: Lang = "ko"): Entry {
  const english = localizeTool(tool, "en");
  const entry: Entry = {
    id: `tool-${tool.slug}`,
    type: "guide",
    title: `${tool.name} 사용법`,
    summary: tool.tagline,
    category: tool.group,
    date: new Date().toISOString(),
    tags: [tool.name],
    cover: tool.image,
    url: tool.href,
    tool: tool.name,
    blocks: toolBlocks(tool, "ko"),
    translations: {
      en: {
        title: `${tool.name} guide`,
        summary: english.tagline,
        blocks: toolBlocks(english, "en"),
      },
    },
  };
  return localizeEntry(entry, lang);
}
