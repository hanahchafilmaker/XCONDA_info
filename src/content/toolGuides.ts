import type { Block } from "./types";
import type { Lang } from "../i18n/dict";

type LocalizedGuide = Record<Lang, Block[]>;

const callout = (text: string, icon = "💡"): Block => ({ type: "callout", icon, text });
const toggle = (title: string, children: Block[]): Block => ({ type: "toggle", text: title, children });

/**
 * 2026 product manuals supplied by the XCONDA team.
 *
 * Keep these guides separate from the short card copy in tools.ts: cards need a
 * scannable workflow, while the article modal can hold the model matrices,
 * option details, editing flows, and output-management instructions below.
 */
export const TOOL_GUIDES: Partial<Record<string, LocalizedGuide>> = {
  turn: {
    ko: [
      { type: "p", text: "360도 배경 생성부터 3D 시점 선택, 부분 수정, 인물 연출, 최종 스틸까지 한 흐름으로 이어지는 작업 환경입니다." },
      callout("2026 사용자 가이드 기준 · 전체 흐름은 Reference → HDRI → Production → Final Still 순서입니다.", "🧭"),
      { type: "h2", text: "빠른 시작" },
      {
        type: "ol",
        items: [
          "왼쪽 사이드바에서 Turn을 엽니다.",
          "Reference 단계에서 Front / Left / Right / Back 이미지를 넣거나 Description만 작성합니다.",
          "Generate를 눌러 360° HDRI 환경을 만듭니다.",
          "3D Preview를 클릭·드래그해 카메라 방향을 정하고 Freeze Frame을 생성합니다.",
          "Production에서 인물·액션·조명·Cinema Style과 캐스트 레퍼런스를 설정합니다.",
          "Generate로 Final Still을 만든 뒤 원하는 결과를 다운로드합니다.",
        ],
      },
      { type: "h2", text: "1. Reference — 공간 만들기" },
      toggle("입력 방식 선택", [
        { type: "ul", items: [
          "프롬프트만: 레퍼런스가 없거나 공간 시안을 빠르게 잡을 때 사용합니다.",
          "이미지 1장: 기존 배경의 분위기를 기준으로 360° 공간을 확장할 때 사용합니다.",
          "4방향 이미지: Front / Left / Right / Back의 구조를 명확하게 유지할 때 사용합니다.",
          "Cube Map 수정: 생성 후 특정 방향의 창문·가구·소품·벽면 디테일만 바꿀 때 사용합니다.",
        ] },
      ]),
      { type: "p", text: "레퍼런스는 4장을 모두 넣어도 되고, 1장만 넣거나 전부 비운 채 Description만으로 시작해도 됩니다. 이미지 없이 진행할 때는 공간, 인물, 제품, 소품, 조명 분위기를 구체적으로 적어 주세요." },
      callout("Reference 단계의 Generate는 크레딧을 사용하며, 완료되면 HDRI 단계로 이동합니다.", "⚡"),
      { type: "h2", text: "2. HDRI — 시점 선택과 부분 수정" },
      { type: "ol", items: [
        "3D Preview에서 화면을 클릭·드래그해 360° 공간을 둘러봅니다.",
        "배경 중심, 인물 배치 위치, 카메라 방향을 확인해 원하는 구도를 찾습니다.",
        "Freeze Frame 영역의 Generate를 눌러 현재 시점을 기준 장면으로 저장합니다.",
      ] },
      toggle("Cube Map의 5가지 편집 도구", [
        { type: "ul", items: [
          "Brush: 수정할 영역에 빨간 마스크를 칠합니다. 작은 소품·얼굴 근처는 작은 브러시, 벽·바닥은 큰 브러시가 적합합니다.",
          "Replace with: 선택 영역에 추가하거나 바꿀 내용을 입력합니다.",
          "Inpaint: 프롬프트가 있으면 오브젝트를 추가·변경합니다. 입력칸을 비우면 마스크 영역의 오브젝트를 제거합니다.",
          "Clear: 결과는 바꾸지 않고 현재 방향에 그린 브러시 마스크만 지웁니다.",
          "REGEN: 부분 수정이 아니라 선택한 방향 화면 전체를 다시 생성합니다.",
        ] },
      ]),
      callout("Inpaint 마스크는 대상보다 약간 크게 잡는 편이 안정적입니다. 전체 구성이 어색할 때만 변화 폭이 큰 REGEN을 사용하세요."),
      { type: "h2", text: "3. Production — 최종 연출" },
      { type: "p", text: "Subject & Casting에 인물의 감정, 자세, 액션, 라이팅과 시네마틱 디테일을 작성합니다. 예: ‘창가에 서 있는 모델, 강한 림 라이트, 자연스러운 미소, 프리미엄 광고 화보’." },
      toggle("Cinema Style", [
        { type: "p", text: "Normal, Hollywood, Korean, Japanese, Chinese, Film Noir, Cyberpunk, Anime 중 하나를 선택합니다. 같은 Freeze Frame이어도 스타일에 따라 색감·조명·대비·분위기가 달라집니다." },
      ]),
      toggle("Cast Reference", [
        { type: "ul", items: [
          "Face ID Source: 유지할 얼굴 기준 이미지를 넣습니다.",
          "Wardrobe Ref: 의상과 스타일 기준 이미지를 넣습니다.",
          "두 레퍼런스를 함께 사용하면 얼굴과 의상 방향을 더 명확하게 유지할 수 있습니다.",
        ] },
      ]),
      { type: "h2", text: "결과와 다운로드" },
      { type: "ul", items: [
        "Freeze Frame: HDRI 단계에서 선택한 기본 카메라 시점입니다. Production 전 구도 검토용으로 따로 다운로드할 수 있습니다.",
        "Final Still: Production의 인물·액션·조명·스타일을 반영한 최종 이미지입니다.",
        "두 결과는 역할이 다르므로 Download Freeze Frame과 Download Final Still 버튼을 구분해 사용합니다.",
      ] },
    ],
    en: [
      { type: "p", text: "A continuous workspace for 360° environment generation, 3D viewpoint selection, partial edits, subject direction, and final still creation." },
      callout("Based on the 2026 user guide · The full flow is Reference → HDRI → Production → Final Still.", "🧭"),
      { type: "h2", text: "Quick start" },
      {
        type: "ol",
        items: [
          "Open Turn from the left sidebar.",
          "In Reference, add Front / Left / Right / Back images or write only a Description.",
          "Press Generate to build the 360° HDRI environment.",
          "Click and drag in 3D Preview to choose a camera angle, then create a Freeze Frame.",
          "In Production, set the subject, action, lighting, Cinema Style, and cast references.",
          "Generate the Final Still and download the output you need.",
        ],
      },
      { type: "h2", text: "1. Reference — build the space" },
      toggle("Choose an input mode", [
        { type: "ul", items: [
          "Prompt only: for quick spatial drafts or when no reference is available.",
          "Single image: extend the mood of an existing background into a 360° space.",
          "Four-direction images: keep Front / Left / Right / Back structure clearly defined.",
          "Cube Map edit: change a window, furniture, prop, wall, or other detail on one face after generation.",
        ] },
      ]),
      { type: "p", text: "Use all four reference slots, only one, or leave them empty and rely on Description. For prompt-only work, describe the space, subject, product, props, and lighting mood in detail." },
      callout("Generate in the Reference step consumes credits and advances to HDRI when complete.", "⚡"),
      { type: "h2", text: "2. HDRI — choose an angle and refine the space" },
      { type: "ol", items: [
        "Click and drag in 3D Preview to inspect the 360° environment.",
        "Check the scene center, planned subject position, and camera direction.",
        "Press Generate in Freeze Frame to save the current viewpoint as the reference shot.",
      ] },
      toggle("Five Cube Map editing controls", [
        { type: "ul", items: [
          "Brush: paint a red mask over the edit area. Use a small brush near faces and props, and a large brush for walls or floors.",
          "Replace with: describe what to add or change inside the selected region.",
          "Inpaint: adds or changes an object when a prompt is present; with an empty field, it removes the masked object.",
          "Clear: removes only the current brush mask without changing the image.",
          "REGEN: rebuilds the entire selected directional face rather than making a local edit.",
        ] },
      ]),
      callout("A mask slightly larger than the target is usually most reliable. Use the higher-variation REGEN only when the whole face composition is not working."),
      { type: "h2", text: "3. Production — direct the final image" },
      { type: "p", text: "In Subject & Casting, describe emotion, pose, action, lighting, and cinematic detail. Example: “a model standing by the window, strong rim light, natural smile, premium advertising editorial.”" },
      toggle("Cinema Style", [
        { type: "p", text: "Choose Normal, Hollywood, Korean, Japanese, Chinese, Film Noir, Cyberpunk, or Anime. Even with the same Freeze Frame, style changes color, light, contrast, and atmosphere." },
      ]),
      toggle("Cast Reference", [
        { type: "ul", items: [
          "Face ID Source: add the face identity you want to preserve.",
          "Wardrobe Ref: add the clothing and styling reference.",
          "Using both provides clearer direction for face and wardrobe continuity.",
        ] },
      ]),
      { type: "h2", text: "Outputs and downloads" },
      { type: "ul", items: [
        "Freeze Frame: the base camera viewpoint selected during HDRI. Download it separately for composition review before Production.",
        "Final Still: the finished image with Production subject, action, lighting, and style applied.",
        "The outputs serve different purposes, so use Download Freeze Frame and Download Final Still separately.",
      ] },
    ],
  },

  "directors-cut": {
    ko: [
      { type: "p", text: "이미지 엔진과 시간·공간, 연출·아트 스타일을 설정해 하나의 이야기로 이어지는 9컷 그리드를 만드는 도구입니다." },
      callout("2026 사용자 매뉴얼 기준 · 필수 항목을 모두 입력해야 Generate가 활성화됩니다.", "🎬"),
      { type: "h2", text: "빠른 시작" },
      { type: "ol", items: [
        "왼쪽 사이드바에서 Director's Cut을 엽니다.",
        "Standard 또는 Cinema Pro 이미지 엔진을 선택합니다.",
        "Year, Location, Scenario를 입력합니다.",
        "Director Style과 Art Style을 선택합니다.",
        "필요하면 Hero Product와 Hero Muse 이미지를 첨부합니다.",
        "Generate를 눌러 3×3 구성의 9컷 그리드를 만듭니다.",
      ] },
      { type: "h2", text: "1. 이미지 엔진" },
      toggle("Standard와 Cinema Pro 비교", [
        { type: "ul", items: [
          "Standard (Gemini 2.5 Flash): 빠르고 기본 구도를 잘 잡아 초안, 아이디어 탐색, 레퍼런스 제작에 적합합니다. 매뉴얼 예시는 컷당 4 credits입니다.",
          "Cinema Pro (Gemini 3.1 Pro): 피부·질감·광원 디테일, 클로즈업·로우앵글·심도, 프레임 일관성이 뛰어나 광고·영상용 최종 결과에 적합합니다. 매뉴얼 예시는 컷당 7 credits입니다.",
        ] },
        callout("크레딧은 변경될 수 있으므로 생성 직전 화면에 표시된 실제 비용을 확인하세요.", "⚡"),
      ]),
      { type: "h2", text: "2. 필수 입력" },
      { type: "ul", items: [
        "Year: 시대 또는 시간적 배경을 입력합니다.",
        "Location: 도시나 장소 등 공간적 배경을 입력합니다.",
        "Scenario: 제작할 이야기나 상황을 최소 글자 수 이상으로 작성합니다.",
        "Director Style: 장면의 연출 문법과 톤앤무드를 선택합니다.",
        "Art Style: 실사·애니메이션·클레이메이션·3D 중 결과 매체를 선택합니다.",
      ] },
      toggle("5가지 Director Style", [
        { type: "ul", items: [
          "Wes Anderson: 대칭 구도, 파스텔 톤, 정돈된 동화적 미장센.",
          "Spike Jonze: 현실과 환상의 경계, 인간적인 스토리, 몽환적이고 서정적인 무드.",
          "Wieden+Kennedy: 강한 메시지와 브랜드 아이덴티티 중심의 광고 연출.",
          "The Baker Brothers: 빠른 템포, 트렌디한 컷 편집, 리듬감 있는 광고 연출.",
          "Show Yanagisawa: 자연광과 여백을 활용한 일본식 미니멀 감성.",
        ] },
      ]),
      toggle("4가지 Art Style", [
        { type: "ul", items: [
          "Live Action (Arri Alexa): 현실적 영화·광고 룩.",
          "Studio Ghibli: 따뜻하고 감성적인 판타지 애니메이션.",
          "Stop-motion Claymation: 수공예 질감과 개성.",
          "3D Animation (Pixar Style): 친근하고 대중적인 캐릭터 표현.",
        ] },
      ]),
      { type: "h2", text: "3. 제품·모델 레퍼런스 (선택)" },
      { type: "ul", items: [
        "Hero Product: 광고의 핵심 제품 이미지를 첨부합니다.",
        "Hero Muse: 9컷에 동일한 모델을 유지하려면 가능한 정면 사진을 첨부합니다.",
        "배경이 없는 이미지를 쓰면 인식 정확도와 컷 간 일관성이 좋아집니다. 두 항목은 선택 사항이며 제품 중심 광고도 만들 수 있습니다.",
      ] },
      { type: "h2", text: "4. 생성·개별 수정·다운로드" },
      { type: "ol", items: [
        "필수 항목을 확인하고 Generate를 눌러 오른쪽에 9컷 그리드를 만듭니다.",
        "수정할 컷의 펜 아이콘을 눌러 해당 프롬프트를 엽니다.",
        "프롬프트를 수정하고 Regenerate를 누르면 선택한 컷만 다시 생성됩니다. 다른 컷은 영향을 받지 않습니다.",
        "각 컷의 다운로드 아이콘으로 개별 저장하거나 Download All로 9장을 한 번에 저장합니다.",
      ] },
      callout("컷은 순서와 횟수에 관계없이 개별 재생성할 수 있습니다. 전체를 다시 만들기 전에 문제 있는 컷만 수정해 보세요."),
    ],
    en: [
      { type: "p", text: "Build a coherent nine-cut story grid by setting the image engine, time and place, directorial style, and art medium." },
      callout("Based on the 2026 user manual · Generate activates only after every required field is complete.", "🎬"),
      { type: "h2", text: "Quick start" },
      { type: "ol", items: [
        "Open Director's Cut from the left sidebar.",
        "Choose the Standard or Cinema Pro image engine.",
        "Enter Year, Location, and Scenario.",
        "Choose a Director Style and Art Style.",
        "Optionally attach Hero Product and Hero Muse images.",
        "Press Generate to create a 3×3 nine-cut grid.",
      ] },
      { type: "h2", text: "1. Image engine" },
      toggle("Standard vs Cinema Pro", [
        { type: "ul", items: [
          "Standard (Gemini 2.5 Flash): fast with solid base framing; suited to drafts, idea exploration, and reference creation. The manual example shows 4 credits per cut.",
          "Cinema Pro (Gemini 3.1 Pro): stronger skin, texture, lighting, close-up, low-angle, depth, and cross-frame consistency; suited to final ad and video output. The manual example shows 7 credits per cut.",
        ] },
        callout("Credit pricing can change. Always confirm the actual cost displayed immediately before generation.", "⚡"),
      ]),
      { type: "h2", text: "2. Required inputs" },
      { type: "ul", items: [
        "Year: enter the era or temporal setting.",
        "Location: enter the city, place, or spatial setting.",
        "Scenario: describe the story or situation and meet the minimum length.",
        "Director Style: choose the directorial grammar and tone-and-mood.",
        "Art Style: choose live action, animation, claymation, or 3D as the output medium.",
      ] },
      toggle("Five Director Styles", [
        { type: "ul", items: [
          "Wes Anderson: symmetry, pastels, and precisely arranged storybook mise-en-scène.",
          "Spike Jonze: human storytelling on the border of reality and fantasy, with a lyrical mood.",
          "Wieden+Kennedy: message-led advertising with strong brand identity.",
          "The Baker Brothers: fast tempo, trend-aware cuts, rhythm, and visual impact.",
          "Show Yanagisawa: Japanese minimalism using natural light, negative space, and quiet emotion.",
        ] },
      ]),
      toggle("Four Art Styles", [
        { type: "ul", items: [
          "Live Action (Arri Alexa): realistic film and advertising look.",
          "Studio Ghibli: warm, emotional fantasy animation.",
          "Stop-motion Claymation: handcrafted texture and personality.",
          "3D Animation (Pixar Style): approachable, mass-appeal character rendering.",
        ] },
      ]),
      { type: "h2", text: "3. Product and model references (optional)" },
      { type: "ul", items: [
        "Hero Product: attach the central product image for the campaign.",
        "Hero Muse: attach a front-facing model photo to maintain the same person across all nine cuts.",
        "Background-free images improve recognition and consistency. Both fields are optional, so product-only campaigns are supported.",
      ] },
      { type: "h2", text: "4. Generate, edit a frame, and download" },
      { type: "ol", items: [
        "Check the required fields and press Generate to create the nine-cut grid on the right.",
        "Press the pen icon on the frame you want to revise to reveal its prompt.",
        "Edit the prompt and press Regenerate to rerender only that frame; the others are unaffected.",
        "Use a frame's download icon for an individual file, or Download All for all nine images.",
      ] },
      callout("Frames can be regenerated individually in any order and as many times as needed. Fix only the problem frame before rebuilding the full grid."),
    ],
  },

  "art-director-pro": {
    ko: [
      { type: "p", text: "포커스 모드, 캐릭터 시트, 카메라와 렌즈를 조합해 얼굴·의상·공간의 연속성을 유지하는 시네마틱 9컷을 만듭니다." },
      callout("2026 사용자 매뉴얼 기준 · 시나리오의 이름과 Role Name이 정확히 일치해야 얼굴과 의상 레퍼런스가 연결됩니다.", "🎭"),
      { type: "h2", text: "빠른 시작" },
      { type: "ol", items: [
        "메인 화면의 START를 누른 뒤 왼쪽 사이드바에서 Art Director Pro를 엽니다.",
        "Dialogue, Action, Atmosphere 중 포커스 모드를 선택합니다.",
        "등장인물의 Role Name이 포함된 시나리오를 작성하고 배경 이미지를 올립니다.",
        "캐스트별 Role Name, Face ID Source, 선택 사항인 Wardrobe Ref를 설정합니다.",
        "Detect Face로 좌·정면·우 3뷰 캐릭터 시트를 생성합니다.",
        "Camera와 Optics를 선택한 뒤 Generate를 누릅니다.",
      ] },
      { type: "h2", text: "1. 포커스 모드" },
      { type: "ul", items: [
        "Dialogue Focus: 감정, 표정, 인물 관계와 얼굴 클로즈업 중심. 드라마·인터뷰·스토리텔링에 적합합니다.",
        "Action Focus: 동작, 동선, 다이나믹한 카메라와 속도감 중심. 액션·퍼포먼스·광고·스포츠에 적합합니다.",
        "Atmosphere Focus: 조명, 색감, 공간 디테일과 톤앤매너 중심. 무드 필름·브랜딩·룩북에 적합합니다.",
      ] },
      { type: "h2", text: "2. 시나리오와 공간" },
      { type: "ul", items: [
        "Scenario는 필수이며 최소 글자 수를 충족해야 합니다. 각 등장인물의 이름을 반드시 포함하세요.",
        "Plate Product에는 건물, 방 구조, 거리 형태처럼 공간 구조가 명확한 배경 이미지를 사용하면 일관성이 좋아집니다.",
        "Role Name은 시나리오에서 사용한 이름과 철자까지 동일하게 입력합니다.",
        "인물이 2명 이상이면 Add Cast로 입력 영역을 추가합니다.",
      ] },
      { type: "h2", text: "3. 얼굴·의상 연속성" },
      { type: "ol", items: [
        "Face ID Source에 가능한 밝고 정면에 가까운 얼굴 사진을 업로드합니다.",
        "필요하면 Wardrobe Ref에 유지할 의상 이미지를 올립니다. 의상 레퍼런스는 선택 사항입니다.",
        "Detect Face를 눌러 좌측·정면·우측 3뷰 캐릭터 시트를 만듭니다.",
        "캐릭터 시트가 없으면 Generate가 활성화되지 않으므로 캐스트마다 생성 여부를 확인합니다.",
      ] },
      callout("애니메이션 캐릭터도 입력할 수 있지만 실사 데이터에 최적화된 엔진 특성상 실사화되거나 디테일이 줄어들 수 있습니다.", "⚠️"),
      { type: "h2", text: "4. Camera / Optics" },
      toggle("6가지 Camera", [
        { type: "ul", items: [
          "ARRI ALEXA 35: 균형 잡힌 17-stop 다이나믹 레인지, 광고·영화 표준 톤.",
          "SONY VENICE 2: 부드러운 그림자와 페인터리 질감, 감성적이고 고급스러운 이미지.",
          "RED V-RAPTOR: 초고해상도와 강한 대비, 선명한 광고 비주얼.",
          "PANAVISION MILLENNIUM DXL2: 대형 포맷 특유의 깊이감.",
          "ARRIFLEX 16SR: 16mm 필름 그레인, 빈티지·다큐멘터리 감성.",
          "IMAX MKIV: 70mm 기반의 압도적인 스케일감.",
        ] },
      ]),
      toggle("10가지 Optics", [
        { type: "ul", items: [
          "Cooke S4 — 따뜻한 색감·크리미한 보케 / ARRI Signature Prime — 현대적·깨끗한 표준 이미지.",
          "Zeiss Ultra Prime — 강한 콘트라스트·디테일 / Canon K-35 — 빈티지 하이라이트 글로우.",
          "Panavision C-Series — 블루 플레어 아나모픽 / Hawk V-Lite — 레트로 아나모픽.",
          "JDC Xtal Xpress — 독특한 왜곡 / Helios 44-2 — 소용돌이 보케.",
          "Angénieux Optimo — 유연한 시네마 줌 / Leica Summilux-C — 자연스럽고 사실적인 고급 룩.",
        ] },
      ]),
      { type: "h2", text: "5. Preview, 재생성, 업스케일" },
      { type: "ul", items: [
        "Generate를 누르면 Preview 1에 9컷 그리드가 만들어집니다. Preview 2~4에서 반복 생성하면 최대 36장까지 만들 수 있습니다.",
        "시나리오를 바꾸지 않고 결과만 다시 만들려면 Regenerate Grid를 사용합니다.",
        "시나리오의 흐름을 수정한 뒤 Generate하면 기존 톤앤매너를 유지하면서 변경된 인과 관계를 반영합니다.",
        "탭의 X로 Preview를 삭제할 수 있습니다. 선택한 탭이 없으면 빈 탭이 자동으로 채워집니다.",
        "업스케일할 컷을 체크한 뒤 Apply to Selection을 누릅니다. Select All로 전체 선택할 수 있으며 결과는 9장씩 페이지로 구분됩니다.",
        "Download Selected는 선택한 컷만, Download All은 전체 결과를 저장합니다.",
      ] },
    ],
    en: [
      { type: "p", text: "Combine a focus mode, character sheets, camera, and optics to create cinematic nine-cut grids with face, wardrobe, and spatial continuity." },
      callout("Based on the 2026 user manual · Names in the Scenario and Role Name fields must match exactly for face and wardrobe references to connect.", "🎭"),
      { type: "h2", text: "Quick start" },
      { type: "ol", items: [
        "Press START on the main screen, then open Art Director Pro from the left sidebar.",
        "Choose Dialogue, Action, or Atmosphere focus.",
        "Write a scenario containing each Role Name and upload a background image.",
        "For each cast member, set Role Name, Face ID Source, and the optional Wardrobe Ref.",
        "Press Detect Face to generate a left/front/right three-view character sheet.",
        "Choose Camera and Optics, then press Generate.",
      ] },
      { type: "h2", text: "1. Focus mode" },
      { type: "ul", items: [
        "Dialogue Focus: emotion, expression, relationships, and facial close-ups; best for drama, interviews, and storytelling.",
        "Action Focus: motion, blocking, dynamic cameras, and speed; best for action, performance, advertising, and sports.",
        "Atmosphere Focus: lighting, color, environmental detail, and tone; best for mood films, branding, and lookbooks.",
      ] },
      { type: "h2", text: "2. Scenario and space" },
      { type: "ul", items: [
        "Scenario is required and must meet the minimum length. Include the name of every character.",
        "For Plate Product, a background with clear structure—buildings, room layout, or street form—improves consistency.",
        "Enter each Role Name exactly as written in the scenario.",
        "For two or more characters, use Add Cast to create another input group.",
      ] },
      { type: "h2", text: "3. Face and wardrobe continuity" },
      { type: "ol", items: [
        "Upload a bright, near-frontal portrait to Face ID Source.",
        "Optionally add the outfit to preserve in Wardrobe Ref.",
        "Press Detect Face to create the left, front, and right three-view character sheet.",
        "Generate remains disabled without a character sheet, so confirm one exists for every cast member.",
      ] },
      callout("Animated characters are accepted, but an engine optimized for live-action data may convert the style toward realism or lose detail.", "⚠️"),
      { type: "h2", text: "4. Camera / Optics" },
      toggle("Six Camera options", [
        { type: "ul", items: [
          "ARRI ALEXA 35: balanced 17-stop dynamic range and a standard ad/film tone.",
          "SONY VENICE 2: soft shadows and painterly texture for emotional, premium images.",
          "RED V-RAPTOR: ultra-high resolution and strong contrast for crisp advertising visuals.",
          "PANAVISION MILLENNIUM DXL2: large-format cinematic depth.",
          "ARRIFLEX 16SR: 16mm grain with a vintage documentary feel.",
          "IMAX MKIV: 70mm-based scale and impact.",
        ] },
      ]),
      toggle("Ten Optics options", [
        { type: "ul", items: [
          "Cooke S4 — warm color and creamy bokeh / ARRI Signature Prime — modern, clean standard image.",
          "Zeiss Ultra Prime — strong contrast and detail / Canon K-35 — vintage highlight glow.",
          "Panavision C-Series — blue-flare anamorphic / Hawk V-Lite — retro anamorphic.",
          "JDC Xtal Xpress — distinctive distortion / Helios 44-2 — swirly bokeh.",
          "Angénieux Optimo — flexible cinema zoom / Leica Summilux-C — natural, realistic premium look.",
        ] },
      ]),
      { type: "h2", text: "5. Preview, regenerate, and upscale" },
      { type: "ul", items: [
        "Generate creates a nine-cut grid in Preview 1. Repeat in Previews 2–4 for up to 36 images.",
        "Use Regenerate Grid to rerender the images without changing the scenario.",
        "Edit the scenario flow and Generate again to apply the new causal sequence while preserving tone-and-mood.",
        "Delete a Preview with its X. If no tab is selected, generation automatically fills an empty slot.",
        "Check the frames to upscale, then press Apply to Selection. Select All chooses every frame; results are paginated in groups of nine.",
        "Download Selected saves checked frames; Download All saves the complete result set.",
      ] },
    ],
  },

  "face-swap": {
    ko: [
      { type: "p", text: "원본의 배경·의상·포즈·조명·구도를 최대한 유지하면서 지정한 얼굴 영역만 다른 얼굴로 교체합니다." },
      callout("본인 또는 명시적인 사용 동의를 받은 얼굴만 사용하고, 공개 공유 전 결과와 권리를 확인하세요.", "🛡️"),
      { type: "h2", text: "언제 사용하나요?" },
      { type: "ul", items: [
        "재촬영 없이 같은 컷에서 캐스팅 후보나 모델의 인상을 비교할 때.",
        "기존 이미지의 포즈와 의상은 유지하고 얼굴만 바꿀 때.",
        "초상권이 민감한 레퍼런스를 대체하거나 배우·모델 버전을 비교할 때.",
      ] },
      { type: "h2", text: "사용 순서" },
      { type: "ol", items: [
        "왼쪽 사이드바에서 Face Swap을 열고 Models에서 Nano Banana 2 또는 Nano Banana를 선택합니다.",
        "Original image에 얼굴을 바꿀 원본 이미지를 업로드합니다.",
        "Brush Size를 조절하며 원본 위의 교체할 얼굴 영역을 마스크로 칠합니다.",
        "Swap to image에 새로 적용할 얼굴 이미지를 업로드합니다.",
        "세 입력(원본·마스크·교체 얼굴)이 완료되면 Generate를 누르고 확인 팝업에서 OK를 선택합니다.",
        "오른쪽 결과 카드에서 생성 결과, 마스크 영역, 교체 얼굴을 비교합니다.",
      ] },
      { type: "h2", text: "좋은 결과를 위한 이미지·마스크 설정" },
      { type: "ul", items: [
        "원본은 얼굴 방향, 조명, 해상도가 안정적일수록 자연스럽습니다.",
        "교체 얼굴은 얼굴 구조가 잘 보이는 정면 또는 3/4 각도 이미지가 좋습니다.",
        "마스크가 실제 교체 범위가 됩니다. 얼굴 주변을 너무 좁거나 너무 넓게 칠하지 마세요.",
        "넓은 면은 굵은 브러시로 칠하고, 눈가·턱선은 작은 브러시로 정리합니다.",
        "업로드 이미지는 우측 상단 X로 제거한 뒤 다시 선택할 수 있습니다.",
      ] },
      callout("매뉴얼의 테스트 화면은 1회 생성에 6 credits를 표시합니다. 실제 비용은 Generate 직전 화면에서 다시 확인하세요.", "⚡"),
      { type: "h2", text: "결과 관리" },
      { type: "ul", items: [
        "공유: 외부 링크 아이콘을 누른 뒤 확인 팝업에서 OK를 선택하면 미디어가 공개 공유됩니다.",
        "재생성: 새로고침 아이콘으로 같은 입력값을 바탕으로 다른 결과를 만듭니다.",
        "다운로드: 다운로드 아이콘으로 파일을 저장합니다.",
        "삭제: 휴지통 아이콘을 누른 뒤 확인 팝업에서 OK를 선택합니다. 삭제할 결과인지 반드시 확인하세요.",
      ] },
    ],
    en: [
      { type: "p", text: "Replace a marked face while preserving the source background, wardrobe, pose, lighting, and composition as much as possible." },
      callout("Use only your own face or one you have explicit permission to use, and verify rights and output before public sharing.", "🛡️"),
      { type: "h2", text: "When to use it" },
      { type: "ul", items: [
        "Compare casting candidates or model impressions in the same shot without a reshoot.",
        "Keep an existing pose and wardrobe while changing only the face.",
        "Replace portrait-sensitive references or compare actor/model versions of one scene.",
      ] },
      { type: "h2", text: "Workflow" },
      { type: "ol", items: [
        "Open Face Swap from the left sidebar and choose Nano Banana 2 or Nano Banana under Models.",
        "Upload the source image under Original image.",
        "Adjust Brush Size and paint a mask over the face to replace.",
        "Upload the new face under Swap to image.",
        "When source, mask, and replacement face are ready, press Generate and confirm with OK.",
        "Compare the generated image, marked region, and replacement face in the result card on the right.",
      ] },
      { type: "h2", text: "Image and mask setup for better results" },
      { type: "ul", items: [
        "A source with stable face direction, lighting, and resolution produces a more natural result.",
        "Use a frontal or three-quarter replacement image where facial structure is clearly visible.",
        "The mask becomes the actual replacement boundary. Do not paint too narrowly or too widely around the face.",
        "Use a thick brush for broad areas and a small brush around the eyes and jawline.",
        "Remove either uploaded image with the X at its upper-right corner, then select it again.",
      ] },
      callout("The manual's test screen shows 6 credits per generation. Confirm the current cost shown immediately before pressing Generate.", "⚡"),
      { type: "h2", text: "Manage results" },
      { type: "ul", items: [
        "Share: press the external-link icon, then OK in the confirmation to make the media public.",
        "Regenerate: use the refresh icon to produce another result from the same inputs.",
        "Download: save the file with the download icon.",
        "Delete: press the trash icon and confirm with OK. Verify that the result should be removed first.",
      ] },
    ],
  },

  image: {
    ko: [
      { type: "p", text: "7가지 AI 모델에서 텍스트 프롬프트와 선택적인 레퍼런스 이미지를 이용해 이미지를 생성하고 결과를 비교·관리합니다." },
      callout("2026 사용자 가이드 기준 · 프롬프트는 필수이며 영어로 작성하면 더 정확한 결과를 얻을 수 있습니다.", "✨"),
      { type: "h2", text: "빠른 시작" },
      { type: "ol", items: [
        "왼쪽 사이드바 첫 번째 아이콘에서 Image Generator를 엽니다.",
        "목적과 레퍼런스 장수에 맞는 모델을 선택합니다.",
        "프롬프트를 입력하고 필요하면 점선 박스 아이콘으로 레퍼런스를 첨부합니다.",
        "이미지 비율, 해상도, 생성 매수와 모델별 옵션을 설정합니다.",
        "Generate를 누른 뒤 오른쪽에서 결과를 확인·다운로드합니다.",
      ] },
      { type: "h2", text: "1. 모델과 레퍼런스 제한" },
      toggle("7가지 모델", [
        { type: "ul", items: [
          "Nano Banana 2: 범용적이고 텍스트 정확도가 높은 안정적인 모델 · 레퍼런스 최대 14장.",
          "Nano Banana Pro: 더 높은 디테일과 품질 · 레퍼런스 최대 14장.",
          "Kling Image O1: 독자적인 이미지 해석 스타일 · 레퍼런스 최대 10장.",
          "Z Image: 레퍼런스 미지원, Negative Prompt 지원, 해상도 1K 전용.",
          "Seedream 5.0 Lite: 감성적이고 부드러운 톤 · 레퍼런스 최대 14장.",
          "Grok Imagine Image: 레퍼런스 1장.",
          "Grok Imagine Pro: Grok Imagine 상위 모델 · 레퍼런스 최대 3장.",
        ] },
      ]),
      { type: "h2", text: "2. 프롬프트와 레퍼런스" },
      { type: "ul", items: [
        "Prompt는 필수입니다. 비어 있으면 Generate가 활성화되지 않으며, 이전 사용 기록이 있으면 마지막 프롬프트가 자동 적용될 수 있습니다.",
        "프롬프트 왼쪽 점선 박스 아이콘으로 이미지를 첨부합니다. 레퍼런스는 선택 사항입니다.",
        "첨부된 이미지는 @image1, @image2 형식으로 표시되므로 프롬프트에서 각 이미지를 명시적으로 참조할 수 있습니다.",
        "Z Image에서는 Negative prompt에 blurry, extra fingers, watermark, text, low quality처럼 제외할 요소를 적을 수 있습니다.",
      ] },
      { type: "h2", text: "3. 출력 옵션" },
      toggle("비율 · 해상도 · 생성 매수", [
        { type: "ul", items: [
          "비율: 16:9, 9:16, 1:1, 3:2, 2:3, 4:3, 3:4, 5:4, 4:5, 21:9, 4:1, 1:4 중 선택합니다.",
          "해상도: 1K는 빠른 초안, 2K는 기본 권장, 4K는 인쇄·상업용 최고 품질에 적합합니다. Z Image는 1K만 지원합니다.",
          "생성 매수: 한 번에 1장, 2장 또는 4장을 선택할 수 있습니다.",
        ] },
        callout("모델마다 지원 비율과 해상도가 다릅니다. 모델을 바꾸면 지원 가능한 기본값으로 자동 조정될 수 있으니 모델 선택 후 다시 확인하세요.", "⚠️"),
      ]),
      { type: "h2", text: "4. 생성과 결과 관리" },
      { type: "ol", items: [
        "설정을 완료한 뒤 노란색 Generate를 누릅니다. 버튼에 표시된 크레딧이 사용됩니다.",
        "생성이 끝나면 오른쪽에 결과와 사용한 프롬프트가 표시됩니다. 4장 생성 시 번호가 붙은 썸네일이 가로로 나열됩니다.",
        "프롬프트 오른쪽 위 복사 아이콘으로 같은 문장을 다시 쓰거나 다른 모델에 옮길 수 있습니다.",
        "썸네일을 누르면 전체 화면에서 좌우 이동, 확대·축소, 90° 회전을 사용할 수 있습니다.",
        "결과 우측 하단 아이콘으로 새 창에서 열기, 다운로드, 삭제를 실행합니다.",
      ] },
    ],
    en: [
      { type: "p", text: "Generate, compare, and manage images across seven AI models using text prompts and optional reference images." },
      callout("Based on the 2026 user guide · A prompt is required, and writing it in English can improve accuracy.", "✨"),
      { type: "h2", text: "Quick start" },
      { type: "ol", items: [
        "Open Image Generator from the first icon in the left sidebar.",
        "Choose a model based on the goal and number of references.",
        "Enter a prompt and optionally attach references with the dotted-box icon.",
        "Set aspect ratio, resolution, image count, and any model-specific option.",
        "Press Generate, then review and download results on the right.",
      ] },
      { type: "h2", text: "1. Models and reference limits" },
      toggle("Seven models", [
        { type: "ul", items: [
          "Nano Banana 2: stable general model with strong text accuracy · up to 14 references.",
          "Nano Banana Pro: higher detail and quality · up to 14 references.",
          "Kling Image O1: distinctive image interpretation · up to 10 references.",
          "Z Image: no references, supports Negative Prompt, and limited to 1K.",
          "Seedream 5.0 Lite: emotional, soft tone · up to 14 references.",
          "Grok Imagine Image: 1 reference.",
          "Grok Imagine Pro: upper-tier Grok Imagine model · up to 3 references.",
        ] },
      ]),
      { type: "h2", text: "2. Prompt and references" },
      { type: "ul", items: [
        "Prompt is required; Generate stays disabled when it is empty. Your last prompt may be restored automatically.",
        "Attach optional images with the dotted-box icon to the left of Prompt.",
        "Attached files appear as @image1, @image2, and so on, allowing explicit references inside the prompt.",
        "With Z Image, list unwanted elements under Negative prompt—for example: blurry, extra fingers, watermark, text, low quality.",
      ] },
      { type: "h2", text: "3. Output options" },
      toggle("Ratio · resolution · image count", [
        { type: "ul", items: [
          "Ratio: choose 16:9, 9:16, 1:1, 3:2, 2:3, 4:3, 3:4, 5:4, 4:5, 21:9, 4:1, or 1:4.",
          "Resolution: 1K for fast drafts, 2K as the recommended default, or 4K for print and commercial quality. Z Image supports only 1K.",
          "Image count: generate 1, 2, or 4 images at once.",
        ] },
        callout("Supported ratios and resolutions vary by model. Changing models can reset an unsupported value, so verify options again after model selection.", "⚠️"),
      ]),
      { type: "h2", text: "4. Generate and manage results" },
      { type: "ol", items: [
        "Complete the settings and press the yellow Generate button. The displayed credits are consumed.",
        "Results and their prompts appear on the right. With four images, numbered thumbnails are arranged horizontally.",
        "Use the copy icon at the upper-right of a result prompt to reuse it here or in another model.",
        "Press a thumbnail for fullscreen navigation, zoom, and 90° rotation.",
        "Use the icons at the lower-right of a result to open it in a new window, download it, or delete it.",
      ] },
    ],
  },

  upscale: {
    ko: [
      { type: "p", text: "저해상도이거나 흐릿한 사진·AI 이미지·제품 컷·인물 컷을 2X 또는 4X로 확대하고 디테일을 보강하는 마무리 도구입니다." },
      callout("2026 사용자 가이드 기준 · Upscaler의 흐름은 모델 선택 → 이미지 업로드 → 옵션 설정 → Generate입니다.", "🔎"),
      { type: "h2", text: "빠른 시작" },
      { type: "ol", items: [
        "왼쪽 사이드바에서 Upscaler를 엽니다.",
        "Models에서 Topaz 또는 Xconda를 선택합니다.",
        "Drop Image Here / Click to Upload에 원본을 넣습니다.",
        "2X 또는 4X와 필요한 보정 옵션을 설정합니다.",
        "Generate를 누르고 확인 팝업에서 OK를 선택합니다.",
        "Latest Result에서 결과를 확인하고 다운로드합니다.",
      ] },
      { type: "h2", text: "1. 모델 선택" },
      { type: "ul", items: [
        "Topaz: 배율, Enhance Model, Subject Detection, Output Format, Face Enhancement, Creativity를 세밀하게 조절할 수 있습니다.",
        "Xconda: 자체 학습 모델로 옵션이 단순하며 빠른 결과를 우선할 때 적합합니다.",
      ] },
      { type: "h2", text: "2. 배율과 Topaz 옵션" },
      toggle("2X / 4X", [
        { type: "ul", items: [
          "2X: 웹 미리보기와 빠르고 가벼운 작업에 적합합니다.",
          "4X: 더 많은 시간·크레딧이 들지만 큰 화면과 고해상도 납품에 적합합니다.",
        ] },
      ]),
      toggle("Enhance Model", [
        { type: "ul", items: [
          "Standard V2 / High Fidelity V2: 일반 사진과 원본 충실도가 중요한 작업.",
          "Low Resolution V2: 작은 저해상도 원본.",
          "CGI: 일러스트와 3D 렌더.",
          "Text Refine: 글자 디테일이 중요한 이미지.",
        ] },
      ]),
      toggle("Subject Detection · Output Format", [
        { type: "ul", items: [
          "Foreground는 배경과 분리된 인물이나 제품을 전경 피사체 중심으로 보정할 때 안정적입니다.",
          "JPG는 가벼운 공유·미리보기, PNG는 투명도·합성·후편집에 적합합니다.",
        ] },
      ]),
      toggle("Face Enhancement · Creativity", [
        { type: "ul", items: [
          "Face Enhancement는 눈·코·입·피부·윤곽을 보강합니다. 너무 높으면 인공적으로 보일 수 있으므로 중간값에서 시작하세요.",
          "Creativity가 낮으면 원본을 유지하고, 높으면 질감과 디테일을 더 적극적으로 재해석합니다. 얼굴은 낮음~중간이 안전합니다.",
        ] },
      ]),
      { type: "h2", text: "3. 생성과 결과 관리" },
      { type: "ol", items: [
        "Generate 오른쪽의 예상 크레딧을 확인합니다. 매뉴얼 예시에는 8 credits가 표시되지만 옵션에 따라 달라질 수 있습니다.",
        "Generate를 누른 뒤 ‘Would you like to generate an image?’ 팝업에서 OK를 선택합니다.",
        "완료된 이미지는 오른쪽 Latest Result에 표시됩니다.",
        "Download 아이콘으로 저장하고 Delete로 필요 없는 결과를 정리합니다.",
        "하단 History에서 이전 결과를 다시 열어 시안을 비교합니다.",
      ] },
      callout("얼굴 보정은 정면에 가깝고 얼굴이 충분히 크게 보이는 원본에서 가장 안정적입니다. 원본 느낌을 지키려면 Face Enhancement와 Creativity를 한 번에 높이지 마세요."),
    ],
    en: [
      { type: "p", text: "A finishing tool that scales low-resolution or blurry photos, AI images, product shots, and portraits by 2X or 4X while restoring detail." },
      callout("Based on the 2026 user guide · The Upscaler flow is model → upload → options → Generate.", "🔎"),
      { type: "h2", text: "Quick start" },
      { type: "ol", items: [
        "Open Upscaler from the left sidebar.",
        "Choose Topaz or Xconda under Models.",
        "Add the source under Drop Image Here / Click to Upload.",
        "Choose 2X or 4X and configure the correction options you need.",
        "Press Generate and confirm with OK.",
        "Review and download the output under Latest Result.",
      ] },
      { type: "h2", text: "1. Choose a model" },
      { type: "ul", items: [
        "Topaz: fine control over scale, Enhance Model, Subject Detection, Output Format, Face Enhancement, and Creativity.",
        "Xconda: a simpler in-house model suited to fast, one-click results.",
      ] },
      { type: "h2", text: "2. Scale and Topaz options" },
      toggle("2X / 4X", [
        { type: "ul", items: [
          "2X: lighter and faster, suited to web previews.",
          "4X: takes more time and credits but suits large screens and high-resolution delivery.",
        ] },
      ]),
      toggle("Enhance Model", [
        { type: "ul", items: [
          "Standard V2 / High Fidelity V2: general photos and source-faithful work.",
          "Low Resolution V2: small, low-resolution sources.",
          "CGI: illustration and 3D renders.",
          "Text Refine: images where lettering detail matters.",
        ] },
      ]),
      toggle("Subject Detection · Output Format", [
        { type: "ul", items: [
          "Foreground reliably centers correction on a person or product clearly separated from the background.",
          "Use JPG for lightweight sharing and previews; PNG for transparency, compositing, and further editing.",
        ] },
      ]),
      toggle("Face Enhancement · Creativity", [
        { type: "ul", items: [
          "Face Enhancement restores eyes, nose, mouth, skin, and contours. Start in the middle range—too high can look artificial.",
          "Low Creativity preserves the source; high values reconstruct texture more aggressively. Low-to-middle is safest for faces.",
        ] },
      ]),
      { type: "h2", text: "3. Generate and manage results" },
      { type: "ol", items: [
        "Check the estimated credits next to Generate. The manual example shows 8 credits, but the cost varies by options.",
        "Press Generate, then OK in the “Would you like to generate an image?” dialog.",
        "The finished image appears under Latest Result on the right.",
        "Save it with Download and remove unwanted outputs with Delete.",
        "Reopen previous generations in History to compare versions.",
      ] },
      callout("Face correction is most reliable when the face is near-frontal and clearly visible. To preserve the original look, avoid raising Face Enhancement and Creativity aggressively at the same time."),
    ],
  },
};

export function getToolGuide(slug: string, lang: Lang): Block[] | undefined {
  return TOOL_GUIDES[slug]?.[lang];
}
