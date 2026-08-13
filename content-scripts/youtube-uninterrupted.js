/**
 * YouTube Uninterrupted - Content Script
 * 
 * Prevents YouTube's "Continue watching?" interruption dialog through
 * multiple defensive layers: CSS hiding, DOM monitoring, activity simulation,
 * and video state management.
 * 
 * Architecture:
 * - Layer 1: CSS injection (instant hiding via inject-styles.css)
 * - Layer 2: DOM mutation observer (catches dynamic dialogs)
 * - Layer 3: Activity simulation (prevents dialog trigger)
 * - Layer 4: Video state monitoring (detects paused state and resumes)
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 YouTube Uninterrupted Contributors
 */

(function () {
	'use strict';

	// ============================================================================
	// CONFIGURATION
	// ============================================================================

	const CONFIG = {
		// Extension state (will be updated from storage)
		enabled: true,

		// Primary selectors for the pause dialog (multiple for resilience).
		//
		// NOTE: 'ytd-popup-container' and '.ytd-popup-container' are deliberately
		// NOT listed. 'ytd-popup-container' is a single persistent host element
		// that YouTube keeps for the lifetime of the page and parks every popup
		// inside — including dialogs the user already dismissed. Matching it means
		// (a) its textContent keeps reporting "Continue watching?" forever after a
		// single interruption, and (b) hiding it hides every YouTube popup at once.
		// '.ytd-popup-container' is worse: Polymer stamps that class onto every
		// descendant of the container, so it matches plain text nodes' wrappers.
		// Only match the dialog elements themselves.
		DIALOG_SELECTORS: [
			'tp-yt-paper-dialog',
			'[role="dialog"]',
			'[role="alertdialog"]',
			'yt-confirm-dialog-renderer',
			'ytd-enforcement-message-view-model',
			'ytd-simple-confirmation-dialog-renderer',
			'yt-dialog-overlay',
			'paper-dialog'
		],

		// Selectors for dialog content to verify it's the right dialog.
		// NOTE: Keep this list NARROW. Generic selectors like '#confirm-button' and
		// '.yt-spec-button-shape-next--call-to-action' also match legitimate
		// user-triggered dialogs (unsubscribe, delete, report, etc.) and must NOT
		// be included here. Text-pattern matching is the authoritative gate.
		CONTINUE_BUTTON_SELECTORS: [
			'yt-button-renderer[dialog-confirm]',
			'button[aria-label*="continue" i]',
			'[data-dialog-action="confirm"]'
		],

		// Text patterns that indicate a pause/continue dialog (case insensitive)
		DIALOG_TEXT_PATTERNS: [
			'continue watching',
			'video paused',
			'still watching',
			'are you there',
			'still there',
			'paused because',
			'you\'ve been inactive',
			'been idle'
		],

		// Selectors to NEVER hide (whitelist)
		PROTECTED_SELECTORS: [
			'#movie_player',
			'.html5-video-player',
			'video',
			'ytd-player',
			'.ytp-popup',
			'.ytp-settings-menu',
			'.ytp-panel'
		],

		// Performance settings
		MUTATION_DEBOUNCE_MS: 50,
		ACTIVITY_INTERVAL_MS: 60 * 1000, // 1 minute
		VIDEO_CHECK_INTERVAL_MS: 2000, // Check video state every 2 seconds
		SCAN_INTERVAL_MS: 5000, // Periodic full scan every 5 seconds

		// A pause that follows a real user input within this window is the user's
		// own pause and must never be undone.
		USER_GESTURE_WINDOW_MS: 3000,

		// How long after removing a pause dialog we still consider a pause to have
		// been caused by that dialog.
		INTERRUPTION_GRACE_MS: 3000,

		// Inline hiding is reverted after this long. YouTube reuses the same dialog
		// and backdrop nodes for every future popup, so a permanent inline
		// display:none would silently break unrelated dialogs later in the session.
		HIDE_REVERT_MS: 5000,

		// Upper bound on consecutive auto-resume attempts. Reset whenever the video
		// actually plays, so a working resume never exhausts it.
		MAX_RESUME_ATTEMPTS: 3,

		// Debug mode (logs to console)
		DEBUG: false
	};

	// Track state
	let domObserver = null;
	let activityIntervalId = null;
	let videoCheckIntervalId = null;
	let scanIntervalId = null;

	let lastInterruptionHandled = 0; // Timestamp of last successful dialog removal
	let lastUserInteractionMs = 0;   // Timestamp of last trusted user input

	// Set when the user pauses the video themselves. Stays set until the video
	// plays again, so the extension can never re-start a video the user stopped.
	let userPaused = false;

	let observedVideo = null;        // Video element we have listeners attached to
	let resumeAttempts = 0;          // Consecutive auto-resume attempts
	let selfInitiatedPlayMs = 0;     // When we last called play() ourselves

	// Original inline style values for elements we hid, so hiding is reversible.
	const hiddenElements = new WeakMap();

	// ============================================================================
	// UTILITY FUNCTIONS
	// ============================================================================

	/**
	 * Debug logging - only logs when DEBUG is true
	 */
	function log(...args) {
		if (CONFIG.DEBUG) {
			console.log('[YouTube Uninterrupted]', new Date().toISOString(), ...args);
		}
	}

	/**
	 * Warning logging - always logs important warnings
	 */
	function warn(...args) {
		console.warn('[YouTube Uninterrupted]', ...args);
	}

	/**
	 * Debounce function to limit execution frequency
	 */
	function debounce(func, wait) {
		let timeout;
		return function executedFunction(...args) {
			const later = () => {
				clearTimeout(timeout);
				func(...args);
			};
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
		};
	}



	/**
	 * Safe query selector that won't throw
	 */
	function safeQuerySelector(selector, parent = document) {
		try {
			return parent.querySelector(selector);
		} catch (_e) {
			return null;
		}
	}

	/**
	 * Safe query selector all that won't throw
	 */
	function safeQuerySelectorAll(selector, parent = document) {
		try {
			return parent.querySelectorAll(selector);
		} catch (_e) {
			return [];
		}
	}

	/**
	 * Cryptographically secure random number between 0 (inclusive) and 1 (exclusive)
	 * Replacement for Math.random() to satisfy security scanners
	 */
	function secureRandom() {
		const array = new Uint32Array(1);
		window.crypto.getRandomValues(array);
		return array[0] / (0xFFFFFFFF + 1);
	}

	/**
	 * Returns true if the user interacted (clicked) within the last 3 seconds.
	 * Dialogs that appear immediately after a user action are user-initiated
	 * (e.g. "Unsubscribe?", "Remove from playlist?", cookie consent) and must
	 * NOT be suppressed by this extension.
	 */
	function wasUserInitiated() {
		return (Date.now() - lastUserInteractionMs) < CONFIG.USER_GESTURE_WINDOW_MS;
	}

	/**
	 * Returns true only if the element is actually rendered on screen.
	 *
	 * This is the gate that keeps dismissed dialogs from counting. YouTube does
	 * not delete a dialog when it closes — it hides it and leaves the node in the
	 * document, text and all. Without this check a single "Continue watching?"
	 * dialog from an hour ago keeps matching for the rest of the page's life.
	 */
	function isElementVisible(element) {
		try {
			if (typeof element.checkVisibility === 'function') {
				return element.checkVisibility({
					checkOpacity: true,
					checkVisibilityCSS: true
				});
			}

			// Fallback for older engines.
			const rect = element.getBoundingClientRect();
			if (rect.width === 0 && rect.height === 0) return false;

			const style = window.getComputedStyle(element);
			return style.display !== 'none' &&
				style.visibility !== 'hidden' &&
				style.opacity !== '0';
		} catch (_e) {
			return false;
		}
	}

	// ============================================================================
	// LAYER 2: DOM MONITORING
	// ============================================================================

	/**
	 * Check if an element should be protected (not hidden)
	 */
	function isProtectedElement(element) {
		if (!element || !element.matches) return false;

		return CONFIG.PROTECTED_SELECTORS.some(selector => {
			try {
				return element.matches(selector) || element.closest(selector);
			} catch (_e) {
				return false;
			}
		});
	}

	/**
	 * Check if an element is the "Continue watching?" dialog.
	 * Uses multiple heuristics for resilience against YouTube changes.
	 *
	 * IMPORTANT: Text-pattern matching is the PRIMARY (and required) gate.
	 * We never hide a dialog solely because it contains a confirm button —
	 * that approach produces false positives on user-initiated dialogs such
	 * as unsubscribe and delete confirmations.
	 */
	function isPauseDialog(element) {
		if (!element || !element.nodeType || element.nodeType !== Node.ELEMENT_NODE) {
			return false;
		}

		// If the user recently clicked something, this dialog was user-initiated
		// (e.g. "Unsubscribe?", "Remove from playlist?"). Leave it alone.
		if (wasUserInitiated()) {
			return false;
		}

		// Never hide protected elements
		if (isProtectedElement(element)) {
			return false;
		}

		try {
			// Check if element matches dialog selectors
			const isDialogElement = CONFIG.DIALOG_SELECTORS.some(selector => {
				try {
					return element.matches && element.matches(selector);
				} catch (_e) {
					return false;
				}
			});

			if (!isDialogElement) return false;

			// A dialog that is not on screen is not interrupting anything. This
			// covers both dialogs YouTube has already dismissed and ones we hid
			// ourselves a moment ago.
			if (!isElementVisible(element)) return false;

			// Get all text content for pattern matching
			const textContent = (element.textContent || '').toLowerCase();
			const innerText = (element.innerText || '').toLowerCase();
			const combinedText = textContent + ' ' + innerText;

			// PRIMARY GATE: Text patterns are the required signal.
			// YouTube's pause/idle dialog always contains recognisable phrasing.
			// If none of these patterns match, we will NOT act on the element —
			// it is almost certainly a different, legitimate dialog.
			const hasRelevantText = CONFIG.DIALOG_TEXT_PATTERNS.some(pattern => {
				return combinedText.includes(pattern.toLowerCase());
			});

			if (hasRelevantText) {
				log('Dialog detected via text pattern:', element);
				return true;
			}

			// SECONDARY CHECK: aria-label and aria-describedby attributes.
			// These can carry pause-dialog wording even when visible text content
			// is not directly accessible (e.g. screen-reader-only labels).
			const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
			const ariaDescribedBy = element.getAttribute('aria-describedby');

			if (ariaDescribedBy) {
				const describedElement = document.getElementById(ariaDescribedBy);
				if (describedElement) {
					const describedText = (describedElement.textContent || '').toLowerCase();
					if (CONFIG.DIALOG_TEXT_PATTERNS.some(p => describedText.includes(p))) {
						log('Dialog detected via aria-describedby:', element);
						return true;
					}
				}
			}

			if (CONFIG.DIALOG_TEXT_PATTERNS.some(p => ariaLabel.includes(p))) {
				log('Dialog detected via aria-label:', element);
				return true;
			}

			// No matching text found — treat as a legitimate dialog, do not hide.
			return false;
		} catch (error) {
			log('Error checking dialog:', error);
			return false;
		}
	}

	// Whole-label match for a confirm button. Anchored on purpose.
	const CONFIRM_LABEL_PATTERN = /^(continue|continue watching|keep watching|yes|ok|okay|resume|got it)\.?$/;

	/**
	 * Hide an element with inline styles, then put its original inline styles
	 * back after HIDE_REVERT_MS.
	 *
	 * The revert is what makes this safe. YouTube reuses the same dialog and
	 * backdrop nodes for every popup it shows, so a permanent inline
	 * `display: none !important` from one interruption would silently break the
	 * next unrelated dialog — an unsubscribe confirmation would render invisible,
	 * or a legitimate dialog would appear with no backdrop. If the pause dialog is
	 * somehow still up after the revert, the next scan simply hides it again.
	 */
	function hideTemporarily(element) {
		const PROPS = ['display', 'visibility', 'opacity', 'pointer-events', 'z-index'];
		const VALUES = ['none', 'hidden', '0', 'none', '-9999'];

		if (!hiddenElements.has(element)) {
			hiddenElements.set(element, PROPS.map(prop => ({
				prop,
				value: element.style.getPropertyValue(prop),
				priority: element.style.getPropertyPriority(prop)
			})));
		}

		PROPS.forEach((prop, i) => {
			element.style.setProperty(prop, VALUES[i], 'important');
		});

		setTimeout(() => {
			const saved = hiddenElements.get(element);
			if (!saved) return;
			hiddenElements.delete(element);

			saved.forEach(({ prop, value, priority }) => {
				element.style.removeProperty(prop);
				if (value) element.style.setProperty(prop, value, priority);
			});

			// Re-check: if YouTube left the dialog open, hide it again.
			if (CONFIG.enabled) scanAndRemoveDialogs();
		}, CONFIG.HIDE_REVERT_MS);
	}

	/**
	 * Remove or hide the pause dialog using multiple strategies
	 */
	function removePauseDialog(element) {
		if (!element) return;

		try {
			log('Removing pause dialog:', element.tagName, element.className);

			// Mark that we are handling an interruption right now
			lastInterruptionHandled = Date.now();

			// Strategy 1: Click the continue button first (cleanest solution)
			let clicked = false;
			for (const selector of CONFIG.CONTINUE_BUTTON_SELECTORS) {
				const btn = safeQuerySelector(selector, element);
				if (btn && btn.click) {
					log('Clicking continue button:', selector);
					btn.click();
					clicked = true;
					break;
				}
			}

			// Also check for any button with confirm-like text.
			// Matched as a whole label, not a substring: 'ok' as a substring also
			// matches "Bookmark", "Look", "Block" and similar.
			if (!clicked) {
				const buttons = element.querySelectorAll('button, yt-button-renderer');
				for (const btn of buttons) {
					const btnText = (btn.textContent || '').trim().toLowerCase();
					if (CONFIRM_LABEL_PATTERN.test(btnText)) {
						log('Clicking button with text:', btnText);
						btn.click();
						clicked = true;
						break;
					}
				}
			}

			// Strategy 2: Hide with CSS, temporarily.
			hideTemporarily(element);

			// Strategy 3: DOM removal intentionally omitted.
			// Physically removing nodes from the DOM makes false positives
			// unrecoverable — the user's dialog would be permanently destroyed.
			// CSS hiding (Strategy 2) is sufficient and reversible.

			// Strategy 4: Also hide any visible backdrop/overlay. Only visible ones:
			// YouTube keeps one backdrop node and reuses it for every dialog, so
			// touching a dormant backdrop would affect unrelated future popups.
			const backdrops = document.querySelectorAll(
				'tp-yt-iron-overlay-backdrop, .scrim, iron-overlay-backdrop, [part="backdrop"]'
			);
			backdrops.forEach(backdrop => {
				if (isElementVisible(backdrop)) {
					hideTemporarily(/** @type {HTMLElement} */(backdrop));
				}
			});

			log('Dialog removal strategies applied');
		} catch (error) {
			warn('Error removing dialog:', error);
		}
	}

	/**
	 * Scan entire DOM for pause dialogs
	 */
	function scanAndRemoveDialogs() {
		if (!CONFIG.enabled) return;

		try {
			let dialogsFound = 0;

			CONFIG.DIALOG_SELECTORS.forEach(selector => {
				const elements = safeQuerySelectorAll(selector);
				elements.forEach(element => {
					if (isPauseDialog(element)) {
						removePauseDialog(element);
						dialogsFound++;
					}
				});
			});

			if (dialogsFound > 0) {
				log(`Scan complete: ${dialogsFound} dialog(s) removed`);
			}

			return dialogsFound > 0;
		} catch (error) {
			log('Error scanning for dialogs:', error);
			return false;
		}
	}

	// Debounced version for mutation observer
	const debouncedScan = debounce(scanAndRemoveDialogs, CONFIG.MUTATION_DEBOUNCE_MS);

	/**
	 * Setup MutationObserver to watch for dialog insertion
	 */
	function setupDOMObserver() {
		if (domObserver) {
			domObserver.disconnect();
		}

		domObserver = new MutationObserver((mutations) => {
			if (!CONFIG.enabled) return;

			for (const mutation of mutations) {
				// Check added nodes
				if (mutation.addedNodes.length > 0) {
					for (const node of mutation.addedNodes) {
						if (node.nodeType === Node.ELEMENT_NODE) {
							// Check if the node itself is a dialog
							if (isPauseDialog(node)) {
								removePauseDialog(node);
							} else if (/** @type {Element} */(node).querySelector) {
								// Check children
								for (const selector of CONFIG.DIALOG_SELECTORS) {
									const dialogs = safeQuerySelectorAll(selector, /** @type {Document} */(node));
									for (const dialog of dialogs) {
										if (isPauseDialog(dialog)) {
											removePauseDialog(dialog);
										}
									}
								}
							}
						}
					}
					// Also do a debounced full scan
					debouncedScan();
				}

				// Check attribute changes that might reveal a dialog
				if (mutation.type === 'attributes') {
					const target = mutation.target;
					if (target.nodeType === Node.ELEMENT_NODE) {
						if (isPauseDialog(target)) {
							removePauseDialog(target);
						}
					}
				}
			}
		});

		// Observe with comprehensive settings
		domObserver.observe(document.documentElement, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'open']
		});

		log('DOM observer initialized');
		return domObserver;
	}

	// ============================================================================
	// LAYER 3: ACTIVITY SIMULATION
	// ============================================================================

	/**
	 * Simulate user activity to reset YouTube's idle timer
	 * Uses multiple event types for reliability
	 */
	function simulateActivity() {
		if (!CONFIG.enabled) return;

		try {
			// Get a random position within viewport for more realistic events
			const x = Math.floor(secureRandom() * window.innerWidth);
			const y = Math.floor(secureRandom() * window.innerHeight);

			// Simulate mouse movement
			const mouseMoveEvent = new MouseEvent('mousemove', {
				bubbles: true,
				cancelable: false,
				view: window,
				clientX: x,
				clientY: y
			});
			document.dispatchEvent(mouseMoveEvent);

			// Occasionally simulate other events for variety
			if (secureRandom() < 0.3) {
				const scrollEvent = new Event('scroll', { bubbles: true });
				document.dispatchEvent(scrollEvent);
			}

			// Dispatch to video player specifically
			const player = safeQuerySelector('#movie_player, .html5-video-player');
			if (player) {
				const playerEvent = new MouseEvent('mousemove', {
					bubbles: true,
					cancelable: false,
					view: window,
					clientX: x,
					clientY: y
				});
				player.dispatchEvent(playerEvent);
			}

			log('Activity simulated at:', x, y);
		} catch (error) {
			log('Error simulating activity:', error);
		}
	}

	// ============================================================================
	// LAYER 4: VIDEO STATE MONITORING
	// ============================================================================

	/**
	 * Get the main video element.
	 *
	 * Scoped to the player on purpose. A bare 'video' selector also matches the
	 * silent hover-preview players on the home page and in search results, which
	 * this extension has no business touching.
	 */
	function getVideoElement() {
		return safeQuerySelector(
			'video.html5-main-video, #movie_player video, .html5-video-player video'
		);
	}

	/**
	 * Resume playback, but only when this tab was demonstrably interrupted by
	 * YouTube and the user has not paused the video themselves.
	 */
	function attemptResume(reason) {
		if (!CONFIG.enabled || userPaused) return false;

		const video = getVideoElement();
		if (!video || !video.paused || video.ended || video.currentTime === 0) {
			return false;
		}

		// A visible pause dialog right now, or one we removed moments ago, is the
		// only evidence that accepts. Without it we leave the video alone.
		const dialogFoundNow = scanAndRemoveDialogs();
		const wasRecentlyHandled =
			(Date.now() - lastInterruptionHandled) < CONFIG.INTERRUPTION_GRACE_MS;

		if (!dialogFoundNow && !wasRecentlyHandled) return false;

		if (resumeAttempts >= CONFIG.MAX_RESUME_ATTEMPTS) {
			log('Resume attempt limit reached, standing down');
			return false;
		}

		resumeAttempts++;
		selfInitiatedPlayMs = Date.now();
		log('Resuming video after interruption:', reason);
		video.play().catch(e => {
			log('Could not auto-resume video:', e);
		});
		return true;
	}

	/**
	 * Fires whenever the video pauses, for any reason.
	 */
	function onVideoPause() {
		if (!CONFIG.enabled) return;

		// Interruption evidence wins: YouTube's own dialog is unambiguous.
		if (attemptResume('pause event')) return;

		// Otherwise, if a real input landed just before the pause, the human did
		// it. Latch that until the video plays again — polling must not undo it.
		if (wasUserInitiated()) {
			userPaused = true;
			log('User paused the video; auto-resume disabled until playback resumes');
		}

		// Neither case: unknown cause (media key, another extension, the OS media
		// controls). Do nothing now. If YouTube's dialog shows up in the next few
		// seconds, the periodic check will still catch it.
	}

	function onVideoPlay() {
		userPaused = false;

		// Only a play we did not cause clears the attempt counter. Otherwise a
		// page that re-pauses immediately after every resume would reset the
		// counter each round and the two of us would fight indefinitely.
		if ((Date.now() - selfInitiatedPlayMs) > 1000) {
			resumeAttempts = 0;
		}
	}

	/**
	 * Attach pause/play listeners to the current video element. YouTube swaps the
	 * element on navigation, so this is re-run periodically and after SPA nav.
	 */
	function attachVideoListeners() {
		const video = getVideoElement();
		if (!video || video === observedVideo) return;

		if (observedVideo) {
			observedVideo.removeEventListener('pause', onVideoPause);
			observedVideo.removeEventListener('play', onVideoPlay);
		}

		video.addEventListener('pause', onVideoPause);
		video.addEventListener('play', onVideoPlay);
		observedVideo = video;

		// If the video is already paused at the moment we attach — a fresh page, a
		// tab restored from a previous session, or the user re-enabling the
		// extension — we did not see what paused it, so we must not undo it.
		// The first genuine 'play' clears this again.
		userPaused = video.paused;
		resumeAttempts = 0;
		log('Video listeners attached; already paused:', video.paused);
	}

	/**
	 * Periodic backstop for the case where YouTube pauses the video first and
	 * renders the dialog a moment later, so the pause event alone saw no evidence.
	 */
	function checkVideoState() {
		if (!CONFIG.enabled) return;

		try {
			attachVideoListeners();
			if (userPaused) return;
			attemptResume('periodic check');
		} catch (error) {
			log('Error checking video state:', error);
		}
	}

	// ============================================================================
	// INITIALIZATION
	// ============================================================================

	/**
	 * Start all monitoring systems
	 */
	function startMonitoring() {
		log('Starting monitoring systems');

		// Setup DOM monitoring
		setupDOMObserver();

		// Watch the video element's own pause/play events
		attachVideoListeners();

		// Setup periodic activity simulation (every 1 minute)
		if (activityIntervalId) clearInterval(activityIntervalId);
		activityIntervalId = setInterval(simulateActivity, CONFIG.ACTIVITY_INTERVAL_MS);

		// Setup video state monitoring (every 2 seconds)
		if (videoCheckIntervalId) clearInterval(videoCheckIntervalId);
		videoCheckIntervalId = setInterval(checkVideoState, CONFIG.VIDEO_CHECK_INTERVAL_MS);

		// Setup periodic full scan (every 5 seconds as backup)
		if (scanIntervalId) clearInterval(scanIntervalId);
		scanIntervalId = setInterval(scanAndRemoveDialogs, CONFIG.SCAN_INTERVAL_MS);

		log('All monitoring systems active');
	}

	/**
	 * Stop all monitoring systems
	 */
	function stopMonitoring() {
		log('Stopping monitoring systems');

		if (domObserver) {
			domObserver.disconnect();
			domObserver = null;
		}

		if (activityIntervalId) {
			clearInterval(activityIntervalId);
			activityIntervalId = null;
		}

		if (videoCheckIntervalId) {
			clearInterval(videoCheckIntervalId);
			videoCheckIntervalId = null;
		}

		if (scanIntervalId) {
			clearInterval(scanIntervalId);
			scanIntervalId = null;
		}

		if (observedVideo) {
			observedVideo.removeEventListener('pause', onVideoPause);
			observedVideo.removeEventListener('play', onVideoPlay);
			observedVideo = null;
		}

		log('All monitoring systems stopped');
	}

	/**
	 * Initialize the extension
	 */
	function init() {
		log('Initializing YouTube Uninterrupted extension');

		// Track user interactions, for two purposes: telling user-triggered dialogs
		// (e.g. "Unsubscribe?", "Delete comment?") apart from YouTube's automatic
		// idle dialog, and recognising a pause the user performed themselves.
		//
		// Keyboard events matter as much as clicks here — space and 'k' are the
		// usual way to pause a YouTube video and produce no click at all.
		//
		// Only trusted events count. Layer 3 dispatches synthetic input of its own,
		// and those must never be mistaken for the user.
		// Capture phase ensures we see the event before page handlers do.
		const noteUserInteraction = (event) => {
			if (event.isTrusted) lastUserInteractionMs = Date.now();
		};

		['pointerdown', 'click', 'keydown'].forEach(type => {
			document.addEventListener(type, noteUserInteraction, { capture: true, passive: true });
		});

		// Load extension state from storage
		browser.storage.local.get(['enabled']).then(result => {
			if (result.enabled !== undefined) {
				CONFIG.enabled = result.enabled;
			}
			log('Extension enabled:', CONFIG.enabled);

			if (CONFIG.enabled) {
				// Initial scan
				scanAndRemoveDialogs();

				// Start monitoring
				startMonitoring();
			}
		}).catch(error => {
			warn('Error loading settings, using defaults:', error);
			// Start with defaults
			scanAndRemoveDialogs();
			startMonitoring();
		});

		// Listen for state changes from popup
		browser.runtime.onMessage.addListener((message) => {
			if (message.action === 'toggleState') {
				CONFIG.enabled = message.enabled;
				log('State toggled:', CONFIG.enabled);

				if (CONFIG.enabled) {
					scanAndRemoveDialogs();
					startMonitoring();
				} else {
					stopMonitoring();
				}
			}
		});

		// Handle page visibility changes
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible' && CONFIG.enabled) {
				log('Page became visible, scanning for dialogs');
				scanAndRemoveDialogs();
			}
		});

		// Handle YouTube SPA navigation
		window.addEventListener('yt-navigate-finish', () => {
			if (CONFIG.enabled) {
				log('YouTube navigation detected, scanning for dialogs');
				setTimeout(() => {
					attachVideoListeners();
					scanAndRemoveDialogs();
				}, 500);
			}
		});

		// Cleanup on page unload
		window.addEventListener('beforeunload', stopMonitoring);

		log('Initialization complete');
	}

	// ============================================================================
	// STARTUP
	// ============================================================================

	// Start when DOM is ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

})();
