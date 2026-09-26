import type { Block, Entry, Tool } from "./types";
import { getLang, translate } from "../i18n/dict";

export const STUDIO_URL = "https://www.xconda.ai";
const IMG = `${STUDIO_URL}/assets/img/land`;
export const FLOW_GIFS = {
  models: "https://media.toolgov.com/media/land/flow-01.gif",
  tools: "https://media.toolgov.com/media/land/flow-02.gif",
  storyboard: "https://media.toolgov.com/media/land/flow-03.gif",
  continuity: "https://media.toolgov.com/media/land/flow-04.gif",
};

export const TOOLS: Tool[] = [
  /* ------------------------------ 핵심 스튜디오 ------------------------------ */
  {
    slug: "turn",
    name: "360 Turn Studio",
    group: "핵심 스튜디오",
    tagline: "사진 한 장으로 360° 공간을 만들고 원하는 앵글로 촬영",
    desc: "레퍼런스 이미지나 텍스트로 완전한 3D 환경을 만들고, 오브젝트를 추가·제거하며 어떤 시네마틱 앵글로든 장면을 촬영합니다.",
    href: `${STUDIO_URL}/studio/turn`,
    image: FLOW_GIFS.tools,
    badge: "Core",
    steps: [
      "레퍼런스 이미지를 업로드하거나, 만들고 싶은 공간을 텍스트로 묘사합니다.",
      "생성 버튼을 눌러 360° 3D 환경을 만듭니다.",
      "마스크 툴로 영역을 칠한 뒤 프롬프트를 입력하면 새 오브젝트가 배치됩니다. 프롬프트를 비워 두면 해당 영역이 자동으로 지워집니다.",
      "캐릭터를 선택하고 공간 안에서 카메라를 자유롭게 이동합니다.",
      "원하는 시네마틱 앵글에서 촬영(Shoot)해 컷을 저장합니다.",
    ],
    tips: [
      "배경은 고정한 채 카메라 앵글만 바꾸는 Turn 기능으로 컷 간 공간 일관성을 유지하세요.",
      "레퍼런스 이미지는 광각·정면 구도일수록 공간 복원 품질이 좋아집니다.",
    ],
  },
  {
    slug: "directors-cut",
    name: "Director's Cut",
    group: "핵심 스튜디오",
    tagline: "시나리오 한 줄로 하나의 이야기가 되는 9컷 스토리보드",
    desc: "이미지 엔진, 연도·장소, 감독 스타일과 아트 스타일을 고르면 AI가 무드와 연출을 잡아 9컷 스토리보드를 완성합니다.",
    href: `${STUDIO_URL}/studio/directors-cut`,
    image: FLOW_GIFS.storyboard,
    badge: "Most Popular",
    steps: [
      "이미지 엔진(모델)을 선택합니다.",
      "배경이 될 연도와 장소를 설정합니다.",
      "시나리오를 작성합니다. 인물·상황·감정의 흐름을 구체적으로 쓸수록 좋습니다.",
      "감독 스타일과 아트 스타일을 선택해 전체 무드와 연출 방향을 정합니다.",
      "생성하면 앵글·무드·타이밍이 설계된 9컷 스토리보드가 만들어집니다.",
      "마음에 들지 않는 컷은 처음부터 다시 만들 필요 없이, 해당 컷의 프롬프트만 수정해 개별 재생성합니다.",
    ],
    tips: [
      "광고 피치라면 ‘Ad Storyboard 템플릿’으로 시작하면 브리프 하나로 5분 안에 시안을 완성할 수 있습니다.",
      "피드백을 반영해도 캐릭터의 감정·부상·소품 상태와 이전 프롬프트가 모든 씬에 걸쳐 기억됩니다.",
    ],
  },
  {
    slug: "art-director-pro",
    name: "Art Director Pro",
    group: "핵심 스튜디오",
    tagline: "캐릭터 얼굴과 의상이 모든 컷에서 그대로",
    desc: "얼굴 사진으로 캐릭터 시트를 만들고, 시나리오 속 이름으로 얼굴·의상 레퍼런스를 연결해 컷 간 일관성을 지킵니다.",
    href: STUDIO_URL,
    image: FLOW_GIFS.continuity,
    badge: "Core",
    steps: [
      "시나리오에 캐릭터의 이름을 반드시 포함합니다. AI는 이름으로 얼굴과 의상 레퍼런스를 연결합니다.",
      "캐릭터의 얼굴 사진을 업로드합니다.",
      "Detect Face를 눌러 캐릭터 시트를 생성합니다. 시트가 있어야 생성을 시작할 수 있습니다.",
      "필요하면 의상·소품 레퍼런스를 추가합니다.",
      "생성합니다. 시나리오를 수정해 다시 생성해도 이전 컷의 톤과 맥락이 유지됩니다.",
    ],
    tips: ["여러 인물이 등장하면 인물마다 이름과 얼굴 사진을 하나씩 짝지어 주세요.", "정면·밝은 조명의 얼굴 사진이 가장 정확하게 인식됩니다."],
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
    tagline: "어떤 얼굴이든, 언제든",
    desc: "이미지 속 얼굴을 원하는 얼굴로 교체합니다.",
    href: `${STUDIO_URL}/studio/face-swap`,
    image: `${IMG}/tool-face-swap.png`,
    steps: ["대상 이미지를 업로드합니다.", "교체할 얼굴 이미지를 업로드합니다.", "생성해 결과를 확인합니다."],
    tips: ["본인 또는 사용 동의를 받은 얼굴만 사용해 주세요."],
  },
  {
    slug: "background-blend",
    name: "Cinematic Image Blender",
    group: "이미지 편집",
    tagline: "인물 + 배경 → 시네마틱 합성",
    desc: "인물 사진과 배경 이미지를 올리면 AI가 자연스럽게 합성해 시네마틱한 룩을 만듭니다.",
    href: `${STUDIO_URL}/studio/background-blend`,
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
    tagline: "Grok Imagine 등 이미지 모델",
    desc: "모든 AI 모델을 하나의 워크스페이스에서. 모델을 바꿔도 세부 파라미터 제어가 일관되게 유지됩니다.",
    href: `${STUDIO_URL}/studio/image`,
    image: `${IMG}/tool-img-gen.png`,
    steps: ["이미지 모델을 선택합니다.", "프롬프트를 입력하고 파라미터(비율, 스타일 등)를 조정합니다.", "생성합니다."],
  },
  {
    slug: "video",
    name: "Video Generator",
    group: "생성 · 보정",
    tagline: "Kling 3.0 등 영상 모델",
    desc: "완성된 스토리보드 컷이나 프롬프트로 영상을 생성합니다.",
    href: `${STUDIO_URL}/studio/video`,
    image: FLOW_GIFS.models,
    steps: ["영상 모델을 선택합니다.", "프롬프트를 입력하거나 시작 이미지를 업로드합니다.", "길이·비율 등 옵션을 설정하고 생성합니다."],
  },
  {
    slug: "upscale",
    name: "Upscaler",
    group: "생성 · 보정",
    tagline: "어떤 이미지든 선명한 6K로",
    desc: "저해상도 이미지를 최대 6K까지 선명하게 업스케일합니다.",
    href: `${STUDIO_URL}/studio/upscale`,
    image: `${IMG}/tool-upsc.png`,
    steps: ["업스케일할 이미지를 업로드합니다.", "배율을 선택합니다.", "생성 후 고해상도 결과를 다운로드합니다."],
  },
];

export const TOOL_GROUPS = ["전체", "핵심 스튜디오", "스토리보드", "카메라 · 앵글", "이미지 편집", "생성 · 보정"] as const;

/** 툴 → 모달에서 보여줄 가이드 Entry로 변환 */
export function toolToEntry(tool: Tool): Entry {
  const lang = getLang();
  const blocks: Block[] = [
    { type: "p", text: tool.desc },
    { type: "h2", text: translate("toolentry.howTo", lang) },
    { type: "ol", items: tool.steps },
  ];
  if (tool.image) blocks.push({ type: "img", src: tool.image, caption: tool.name });
  if (tool.tips?.length) {
    blocks.push({ type: "h2", text: translate("toolentry.tips", lang) });
    tool.tips.forEach((t) => blocks.push({ type: "callout", icon: "💡", text: t }));
  }
  return {
    id: `tool-${tool.slug}`,
    type: "guide",
    title: lang === "ko" ? `${tool.name} 사용법` : `${tool.name} guide`,
    summary: tool.tagline,
    category: tool.group,
    date: new Date().toISOString(),
    tags: [tool.name],
    url: tool.href,
    tool: tool.name,
    blocks,
  };
}
