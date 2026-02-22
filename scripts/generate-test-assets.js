#!/usr/bin/env node

/**
 * Generate Test Assets for PWA Cache Testing
 *
 * Creates fake binary files to simulate real-world cache payloads:
 *   - 40 images  × 1 MB each  = ~40 MB
 *   - 10 audio   × 3 MB each  = ~30 MB
 *   - 20 map     × 2 MB each  = ~40 MB
 *   ─────────────────────────────────────
 *   Total                      ≈ 110 MB
 *
 * Usage:
 *   node scripts/generate-test-assets.js
 */

import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

// ── Config ─────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STATIC_DIR = join(__dirname, '..', 'static', 'test-assets');

const ASSET_DEFINITIONS = [
	{
		category: 'images',
		prefix: 'test-image',
		extension: '.bin',
		count: 40,
		sizeBytes: 1 * 1024 * 1024 // 1 MB
	},
	{
		category: 'audio',
		prefix: 'test-audio',
		extension: '.bin',
		count: 10,
		sizeBytes: 3 * 1024 * 1024 // 3 MB
	},
	{
		category: 'map',
		prefix: 'test-tile',
		extension: '.bin',
		count: 20,
		sizeBytes: 2 * 1024 * 1024 // 2 MB
	}
];

// ── Main ───────────────────────────────────────────────────

function main() {
	console.log('╔══════════════════════════════════════════╗');
	console.log('║   PWA Cache Test — Asset Generator       ║');
	console.log('╚══════════════════════════════════════════╝');
	console.log();

	let totalFiles = 0;
	let totalBytes = 0;
	let skippedFiles = 0;

	for (const def of ASSET_DEFINITIONS) {
		const dir = join(STATIC_DIR, def.category);
		mkdirSync(dir, { recursive: true });

		console.log(`▸ Generating ${def.category}: ${def.count} files × ${formatMB(def.sizeBytes)} each`);

		for (let i = 1; i <= def.count; i++) {
			const filename = `${def.prefix}-${String(i).padStart(3, '0')}${def.extension}`;
			const filepath = join(dir, filename);

			// Skip if file already exists with correct size
			if (existsSync(filepath)) {
				const stat = statSync(filepath);
				if (stat.size === def.sizeBytes) {
					skippedFiles++;
					continue;
				}
			}

			// Generate random binary data in chunks to avoid memory issues
			const CHUNK_SIZE = 256 * 1024; // 256 KB chunks
			const chunks = [];
			let remaining = def.sizeBytes;

			while (remaining > 0) {
				const chunkSize = Math.min(CHUNK_SIZE, remaining);
				chunks.push(randomBytes(chunkSize));
				remaining -= chunkSize;
			}

			writeFileSync(filepath, Buffer.concat(chunks));
			totalFiles++;
			totalBytes += def.sizeBytes;

			// Progress indicator every 10 files
			if (i % 10 === 0 || i === def.count) {
				process.stdout.write(`  ${i}/${def.count} files written\r`);
			}
		}

		console.log(`  ✓ ${def.category} done`);
	}

	console.log();
	console.log('─────────────────────────────────────────────');
	console.log(`  Created:  ${totalFiles} files (${formatMB(totalBytes)})`);
	console.log(`  Skipped:  ${skippedFiles} files (already exist)`);
	console.log(`  Location: ${STATIC_DIR}`);
	console.log('─────────────────────────────────────────────');
	console.log('✓ Done');
}

/**
 * @param {number} bytes
 * @returns {string}
 */
function formatMB(bytes) {
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

main();
