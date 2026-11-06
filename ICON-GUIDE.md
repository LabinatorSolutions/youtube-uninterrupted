# Icon Creation Guide

## Modern SVG Icons

This extension uses a single **Scalable Vector Graphics (SVG)** file for its icon. Firefox automatically handles scaling
this image to all necessary sizes (16px, 32px, 48px, 64px, 128px), ensuring crisp rendering on all high-DPI displays.

### Required File

- **Filename:** `icon.svg`
- **Location:** Root directory (`youtube-uninterrupted/icon.svg`)

## Benefits of SVG

1. **Crispness**: Never pixelated, looks perfect on 4K/Retina displays.
2. **Simplicity**: Only one file to manage instead of 3-5 PNGs.
3. **Efficiency**: Tiny file size (often < 1KB).
4. **Dark Mode**: Can use CSS variables (context-fill) for adaptive colors (advanced).

## Design Recommendations

### Labinator icon system

This add-on is published by Labinator, and every Labinator add-on shares one icon system taken from the Labinator
design system (`labinator-website/DESIGN.md`):

- **Plate:** a full-bleed square in Labinator ultramarine `#2400ff`. Square corners, no radius, matching the
  labinator.com favicon.
- **Glyph:** flat white `#ffffff` geometry, plus ultramarine cut-outs where a shape needs an inner detail.
- **Banned:** gradients, shadows, filters, rounded corners, and any color outside ultramarine and white. That
  includes YouTube red.
- **Legibility:** the glyph must still read at 16x16 px in the toolbar. Use at most two or three solid shapes.

### This add-on's glyph

A white play triangle with an unbroken white bar running from its tip to the right edge: playback that carries on
without interruption. The three Labinator YouTube add-ons share the play triangle and differ in what sits beside
it:

| Add-on | Glyph |
|---|---|
| YouTube Uninterrupted | Play triangle + one unbroken bar |
| Quick YouTube Summary with Gemini | Play triangle + three text lines |
| Play YouTube Video in Background | Play triangle on a front window, with a second window behind it |

## Creating Your SVG

Write the SVG by hand on a 128x128 grid and keep it to plain paths:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <title>YouTube Uninterrupted</title>
  <rect width="128" height="128" fill="#2400ff"/>
  <path d="M16 34v60l44-30z" fill="#ffffff"/>
  <path d="M60 56h52v16H60z" fill="#ffffff"/>
</svg>
```

### Constraints & Best Practices

- **Aspect Ratio**: Must be 1:1 (Square).
- **Padding**: The plate fills the whole square. Keep the glyph about 16 units inside the edges.
- **Complexity**: Use flat fills only. Small sizes lose fine detail.
- **Testing**: Test at 16px size to ensure visibility.

## Installation

1. Save your file as `icon.svg`.
2. Place it in the extension root folder.
3. Ensure `manifest.json` points to it:

    ```json
    "icons": {
      "16": "icon.svg",
      "48": "icon.svg",
      "128": "icon.svg"
    }
    ```

## Testing

1. Load the extension in Firefox (`about:debugging`).
2. **Toolbar Grid:** Check if the 16px icon in the toolbar is legible.
3. **Add-ons Manager:** Check `about:addons` for the large version.
4. **Popup:** Open the extension popup to see the medium version.
