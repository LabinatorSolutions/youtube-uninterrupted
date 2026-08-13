/**
 * YouTube Uninterrupted - Pause/resume regression tests
 *
 * These tests exist because two separate bugs in this exact area have shipped:
 * the extension restarting a video the user had paused, and the extension
 * quietly giving up after a few interruptions. Both were invisible to lint,
 * typecheck and web-ext lint. They are only catchable by driving the real
 * content script against a DOM that behaves the way YouTube's does.
 *
 * The fixture reproduces the two YouTube behaviours that caused the trouble:
 *
 *   1. Dialogs are not deleted when dismissed. YouTube hides them and leaves
 *      the node — text and all — parked inside the persistent
 *      `ytd-popup-container`. Anything that matches on text alone therefore
 *      keeps matching forever.
 *   2. Those same nodes get reused for later, unrelated popups, so any styling
 *      the extension applies must be reversible.
 *
 * The <video> element is instrumented rather than fed real media: the extension
 * only ever reads `paused`, `ended` and `currentTime` and calls `play()`, so
 * those four are stubbed and `play()` is counted. Everything else — the dialog
 * DOM, the visibility checks, the event ordering, the timers — is real, and
 * user input is delivered as genuine trusted events through the browser.
 *
 * Run: bun run test:e2e
 * Override the browser binary with CHROMIUM_PATH=/path/to/chromium
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 YouTube Uninterrupted Contributors
 */

import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(
	process.env.SRC_PATH || join(ROOT, 'content-scripts', 'youtube-uninterrupted.js'),
	'utf8'
);

// How long to wait when asserting that nothing happens. Must comfortably exceed
// SCAN_INTERVAL_MS (5s) so every timer in the extension has had a turn.
const SETTLE_MS = 7000;

const PAUSE_TEXT = 'Video paused. Continue watching?';

// ============================================================================
// FIXTURE
// ============================================================================

const pageHtml = (dialogHtml) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  video { display: block; width: 320px; height: 180px; background: #222 }
  tp-yt-paper-dialog { display: block; padding: 20px; background: #fff; border: 1px solid #000 }
  tp-yt-paper-dialog[data-dismissed] { display: none }
  ytd-popup-container { display: block }
</style></head><body>
<ytd-app>
  <div id="movie_player" class="html5-video-player"><video class="html5-main-video"></video></div>
  <ytd-popup-container class="style-scope ytd-app">${dialogHtml}</ytd-popup-container>
</ytd-app></body></html>`;

/**
 * @param text  dialog body text
 * @param dismissed  true renders it the way YouTube leaves a closed dialog:
 *                   still in the DOM, still carrying its text, but hidden
 */
const dialog = (text, dismissed) => `
  <tp-yt-paper-dialog id="dlg" class="style-scope ytd-popup-container"${dismissed ? ' data-dismissed aria-hidden="true"' : ''}>
    <yt-confirm-dialog-renderer class="style-scope">
      <div id="title">${text}</div>
      <yt-button-renderer id="confirm-button"><button>Yes</button></yt-button-renderer>
    </yt-confirm-dialog-renderer>
  </tp-yt-paper-dialog>`;

/** Install the extension API stubs and the instrumented video element. */
async function instrument(page) {
	await page.evaluate(() => {
		window.browser = {
			storage: { local: { get: () => Promise.resolve({ enabled: true }) } },
			runtime: { onMessage: { addListener: () => {} } }
		};

		const video = document.querySelector('video');
		let paused = true;
		window.__playCalls = 0;

		Object.defineProperty(video, 'paused', { get: () => paused, configurable: true });
		Object.defineProperty(video, 'ended', { get: () => false, configurable: true });
		Object.defineProperty(video, 'currentTime', { get: () => 42, set: () => {}, configurable: true });

		video.play = () => {
			window.__playCalls++;
			paused = false;
			video.dispatchEvent(new Event('play'));
			return Promise.resolve();
		};

		window.__startPlaying = () => { paused = false; video.dispatchEvent(new Event('play')); };
		window.__pause = () => { paused = true; video.dispatchEvent(new Event('pause')); };
		window.__isPaused = () => paused;
	});
}

/** Fresh page with the extension running and the video playing. */
async function bootPlaying(browser, dialogHtml) {
	const page = await browser.newPage();
	await page.setContent(pageHtml(dialogHtml));
	await instrument(page);
	await page.evaluate(SRC);
	await page.waitForTimeout(300);
	await page.evaluate(() => window.__startPlaying());
	await page.waitForTimeout(300);
	return page;
}

// ============================================================================
// TESTS
// ============================================================================

const results = [];

function record(name, pass, detail) {
	results.push({ name, pass, detail });
}

/**
 * Scenarios where the user pauses the video and we assert what follows.
 * `expectResume: false` is the anti-regression direction: the extension must
 * keep its hands off.
 */
const PAUSE_SCENARIOS = [
	{
		name: 'stale dismissed dialog + user clicks pause',
		dom: dialog(PAUSE_TEXT, true), pause: 'click', expectResume: false
	},
	{
		name: 'unrelated dismissed popup + user clicks pause',
		dom: dialog('Share this video', true), pause: 'click', expectResume: false
	},
	{
		name: 'stale dismissed dialog + user presses K to pause',
		dom: dialog(PAUSE_TEXT, true), pause: 'key', expectResume: false
	},
	{
		name: 'empty popup container + user clicks pause',
		dom: '', pause: 'click', expectResume: false
	},
	{
		name: 'YouTube pauses and shows the dialog, no user input',
		dom: '', pause: 'youtube', injectOnPause: dialog(PAUSE_TEXT, false), expectResume: true
	},
	{
		name: 'visible user-triggered dialog (unsubscribe) after a click',
		dom: dialog('Unsubscribe from this channel?', false), pause: 'click', expectResume: false
	}
];

async function runPauseScenario(browser, scenario) {
	const page = await bootPlaying(browser, scenario.dom);

	if (scenario.pause === 'click') await page.click('video');
	else if (scenario.pause === 'key') await page.keyboard.press('k');
	// 'youtube' delivers no user input at all

	await page.evaluate((html) => {
		window.__playCalls = 0;                 // count only post-pause resumes
		if (html) document.querySelector('ytd-popup-container').innerHTML = html;
		window.__pause();
	}, scenario.injectOnPause || '');

	await page.waitForTimeout(SETTLE_MS);

	const out = await page.evaluate(() => ({
		calls: window.__playCalls,
		paused: window.__isPaused()
	}));
	await page.close();

	const resumed = out.calls > 0;
	record(
		scenario.name,
		resumed === scenario.expectResume,
		`resume expected ${scenario.expectResume}, play() calls ${out.calls}, still paused ${out.paused}`
	);
}

/** A dialog node reused for an unrelated popup must not stay hidden. */
async function runNodeReuse(browser) {
	const page = await browser.newPage();
	await page.setContent(pageHtml(dialog(PAUSE_TEXT, false)));
	await instrument(page);
	await page.evaluate(() => window.__startPlaying());
	await page.evaluate(SRC);
	await page.waitForTimeout(1000);

	const hiddenWhenHandled = await page.evaluate(
		() => document.querySelector('#dlg').style.display === 'none'
	);

	// YouTube reuses the node for something else entirely.
	await page.evaluate(() => {
		document.querySelector('#dlg #title').textContent = 'Unsubscribe from this channel?';
	});
	await page.waitForTimeout(SETTLE_MS);

	const after = await page.evaluate(() => {
		const dlg = document.querySelector('#dlg');
		return {
			inline: dlg.style.display,
			visible: dlg.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
		};
	});
	await page.close();

	record(
		'reused dialog node is usable again after the pause dialog is handled',
		hiddenWhenHandled && after.visible === true && after.inline === '',
		`hidden while handled ${hiddenWhenHandled}, later visible ${after.visible}, inline display "${after.inline}"`
	);
}

/** A deliberate pause inside the post-interruption grace window must stand. */
async function runPauseInsideGrace(browser) {
	const page = await bootPlaying(browser, dialog(PAUSE_TEXT, false));
	await page.click('video');                                   // real click, ~0.6s after handling
	await page.evaluate(() => { window.__playCalls = 0; window.__pause(); });
	await page.waitForTimeout(SETTLE_MS);

	const out = await page.evaluate(() => ({
		calls: window.__playCalls, paused: window.__isPaused()
	}));
	await page.close();

	record(
		'user pauses inside the post-interruption grace window',
		out.calls === 0 && out.paused === true,
		`play() calls ${out.calls}, still paused ${out.paused}`
	);
}

/** The attempt cap bounds one interruption, not the whole session. */
async function runRepeatedInterruptions(browser) {
	const page = await bootPlaying(browser, '');
	const seen = [];

	for (let episode = 0; episode < 4; episode++) {
		if (episode > 0) await page.waitForTimeout(SETTLE_MS);   // past INTERRUPTION_GRACE_MS
		await page.evaluate((html) => {
			document.querySelector('ytd-popup-container').innerHTML = html;
			window.__pause();
		}, dialog(PAUSE_TEXT, false));
		await page.waitForTimeout(1000);
		seen.push(await page.evaluate(() => window.__playCalls));
	}
	await page.close();

	record(
		'four interruptions across a session are all handled',
		seen.join(',') === '1,2,3,4',
		`cumulative play() calls: ${seen.join(' then ')}`
	);
}

// ============================================================================
// RUNNER
// ============================================================================

async function launch() {
	if (process.env.CHROMIUM_PATH) {
		return chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
	}
	try {
		return await chromium.launch();                          // Playwright's own build
	} catch (error) {
		for (const path of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) {
			try {
				return await chromium.launch({ executablePath: path });
			} catch { /* try the next one */ }
		}
		throw new Error(
			'No usable Chromium. Run "bunx playwright install chromium" or set CHROMIUM_PATH.',
			{ cause: error }
		);
	}
}

const browser = await launch();
try {
	for (const scenario of PAUSE_SCENARIOS) await runPauseScenario(browser, scenario);
	await runNodeReuse(browser);
	await runPauseInsideGrace(browser);
	await runRepeatedInterruptions(browser);
} finally {
	await browser.close();
}

let failed = 0;
for (const result of results) {
	if (!result.pass) failed++;
	console.log(`${result.pass ? 'PASS' : 'FAIL'}  ${result.name}\n      ${result.detail}`);
}

console.log(
	failed === 0
		? `\nAll ${results.length} scenarios pass.`
		: `\n${failed} of ${results.length} scenarios FAILED.`
);
process.exit(failed === 0 ? 0 : 1);
