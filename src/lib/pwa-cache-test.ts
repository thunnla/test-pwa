/**
 * PWA Cache Test Helper Module
 *
 * Provides utilities for testing browser cache storage capacity,
 * offline capability, and PWA readiness for offline-first architectures.
 */

import { browser } from '$app/environment';

// ── Constants ──────────────────────────────────────────────

const MANUAL_CACHE_NAME = 'manual-test-cache';

/** Known test asset paths grouped by category */
const TEST_ASSET_MANIFEST = {
	images: Array.from({ length: 40 }, (_, i) => `/test-assets/images/test-image-${String(i + 1).padStart(3, '0')}.bin`),
	audio: Array.from({ length: 10 }, (_, i) => `/test-assets/audio/test-audio-${String(i + 1).padStart(3, '0')}.bin`),
	map: Array.from({ length: 20 }, (_, i) => `/test-assets/map/test-tile-${String(i + 1).padStart(3, '0')}.bin`)
};

// ── Types ──────────────────────────────────────────────────

export interface StorageUsage {
	usage: number;
	quota: number;
	usageMB: number;
	quotaMB: number;
	percentUsed: number;
}

export interface CacheTestResult {
	totalFiles: number;
	cachedCount: number;
	failedCount: number;
	failures: string[];
	durationMs: number;
}

// ── Public API ─────────────────────────────────────────────

/**
 * Fetch and cache all test assets into a manual cache.
 * Logs progress to console for debugging.
 */
export async function cacheTestAssets(): Promise<CacheTestResult> {
	if (!browser) throw new Error('cacheTestAssets() requires a browser environment');

	console.log('PWA cache test started');
	const start = performance.now();

	const allPaths = [
		...TEST_ASSET_MANIFEST.images,
		...TEST_ASSET_MANIFEST.audio,
		...TEST_ASSET_MANIFEST.map
	];

	const cache = await caches.open(MANUAL_CACHE_NAME);
	let cachedCount = 0;
	const failures: string[] = [];

	// Process in batches of 5 to avoid overwhelming the browser
	const BATCH_SIZE = 5;
	for (let i = 0; i < allPaths.length; i += BATCH_SIZE) {
		const batch = allPaths.slice(i, i + BATCH_SIZE);
		const results = await Promise.allSettled(
			batch.map(async (path) => {
				const response = await fetch(path);
				if (!response.ok) throw new Error(`HTTP ${response.status} for ${path}`);
				await cache.put(path, response);
				return path;
			})
		);

		for (const result of results) {
			if (result.status === 'fulfilled') {
				cachedCount++;
			} else {
				const failedPath = batch[results.indexOf(result)];
				failures.push(failedPath);
				console.warn(`Failed to cache: ${failedPath}`, result.reason);
			}
		}

		// Log progress every batch
		console.log(`Caching progress: ${Math.min(i + BATCH_SIZE, allPaths.length)}/${allPaths.length}`);
	}

	const durationMs = Math.round(performance.now() - start);
	console.log(`Assets cached successfully: ${cachedCount}/${allPaths.length} in ${durationMs}ms`);

	return {
		totalFiles: allPaths.length,
		cachedCount,
		failedCount: failures.length,
		failures,
		durationMs
	};
}

/**
 * Query browser storage usage via StorageManager API.
 */
export async function getStorageUsage(): Promise<StorageUsage> {
	if (!browser) throw new Error('getStorageUsage() requires a browser environment');

	if (!navigator.storage?.estimate) {
		throw new Error('StorageManager API not supported in this browser');
	}

	const estimate = await navigator.storage.estimate();
	const usage = estimate.usage ?? 0;
	const quota = estimate.quota ?? 0;

	const result: StorageUsage = {
		usage,
		quota,
		usageMB: toMB(usage),
		quotaMB: toMB(quota),
		percentUsed: quota > 0 ? round((usage / quota) * 100, 2) : 0
	};

	console.log('Storage usage:', result);
	return result;
}

/**
 * Delete ALL caches from CacheStorage.
 * Returns the number of caches deleted.
 */
export async function clearAllCaches(): Promise<number> {
	if (!browser) throw new Error('clearAllCaches() requires a browser environment');

	const names = await caches.keys();
	await Promise.all(names.map((name) => caches.delete(name)));

	console.log(`Caches cleared: ${names.length} caches deleted`, names);
	return names.length;
}

/**
 * List all cache names currently in CacheStorage.
 */
export async function listCaches(): Promise<string[]> {
	if (!browser) throw new Error('listCaches() requires a browser environment');

	const names = await caches.keys();
	console.log('Cache list:', names);
	return names;
}

/**
 * Test offline capability by attempting to read from cache.
 * Returns true if a cached asset can be retrieved.
 */
export async function testOfflineCapability(): Promise<boolean> {
	if (!browser) throw new Error('testOfflineCapability() requires a browser environment');

	try {
		// Try to find ANY cached response across all caches
		const cacheNames = await caches.keys();
		for (const name of cacheNames) {
			const cache = await caches.open(name);
			const keys = await cache.keys();
			if (keys.length > 0) {
				const response = await cache.match(keys[0]);
				if (response) {
					console.log('Offline test passed — retrieved cached asset from:', name);
					return true;
				}
			}
		}

		console.warn('Offline test failed — no cached assets found');
		return false;
	} catch (error) {
		console.error('Offline test failed with error:', error);
		return false;
	}
}

/**
 * Convert bytes to a human-readable MB string.
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 MB';
	const mb = bytes / (1024 * 1024);
	if (mb < 0.01) return `${(bytes / 1024).toFixed(2)} KB`;
	if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
	return `${mb.toFixed(2)} MB`;
}

// ── Internal helpers ───────────────────────────────────────

function toMB(bytes: number): number {
	return round(bytes / (1024 * 1024), 2);
}

function round(value: number, decimals: number): number {
	const factor = 10 ** decimals;
	return Math.round(value * factor) / factor;
}
