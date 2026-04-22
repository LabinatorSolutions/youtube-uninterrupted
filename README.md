# YouTube Uninterrupted

A Firefox extension that prevents YouTube from interrupting your viewing experience with the "Continue watching?" dialog. Perfect for music playlists, podcasts, long-form content, and ambient videos.

[![Firefox Add-on](https://img.shields.io/badge/Firefox_Add--on-Get_It_Now-blue.svg)](https://addons.mozilla.org/en-US/firefox/addon/youtube-uninterrupted/)
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)

## Purpose

YouTube automatically pauses videos after a period of inactivity and displays a "Video paused. Continue watching?" prompt. This extension removes that interruption, allowing uninterrupted playback for legitimate use cases such as:

- 🎵 Music playlists and albums
- 🎙️ Podcasts and long-form content
- 🌙 Ambient videos (rain sounds, lo-fi, etc.)
- 📚 Educational content and lectures
- 🎮 Livestreams and VODs

**Note:** This extension does NOT block advertisements or interfere with YouTube's monetization. It only prevents the passive viewing timeout prompt.

## Features

- ✅ **Automatic Dialog Removal** - Four-layer defense system ensures the dialog never appears
- ✅ **Preserves Legitimate Dialogs** - Unsubscribe confirmations, delete prompts, and other user-triggered dialogs are never suppressed
- ✅ **Mobile & Desktop Support** - Works on both www.youtube.com and m.youtube.com
- ✅ **Minimal Permissions** - Only requests access to YouTube, nothing else
- ✅ **Zero Data Collection** - All processing happens locally, no tracking whatsoever
- ✅ **Lightweight** - Minimal CPU/memory footprint, won't slow down your browser
- ✅ **Easy Toggle** - Simple on/off switch in the popup
- ✅ **Privacy First** - No external connections, no telemetry, fully transparent

## How It Works

The extension uses a multi-layered approach for maximum reliability:

### Layer 1: CSS Injection

Instantly hides the dialog using intentionally **narrow** CSS rules before JavaScript even loads. Only selectors that are exclusive to the idle dialog are used here — broad selectors that also match legitimate user-triggered dialogs (unsubscribe, delete, report) are deliberately excluded and handled by Layer 2 instead.

### Layer 2: DOM Monitoring

A MutationObserver watches for the dialog being inserted into the page and hides it immediately. **Text-pattern matching is the required gate** — the extension only acts if the dialog contains known idle/pause phrasing (e.g. "Continue watching", "Still watching"). Dialogs that appear within 3 seconds of a user click are left untouched, protecting unsubscribe confirmations and similar user-initiated flows.

### Layer 3: Activity Simulation

Periodically simulates minimal user activity (mouse movement event) every minute to reset YouTube's idle timer, preventing the dialog from triggering in the first place.

## Installation

### Firefox Desktop

1. **Download the Extension**
   - [**Download from Mozilla Add-ons (Recommended)**](https://addons.mozilla.org/en-US/firefox/addon/youtube-uninterrupted)
   - Or clone this repository:

   ```bash
   git clone https://github.com/LabinatorSolutions/youtube-uninterrupted.git
   cd youtube-uninterrupted
   ```

2. **Load as Temporary Add-on** (for testing)
   - Open Firefox
   - Navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file from the extension folder
   - The extension will remain active until you restart Firefox

3. **Permanent Installation** (recommended)
   - Create a Firefox Add-on Collection (see below)
   - Or submit to Mozilla Add-ons (AMO) for public distribution

### Firefox Android

#### Method 1: Custom Add-on Collection (Recommended)

1. **Create a Firefox Account** (if you don't have one)
   - Go to https://accounts.firefox.com/signup

2. **Create a Collection**
   - Visit https://addons.mozilla.org/firefox/collections/
   - Click "Create a collection"
   - Name it (e.g., "My Extensions")
   - Note your User ID and Collection name

3. **Add Extension to Collection**
   - You'll need to submit the extension to AMO first (even as unlisted)
   - Or use a pre-published version
   - Add it to your collection

4. **Configure Firefox Android**
   - Open Firefox on Android
   - Tap menu (⋮) → Settings → About Firefox
   - Tap the Firefox logo 5 times to enable debug menu
   - Go back to Settings → Custom Add-on collection
   - Enter your User ID and Collection name
   - Restart Firefox
   - Go to Add-ons and install from your collection

#### Method 2: Firefox Nightly (Development)

1. Install Firefox Nightly from Google Play Store
2. Follow the same collection process as above
3. Nightly allows more flexibility for testing

## 🎮 Usage

1. **Navigate to YouTube**
   - Open any YouTube video (desktop or mobile)

2. **Verify Extension is Active**
   - Click the extension icon in your toolbar
   - You should see "Active on YouTube pages"
   - The toggle should be ON (red)

3. **Play a Video**
   - Start any video
   - Let it play without interaction
   - The "Continue watching?" dialog will never appear

4. **Toggle On/Off**
   - Click the extension icon
   - Use the toggle switch to enable/disable
   - Status updates in real-time

## 🔧 Troubleshooting

### Extension Not Working

**Issue:** Dialog still appears

**Solutions:**

1. Verify the extension is enabled
   - Click the extension icon
   - Ensure toggle is ON

2. Check if extension is active on current page
   - Extension only works on `*.youtube.com` domains
   - Not in YouTube mobile app (apps don't support extensions)

3. Reload the YouTube page
   - Press F5 or Ctrl+R (desktop)
   - Pull down to refresh (mobile)

4. Check Firefox console for errors
   - Press F12 → Console tab
   - Look for errors starting with `[YouTube Uninterrupted]`

### Extension Icon Not Visible (Desktop)

**Issue:** Can't find the extension icon

**Solutions:**

1. Check if extension is installed
   - Go to `about:addons`
   - Look for "YouTube Uninterrupted"

2. Pin the extension to toolbar
   - Right-click toolbar → Customize Toolbar
   - Drag extension icon to toolbar

### Mobile: Extensions Not Available

**Issue:** Can't add extensions on Firefox Android

**Solutions:**

1. Ensure you're using **Firefox** (not Chrome or other browsers)
2. Firefox for Android requires custom collections (see installation)
3. Use Firefox Nightly for easier development/testing

### Dialog Appears on First Page Load

**Issue:** Dialog shows once when first opening YouTube

**Why:** The content script needs a moment to initialize

**Solution:** This is expected behavior. The dialog won't appear again during that session.

## Privacy Policy

This extension is committed to your privacy:

- ✅ **No Data Collection** - We don't collect, store, or transmit any data
- ✅ **No Tracking** - No analytics, no telemetry, no cookies
- ✅ **No External Connections** - Extension works entirely offline
- ✅ **Minimal Permissions** - Only requests YouTube access
- ✅ **Open Source** - All code is public and auditable
- ✅ **Local Processing** - Everything happens in your browser

### Permissions Explained

The extension requests:

| Permission            | Purpose                                   |
| --------------------- | ----------------------------------------- |
| `storage`             | Save your on/off preference               |
| `*://*.youtube.com/*` | Access YouTube pages to remove the dialog |

That's it. No access to browsing history, no access to other sites, no background data collection.

## 🛠️ Development

### Project Structure

```text
youtube-uninterrupted/
├── manifest.json                    # Extension configuration
├── content-scripts/
│   ├── youtube-uninterrupted.js          # Main logic (3 layers)
│   └── inject-styles.css            # CSS hiding layer
├── background/
│   └── service-worker.js            # State management
├── popup/
│   ├── popup.html                   # Popup UI
│   ├── popup.js                     # Popup logic
│   └── popup.css                    # Popup styles
├── icon.svg                         # Extension icon (scalable)
└── README.md                        # This file
```

### Building from Source

1. **Clone Repository**

   ```bash
   git clone https://github.com/LabinatorSolutions/youtube-uninterrupted.git
   cd youtube-uninterrupted
   ```

2. **No Build Step Required**
   - This is a vanilla JavaScript extension
   - No npm dependencies, no bundling needed
   - Just load directly into Firefox

3. **Testing**
   - Load as temporary add-on (see Installation)
   - Open YouTube
   - Check browser console for `[YouTube Continue]` logs
   - Enable debug mode by editing `CONFIG.DEBUG = true` in `youtube-uninterrupted.js`

### Code Quality

- ✅ **No External Dependencies** - Vanilla JavaScript only
- ✅ **Modern ES6+** - Clean, readable code
- ✅ **Comprehensive Comments** - Every function documented
- ✅ **Error Handling** - Try/catch blocks throughout
- ✅ **Performance Optimized** - Debouncing, minimal polling
- ✅ **Cross-Browser Compatible** - Works on Firefox Desktop & Android

## Technical Details

### Architecture

The extension implements four defensive layers:

**Layer 1: CSS Injection (`inject-styles.css`)**

- Injected at `document_start` for instant effect
- Uses `!important` flags to override YouTube's inline styles
- Targets multiple selectors for resilience

**Layer 2: DOM Monitoring (`youtube-uninterrupted.js`)**

- MutationObserver watches for dialog insertion
- Debounced callbacks (50ms) for performance
- Text-pattern matching is the mandatory primary gate
- User-interaction guard: skips dialogs triggered within 3 s of a click
- CSS-hides confirmed dialogs (no DOM removal, keeping false positives recoverable)

**Layer 3: Activity Simulation (`youtube-uninterrupted.js`)**

- Dispatches mouse movement events every minute
- Resets YouTube's idle timer
- Prevents dialog from triggering in the first place
- Non-intrusive, doesn't interfere with actual user actions

### Performance

- **CPU Usage:** Negligible (event-driven, no continuous polling)
- **Memory Usage:** < 1MB
- **Network Impact:** Zero (no external requests)
- **Battery Impact:** Minimal (optimized intervals)

### Compatibility

| Platform        | Minimum Version | Status          |
| --------------- | --------------- | --------------- |
| Firefox Desktop | 147.0           | Fully supported |
| Firefox Android | 147.0           | Fully supported |
| Firefox Nightly | Latest          | Fully supported |

## Contributing

Contributions are welcome! Here's how you can help:

1. **Report Bugs**
   - Open an issue with details
   - Include Firefox version and OS
   - Describe steps to reproduce

2. **Suggest Features**
   - Open an issue with your idea
   - Explain the use case

3. **Submit Pull Requests**
   - Fork the repository
   - Create a feature branch
   - Make your changes
   - Test thoroughly
   - Submit PR with clear description

### Development Guidelines

- Keep it simple - no unnecessary dependencies
- Maintain vanilla JavaScript approach
- Comment your code thoroughly
- Test on both desktop and mobile
- Preserve privacy-first principles

## License

GNU Affero General Public License v3.0

Copyright (c) 2026 YouTube Uninterrupted Contributors

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

## Credits

Developed by [Labinator](https://Labinator.com).

## Support

- **Issues:** https://github.com/LabinatorSolutions/youtube-uninterrupted/issues

## Ethical Use & Responsibility

This extension is designed strictly to enhance the experience for valid users who are actively listening to or watching content but cannot interact with their device (e.g., while cooking, exercising, working, or sleeping).

**Please use this tool responsibly.** It is **NOT** intended to:

- Artificially inflate view counts or engagement metrics
- Abuse YouTube's bandwidth or server resources
- Circumvent policies when no user is actually present or consuming content

We strongly encourage users to respect the platform and its creators. If you are no longer consuming content, please pause the video or close the tab manually.

## Disclaimer

This extension is not affiliated with, endorsed by, or officially connected to YouTube, Google, or Mozilla. It is an independent project created for educational purposes and personal use.

The extension respects YouTube's terms of service by:

- Not blocking advertisements
- Not circumventing YouTube Premium features
- Not downloading or modifying video content
- Simply removing a UI element that interrupts playback

Use responsibly and in accordance with YouTube's Terms of Service.
