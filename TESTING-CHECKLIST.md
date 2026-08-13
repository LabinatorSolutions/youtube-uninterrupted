# Testing Checklist

Use this checklist to verify the YouTube Uninterrupted extension is working correctly.

## Pre-Installation Tests

- [ ] **Files Present**
  - [ ] manifest.json exists
  - [ ] All content-scripts files present
  - [ ] All popup files present
  - [ ] Background worker file present
  - [ ] icon.svg present

- [ ] **Manifest Validation**
  - [ ] manifest.json is valid JSON (test with JSON validator)
  - [ ] All paths in manifest are correct
  - [ ] Version number is set
  - [ ] Permissions are minimal

## Installation Tests

### Firefox Desktop

- [ ] **Load Extension**
  - [ ] Navigate to `about:debugging#/runtime/this-firefox`
  - [ ] Click "Load Temporary Add-on"
  - [ ] Select manifest.json
  - [ ] Extension loads without errors

- [ ] **Verify Installation**
  - [ ] Extension appears in toolbar
  - [ ] Icon displays correctly
  - [ ] Clicking icon opens popup
  - [ ] Extension appears in `about:addons`

### Firefox Android (if applicable)

- [ ] **Collection Setup**
  - [ ] Firefox account created
  - [ ] User ID obtained
  - [ ] Collection created on AMO
  - [ ] Collection is public

- [ ] **Mobile Configuration**
  - [ ] Debug menu enabled (5 taps)
  - [ ] Custom collection configured
  - [ ] Firefox restarted
  - [ ] Extension appears in Add-ons menu

## Functional Tests

### YouTube Desktop

- [ ] **Basic Functionality**
  - [ ] Navigate to youtube.com
  - [ ] Extension icon shows in toolbar
  - [ ] Click extension icon - popup opens
  - [ ] Toggle shows "Active on YouTube pages"

- [ ] **Dialog Prevention - Short Test (5 minutes)**
  - [ ] Open any YouTube video
  - [ ] Start playback
  - [ ] Do NOT interact with page for 5+ minutes
  - [ ] No "Continue watching?" dialog appears

- [ ] **Dialog Prevention - Long Test (15+ minutes)**
  - [ ] Open a long video or playlist
  - [ ] Start playback
  - [ ] Leave tab open but don't interact for 15+ minutes
  - [ ] No interruption dialog
  - [ ] Video continues playing

- [ ] **Manual Pause Is Respected** (regression: the extension must never restart a video you paused)
  - [ ] Play a video, let it run past one "Continue watching?" interruption so the dialog has been handled once
  - [ ] Click pause — video stays paused for at least 30 seconds
  - [ ] Press play, then pause with the spacebar — video stays paused
  - [ ] Press play, then pause with `k` — video stays paused
  - [ ] Pause immediately (within ~2 seconds) after an interruption is handled — video stays paused
  - [ ] Pause via the OS media controls or a media key — video stays paused

- [ ] **Multiple Tabs** (regression: only the interrupted tab may be touched)
  - [ ] Open 3+ YouTube video tabs, play one, pause the others
  - [ ] Wait 15+ minutes — no paused tab starts playing on its own
  - [ ] Toggle the extension OFF then ON — no tab starts playing
  - [ ] Confirm the tab you left playing is still the only one playing

- [ ] **Legitimate Dialogs Survive**
  - [ ] Click Unsubscribe on any channel — the confirmation dialog appears normally, with its backdrop
  - [ ] Do this *after* an interruption has been handled in the same tab — dialog still appears normally
  - [ ] Open Share, Save to playlist, and the player settings menu — all render and work

- [ ] **Repeated Interruptions**
  - [ ] Leave a long video playing for several hours across multiple interruptions
  - [ ] Every interruption is still handled — the extension does not stop working after the first few

- [ ] **Enable/Disable Toggle**
  - [ ] Click extension icon
  - [ ] Toggle extension OFF
  - [ ] Status shows "Disabled"
  - [ ] (Optional) Wait for dialog - it SHOULD appear when disabled
  - [ ] Toggle extension ON
  - [ ] Status shows "Active on YouTube pages"

### YouTube Mobile (m.youtube.com)

- [ ] **Mobile Browser Test**
  - [ ] Open m.youtube.com (mobile site) in Firefox desktop
  - [ ] Extension should work the same as desktop site
  - [ ] Dialog prevention should work

- [ ] **Firefox Android Test** (if you have Android device)
  - [ ] Open youtube.com in Firefox Android
  - [ ] Extension toggle is ON
  - [ ] Play video without interaction
  - [ ] No dialog appears after several minutes

## Performance Tests

- [ ] **CPU Usage**
  - [ ] Open browser task manager (Shift+Esc in Firefox)
  - [ ] Extension should use negligible CPU (<1%)
  - [ ] No continuous high CPU usage

- [ ] **Memory Usage**
  - [ ] Check memory in task manager
  - [ ] Extension should use < 5MB
  - [ ] No memory leaks over time

- [ ] **Battery Impact** (Mobile only)
  - [ ] Monitor battery usage
  - [ ] Extension should have minimal impact
  - [ ] No excessive battery drain

## Edge Cases & Error Handling

- [ ] **Page Navigation**
  - [ ] Navigate from one YouTube video to another
  - [ ] Extension continues to work
  - [ ] No console errors

- [ ] **Multiple Tabs**
  - [ ] Open multiple YouTube tabs
  - [ ] Extension works in all tabs
  - [ ] Toggle affects all tabs

- [ ] **Incognito/Private Mode**
  - [ ] Open YouTube in private window
  - [ ] Extension should work (if "Allow in Private Windows" is enabled)
  - [ ] Test functionality same as normal mode

- [ ] **Browser Restart**
  - [ ] Close and reopen Firefox
  - [ ] Extension state persists (ON/OFF setting saved)
  - [ ] Extension still works on YouTube

- [ ] **Extension Update**
  - [ ] Update version number in manifest
  - [ ] Reload extension
  - [ ] Settings persist after update
  - [ ] No errors in console

## Console Testing (Debug Mode)

- [ ] **Enable Debug Mode**
  - [ ] Edit `youtube-uninterrupted.js`
  - [ ] Change `CONFIG.DEBUG = true`
  - [ ] Reload extension

- [ ] **Check Console Logs**
  - [ ] Open YouTube
  - [ ] Open browser console (F12)
  - [ ] Verify logs appear: `[YouTube Uninterrupted] Initializing...`
  - [ ] Should see: `[YouTube Uninterrupted] DOM observer initialized`
  - [ ] Should see: `[YouTube Uninterrupted] Activity simulator initialized`

- [ ] **Monitor During Playback**
  - [ ] Watch console during video playback
  - [ ] Should see periodic activity simulation logs
  - [ ] No error messages
  - [ ] No warnings about dialog detection

## Compatibility Tests

- [ ] **Firefox Versions**
  - [ ] Test on Firefox 153+ (minimum version)
  - [ ] Test on latest Firefox release
  - [ ] (Optional) Test on Firefox Nightly

- [ ] **YouTube Variants**
  - [ ] <https://www.youtube.com> (standard desktop)
  - [ ] m.youtube.com (mobile web)
  - [ ] youtube.com/embed/* (embedded players)
  - [ ] Should work on all variants

- [ ] **Operating Systems**
  - [ ] Linux (if applicable)
  - [ ] Windows (if applicable)
  - [ ] macOS (if applicable)
  - [ ] Android (if applicable)

## User Experience Tests

- [ ] **Popup Design**
  - [ ] Popup opens quickly (<100ms)
  - [ ] All text is readable
  - [ ] Icons display correctly
  - [ ] Toggle switch works smoothly
  - [ ] Footer links are clickable

- [ ] **Status Updates**
  - [ ] Status text updates when toggle changes
  - [ ] Status icon changes color (green when active)
  - [ ] "Not on YouTube" shows on non-YouTube pages

- [ ] **Error Messages**
  - [ ] Graceful error handling
  - [ ] No cryptic errors shown to user
  - [ ] Helpful error messages (if any)

## Privacy & Security Tests

- [ ] **Network Monitoring**
  - [ ] Open browser DevTools → Network tab
  - [ ] Use extension
  - [ ] No outgoing network requests from extension
  - [ ] No data sent to external servers

- [ ] **Storage Inspection**
  - [ ] Open `about:debugging` → Inspect → Storage
  - [ ] Only `enabled` boolean should be stored
  - [ ] No user data or tracking info

- [ ] **Permissions Verification**
  - [ ] Extension only requests:
    - `storage` permission
    - `*://*.youtube.com/*` host permission
  - [ ] No unnecessary permissions

## Final Validation

- [ ] **Complete Workflow Test**
  - [ ] Install extension fresh
  - [ ] Open YouTube
  - [ ] Start playing a music playlist
  - [ ] Leave it playing for 30+ minutes
  - [ ] Uninterrupted playback - no dialogs
  - [ ] Extension is working as expected

- [ ] **User Acceptance**
  - [ ] Ask someone else to test
  - [ ] Get feedback on usability
  - [ ] Verify it solves the problem

## Known Issues Checklist

Document any issues found:

| Issue | Severity | Reproducible? | Notes |
| ----- | -------- | ------------- | ----- |
|       |          |               |       |

## Test Results Summary

Date: _______________  
Firefox Version: _______________  
OS: _______________  

**Overall Result:** ☐ Pass ☐ Fail ☐ Partial

**Critical Issues:** _______________

**Minor Issues:** _______________

**Ready for Release:** ☐ Yes ☐ No

## Notes

Additional observations:

```text
[Your notes here]
```

---

**Testing completed by:** _______________  
**Date:** _______________  
**Sign-off:** ☐ Approved for deployment
