"""
Renders a crisp 16-bit chunky maritime 'Front and High' (Elevated Frontal / Zero-Yaw)
Center Ice Box (Cargo Hatch / Cooler) sprite directly into client/assets/sprites/stations/station_cooler.png.
"""

from PIL import Image, ImageDraw
import math

def create_front_high_cooler(output_path: str, size=(256, 256)):
    # 256 x 256 RGBA image
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Box coordinates (Slightly wider than tall, centered)
    # Total width: 236, height: 180 (centered horizontally, grounded vertically)
    bx0, by0 = 10, 30
    bx1, by1 = 246, 230
    w = bx1 - bx0
    h = by1 - by0

    # Vertical split: Top hatch surface is top 68%, front face is bottom 32%
    split_y = by0 + int(h * 0.68)  # ~166

    # 1. Soft drop shadow beneath the cooler
    draw.ellipse([bx0 + 8, by1 - 10, bx1 - 8, by1 + 18], fill=(0, 0, 0, 100))

    # 2. Main Outer Steel Structure (Base dark slate frame)
    # Top working surface: [bx0, by0, bx1, split_y]
    # Front vertical face: [bx0, split_y, bx1, by1]
    
    # Outer dark ink outline for entire unit
    draw.rounded_rectangle([bx0, by0, bx1, by1], radius=14, fill=(15, 23, 42, 255), outline=(2, 6, 23, 255), width=6)

    # Top Coaming Lip (Steel rim surrounding hatch)
    draw.rounded_rectangle([bx0 + 6, by0 + 6, bx1 - 6, split_y - 2], radius=10, fill=(71, 85, 105, 255), outline=(30, 41, 59, 255), width=4)

    # Coaming Hazard Warning Chevron Stripes on left, right, top
    stripe_w = 16
    for sx in range(bx0 + 10, bx1 - 10, stripe_w * 2):
        # Top hazard stripe segments
        pts = [(sx, by0 + 8), (sx + stripe_w, by0 + 8), (sx + stripe_w - 8, by0 + 20), (sx - 8, by0 + 20)]
        draw.polygon(pts, fill=(234, 179, 8, 240))

    # Inner sunken cargo hatch pit (Deep navy icy water)
    hx0, hy0 = bx0 + 26, by0 + 22
    hx1, hy1 = bx1 - 26, split_y - 12
    draw.rectangle([hx0, hy0, hx1, hy1], fill=(2, 6, 23, 255), outline=(15, 23, 42, 255), width=4)
    # Cold deep water gradient fill
    draw.rectangle([hx0 + 4, hy0 + 4, hx1 - 4, hy1 - 4], fill=(3, 105, 161, 255))

    # Packed Sparkling Crushed Ice Cubes inside
    import random
    random.seed(42)
    ice_colors = [
        (186, 230, 253, 255), # pale cyan
        (224, 242, 254, 255), # icy white
        (125, 211, 252, 255), # sky blue
        (240, 249, 255, 255)  # bright white glint
    ]

    # Grid of chunky crushed ice blocks
    for iy in range(hy0 + 6, hy1 - 8, 12):
        for ix in range(hx0 + 6, hx1 - 8, 14):
            cube_w = random.randint(10, 16)
            cube_h = random.randint(8, 12)
            color = random.choice(ice_colors)
            draw.rounded_rectangle([ix, iy, min(ix + cube_w, hx1 - 6), min(iy + cube_h, hy1 - 6)], 
                                  radius=3, fill=color, outline=(2, 132, 199, 200), width=1)
            # Sparkle glint on ice
            if random.random() > 0.5:
                draw.rectangle([ix + 2, iy + 2, ix + 4, iy + 4], fill=(255, 255, 255, 255))

    # Frosty cold mist haze across ice surface
    draw.rectangle([hx0 + 4, hy0 + 4, hx1 - 4, hy0 + 16], fill=(224, 242, 254, 60))

    # Split Double Doors Hinged Open Flaps (Left and Right)
    # Left open door flap folded out to the left rim
    draw.rounded_rectangle([bx0 + 6, by0 + 18, bx0 + 24, split_y - 8], radius=4, 
                          fill=(51, 65, 85, 255), outline=(15, 23, 42, 255), width=3)
    # Door rib lines
    draw.line([bx0 + 12, by0 + 24, bx0 + 12, split_y - 14], fill=(100, 116, 139, 255), width=2)
    draw.line([bx0 + 18, by0 + 24, bx0 + 18, split_y - 14], fill=(30, 41, 59, 255), width=2)
    # Heavy brass hinge
    draw.rectangle([bx0 + 22, by0 + 30, bx0 + 26, by0 + 42], fill=(245, 158, 11, 255))
    draw.rectangle([bx0 + 22, split_y - 32, bx0 + 26, split_y - 20], fill=(245, 158, 11, 255))

    # Right open door flap folded out to the right rim
    draw.rounded_rectangle([bx1 - 24, by0 + 18, bx1 - 6, split_y - 8], radius=4, 
                          fill=(51, 65, 85, 255), outline=(15, 23, 42, 255), width=3)
    draw.line([bx1 - 18, by0 + 24, bx1 - 18, split_y - 14], fill=(100, 116, 139, 255), width=2)
    draw.line([bx1 - 12, by0 + 24, bx1 - 12, split_y - 14], fill=(30, 41, 59, 255), width=2)
    # Heavy brass hinge
    draw.rectangle([bx1 - 26, by0 + 30, bx1 - 22, by0 + 42], fill=(245, 158, 11, 255))
    draw.rectangle([bx1 - 26, split_y - 32, bx1 - 22, split_y - 20], fill=(245, 158, 11, 255))

    # 3. Front Vertical Face (Bottom 32% facing straight toward player)
    fx0, fy0 = bx0 + 4, split_y
    fx1, fy1 = bx1 - 4, by1 - 4
    
    # Base metallic steel front
    draw.rounded_rectangle([fx0, fy0, fx1, fy1], radius=8, fill=(30, 41, 59, 255), outline=(15, 23, 42, 255), width=3)

    # Steel plate panels & horizontal seam lines
    draw.line([fx0 + 6, fy0 + 18, fx1 - 6, fy0 + 18], fill=(15, 23, 42, 255), width=3)
    draw.line([fx0 + 6, fy0 + 36, fx1 - 6, fy0 + 36], fill=(15, 23, 42, 255), width=3)

    # Yellow & Black Caution Hazard Bar along bottom front edge
    draw.rectangle([fx0 + 8, fy1 - 14, fx1 - 8, fy1 - 4], fill=(234, 179, 8, 255), outline=(15, 23, 42, 255), width=2)
    for hx in range(fx0 + 12, fx1 - 12, 18):
        hpts = [(hx, fy1 - 13), (hx + 8, fy1 - 13), (hx + 2, fy1 - 5), (hx - 6, fy1 - 5)]
        draw.polygon(hpts, fill=(0, 0, 0, 255))

    # Brass Rivet Studs across front plate
    for rx in range(fx0 + 14, fx1 - 10, 22):
        draw.ellipse([rx, fy0 + 8, rx + 5, fy0 + 13], fill=(245, 158, 11, 255), outline=(180, 83, 9, 255), width=1)
        draw.ellipse([rx, fy0 + 26, rx + 5, fy0 + 31], fill=(245, 158, 11, 255), outline=(180, 83, 9, 255), width=1)

    # Center Brass Inspection Nameplate
    pw = 90
    ph = 16
    px0 = bx0 + (w - pw) // 2
    py0 = fy0 + 10
    draw.rounded_rectangle([px0, py0, px0 + pw, py0 + ph], radius=3, fill=(15, 23, 42, 255), outline=(245, 158, 11, 255), width=2)
    # Screws on nameplate
    draw.ellipse([px0 + 3, py0 + 5, px0 + 7, py0 + 9], fill=(245, 158, 11, 255))
    draw.ellipse([px0 + pw - 7, py0 + 5, px0 + pw - 3, py0 + 9], fill=(245, 158, 11, 255))

    # Save PNG
    img.save(output_path, 'PNG')
    print(f"[OK] Generated Front-and-High Cooler -> {output_path}")

if __name__ == '__main__':
    create_front_high_cooler(r'c:\Projects\Friendslop_fishing\client\assets\sprites\stations\station_cooler.png')
