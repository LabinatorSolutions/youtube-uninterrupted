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

### Visual Concept

The icon should represent:

- **YouTube** (incorporate red color `#FF0000`)
- **"Continue" or "Play"** concept
- **Simple shapes** that remain readable when scaled down to 16x16px (toolbar size)

### Suggested Design Ideas

#### Option 1: Play Button with Continue Arrow

- Red circle background (`#FF0000`)
- White play triangle (▶)
- Small green checkmark overlay

#### Option 2: YouTube Logo Variation

- Stylized play button
- Red and white color scheme
- Minimalist design

#### Option 3: Abstract Continuous Symbol

- Circular arrows (♻) or infinity symbol (∞)
- YouTube red color
- Clean, modern look

## Creating Your SVG

### Using Design Tools

**Figma / Adobe Illustrator / Inkscape:**

1. Create a square artboard (e.g., 128x128 or 512x512).
2. Design using vector shapes.
3. Combine paths where possible (minimize complex groups).
4. **Export as SVG**.
5. Ensure strict standard SVG code (avoid tool-specific metadata).

**Coding Manually:**
SVGs are just XML. You can write them by hand!

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <!-- Red Background Circle -->
  <circle cx="64" cy="64" r="60" fill="#FF0000" />
  
  <!-- White Play Triangle -->
  <path d="M50 40 L50 88 L88 64 Z" fill="#FFFFFF" />
</svg>
```

### Constraints & Best Practices

- **Aspect Ratio**: Must be 1:1 (Square).
- **Padding**: Leave a small margin (padding) around your main shape so it doesn't get cut off when rounded.
- **Complexity**: Keep it simple. Avoid complex filters/gradients if possible, as small sizes won't show them well.
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
