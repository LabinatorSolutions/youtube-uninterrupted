# YouTube Uninterrupted - Android Installation Guide

Complete step-by-step instructions for installing YouTube Uninterrupted on Firefox for Android.

## Prerequisites

- Android device (phone or tablet)
- Firefox browser for Android (NOT Chrome, Samsung Internet, etc.)
- Firefox account (free to create)

## Why Is This Complicated on Mobile?

Unlike desktop, Firefox for Android doesn't have an "about:debugging" page to load temporary add-ons. To install custom
extensions, you must:

1. Create a Firefox Add-on Collection
2. Configure Firefox Android to use your collection
3. Install extensions from your collection

This is a **one-time setup** - after configuration, you can easily add/remove extensions.

## Step-by-Step Installation

### Part 1: Create Firefox Account (Skip if you have one)

1. **On your computer or phone**, go to:

   ```text
   https://accounts.firefox.com/signup
   ```

2. **Enter your email** and create a password

3. **Verify your email** by clicking the link sent to your inbox

4. **Remember your credentials** - you'll need them later

### Part 2: Create Add-on Collection

1. **Sign in to Firefox Add-ons**
   - Go to: <https://addons.mozilla.org>
   - Click "Log in" (top right)
   - Sign in with your Firefox account

2. **Find your User ID**
   - Click your profile icon (top right)
   - Click "View My Profile"
   - Look at the URL - it will be:

     ```text
     https://addons.mozilla.org/en-US/firefox/user/NUMBERS/
     ```

   - **Copy those NUMBERS** - this is your User ID
   - Example: If URL is `.../user/12345678/`, your User ID is `12345678`

3. **Create a Collection**
   - On your profile page, click "Collections" tab
   - Click "Create a collection"
   - **Collection name:** `CustomExtensions` (or anything you want)
   - **Description:** (Optional) "My personal extensions"
   - **Visibility:** Make it "Public" (required for mobile access)
   - Click "Create collection"

4. **Note Your Collection Details**
   Write down:
   - User ID: `_______________`
   - Collection Name: `_______________`

### Part 3: Add Extension to Collection

Since this extension isn't on Mozilla Add-ons yet, you have two options:

#### Option A: Submit to AMO (Recommended for personal use)

1. **Package the extension**
   - On your computer, compress the extension folder to ZIP
   - Make sure `manifest.json` is in the root of the ZIP

2. **Submit to AMO**
   - Go to: <https://addons.mozilla.org/developers/addon/submit/distribution>
   - Choose "On this site" (unlisted if for personal use only)
   - Upload your ZIP file
   - Fill in required information
   - Submit for review

3. **After approval (usually 1-2 days)**
   - Go to your collection
   - Click "Add to this collection"
   - Search for your extension
   - Add it

#### Option B: Use a Pre-Approved Extension (Temporary)

For testing, you can use any public extension to verify your setup works:

1. Go to: <https://addons.mozilla.org>
2. Search for any extension (e.g., "uBlock Origin")
3. Click the extension
4. Click "Add to collection"
5. Select your collection

Once you verify the setup works, submit your YouTube Uninterrupted extension as described in Option A.

### Part 4: Configure Firefox Android

1. **Install Firefox on Android**
   - Open Google Play Store
   - Search for "Firefox Browser"
   - Install "Firefox Browser" (NOT "Firefox Focus")

2. **Open Firefox for Android**

3. **Enable Custom Add-on Collection**
   - Tap the menu button (⋮) in the top right
   - Tap "Settings"
   - Scroll down to "About Firefox"
   - Tap the Firefox logo **5 times quickly**
   - You'll see a message: "Debug menu enabled"

4. **Configure Collection**
   - Go back to Settings
   - You should now see "Custom Add-on collection"
   - Tap it
   - Enter your **User ID** (the numbers from earlier)
   - Enter your **Collection name** (exactly as you named it)
   - Tap "OK"

5. **Restart Firefox**
   - Close Firefox completely (swipe it away from recent apps)
   - Open Firefox again

### Part 5: Install the Extension

1. **Open Add-ons**
   - Tap menu (⋮) → "Add-ons"

2. **Find Your Extension**
   - You should see extensions from your collection
   - Find "YouTube Uninterrupted"
   - Tap it

3. **Install**
   - Tap "Add to Firefox"
   - Grant any requested permissions
   - Tap "Add"

4. **Verify Installation**
   - You should see "YouTube Uninterrupted added to Firefox"
   - It will appear in your add-ons list

### Part 6: Test It Works

1. **Open YouTube**
   - Navigate to youtube.com in Firefox
   - Start playing any video

2. **Verify Extension is Active**
   - Tap menu (⋮) → "Add-ons"
   - Find "YouTube Uninterrupted"
   - Toggle should be ON

3. **Test Functionality**
   - Let a video play for several minutes without interaction
   - The "Continue watching?" dialog should NOT appear

## Troubleshooting

### "Custom Add-on collection" not appearing

**Problem:** After tapping Firefox logo 5 times, option doesn't appear

**Solutions:**

- Make sure you're using **Firefox** (not Firefox Focus, Nightly, or Beta)
- Update Firefox to the latest version from Play Store
- Try tapping 5 times faster
- Restart Firefox and try again

### Collection shows no extensions

**Problem:** After configuring collection, it's empty

**Solutions:**

- Verify User ID is correct (just the numbers)
- Verify Collection name matches exactly (case-sensitive)
- Make sure collection is set to "Public" on AMO
- Try restarting Firefox
- Wait a few minutes - sometimes there's a sync delay

### Extension not working on YouTube

**Problem:** Dialog still appears

**Solutions:**

- Verify extension is enabled (Add-ons → YouTube Uninterrupted → ON)
- Reload the YouTube page
- Clear Firefox cache: Settings → Delete browsing data
- Disable and re-enable the extension

### Can't submit extension to AMO

**Problem:** Submission rejected or stuck in review

**Solutions:**

- Make sure manifest.json is valid
- Ensure all icons are included
- Set visibility to "Unlisted" for personal use
- Check email for reviewer feedback
- Usually takes 1-2 days for review

## Alternative: Firefox Nightly

If you're comfortable with beta software:

1. **Install Firefox Nightly** from Play Store
2. Nightly allows **any** extension without collections
3. Go to: <https://addons.mozilla.org>
4. Search for extensions and install directly

Note: Nightly is less stable than regular Firefox.

## Frequently Asked Questions

**Q: Do I need to redo this for every extension?**
A: No! Once your collection is configured, just add new extensions to your collection on AMO, and they'll appear in
Firefox Android automatically.

**Q: Can I share my collection with friends?**
A: Yes! Give them your User ID and Collection name, and they can configure their Firefox to use it.

**Q: Does this work on Chrome/Samsung Internet?**
A: No. This is Firefox-only. Chrome for Android doesn't support custom extensions.

**Q: Will my extensions sync across devices?**
A: No. Each device needs to be configured with your collection separately.

**Q: Is this safe?**
A: Yes. This is an official Firefox feature for developers and advanced users.

**Q: Do I need to root my phone?**
A: No. No root required.

## Visual Setup Guide

If you prefer video instructions, search YouTube for:

- "Firefox Android custom add-on collection"
- "Install custom Firefox extensions Android"

## Need Help?

If you're stuck:

1. **Firefox Support:** <https://support.mozilla.org/>
2. **GitHub Issues:** [Link to your repo]/issues
3. **Reddit:** r/firefox community is very helpful

## Quick Reference

Once set up, to install new extensions:

```text
1. Add extension to your AMO collection
2. Open Firefox Android → Add-ons
3. Find extension → Install
```

That's it!

---

**Remember:** This is a one-time setup. After configuration, installing extensions is easy!
