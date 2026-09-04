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

def remove_chromakey(image: Image.Image, key_color=(255, 0, 255), threshold=55) -> Image.Image:
    """Replaces pixels matching key_color within Euclidean distance threshold with RGBA(0,0,0,0)."""
    rgba_img = image.convert('RGBA')
    datas = rgba_img.getdata()
    
    kr, kg, kb = key_color
    new_data = []
    
    for item in datas:
        r, g, b, a = item
        dist = math.sqrt((r - kr)**2 + (g - kg)**2 + (b - kb)**2)
        if dist < threshold:
            new_data.append((0, 0, 0, 0))
        else:
            new_data.append(item)
            
    rgba_img.putdata(new_data)
    return rgba_img

def crop_transparent(image: Image.Image) -> Image.Image:
    """Tightly crops image to non-transparent bounding box."""
    bbox = image.getbbox()
    if bbox:
        return image.crop(bbox)
    return image

def scale_pixel_art(image: Image.Image, target_size=(48, 48)) -> Image.Image:
    """Scales image down to target size using NEAREST neighbor to preserve pixel art crispness."""
    img_w, img_h = image.size
    aspect = img_w / img_h
    target_w, target_h = target_size
    
    if aspect > 1.0:
        new_w = target_w
        new_h = max(1, int(target_w / aspect))
    else:
        new_h = target_h
        new_w = max(1, int(target_h * aspect))
        
    scaled = image.resize((new_w, new_h), resample=Image.Resampling.NEAREST)
    
    final_canvas = Image.new('RGBA', target_size, (0, 0, 0, 0))
    offset_x = (target_w - new_w) // 2
    offset_y = (target_h - new_h) // 2
    final_canvas.paste(scaled, (offset_x, offset_y), scaled)
    return final_canvas

def process_sprite(input_path: str, output_path: str, target_size=(48, 48), threshold=55):
    """Processes a single raw generation file into a clean transparent pixel sprite."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    raw = Image.open(input_path)
    keyed = remove_chromakey(raw, HOTPINK_RGB, threshold=threshold)
    cropped = crop_transparent(keyed)
    pixel = scale_pixel_art(cropped, target_size=target_size)
    pixel.save(output_path, 'PNG')
    print(f"[OK] Processed {input_path} -> {output_path} ({target_size[0]}x{target_size[1]})")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python process_sprites.py <input_file> <output_file> [target_w] [target_h] [threshold]")
        sys.exit(0)
        
    in_file = sys.argv[1]
    out_file = sys.argv[2]
    w = int(sys.argv[3]) if len(sys.argv) > 3 else 48
    h = int(sys.argv[4]) if len(sys.argv) > 4 else 48
    thresh = int(sys.argv[5]) if len(sys.argv) > 5 else 55
    
    process_sprite(in_file, out_file, (w, h), thresh)
