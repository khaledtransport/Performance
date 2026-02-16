from PIL import Image
import os

img = Image.open('/Users/s/Desktop/6bc227ab-aed1-4b37-969c-af08408e39b8 (1).png')
w, h = img.size
cell_w = w // 4
cell_h = h // 2

print(f"Image: {w}x{h}, cell: {cell_w}x{cell_h}")

# Row 0 (top, left to right): front(0), front-left(315), front-right(45), right(90)
# Row 1 (bottom, left to right): left(270), back-left(225), back-right(135), back(180)
angles = [
    (0, 0, 0),
    (1, 0, 315),
    (2, 0, 45),
    (3, 0, 90),
    (0, 1, 270),
    (1, 1, 225),
    (2, 1, 135),
    (3, 1, 180),
]

script_dir = os.path.dirname(os.path.abspath(__file__))
out_dir = os.path.join(script_dir, '..', 'public', 'icons', 'bus')
os.makedirs(out_dir, exist_ok=True)

for col, row, deg in angles:
    x1 = col * cell_w
    y1 = row * cell_h
    x2 = x1 + cell_w
    y2 = y1 + cell_h

    cell = img.crop((x1, y1, x2, y2))

    # Trim whitespace
    bbox = cell.getbbox()
    if bbox:
        cell = cell.crop(bbox)

    # Resize to 80px width for map icons
    target_w = 80
    ratio = target_w / cell.width
    target_h = int(cell.height * ratio)
    cell = cell.resize((target_w, target_h), Image.LANCZOS)

    filename = f'bus-{deg}.png'
    cell.save(os.path.join(out_dir, filename), 'PNG', optimize=True)
    print(f"  Saved: {filename} ({cell.width}x{cell.height})")

print("Done! All 8 icons saved.")
