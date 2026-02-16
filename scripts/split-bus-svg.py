import os

svg_source = '/Users/s/Desktop/6bc227ab-aed1-4b37-969c-af08408e39b8 (1).svg'
script_dir = os.path.dirname(os.path.abspath(__file__))
out_dir = os.path.join(script_dir, '..', 'public', 'icons', 'bus')
os.makedirs(out_dir, exist_ok=True)

with open(svg_source, 'r', encoding='utf-8') as f:
    original_svg = f.read()

# Extract content between the opening <svg ...> tag and closing </svg>
import re
# Get defs + content (everything inside the svg tag)
match = re.search(r'<svg[^>]*>(.*)</svg>', original_svg, re.DOTALL)
if not match:
    print("ERROR: Could not parse SVG content")
    exit(1)

svg_inner = match.group(1)

# Original viewBox: 0 0 1450.18 658.5
vb_w = 1450.18
vb_h = 658.5
cell_w = vb_w / 4
cell_h = vb_h / 2

# Direction mapping: (col, row, degree)
# Row 0 (top L-R): front(0), front-left(315), front-right(45), right(90)
# Row 1 (bottom L-R): left(270), back-left(225), back-right(135), back(180)
directions = [
    (0, 0, 0),
    (1, 0, 315),
    (2, 0, 45),
    (3, 0, 90),
    (0, 1, 270),
    (1, 1, 225),
    (2, 1, 135),
    (3, 1, 180),
]

for col, row, deg in directions:
    x = col * cell_w
    y = row * cell_h
    
    # Create individual SVG with viewBox showing only this cell
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x:.2f} {y:.2f} {cell_w:.2f} {cell_h:.2f}" width="80" height="73">
{svg_inner}
</svg>'''
    
    filename = f'bus-{deg}.svg'
    filepath = os.path.join(out_dir, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    
    file_size = os.path.getsize(filepath)
    print(f"  Saved: {filename} ({file_size:,} bytes)")

print("\nDone! 8 SVG icons created.")
