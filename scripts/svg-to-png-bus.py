import cairosvg
import os

svg_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'icons', 'car_views_svg')
out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'icons', 'bus')
os.makedirs(out_dir, exist_ok=True)

# Map SVG filenames to GPS heading degrees
# top_left = front (0), top_mid_left = front-left (315), top_mid_right = front-right (45), top_right = right (90)
# bottom_left = left (270), bottom_mid_left = back-left (225), bottom_mid_right = back-right (135), bottom_right = back (180)
mapping = {
    'car_top_left.svg': 0,
    'car_top_mid_left.svg': 315,
    'car_top_mid_right.svg': 45,
    'car_top_right.svg': 90,
    'car_bottom_left.svg': 270,
    'car_bottom_mid_left.svg': 225,
    'car_bottom_mid_right.svg': 135,
    'car_bottom_right.svg': 180,
}

TARGET_WIDTH = 120  # retina quality

for svg_name, deg in mapping.items():
    svg_path = os.path.join(svg_dir, svg_name)
    png_path = os.path.join(out_dir, f'bus-{deg}.png')

    cairosvg.svg2png(
        url=svg_path,
        write_to=png_path,
        output_width=TARGET_WIDTH,
        background_color=None,  # transparent
    )

    size = os.path.getsize(png_path)
    print(f'  {svg_name} -> bus-{deg}.png ({size:,} bytes)')

print('\nDone! 8 high-quality PNG icons from SVG sources.')
