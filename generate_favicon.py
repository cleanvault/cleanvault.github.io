#!/usr/bin/env python3
import os
from PIL import Image
import cairosvg

SVG_PATH = 'assets/logo.svg'
ASSETS_DIR = 'assets'

SIZES = {
    'favicon-16x16.png': 16,
    'favicon-32x32.png': 32,
    'apple-touch-icon.png': 180,
    'favicon-48x48.png': 48,
}

def generate_png_from_svg(svg_path, output_path, size):
    print(f"Generating {output_path} ({size}x{size})...")
    png_data = cairosvg.svg2png(url=svg_path, output_width=size, output_height=size)
    with open(output_path, 'wb') as f:
        f.write(png_data)
    print(f"  ✓ Created {output_path}")

def generate_ico(png_files, output_path):
    print(f"Generating {output_path}...")
    images = []
    for png_file in png_files:
        if os.path.exists(png_file):
            img = Image.open(png_file)
            images.append(img)
    
    if images:
        images[0].save(output_path, format='ICO', 
                      sizes=[(img.width, img.height) for img in images],
                      append_images=images[1:] if len(images) > 1 else [])
        print(f"  ✓ Created {output_path}")

def main():
    print("=" * 60)
    print("CleanVault Favicon Generator")
    print("=" * 60)
    print()
    
    if not os.path.exists(SVG_PATH):
        print(f"Error: {SVG_PATH} not found!")
        return False
    
    os.makedirs(ASSETS_DIR, exist_ok=True)
    
    print("Step 1: Generating PNG favicon files...")
    print()
    generated_pngs = []
    for filename, size in SIZES.items():
        output_path = os.path.join(ASSETS_DIR, filename)
        generate_png_from_svg(SVG_PATH, output_path, size)
        generated_pngs.append(output_path)
    
    print()
    print("Step 2: Generating ICO favicon...")
    print()
    ico_path = os.path.join(ASSETS_DIR, 'favicon.ico')
    generate_ico(generated_pngs, ico_path)
    
    print()
    print("=" * 60)
    print("Favicon generation complete!")
    print("=" * 60)
    print()
    print("Generated files:")
    for filename in list(SIZES.keys()) + ['favicon.ico']:
        filepath = os.path.join(ASSETS_DIR, filename)
        if os.path.exists(filepath):
            size = os.path.getsize(filepath)
            print(f"  ✓ {filepath} ({size:,} bytes)")
    print()
    return True

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
