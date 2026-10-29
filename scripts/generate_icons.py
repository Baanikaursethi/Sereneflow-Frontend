#!/usr/bin/env python3
"""
Generates Android adaptive icon assets for Serene Flow.

Android adaptive icons have two layers:
  - background: solid color (#2D1B4E deep purple)
  - foreground: the logo scaled to ~60% centered on transparent canvas

The foreground canvas must be 108dp x 108dp conceptually.
Expo uses 1024x1024 for the foreground source.
Android crops to the inner 72dp safe zone (66.7% of 108dp).
So the actual visible area is ~66.7% of the foreground image.
To keep the droplet filling ~80% of the final icon, we scale
the source logo to ~55% of the foreground canvas.
"""

import os
import sys
sys.path.insert(0, '/Users/baanikaur/Library/Python/3.9/lib/python/site-packages')

from PIL import Image

# Paths
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_ICON = os.path.join(ROOT, 'assets', 'icon.png')
ASSETS_DIR = os.path.join(ROOT, 'assets')

# Output paths
ADAPTIVE_FOREGROUND = os.path.join(ASSETS_DIR, 'adaptive-icon.png')

# Android adaptive icon safe zone:
# Total foreground canvas = 108 units
# Safe zone (visible area guaranteed) = 72 units = 66.67%
# We want the droplet to occupy ~80% of the safe zone
# So scale = 0.8 * 0.6667 = ~53% of the full canvas
# We use 58% to give it good presence without clipping

FOREGROUND_SIZE = 1024
SCALE_FACTOR = 0.60  # droplet will be 60% of foreground = ~90% of safe zone visible area

def create_adaptive_foreground():
    """Create foreground image: logo scaled and centered on transparent background."""
    src = Image.open(SOURCE_ICON).convert('RGBA')
    src_w, src_h = src.size

    # Create transparent canvas
    canvas = Image.new('RGBA', (FOREGROUND_SIZE, FOREGROUND_SIZE), (0, 0, 0, 0))

    # Scale the source image
    new_size = int(FOREGROUND_SIZE * SCALE_FACTOR)
    scaled = src.resize((new_size, new_size), Image.LANCZOS)

    # Center it
    offset_x = (FOREGROUND_SIZE - new_size) // 2
    offset_y = (FOREGROUND_SIZE - new_size) // 2

    canvas.paste(scaled, (offset_x, offset_y), scaled)
    canvas.save(ADAPTIVE_FOREGROUND, 'PNG')
    print(f'✅ Created adaptive foreground: {ADAPTIVE_FOREGROUND}')
    print(f'   Canvas: {FOREGROUND_SIZE}x{FOREGROUND_SIZE}, droplet: {new_size}x{new_size} (centered)')

if __name__ == '__main__':
    print('Generating Serene Flow adaptive icon assets...')
    create_adaptive_foreground()
    print('\nDone! Update app.json adaptiveIcon.foregroundImage to ./assets/adaptive-icon.png')
    print('Background color: #2D1B4E (set in app.json and colors.xml)')
