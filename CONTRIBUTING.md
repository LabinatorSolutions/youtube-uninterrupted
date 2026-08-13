# Development Guide

Guide for developers who want to modify, improve, or contribute to YouTube Uninterrupted.

## 🛠️ Development Setup

### Prerequisites

- Firefox Browser (153+)
- Text editor or IDE (VS Code recommended)
- Git (for version control)
- Basic knowledge of:
  - JavaScript (ES6+)
  - Browser Extensions (WebExtensions API)
  - DOM manipulation
  - CSS
- [Bun](https://bun.sh/) (for linting/building)

### Setting Up Development Environment

1. **Clone Repository**

   ```bash
   git clone https://github.com/LabinatorSolutions/youtube-uninterrupted.git
   cd youtube-uninterrupted
   ```

2. **Load Extension in Firefox**
   - Open Firefox
   - Navigate to: `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select `manifest.json`

3. **Enable Debug Mode**
   - Edit `content-scripts/youtube-uninterrupted.js`
   - Change `CONFIG.DEBUG = false` to `CONFIG.DEBUG = true`
   - Reload extension

4. **Open Console**
   - Press F12 on any YouTube page
   - Console tab will show debug logs: `[YouTube Uninterrupted] ...`

## 📁 Project Structure

```text
youtube-uninterrupted/
├── manifest.json                 # Extension metadata & config
│   ├── Defines permissions
│   ├── Content script injection
│   └── Background worker setup
│
├── content-scripts/
│   ├── youtube-uninterrupted.js       # Main logic (3 layers)
│   │   ├── Layer 1: CSS injection (via manifest)
│   │   ├── Layer 2: DOM monitoring (MutationObserver)
│   │   └── Layer 3: Activity simulation
│   │
│   └── inject-styles.css         # Instant CSS hiding
│
├── background/
│   └── service-worker.js         # State management & messaging
│       ├── Extension on/off state
│       ├── Storage management
│       └── Tab-popup communication
│
├── popup/
│   ├── popup.html                # Popup UI structure
│   ├── popup.css                 # Popup styling
│   └── popup.js                  # Popup logic
│       ├── Load state from background
│       ├── Toggle on/off
│       └── Update UI
│
└── icon.svg                      # Extension icon (scalable)
```

## 🔧 Key Components

### 1. Content Script (`youtube-uninterrupted.js`)

**Purpose:** Runs on every YouTube page to detect and remove dialog

**Key Functions:**

- `init()` - Initializes all layers
- `scanAndRemoveDialogs()` - Scans DOM for dialog elements
- `isPauseDialog(element)` - Verifies element is the target dialog
- `removePauseDialog(element)` - Removes/hides dialog
- `setupDOMObserver()` - Watches for new dialog insertions
- `simulateActivity()` - Dispatches mouse events to reset timer

**Configuration Object:**

```javascript
const CONFIG = {
  enabled: true,                          // Extension on/off
  DIALOG_SELECTORS: [...],                // Dialog CSS selectors
  CONTINUE_BUTTON_SELECTORS: [...],       // Button selectors
  MUTATION_DEBOUNCE_MS: 100,              // Performance tuning
  ACTIVITY_INTERVAL_MS: 60 * 1000,        // 1 minute
  DEBUG: false                            // Console logging
};
```

### 2. Background Service Worker (`service-worker.js`)

**Purpose:** Manages extension state and cross-component communication

**Key Functions:**

- Message handling (`getState`, `setState`)
- Storage management
- Tab communication

**Message Format:**

```javascript
// From popup to background
{ action: 'setState', enabled: true }

// From background to content scripts
{ action: 'toggleState', enabled: true }

// From background to popup
{ enabled: true }
```

### 3. Popup UI (`popup.html/js/css`)

**Purpose:** User interface for toggling extension on/off

**Key Elements:**

- Toggle switch (ON/OFF)
- Status indicator (Active/Disabled)
- Info text
- Footer links

## 🔍 How It Works

### Three-Layer Defense System

**Layer 1: CSS Injection** (Instant)

```css
/* inject-styles.css */
ytd-popup-container,
tp-yt-paper-dialog {
  display: none !important;
  visibility: hidden !important;
}
```

- Injected at `document_start` (before page renders)
- Hides dialog immediately using CSS
- Uses `!important` to override inline styles

**Layer 2: DOM Monitoring** (Reactive)

```javascript
const observer = new MutationObserver((mutations) => {
  // Check for added nodes
  // If dialog detected → remove it
});
```

- Watches for DOM changes
- Detects dialog insertion
- Removes dialog elements
- Debounced for performance

**Layer 3: Activity Simulation** (Proactive)

```javascript
setInterval(() => {
  const event = new MouseEvent('mousemove', {...});
  document.dispatchEvent(event);
}, 60 * 1000); // Every minute
```

- Prevents dialog from triggering
- Simulates user activity
- Resets YouTube's idle timer
- Non-intrusive (doesn't affect actual playback)

### Communication Flow

```text
User clicks popup toggle
        ↓
popup.js sends message to background
        ↓
service-worker.js updates storage
        ↓
service-worker.js notifies all YouTube tabs
        ↓
youtube-uninterrupted.js receives toggle state
        ↓
CONFIG.enabled updated
        ↓
Layers activate/deactivate
```

## 🧪 Testing Your Changes

### 1. Manual Testing

```bash
# After making changes:
1. Edit files
2. Go to about:debugging
3. Click "Reload" next to extension
4. Open YouTube
5. Test functionality
6. Check console for errors
```

### 2. Debug Mode Testing

```javascript
// Enable in youtube-uninterrupted.js
CONFIG.DEBUG = true;

// Then check console for:
// - Initialization messages
// - Dialog detection logs
// - Activity simulation logs
```

### 3. Automated Scripts (Recommended)

This project uses `bun` scripts to simplify development tasks.

1. **Install Dependencies**

   ```bash
   bun install
   ```

2. **Lint Code**
   Check for common errors and manifest issues:

   ```bash
   bun run lint
   ```

3. **Typecheck Code**
   Check for type errors in JavaScript files:

   ```bash
   bun run typecheck
   ```

4. **Build Package**
   Create a production-ready ZIP file in the `web-ext-artifacts/` directory:

   ```bash
   bun run build
   ```

### 4. Testing Checklist

See [TESTING-CHECKLIST.md](./TESTING-CHECKLIST.md) for comprehensive testing guide.

## 🎨 Modifying the Extension

### Adding New Dialog Selectors

If YouTube changes their dialog structure:

1. **Inspect Dialog Element**
   - Right-click dialog → Inspect
   - Note class names, IDs, attributes

2. **Update Selectors**

   ```javascript
   // In youtube-uninterrupted.js
   DIALOG_SELECTORS: [
     'ytd-popup-container',
     'new-selector-here',  // ← Add new selector
     ...
   ],
   ```

3. **Update CSS**

   ```css
   /* In inject-styles.css */
   ytd-popup-container,
   new-selector-here {  /* ← Add same selector */
     display: none !important;
   }
   ```

### Changing Activity Interval

To adjust how often activity is simulated:

```javascript
// In youtube-uninterrupted.js
ACTIVITY_INTERVAL_MS: 3 * 60 * 1000,  // 3 minutes (current default is 1 minute)
```

⚠️ **Note:** Too frequent = higher battery/CPU usage. Too rare = dialog might trigger.

### Adding Features

#### Example: Add Statistics Tracking

1. **Update Storage**

   ```javascript
   // In service-worker.js
   let stats = { dialogsBlocked: 0 };
   ```

2. **Track in Content Script**

   ```javascript
   // In youtube-uninterrupted.js
   function removePauseDialog(element) {
     // ... existing code ...
     browser.runtime.sendMessage({ 
       action: 'dialogBlocked' 
     });
   }
   ```

3. **Update Background**

   ```javascript
   // In service-worker.js
   if (message.action === 'dialogBlocked') {
     stats.dialogsBlocked++;
     browser.storage.local.set({ stats });
   }
   ```

4. **Display in Popup**

   ```javascript
   // In popup.js
   const stats = await browser.storage.local.get(['stats']);
   document.getElementById('stats').textContent = 
     `Blocked: ${stats.dialogsBlocked}`;
   ```

## 📦 Building for Distribution

### 1. Prepare for Release

**Update Version:**

```json
// manifest.json
"version": "1.5.0"  // Increment version
```

**Disable Debug Mode:**

```javascript
// youtube-uninterrupted.js
CONFIG.DEBUG = false
```

**Test Thoroughly:**

- Run full testing checklist
- Test on multiple Firefox versions
- Test on desktop and mobile

### 2. Create Release Package

```bash
# Create ZIP file (excluding dev files)
zip -r youtube-uninterrupted-v1.5.0.zip . \
  -x "*.git*" \
  -x "*node_modules*" \
  -x "*.md" \
  -x "TESTING-CHECKLIST.md"
```

### 3. Submit to Mozilla Add-ons (AMO)

1. Go to: <https://addons.mozilla.org/developers/>
2. Upload ZIP file
3. Fill in metadata:
   - Name: YouTube Uninterrupted
   - Summary: Prevents "Continue watching?" dialog
   - Description: See README.md
   - Categories: Social & Communication, Video
4. Choose visibility:
   - **Listed:** Public (everyone can find it)
   - **Unlisted:** Only you and people with link
5. Submit for review
6. Wait 1-3 days for approval

## 🐛 Debugging Common Issues

### Extension Not Loading

**Symptom:** Error when loading temporary add-on

**Solutions:**

- Check manifest.json is valid JSON
- Verify all paths in manifest exist
- Check browser console for errors

### Dialog Still Appearing

**Symptom:** Dialog shows even with extension enabled

**Debug Steps:**

1. Open console (F12)
2. Enable debug mode (`CONFIG.DEBUG = true`)
3. Look for: `[YouTube Uninterrupted] ...` messages
4. Check if dialog is being detected
5. Verify selectors match current YouTube DOM

**Common Causes:**

- YouTube changed their DOM structure
- Selectors need updating
- Extension disabled on current tab

### Memory Leaks

**Symptom:** Browser slows down over time

**Debug Steps:**

1. Open `about:memory`
2. Check extension memory usage
3. If > 50MB, there's a leak

**Solutions:**

- Ensure MutationObserver is disconnected on `beforeunload`
- Clear intervals on page unload
- Check for retained DOM references

## 🔐 Security Best Practices

### When Contributing

**DO:**

- ✅ Minimize permissions requested
- ✅ Sanitize user input
- ✅ Use `textContent` instead of `innerHTML`
- ✅ Validate all data from storage
- ✅ Use strict Content Security Policy

**DON'T:**

- ❌ Request unnecessary permissions
- ❌ Make external network requests
- ❌ Store sensitive user data
- ❌ Use `eval()` or `innerHTML` with user data
- ❌ Access non-YouTube domains

### Code Review Checklist

Before submitting PR:

- [ ] No new permissions added (unless absolutely necessary)
- [ ] No external network requests
- [ ] No user data collection
- [ ] All user input sanitized
- [ ] No security vulnerabilities introduced

## 📝 Coding Standards

### JavaScript Style

```javascript
// Use const by default, let when reassignment needed
const CONFIG = {...};
let counter = 0;

// Use arrow functions for callbacks
elements.forEach(el => removeDialog(el));

// Use template literals
console.log(`Status: ${enabled ? 'on' : 'off'}`);

// Use async/await instead of promises
async function loadState() {
  const result = await browser.storage.local.get(['enabled']);
  return result.enabled;
}
```

### Comments

```javascript
/**
 * Multi-line comment for functions
 * Describes what, why, and how
 */
function complexFunction() {
  // Single-line for inline notes
  const result = doSomething();
  return result;
}
```

### Error Handling

```javascript
// Always wrap DOM manipulation in try/catch
try {
  const element = document.querySelector('.selector');
  element.remove();
} catch (error) {
  log('Error removing element:', error);
}
```

## 🤝 Contributing

### How to Contribute

1. **Fork Repository**
2. **Create Feature Branch**

   ```bash
   git checkout -b feature/my-new-feature
   ```

3. **Make Changes**
4. **Test Thoroughly**
5. **Commit with Clear Messages**

   ```bash
   git commit -m "feat: Add statistics tracking"
   ```

6. **Push to Fork**
7. **Open Pull Request**

### Commit Message Format

```text
type(scope): Subject

Body (optional)

Footer (optional)
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**

```text
feat(popup): Add statistics display
fix(content): Update dialog selectors for new YouTube UI
docs(readme): Add troubleshooting section
```

## 📚 Resources

### WebExtensions API

- [MDN WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [browser.* API Reference](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API)
- [Manifest V3 Guide](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/)

### Tools

- [web-ext](https://github.com/mozilla/web-ext) - CLI tool for extension development
- [Firefox DevTools](https://firefox-source-docs.mozilla.org/devtools-user/)
- [Extension Workshop](https://extensionworkshop.com/) - Mozilla's official guide

### Community

- [Mozilla Add-ons Community](https://discourse.mozilla.org/c/add-ons/)
- [r/firefox](https://reddit.com/r/firefox)
- Project Issues: (link to your GitHub issues)

## 🎓 Learning Path

New to extension development? Start here:

1. **Basics**
   - Read MDN WebExtensions tutorial
   - Understand manifest.json structure
   - Learn content scripts vs background scripts

2. **This Project**
   - Read all code comments
   - Enable debug mode
   - Watch console logs while using extension

3. **Make Changes**
   - Start with small tweaks (CSS, intervals)
   - Then try adding features
   - Submit PRs for review

## 🙏 Credits

Contributors are recognized in GitHub contributors list.

Special thanks to:

- Mozilla Firefox team for WebExtensions API
- Open-source community for inspiration

---

Happy coding! 🚀
