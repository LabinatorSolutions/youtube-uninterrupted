# Changelog

All notable changes to YouTube Uninterrupted are documented here.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.4] - 2026-11-06

### Changed

- **Requires Firefox 159 or newer** (desktop and Android). `strict_min_version` is now `159.0`, up from `153.0`. Older
  Firefox releases carry known, unpatched security vulnerabilities. Users on an older Firefox stay on 1.6.3 until they
  update their browser.
- New toolbar icon in the Labinator icon system: a white play triangle and an unbroken bar on an ultramarine square,
  replacing the red circle and green checkmark.

### Unchanged

- Extension code is identical to 1.6.3. No new permissions.

## [1.6.3] - 2026-09-22

### Fixed

- **Player controls no longer reappear on their own during playback.** The idle-timer refresh that stops YouTube
  pausing long videos was dispatching its synthetic `mousemove` at `#movie_player` as well as at `document`. YouTube
  reveals the control bar from a `mousemove` listener bound to that element, and suppresses only a move whose
  coordinates repeat the previous one — so the randomised coordinates used on each tick cleared `ytp-autohide` and
  flashed the control bar, plus the mouse cursor in fullscreen, into view roughly once a minute. The refresh now
  targets `document` and nothing else. Reported by a user against 1.6.1.
- Removed the occasional synthetic `scroll` event from the same routine. It had no measurable effect on YouTube's
  idle timer and could still drive YouTube's own scroll-linked chrome.

### Changed

- `ARCHITECTURE.md`, `README.md` and `CONTRIBUTING.md` no longer describe dispatching into the player as intended
  behaviour, and now carry the measurements behind the rule against it.
- `TESTING-CHECKLIST.md` gained a manual check that the control bar stays hidden, and a corrected console log string
  (`All monitoring systems active`; the previously listed `Activity simulator initialized` has never existed).

### Added

- Regression test in `tests/pause-behavior.mjs` asserting that no synthetic event ever reaches the player subtree
  while the document-level tick still fires. Verified to fail against the 1.6.1 source and pass against this release.

### Unchanged

- Dialog detection, dialog dismissal and playback recovery are untouched.
- No new permissions. `strict_min_version` remains `153.0`.

## [1.6.2] - Withdrawn

Uploaded to addons.mozilla.org, then withdrawn. AMO reserves a version number permanently once it has been uploaded
— disabling the version does not release it, and neither does deleting it — so the same fix ships as 1.6.3 instead.
The extension code in 1.6.3 is identical to what 1.6.2 contained; nothing is missing from it.
