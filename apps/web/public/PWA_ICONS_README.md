# PWA Icons Required

The FROK Progressive Web App (PWA) requires the following icon files to be created and placed in this directory:

## Required Icon Sizes

- `icon-72.png` - 72x72px
- `icon-96.png` - 96x96px
- `icon-128.png` - 128x128px
- `icon-144.png` - 144x144px
- `icon-152.png` - 152x152px (Apple Touch Icon)
- `icon-192.png` - 192x192px (Android Chrome minimum)
- `icon-384.png` - 384x384px
- `icon-512.png` - 512x512px (Android Chrome recommended)

## Design Guidelines

- **Format**: PNG with transparency
- **Purpose**: `any maskable` (works with and without safe zone)
- **Background**: Should work on both light and dark backgrounds
- **Content**: FROK logo/branding
- **Safe Zone**: Keep important content within 80% center circle for maskable icons

## Generation Options

### Option 1: Online Tools
- [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator)
- [PWA Image Generator](https://www.pwabuilder.com/imageGenerator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

### Option 2: Manual with ImageMagick
```bash
# From a single 512x512 source image
convert icon-source.png -resize 72x72 icon-72.png
convert icon-source.png -resize 96x96 icon-96.png
convert icon-source.png -resize 128x128 icon-128.png
convert icon-source.png -resize 144x144 icon-144.png
convert icon-source.png -resize 152x152 icon-152.png
convert icon-source.png -resize 192x192 icon-192.png
convert icon-source.png -resize 384x384 icon-384.png
convert icon-source.png -resize 512x512 icon-512.png
```

### Option 3: Temporary Placeholders
Until proper branding is created, you can use simple colored placeholders:
```bash
# Create blue placeholder icons (requires ImageMagick)
for size in 72 96 128 144 152 192 384 512; do
  convert -size ${size}x${size} xc:"#3b82f6" \
    -gravity center -pointsize $((size/3)) -fill white \
    -annotate +0+0 "FROK" icon-${size}.png
done
```

## Current Status

⚠️ **ICONS NOT YET CREATED** - The manifest.json references these icons but they don't exist yet.

The PWA will still function without these icons, but:
- Won't be installable on Android/iOS
- Won't show proper branding in app drawer
- Browser console will show 404 errors for missing icons

## Testing PWA Installation

After adding icons:

1. **Build for production**: `pnpm run build`
2. **Start production server**: `pnpm run start`
3. **Test in Chrome**:
   - Open DevTools → Application → Manifest
   - Check for errors
   - Look for "Install" button in address bar
4. **Test on mobile**:
   - Open in mobile browser
   - Look for "Add to Home Screen" option

## Related Files

- `/manifest.json` - PWA manifest configuration
- `/sw.js` - Service worker for offline support
- `src/components/ServiceWorkerProvider.tsx` - React integration
- `src/lib/serviceWorker.ts` - Registration utilities
