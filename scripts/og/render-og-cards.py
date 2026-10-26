#!/usr/bin/env python3
"""
언어별 공유 카드(OG, 1200×630) 렌더러.

    python3 scripts/og/render-og-cards.py <spec.json> <out_dir>

`npm run og:cards`(= scripts/og/build-og-cards.mjs)가 spec JSON 을 만들어 호출합니다.
spec 형식:

    {
      "fonts": {"ko": {"regular": "...", "bold": "..."}, ...},
      "cards": [{"id": "ja/qna", "file": "ja-qna.png", "lang": "ja",
                 "kicker": "XCONDA HUB ・ Q&A", "title": "…", "description": "…",
                 "foot": "hub.xconda.ai/ja/qna/", "label": "日本語"}]
    }

Pillow 가 없으면 SKIP(종료 코드 1) — 카드 생성은 빌드 경로가 아니므로 사이트 빌드에는
영향이 없습니다. 이미 만들어 둔 카드(PNG · manifest)는 저장소에 커밋되어 있습니다.
"""
import json
import os
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:  # Pillow 없으면 조용히 실패 (카드 생성만 건너뜀)
    print("SKIP: Pillow 없음 (pip install Pillow)")
    sys.exit(1)

W, H = 1200, 630
BG = (11, 11, 11)
FG = (250, 250, 250)
MUTED = (161, 161, 170)
DIM = (113, 113, 122)
VOLT = (250, 204, 21)
RULE = (39, 39, 42)

PAD_X = 72
CONTENT_WIDTH = W - PAD_X * 2


# 줄 첫머리에 올 수 없는 글자(한국어·일본어·중국어 문장 부호) — 앞 줄 끝으로 당깁니다.
NO_LINE_START = "、。，．・：；？！）〕」』】〉》…‥ー々~%"


def _kinsoku(lines):
    out = []
    for line in lines:
        while line and out and line[0] in NO_LINE_START:
            out[-1] += line[0]
            line = line[1:]
        if line:
            out.append(line)
    return out


def wrap(draw, text, font, max_width):
    """공백 기준으로 줄을 나누고, 한 단어/구절이 폭을 넘으면 글자 단위로 자릅니다.
    한국어·일본어·중국어는 공백이 적어 글자 단위 자르기가 실제로 자주 쓰입니다."""
    lines = []
    for para in str(text or "").split("\n"):
        para = para.strip()
        if not para:
            continue
        cur = ""
        for word in para.split(" "):
            trial = f"{cur} {word}".strip()
            if draw.textlength(trial, font=font) <= max_width:
                cur = trial
                continue
            if cur:
                lines.append(cur)
            if draw.textlength(word, font=font) > max_width:
                buf = ""
                for ch in word:
                    if draw.textlength(buf + ch, font=font) <= max_width:
                        buf += ch
                    else:
                        lines.append(buf)
                        buf = ch
                cur = buf
            else:
                cur = word
        if cur:
            lines.append(cur)
    return _kinsoku(lines)


def fit_title(draw, text, font_path, sizes=(70, 62, 54, 46), max_lines=3):
    """제목이 3줄을 넘지 않도록 폰트 크기를 낮춰 가며 맞춥니다."""
    chosen = None
    for size in sizes:
        font = ImageFont.truetype(font_path, size)
        lines = wrap(draw, text, font, CONTENT_WIDTH)
        chosen = (font, size, lines)
        if len(lines) <= max_lines:
            break
    font, size, lines = chosen
    return font, size, lines[:max_lines]


def render_card(card, fonts, out_dir):
    lang = card.get("lang") or "ko"
    paths = fonts.get(lang) or {}
    bold_path = paths.get("bold") or paths.get("regular")
    regular_path = paths.get("regular") or bold_path
    if not bold_path:
        raise SystemExit(f"SKIP: {lang} 폰트를 찾지 못했습니다")

    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    font_kicker = ImageFont.truetype(bold_path, 28)
    title_font, title_size, title_lines = fit_title(d, card.get("title", ""), bold_path)
    font_desc = ImageFont.truetype(regular_path, 27)
    font_foot = ImageFont.truetype(regular_path, 24)

    # 왼쪽 위 짧은 노란 막대 — 허브의 강조색을 카드에서도 유지합니다.
    d.rectangle([PAD_X, 86, PAD_X + 84, 94], fill=VOLT)
    d.text((PAD_X, 112), card.get("kicker", "XCONDA HUB"), font=font_kicker, fill=VOLT)

    y = 196
    line_height = int(title_size * 1.24)
    for line in title_lines:
        d.text((PAD_X, y), line, font=title_font, fill=FG)
        y += line_height

    desc_lines = wrap(d, card.get("description", ""), font_desc, CONTENT_WIDTH)
    if len(desc_lines) > 3:
        desc_lines = desc_lines[:3]
        desc_lines[-1] = desc_lines[-1].rstrip() + "…"
    y += 18
    for line in desc_lines:
        if y > 486:  # 푸터와 겹치지 않게
            break
        d.text((PAD_X, y), line, font=font_desc, fill=MUTED)
        y += 42

    # 푸터 — 주소(왼쪽) · 언어 이름(오른쪽)
    d.rectangle([PAD_X, 528, W - PAD_X, 529], fill=RULE)
    d.text((PAD_X, 552), card.get("foot", ""), font=font_foot, fill=DIM)
    label = card.get("label", "")
    if label:
        lw = d.textlength(label, font=font_foot)
        d.text((W - PAD_X - lw, 552), label, font=font_foot, fill=VOLT)

    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, card["file"])
    img.save(out, "PNG", optimize=True)
    return out


def main():
    if len(sys.argv) < 3:
        print("usage: render-og-cards.py <spec.json> <out_dir>")
        return 2
    spec_path, out_dir = sys.argv[1], sys.argv[2]
    with open(spec_path, encoding="utf-8") as fh:
        spec = json.load(fh)
    fonts = spec.get("fonts") or {}
    cards = spec.get("cards") or []
    done = 0
    for card in cards:
        render_card(card, fonts, out_dir)
        done += 1
    print(f"렌더 완료 {done}장 → {out_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
