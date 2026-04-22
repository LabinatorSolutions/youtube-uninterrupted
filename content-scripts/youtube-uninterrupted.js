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

		// Primary selectors for the pause dialog (multiple for resilience)
		DIALOG_SELECTORS: [
			'ytd-popup-container',
			'tp-yt-paper-dialog',
			'.ytd-popup-container',
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

		// Debug mode (logs to console)
		DEBUG: false
	};

	// Track state
	let domObserver = null;
	let activityIntervalId = null;
	let videoCheckIntervalId = null;
	let scanIntervalId = null;

	let lastInterruptionHandled = 0; // Timestamp of last successful dialog removal
	let lastUserInteractionMs = 0;   // Timestamp of last user click/interaction

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
		return (Date.now() - lastUserInteractionMs) < 3000;
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

			// Also check for any button with confirm-like text
			if (!clicked) {
				const buttons = element.querySelectorAll('button, yt-button-renderer');
				for (const btn of buttons) {
					const btnText = (btn.textContent || '').toLowerCase();
					if (btnText.includes('continue') || btnText.includes('yes') || btnText.includes('ok')) {
						log('Clicking button with text:', btnText);
						btn.click();
						clicked = true;
						break;
					}
				}
			}

			// Strategy 2: Hide with CSS
			element.style.setProperty('display', 'none', 'important');
			element.style.setProperty('visibility', 'hidden', 'important');
			element.style.setProperty('opacity', '0', 'important');
			element.style.setProperty('pointer-events', 'none', 'important');
			element.style.setProperty('z-index', '-9999', 'important');

			// Strategy 3: DOM removal intentionally omitted.
			// Physically removing nodes from the DOM makes false positives
			// unrecoverable — the user's dialog would be permanently destroyed.
			// CSS hiding (Strategy 2) is sufficient and reversible.

			// Strategy 4: Also hide any backdrop/overlay
			const backdrops = document.querySelectorAll(
				'tp-yt-iron-overlay-backdrop, .scrim, iron-overlay-backdrop, [part="backdrop"]'
			);
			backdrops.forEach(backdrop => {
				/** @type {HTMLElement} */(backdrop).style.setProperty('display', 'none', 'important');
				/** @type {HTMLElement} */(backdrop).style.setProperty('opacity', '0', 'important');
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
	 * Get the main video element
	 */
	function getVideoElement() {
		return safeQuerySelector('video.html5-main-video, #movie_player video, video');
	}

	/**
	 * Check if video was paused unexpectedly (not by user)
	 * and resume it if so
	 */
	function checkVideoState() {
		if (!CONFIG.enabled) return;

		try {
			const video = getVideoElement();
			if (!video) return;

			// If video is paused, checks if we need to resume it
			if (video.paused && !video.ended && video.currentTime > 0) {

				// 1. Check for any dialogs right now
				const dialogFoundNow = scanAndRemoveDialogs();

				// 2. Determine if we should resume
				// We resume IF we just found a dialog OR if we handled one very recently (last 2 seconds)
				const timeSinceLastHandled = Date.now() - lastInterruptionHandled;
				const wasRecentlyHandled = timeSinceLastHandled < 2000;

				if (dialogFoundNow || wasRecentlyHandled) {
					log('Resuming video (interruption detected/handled)');
					video.play().catch(e => {
						log('Could not auto-resume video:', e);
					});
				} else {
					// Otherwise, assume it's a legitimate user pause and do nothing.
					// We no longer rely on heuristics like checking for UI overlays, 
					// which are prone to false negatives.
				}
			}


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

		log('All monitoring systems stopped');
	}

	/**
	 * Initialize the extension
	 */
	function init() {
		log('Initializing YouTube Uninterrupted extension');

		// Track user interactions so we can distinguish user-triggered dialogs
		// (e.g. "Unsubscribe?", "Delete comment?") from YouTube's automatic idle
		// dialogs. Capture phase ensures we catch clicks before they reach targets.
		document.addEventListener('click', () => {
			lastUserInteractionMs = Date.now();
		}, true);

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
				setTimeout(scanAndRemoveDialogs, 500);
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
