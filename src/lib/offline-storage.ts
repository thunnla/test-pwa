/**
 * Offline Storage Utilities
 * 
 * Sử dụng:
 * - Cache API: cho App Shell (HTML/CSS/JS), images, API responses
 * - idb-keyval: cho structured data (objects, arrays)
 */

import { get, set, del, clear, keys } from 'idb-keyval';

// ============================================
// Cache API Utilities
// ============================================

/**
 * Lưu request/response vào Cache API
 * Service Worker sẽ tự động handle, nhưng có thể dùng manual caching
 */
export async function cacheResource(cacheName: string, url: string): Promise<void> {
	if (!('caches' in window)) {
		console.warn('Cache API not supported');
		return;
	}

	try {
		const cache = await caches.open(cacheName);
		await cache.add(url);
		console.log(`✅ Cached: ${url} in ${cacheName}`);
	} catch (error) {
		console.error(`❌ Failed to cache ${url}:`, error);
	}
}

/**
 * Lấy resource từ Cache API
 */
export async function getCachedResource(cacheName: string, url: string): Promise<Response | undefined> {
	if (!('caches' in window)) {
		return undefined;
	}

	try {
		const cache = await caches.open(cacheName);
		return await cache.match(url);
	} catch (error) {
		console.error(`❌ Failed to get cached ${url}:`, error);
		return undefined;
	}
}

/**
 * Xóa cache cũ
 */
export async function clearOldCaches(cacheWhitelist: string[]): Promise<void> {
	if (!('caches' in window)) {
		return;
	}

	const cacheNames = await caches.keys();
	await Promise.all(
		cacheNames.map(async (cacheName) => {
			if (!cacheWhitelist.includes(cacheName)) {
				console.log(`🗑️ Deleting old cache: ${cacheName}`);
				await caches.delete(cacheName);
			}
		})
	);
}

/**
 * Lấy thông tin cache size (ước tính)
 */
export async function getCacheInfo(): Promise<{ name: string; size: number }[]> {
	if (!('caches' in window)) {
		return [];
	}

	const cacheNames = await caches.keys();
	const cacheInfo = await Promise.all(
		cacheNames.map(async (name) => {
			const cache = await caches.open(name);
			const keys = await cache.keys();
			return {
				name,
				size: keys.length
			};
		})
	);

	return cacheInfo;
}

// ============================================
// IndexedDB (idb-keyval) Utilities
// ============================================

/**
 * Lưu data vào IndexedDB
 * Tốt cho structured data: objects, arrays, Map, Set, Date, etc.
 */
export async function saveToIDB<T>(key: string, value: T): Promise<void> {
	try {
		await set(key, value);
		console.log(`✅ Saved to IDB: ${key}`);
	} catch (error) {
		console.error(`❌ Failed to save to IDB:`, error);
		throw error;
	}
}

/**
 * Lấy data từ IndexedDB
 */
export async function getFromIDB<T>(key: string): Promise<T | undefined> {
	try {
		return await get<T>(key);
	} catch (error) {
		console.error(`❌ Failed to get from IDB:`, error);
		return undefined;
	}
}

/**
 * Xóa entry từ IndexedDB
 */
export async function deleteFromIDB(key: string): Promise<void> {
	try {
		await del(key);
		console.log(`🗑️ Deleted from IDB: ${key}`);
	} catch (error) {
		console.error(`❌ Failed to delete from IDB:`, error);
		throw error;
	}
}

/**
 * Xóa tất cả data từ IndexedDB
 */
export async function clearIDB(): Promise<void> {
	try {
		await clear();
		console.log(`🗑️ Cleared all IDB data`);
	} catch (error) {
		console.error(`❌ Failed to clear IDB:`, error);
		throw error;
	}
}

/**
 * Lấy tất cả keys trong IndexedDB
 */
export async function getAllIDBKeys(): Promise<IDBValidKey[]> {
	try {
		return await keys();
	} catch (error) {
		console.error(`❌ Failed to get IDB keys:`, error);
		return [];
	}
}

// ============================================
// Storage Quota Info
// ============================================

export interface StorageEstimate {
	quota?: number; // bytes
	usage?: number; // bytes
	usagePercent?: number;
	usageMB?: number;
	quotaMB?: number;
}

/**
 * Lấy thông tin storage quota
 */
export async function getStorageEstimate(): Promise<StorageEstimate> {
	if (!('storage' in navigator && 'estimate' in navigator.storage)) {
		return {};
	}

	try {
		const estimate = await navigator.storage.estimate();
		const quota = estimate.quota || 0;
		const usage = estimate.usage || 0;
		const usagePercent = quota > 0 ? (usage / quota) * 100 : 0;

		return {
			quota,
			usage,
			usagePercent,
			usageMB: usage / (1024 * 1024),
			quotaMB: quota / (1024 * 1024)
		};
	} catch (error) {
		console.error(`❌ Failed to get storage estimate:`, error);
		return {};
	}
}

// ============================================
// Preload Critical Resources
// ============================================

/**
 * Preload critical resources cho offline
 * Tốt nhất gọi khi app khởi động hoặc khi có network
 */
export async function preloadCriticalResources(urls: string[]): Promise<void> {
	const cache = await caches.open('critical-cache');
	
	await Promise.allSettled(
		urls.map(async (url) => {
			try {
				await cache.add(url);
				console.log(`✅ Preloaded: ${url}`);
			} catch (error) {
				console.error(`❌ Failed to preload ${url}:`, error);
			}
		})
	);
}
