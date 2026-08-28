#!/usr/bin/env python3
"""Images de partage (Open Graph) — une par outil, plus celle du site.

Le lettrage est vectorisé avec fontTools avant d'être rasterisé : la chaîne ne
dépend donc d'aucune police installée sur la machine qui lance le script, et le
rendu est identique en local et en CI.

    python3 scripts/og/build.py            # tout
    python3 scripts/og/build.py --site     # seulement l'image du site
"""
from __future__ import annotations
import argparse, json, shutil, subprocess, sys, urllib.request
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / ".cache" / "fonts"
URL = "https://github.com/google/fonts/raw/main/ofl/manrope/Manrope%5Bwght%5D.ttf"
INK, PAPER, MUTED, ACCENT = "#0B0B0C", "#F6F5F3", "#8A8A93", "#F2B705"
W, H = 1200, 630

_fonts: dict[int, tuple] = {}


def font(weight: int):
    """Manrope instanciée à une graisse, avec son jeu de glyphes et ses métriques."""
    if weight in _fonts:
        return _fonts[weight]
    CACHE.mkdir(parents=True, exist_ok=True)
    src = CACHE / "Manrope.ttf"
    if not src.exists():
        print("… téléchargement de Manrope (OFL)")
        urllib.request.urlretrieve(URL, src)
    f = instancer.instantiateVariableFont(TTFont(src), {"wght": weight})
    _fonts[weight] = (f, f.getGlyphSet(), f.getBestCmap(), f["hmtx"], f["head"].unitsPerEm)
    return _fonts[weight]


def width_of(text: str, size: float, weight: int, track: float = 0.0) -> float:
    _, _, cmap, hmtx, upm = font(weight)
    s = size / upm
    w = 0.0
    for ch in text:
        g = cmap.get(ord(ch))
        if g:
            w += hmtx[g][0] * s + size * track
    return w


def text_path(text: str, size: float, x: float, y: float, weight: int = 800,
              track: float = 0.0, fill: str = PAPER) -> str:
    """Rend une chaîne en un seul <path>. y est la ligne de base."""
    _, gs, cmap, hmtx, upm = font(weight)
    s = size / upm
    parts, cx = [], x
    for ch in text:
        g = cmap.get(ord(ch))
        if g is None:
            continue
        pen = SVGPathPen(gs)
        gs[g].draw(TransformPen(pen, Transform(s, 0, 0, -s, cx, y)))
        d = pen.getCommands()
        if d:
            parts.append(d)
        cx += hmtx[g][0] * s + size * track
    return f'<path fill="{fill}" d="{" ".join(parts)}"/>' if parts else ""


def wrap(text: str, size: float, weight: int, track: float, max_w: float, max_lines: int) -> list[str]:
    lines, cur = [], ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if width_of(trial, size, weight, track) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
            if len(lines) == max_lines:
                break
    if cur and len(lines) < max_lines:
        lines.append(cur)
    if len(lines) == max_lines and width_of(lines[-1], size, weight, track) > max_w:
        while lines[-1] and width_of(lines[-1] + "…", size, weight, track) > max_w:
            lines[-1] = lines[-1][:-1]
        lines[-1] += "…"
    return lines


MARK = ('<g transform="translate({x},{y}) scale({s})">'
        '<path d="M24 4.5 43.5 21H4.5z" fill="{c}"/>'
        '<rect x="8" y="23.5" width="32" height="9" rx="2.5" fill="{c}"/>'
        '<rect x="8" y="35" width="20.5" height="9" rx="2.5" fill="{c}"/>'
        '<rect x="31.5" y="35" width="8.5" height="9" rx="2.5" fill="' + ACCENT + '"/></g>')


def card(title: str, kicker: str, subtitle: str, footer: str, title_size: float = 76) -> str:
    lines = wrap(title, title_size, 800, -0.03, W - 160, 3)
    while len(lines) > 2 and title_size > 52:
        title_size -= 8
        lines = wrap(title, title_size, 800, -0.03, W - 160, 3)
    body = [
        f'<rect width="{W}" height="{H}" fill="{INK}"/>',
        f'<rect x="0" y="{H-10}" width="{W}" height="10" fill="{ACCENT}"/>',
        MARK.format(x=80, y=68, s=0.72, c=PAPER),
        text_path(kicker, 21, 122, 96, 700, 0.06, MUTED),
    ]
    y = 250 if len(lines) <= 2 else 214
    for ln in lines:
        body.append(text_path(ln, title_size, 80, y, 800, -0.03, PAPER))
        y += title_size * 1.12
    if subtitle:
        body.append(text_path(subtitle, 30, 80, y + 18, 600, 0, MUTED))
    if footer:
        body.append(text_path(footer, 25, 80, H - 62, 600, 0, MUTED))
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{"".join(body)}</svg>'


# ImageMagick 7 fournit `magick`, ImageMagick 6 — celui des runners Ubuntu —
# fournit `convert`. Supposer `magick` fait échouer la CI alors que tout marche
# en local, ce qui est la panne la plus coûteuse à diagnostiquer.
IMAGEMAGICK = shutil.which("magick") or shutil.which("convert")


def render(svg: str, out: Path) -> None:
    if not IMAGEMAGICK:
        raise SystemExit(
            "ImageMagick est absent : ni `magick` ni `convert` sur le PATH.\n"
            "  macOS  : brew install imagemagick\n"
            "  Ubuntu : sudo apt-get install -y imagemagick"
        )
    out.parent.mkdir(parents=True, exist_ok=True)
    # Le rendu ne demande aucune police : tout le lettrage est déjà en courbes.
    subprocess.run([IMAGEMAGICK, "-background", "none", "svg:-", "-flatten",
                    "-colors", "64", "PNG8:" + str(out)],
                   input=svg.encode(), check=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", action="store_true", help="seulement l'image du site")
    a = ap.parse_args()

    api = json.loads((ROOT / "public" / "api" / "tools.json").read_text())
    tools, counts = api["tools"], api["counts"]
    tax = json.loads((ROOT / "public" / "api" / "taxonomy.json").read_text())
    cat = {c["id"]: c["label_en"] for c in tax["categories"]}
    mkt = {m["id"]: m["label_en"] for m in tax["markets"]}

    render(card(
        "Every real estate software, and what it is actually for.",
        "PROPTECH ATLAS",
        "",
        f'{counts["tools"]} products · {counts["US"]} United States · {counts["FR"]} France · open data',
    ), ROOT / "public" / "og.png")
    print("✓ og.png")
    if a.site:
        return 0

    for i, t in enumerate(tools, 1):
        render(card(
            t["name"],
            "PROPTECH ATLAS",
            # Répéter « DoorLoop / DoorLoop » n'apprend rien : quand l'éditeur
            # porte le nom du produit, la ligne cède la place au positionnement.
            t["editor"] if t["editor"].lower() != t["name"].lower()
            else t["positioning"][:110],
            f'{cat.get(t["category"], t["category"])} · {" · ".join(mkt.get(m, m) for m in t["markets"])}',
            title_size=72,
        ), ROOT / "public" / "og" / f'{t["slug"]}.png')
        if i % 25 == 0:
            print(f"  … {i}/{len(tools)}")
    print(f"✓ {len(tools)} images par outil")
    return 0


if __name__ == "__main__":
    sys.exit(main())
