import os
import sys
import numpy as np
from PIL import Image
from collections import deque

def flood_fill_chromakey(img: Image.Image, tolerance=55) -> Image.Image:
    """
    Performs boundary-connected flood fill from the 4 corners to remove
    the hotpink (#FF00FF) background without affecting any interior pink/magenta details.
    """
    rgba = img.convert('RGBA')
    arr = np.array(rgba)
    h, w, _ = arr.shape
    
    # Target hotpink
    tr, tg, tb = 255, 0, 255
    
    # Distance to pure hotpink
    r = arr[:, :, 0].astype(float)
    g = arr[:, :, 1].astype(float)
    b = arr[:, :, 2].astype(float)
    dist = np.sqrt((r - tr)**2 + (g - tg)**2 + (b - tb)**2)
    
    # Candidate hotpink pixels
    is_pink = (dist < tolerance) | ((r > 180) & (b > 180) & (g < 70))
    
    # BFS flood fill from edges
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()
    
    # Add borders
    for x in range(w):
        if is_pink[0, x]:
            queue.append((0, x))
            visited[0, x] = True
        if is_pink[h - 1, x]:
            queue.append((h - 1, x))
            visited[h - 1, x] = True
            
    for y in range(h):
        if is_pink[y, 0]:
            queue.append((y, 0))
            visited[y, 0] = True
        if is_pink[y, w - 1]:
            queue.append((y, w - 1))
            visited[y, w - 1] = True
            
    # Run BFS
    while queue:
        cy, cx = queue.popleft()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                if is_pink[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((ny, nx))
                    
    # Set flood-filled background to completely transparent
    arr[visited, 3] = 0
    
    # Mild defringe on edge boundary pixels that touched the background
    cleaned = Image.fromarray(arr)
    bbox = cleaned.getbbox()
    if bbox:
        return cleaned.crop(bbox)
    return cleaned

def fit_to_canvas(cropped: Image.Image, target_size=(256, 256), padding=8) -> Image.Image:
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

def process_station(input_path: str, output_path: str, target_size=(256, 256), padding=8):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    raw = Image.open(input_path)
    cropped = flood_fill_chromakey(raw)
    final_img = fit_to_canvas(cropped, target_size=target_size, padding=padding)
    final_img.save(output_path, 'PNG')
    print(f"[OK] Processed {os.path.basename(input_path)} -> {output_path} ({final_img.size})")

if __name__ == '__main__':
    stations = {
        'station_cutting_board.png': r'C:\Users\calzi\.gemini\antigravity\brain\fa1c25b4-1cfd-42f0-8e4d-0e439a0f0e86\station_cutting_board_raw_1790016078216.jpg',
        'station_deep_fryer.png': r'C:\Users\calzi\.gemini\antigravity\brain\fa1c25b4-1cfd-42f0-8e4d-0e439a0f0e86\station_deep_fryer_raw_1790016093525.jpg',
        'station_soup_pot.png': r'C:\Users\calzi\.gemini\antigravity\brain\fa1c25b4-1cfd-42f0-8e4d-0e439a0f0e86\station_soup_pot_raw_1790016088216.jpg' if False else r'C:\Users\calzi\.gemini\antigravity\brain\fa1c25b4-1cfd-42f0-8e4d-0e439a0f0e86\station_soup_pot_raw_1790016103386.jpg',
        'station_rinse_station.png': r'C:\Users\calzi\.gemini\antigravity\brain\fa1c25b4-1cfd-42f0-8e4d-0e439a0f0e86\station_rinse_station_raw_1790016115444.jpg',
        'station_rod_rack.png': r'C:\Users\calzi\.gemini\antigravity\brain\fa1c25b4-1cfd-42f0-8e4d-0e439a0f0e86\station_rod_rack_raw_1790016127710.jpg',
        'station_sushi_station.png': r'C:\Users\calzi\.gemini\antigravity\brain\fa1c25b4-1cfd-42f0-8e4d-0e439a0f0e86\station_sushi_station_raw_1790016138442.jpg',
        'station_trash_chute.png': r'C:\Users\calzi\.gemini\antigravity\brain\fa1c25b4-1cfd-42f0-8e4d-0e439a0f0e86\station_trash_chute_raw_1790016152272.jpg',
        'station_cooler.png': r'C:\Users\calzi\.gemini\antigravity\brain\fa1c25b4-1cfd-42f0-8e4d-0e439a0f0e86\station_cooler_raw_1790016163043.jpg'
    }
    
    out_dir = r'c:\Projects\Friendslop_fishing\client\assets\sprites\stations'
    for name, in_path in stations.items():
        out_path = os.path.join(out_dir, name)
        process_station(in_path, out_path, target_size=(256, 256), padding=6)
