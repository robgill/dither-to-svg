# Dither to SVG

Plugin identity:

- displayName: Dither to SVG
- description: Converts images into scalable SVG dither grids

Original user prompt:

Build me a plugin called "Dither to SVG" that converts images into scalable SVG dither grids. Upload an image or select a layer on the canvas. A live preview shows the dithered output, updating in real time as you change settings. When happy, click "Apply dither" to export an SVG onto the canvas made of a background rect and a single foreground path (not individual rects). Controls: Output size (10-500px, default 110), Pixel size (1-10px, default 1), Dither type (Ordered/Random/Halftone), Palette (White on black, Black on white, Colour with two pickers), Threshold (0-1, default 0.35). Preview at top of panel in 248x248px area with pixelated rendering. Two source buttons: Upload image and Select layer. SVG output uses single background rect and single path for all foreground pixels with shape-rendering crispEdges. Each foreground cell is a subpath: M{x},{y}h{pixelSize}v{pixelSize}H{x}Z.

Usage:

- Output size slider (10-500, default 110): total SVG dimensions
- Pixel size slider (1-10, default 1): size of each dither cell
- Dither type segmented control: Ordered (Bayer), Random (Noise), Halftone
- Palette dropdown: White on black, Black on white, Colour (with Light/Dark colour pickers when Colour selected)
- Threshold slider (0-1, step 0.01, default 0.35)
- Brightness slider (-100 to 100, default 0)
- Contrast slider (-100 to 100, default 0)
- Live preview canvas 300x300 at top of panel
- Upload image button + Select layer button for image source
- Export single rectangles toggle: when on, outputs individual  elements instead of a single 
- Apply dither footer button creates SVG on canvas
- **Resize pixel art**: Auto-detected when a pixel art frame (frame with 1px rectangle children) is selected. User specifies target width, height auto-calculated from aspect ratio. Minimum 16px on both dimensions. Area-weighted downsampling with configurable threshold. Preserves source colors. Output placed next to original.

