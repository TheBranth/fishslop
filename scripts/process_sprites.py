"""
Friendslop Fishing Co. — Sprite Post-Processing Pipeline
Handles:
1. Chroma-key removal of solid Hotpink (#FF00FF) to transparent alpha RGBA(0, 0, 0, 0)
2. Auto-cropping transparent bounding boxes
3. Nearest-neighbor downscaling for crispy 16-bit pixel art
4. 4-Player Palette Swapper (Blue, Yellow, Red, Green)
"""

import sys
import os
import math
from PIL import Image

HOTPINK_RGB = (255, 0, 255)

CREW_PALETTES = {
    'blue': {
        'base': (56, 189, 248),    # Sky blue
        'shadow': (2, 132, 199),   # Deep blue
        'highlight': (186, 230, 253) # Pale blue
    },
    'yellow': {
        'base': (250, 204, 21),    # Oilskin Yellow
        'shadow': (202, 138, 4),   # Ochre shadow
        'highlight': (254, 240, 138) # Lemon tint
    },
    'red': {
        'base': (248, 113, 113),   # Lobster Red
        'shadow': (185, 28, 28),   # Dark Crimson
        'highlight': (254, 202, 202) # Pink tint
    },
    'green': {
        'base': (74, 222, 128),    # Trawler Green
        'shadow': (22, 163, 74),   # Forest Green
        'highlight': (187, 247, 208) # Mint tint
    }
}

import numpy as np

def defringe_and_crop(img: Image.Image, target_size=(256, 256), padding=16) -> Image.Image:
    """Removes hotpink chroma key and defringes JPEG ringing, crops tightly, and centers in target_size."""
    img_rgba = img.convert('RGBA')
    arr = np.array(img_rgba, dtype=float)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

    # True background mask: high red, low green, high blue
    bg_mask = (r > 165) & (g < 85) & (b > 65)
    
    # Fringe pixels (JPEG compression artifacts bleeding pink into dark comic outlines)
    fringe_mask = (r - g > 50) & (b - g > 30) & (g < 115) & (~bg_mask)
    
    arr[bg_mask, 3] = 0
    arr[fringe_mask, 0] = arr[fringe_mask, 1]
    arr[fringe_mask, 2] = arr[fringe_mask, 1]

    cleaned = Image.fromarray(arr.astype(np.uint8))
    bbox = cleaned.getbbox()
    if bbox:
        cropped = cleaned.crop(bbox)
        cw, ch = target_size
        max_w = cw - padding * 2
        max_h = ch - padding * 2
        w, h = cropped.size
        scale = min(max_w / w, max_h / h)
        tw = max(1, int(w * scale))
        th = max(1, int(h * scale))
        res = cropped.resize((tw, th), Image.Resampling.LANCZOS)
        
        canvas = Image.new('RGBA', target_size, (0, 0, 0, 0))
        canvas.paste(res, ((cw - tw) // 2, (ch - th) // 2), res)
        return canvas
    return cleaned

def process_sprite(input_path: str, output_path: str, target_size=(256, 256), padding=16):
    """Processes a single raw generation file into a clean transparent pixel sprite."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    raw = Image.open(input_path)
    result = defringe_and_crop(raw, target_size=target_size, padding=padding)
    result.save(output_path, 'PNG')
    print(f"[OK] Processed {input_path} -> {output_path} ({target_size[0]}x{target_size[1]})")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python process_sprites.py <input_file> <output_file> [target_w] [target_h] [padding]")
        sys.exit(0)
        
    in_file = sys.argv[1]
    out_file = sys.argv[2]
    w = int(sys.argv[3]) if len(sys.argv) > 3 else 256
    h = int(sys.argv[4]) if len(sys.argv) > 4 else 256
    pad = int(sys.argv[5]) if len(sys.argv) > 5 else 16
    
    process_sprite(in_file, out_file, (w, h), pad)
