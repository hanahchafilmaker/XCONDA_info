#!/usr/bin/env python3
"""
www 기능 페이지 공유 카드 PNG(1200×630) 렌더러.

    python3 scripts/www/render-og-png.py www/dist

`npm run www:build` 가 자동으로 호출합니다(파이썬·Pillow·한글 폰트가 있을 때만).
없으면 빌드는 SVG 카드로 폴백하고, meta og:image 도 SVG 를 가리킵니다.

한글 폰트 탐색 순서
  1) 환경변수 OG_FONT_KO
  2) koreanize-matplotlib 이 번들한 NanumGothic (pip install koreanize-matplotlib)
  3) 시스템의 흔한 한글 폰트 경로
"""
import json
import os
import sys
import glob

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:  # Pillow 없으면 조용히 실패 (빌드가 SVG 로 폴백)
    print("SKIP: Pillow 없음")
    sys.exit(1)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DATA = os.path.join(ROOT, "www/feature-pages.json")

BG = (11, 11, 11)
FG = (255, 255, 255)
MUTED = (161, 161, 170)
DIM = (113, 113, 122)
VOLT = (250, 204, 21)
W, H = 1200, 630


def find_font(bold: bool = False) -> str | None:
    env = os.environ.get("OG_FONT_KO")
    if env and os.path.exists(env):
        return env
    pats = []
    try:
        import koreanize_matplotlib  # type: ignore

        base = os.path.dirname(koreanize_matplotlib.__file__)
        pats.append(os.path.join(base, "fonts", "NanumGothicBold.ttf" if bold else "NanumGothic.ttf"))
    except Exception:
        pass
    pats += [
        "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf" if bold else "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc" if bold else "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",
        "C:/Windows/Fonts/malgunbd.ttf" if bold else "C:/Windows/Fonts/malgun.ttf",
    ]
    for p in pats:
        if p and os.path.exists(p):
            return p
    found = glob.glob("/usr/share/fonts/**/*Gothic*.ttf", recursive=True)
    return found[0] if found else None


def wrap(draw, text: str, font, max_width: int) -> list[str]:
    """한글은 공백 단위로, 공백이 없으면 글자 단위로 줄바꿈합니다."""
    words = text.split(" ")
    lines: list[str] = []
    cur = ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if draw.textlength(trial, font=font) <= max_width:
            cur = trial
            continue
        if cur:
            lines.append(cur)
        # 단어 하나가 폭을 넘으면 글자로 자릅니다
        if draw.textlength(w, font=font) > max_width:
            buf = ""
            for ch in w:
                if draw.textlength(buf + ch, font=font) <= max_width:
                    buf += ch
                else:
                    lines.append(buf)
                    buf = ch
            cur = buf
        else:
            cur = w
    if cur:
        lines.append(cur)
    return lines


def render(out_dir: str) -> int:
    regular = find_font(bold=False)
    bold = find_font(bold=True) or regular
    if not regular:
        print("SKIP: 한글 폰트를 찾지 못했습니다 (OG_FONT_KO 로 지정 가능)")
        return 1

    data = json.load(open(DATA, encoding="utf-8"))
    pages = data.get("pages", [])
    base = data.get("basePath", "features")
    font_lg = ImageFont.truetype(bold, 76)
    font_md = ImageFont.truetype(regular, 32)
    font_sm = ImageFont.truetype(regular, 26)
    font_kicker = ImageFont.truetype(bold, 30)
    count = 0

    for page in pages:
        for lang in ("ko", "en"):
            copy = page.get(lang) or {}
            if not copy.get("title"):
                continue
            slug = page["slug"]
            path = os.path.join(out_dir, "ko/" if lang == "ko" else "", base, slug)
            os.makedirs(path, exist_ok=True)

            img = Image.new("RGB", (W, H), BG)
            d = ImageDraw.Draw(img)
            kicker = "XCONDA 기능" if lang == "ko" else "XCONDA FEATURE"
            d.text((72, 64), "XCONDA", font=font_kicker, fill=VOLT)
            d.text((72 + d.textlength("XCONDA", font=font_kicker) + 22, 64), f"· {kicker}", font=font_sm, fill=MUTED)

            title = copy.get("h1") or page.get("name", "")
            d.text((72, 200), title, font=font_lg, fill=FG)

            intro = copy.get("intro") or copy.get("description", "")
            y = 320
            for line in wrap(d, intro, font_md, W - 160)[:3]:
                d.text((72, y), line, font=font_md, fill=MUTED)
                y += 46

            d.text((72, 545), f"www.xconda.ai/{'ko/' if lang == 'ko' else ''}{base}/{slug}", font=font_sm, fill=DIM)
            right = "hub.xconda.ai"
            d.text((W - 72 - d.textlength(right, font=font_sm), 545), right, font=font_sm, fill=VOLT)

            img.save(os.path.join(path, "og.png"), "PNG", optimize=True)
            count += 1

    # 목록 페이지 카드
    for lang in ("ko", "en"):
        path = os.path.join(out_dir, "ko/" if lang == "ko" else "", base)
        os.makedirs(path, exist_ok=True)
        img = Image.new("RGB", (W, H), BG)
        d = ImageDraw.Draw(img)
        d.text((72, 64), "XCONDA", font=font_kicker, fill=VOLT)
        d.text((72 + d.textlength("XCONDA", font=font_kicker) + 22, 64), "· FEATURES", font=font_sm, fill=MUTED)
        title = "XCONDA 기능" if lang == "ko" else "XCONDA features"
        d.text((72, 220), title, font=font_lg, fill=FG)
        sub = "AI 스토리보드부터 영상 생성까지, 제작 도구 20가지" if lang == "ko" else "20 production tools, from AI storyboards to video"
        d.text((72, 330), sub, font=font_md, fill=MUTED)
        d.text((72, 545), f"www.xconda.ai/{'ko/' if lang == 'ko' else ''}{base}", font=font_sm, fill=DIM)
        img.save(os.path.join(path, "og.png"), "PNG", optimize=True)
        count += 1

    print(f"OG PNG {count}개 생성")
    return 0


if __name__ == "__main__":
    out = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "www/dist"))
    sys.exit(render(out))
