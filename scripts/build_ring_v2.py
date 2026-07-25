#!/usr/bin/env python3
"""
Post-process the v2 ring turntable render into the web asset set.

Reads the 180 source PNG frames (1200x1200 RGBA, 2 deg/frame, seamless loop)
and produces, under --out:

  frames/ring_0000.webp .. ring_0179.webp   full-res 1200px WebP sequence
                                            (login intro — big on screen)
  spritesheet.webp                          320px tiles, grid cols x rows
                                            (sidebar idle spin — tiny on screen)
  spritesheet.json                          {frameW,frameH,cols,rows,count,...}

It only READS the source PNGs and WRITES to --out. It never touches the live
public/ assets. Run it only if the Blender pipeline hasn't already emitted the
WebP/spritesheet outputs.

Usage:
  python scripts/build_ring_v2.py \
      --src "/c/Users/Abdurahmon/Desktop/Almaz/render/spin_v2" \
      --out public/ring/v2
  # validate only, no writes:
  python scripts/build_ring_v2.py --src <dir> --out <dir> --dry-run
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from PIL import Image

# --- v2 spec (matches KURS render brief) ------------------------------------
COUNT = 180            # 360deg / 2deg per frame
SRC_SIZE = 1200        # source frame is 1200x1200 RGBA
FRAME_WEBP_SIZE = 1200 # full-res sequence keeps native size
TILE = 320             # spritesheet tile size
COLS = 15              # 15 * 320 = 4800
ROWS = 12              # 12 * 320 = 3840 ; 15*12 = 180
SRC_PATTERN = "ring_{:04d}.png"


def human(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return f"{n:.1f}{unit}" if unit != "B" else f"{n}B"
        n /= 1024
    return f"{n:.1f}GB"


def validate_sources(src: Path) -> list[Path]:
    """Require exactly COUNT frames, each SRC_SIZE square RGBA. Abort otherwise."""
    frames: list[Path] = []
    missing: list[int] = []
    for i in range(COUNT):
        p = src / SRC_PATTERN.format(i)
        if p.exists():
            frames.append(p)
        else:
            missing.append(i)
    present = COUNT - len(missing)
    if missing:
        head = ", ".join(SRC_PATTERN.format(i) for i in missing[:6])
        more = "" if len(missing) <= 6 else f" (+{len(missing) - 6} more)"
        raise SystemExit(
            f"ABORT: {present}/{COUNT} frames present. Missing: {head}{more}\n"
            f"The render is not finished -- never build a partial turntable."
        )
    # spot-check dimensions/mode on all frames (cheap: header only via Image.open)
    bad: list[str] = []
    for p in frames:
        with Image.open(p) as im:
            if im.size != (SRC_SIZE, SRC_SIZE):
                bad.append(f"{p.name}: size {im.size}")
            if im.mode not in ("RGBA", "LA", "P"):
                bad.append(f"{p.name}: mode {im.mode}")
    if bad:
        raise SystemExit("ABORT: unexpected source frames:\n  " + "\n  ".join(bad[:12]))
    return frames


def build(src: Path, out: Path, quality: int, method: int, dry_run: bool) -> None:
    t0 = time.time()
    frames = validate_sources(src)
    print(f"OK: {COUNT}/{COUNT} source frames, {SRC_SIZE}x{SRC_SIZE} RGBA.")
    if dry_run:
        print("dry-run: validation only, no output written.")
        return

    frames_dir = out / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    # 1) full-res WebP sequence -----------------------------------------------
    seq_bytes = 0
    for i, p in enumerate(frames):
        with Image.open(p) as im:
            im = im.convert("RGBA")
            dst = frames_dir / f"ring_{i:04d}.webp"
            # exact=True keeps RGB in fully-transparent pixels -> no alpha halo
            im.save(dst, "WEBP", quality=quality, method=method, exact=True)
            seq_bytes += dst.stat().st_size
    print(f"frames/  : 180 WebP @ {FRAME_WEBP_SIZE}px, q{quality} -> {human(seq_bytes)} "
          f"({human(seq_bytes // COUNT)}/frame avg)")

    # 2) 320px spritesheet -----------------------------------------------------
    sheet = Image.new("RGBA", (COLS * TILE, ROWS * TILE), (0, 0, 0, 0))
    for i, p in enumerate(frames):
        with Image.open(p) as im:
            tile = im.convert("RGBA").resize((TILE, TILE), Image.LANCZOS)
            col, row = i % COLS, i // COLS
            sheet.paste(tile, (col * TILE, row * TILE))
    sheet_path = out / "spritesheet.webp"
    sheet.save(sheet_path, "WEBP", quality=quality, method=method, exact=True)
    sheet_bytes = sheet_path.stat().st_size
    print(f"sheet    : {COLS*TILE}x{ROWS*TILE} ({COLS}x{ROWS} tiles @ {TILE}px), "
          f"q{quality} -> {human(sheet_bytes)}")

    # 3) JSON descriptor -------------------------------------------------------
    descriptor = {
        "frameW": TILE,
        "frameH": TILE,
        "cols": COLS,
        "rows": ROWS,
        "count": COUNT,
        "degPerFrame": 2,
        "sheet": "spritesheet.webp",
        "frames": "frames/ring_{:04d}.webp",
    }
    json_path = out / "spritesheet.json"
    json_path.write_text(json.dumps(descriptor, indent=2), encoding="utf-8")
    print(f"json     : {json_path.name} -> {json.dumps(descriptor)}")

    print(
        f"\nDONE in {time.time() - t0:.1f}s\n"
        f"  WebP sequence total : {human(seq_bytes)}\n"
        f"  Spritesheet         : {human(sheet_bytes)}\n"
        f"  Output              : {out}"
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--src", required=True, help="dir with ring_0000.png .. ring_0179.png")
    ap.add_argument("--out", default="public/ring/v2", help="output dir (default public/ring/v2)")
    ap.add_argument("--quality", type=int, default=90, help="WebP quality 0-100 (default 90)")
    # method 4 ~= method 6 size within ~1-2% but ~4x faster (method 6 is ~11s/
    # frame on these 1200px RGBA -> ~33min for 180; method 4 keeps it ~8min).
    ap.add_argument("--method", type=int, default=4, help="WebP method 0-6, higher=smaller/slower (default 4)")
    ap.add_argument("--dry-run", action="store_true", help="validate sources only, write nothing")
    args = ap.parse_args()
    build(Path(args.src), Path(args.out), args.quality, args.method, args.dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main())
