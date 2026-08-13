/**
 * YouTube Uninterrupted - Background Service Worker
 * 
 * Manages extension state and handles communication between popup and content scripts
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 YouTube Uninterrupted Contributors
 */

// Extension state
let extensionState = {
	enabled: true
};

// Initialize extension on install
browser.runtime.onInstalled.addListener(() => {
	console.log('[YouTube Uninterrupted] Extension installed');

	// Set default state
	browser.storage.local.set({ enabled: true });
});

// Listen for messages from popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === 'getState') {
		// Return current state to popup
		browser.storage.local.get(['enabled']).then(result => {
			sendResponse({ enabled: result.enabled !== false });
		});
		return true; // Keep channel open for async response
	}

	if (message.action === 'setState') {
		// Update state from popup
		const newState = message.enabled;
		extensionState.enabled = newState;

		// Save to storage
		browser.storage.local.set({ enabled: newState });

		// Notify all YouTube tabs
		browser.tabs.query({ url: '*://*.youtube.com/*' }).then(tabs => {
			tabs.forEach(tab => {
				browser.tabs.sendMessage(tab.id, {
					action: 'toggleState',
					enabled: newState
				}).catch(() => {
					// Tab might not have content script loaded yet
				});
			});
		});

		sendResponse({ success: true });
		return true;
	}
});

// Update extension icon/badge based on state
function updateIcon(enabled) {
	if (enabled) {
		browser.action.setBadgeText({ text: '' });
	} else {
		browser.action.setBadgeText({ text: 'OFF' });
		browser.action.setBadgeBackgroundColor({ color: '#666666' });
	}
}

// Listen for storage changes
browser.storage.onChanged.addListener((changes, area) => {
	if (area === 'local' && changes.enabled) {
		extensionState.enabled = changes.enabled.newValue;
		updateIcon(changes.enabled.newValue);
	}
});

// Restore the badge on startup. Without this the "OFF" badge disappears after a
// browser restart even though the extension is still disabled.
browser.storage.local.get(['enabled']).then(result => {
	extensionState.enabled = result.enabled !== false;
	updateIcon(extensionState.enabled);
}).catch(() => {
	// Storage unavailable; leave the badge at its default.
});

console.log('[YouTube Uninterrupted] Background service worker initialized');
