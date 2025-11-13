# PWA Icon Generation Instructions

To generate the PWA icons for EuMatter, you need to create two icon files:

1. **icon-192x192.png** - 192x192 pixels
2. **icon-512x512.png** - 512x512 pixels

## Recommended Approach:

1. **Use the EuMatter logo** (`src/assets/Eumatter-logo.png`) as the base
2. **Resize it** to the required dimensions using an image editor (Photoshop, GIMP, or online tools like Canva)
3. **Ensure the icons:**
   - Have a transparent background (PNG format)
   - Are square (equal width and height)
   - Are centered within the canvas
   - Have good contrast and are recognizable at small sizes

## Quick Online Tools:

- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator
- https://www.favicon-generator.org/

## Manual Creation:

If you have ImageMagick installed:
```bash
# Convert logo to 192x192
convert src/assets/Eumatter-logo.png -resize 192x192 -background transparent -gravity center -extent 192x192 public/icon-192x192.png

# Convert logo to 512x512
convert src/assets/Eumatter-logo.png -resize 512x512 -background transparent -gravity center -extent 512x512 public/icon-512x512.png
```

## Temporary Placeholder:

For development, you can create simple colored squares with text:
- Create a 192x192px image with maroon background (#800000) and white text "EM"
- Create a 512x512px image with the same design

These icons will be automatically detected by the PWA system once placed in the `public` directory.

