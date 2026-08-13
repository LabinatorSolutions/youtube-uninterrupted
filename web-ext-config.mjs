/**
 * YouTube Uninterrupted - web-ext configuration
 *
 * Keeps development files out of the published package. Without this, the .zip
 * carries the lockfile, tool configs and every contributor document — files an
 * AMO reviewer has to read through and users have to download for no reason.
 *
 * LICENSE is deliberately NOT ignored: this extension is AGPL-3.0-or-later, and
 * the licence requires a copy to travel with the work.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 YouTube Uninterrupted Contributors
 */

export default {
	ignoreFiles: [
		// Tooling and dependency management
		'package.json',
		'bun.lock',
		'tsconfig.json',
		'eslint.config.js',
		'web-ext-config.mjs',
		// Both entries are needed: the glob drops the contents, the bare name
		// drops the now-empty directory entry itself.
		'tests',
		'tests/**',

		// Repository documentation (the AMO listing carries the user-facing text)
		'ANDROID-INSTALLATION.md',
		'ARCHITECTURE.md',
		'CODE_OF_CONDUCT.md',
		'CONTRIBUTING.md',
		'ICON-GUIDE.md',
		'MAINTENANCE.md',
		'README.md',
		'SECURITY.md',
		'TESTING-CHECKLIST.md',

		// Repository metadata
		'.github/**'
	]
};
