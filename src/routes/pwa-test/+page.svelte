<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import {
		getStorageUsage,
		listCaches,
		clearAllCaches,
		cacheTestAssets,
		testOfflineCapability,
		formatBytes,
		type StorageUsage,
		type CacheTestResult
	} from '$lib/pwa-cache-test';

	// ── State ──

	let isOnline = $state(true);
	let storageInfo = $state<StorageUsage | null>(null);
	let cacheNames = $state<string[]>([]);
	let cacheResult = $state<CacheTestResult | null>(null);
	let offlineOk = $state<boolean | null>(null);

	let loading = $state<Record<string, boolean>>({});
	let error = $state('');

	// ── Lifecycle ──

	onMount(() => {
		isOnline = navigator.onLine;
		window.addEventListener('online', () => (isOnline = true));
		window.addEventListener('offline', () => (isOnline = false));
		refreshAll();
	});

	async function refreshAll() {
		await Promise.all([refreshStorage(), refreshCaches()]);
	}

	// ── Actions ──

	async function refreshStorage() {
		loading = { ...loading, storage: true };
		try {
			storageInfo = await getStorageUsage();
		} catch (e) {
			error = String(e);
		}
		loading = { ...loading, storage: false };
	}

	async function refreshCaches() {
		loading = { ...loading, caches: true };
		try {
			cacheNames = await listCaches();
		} catch (e) {
			error = String(e);
		}
		loading = { ...loading, caches: false };
	}

	async function handleCacheAssets() {
		loading = { ...loading, cacheAssets: true };
		error = '';
		try {
			cacheResult = await cacheTestAssets();
			await refreshAll();
		} catch (e) {
			error = String(e);
		}
		loading = { ...loading, cacheAssets: false };
	}

	async function handleTestOffline() {
		loading = { ...loading, offline: true };
		try {
			offlineOk = await testOfflineCapability();
		} catch {
			offlineOk = false;
		}
		loading = { ...loading, offline: false };
	}

	async function handleClearCaches() {
		loading = { ...loading, clear: true };
		try {
			await clearAllCaches();
			cacheNames = [];
			cacheResult = null;
			offlineOk = null;
			await refreshStorage();
		} catch (e) {
			error = String(e);
		}
		loading = { ...loading, clear: false };
	}
</script>

<svelte:head>
	<title>Lam Thuong Offline PWA Test Dashboard</title>
</svelte:head>

<div class="page">
	<header class="header">
		<h1>Lam Thuong Offline PWA Test Dashboard</h1>
		<span class="badge" class:online={isOnline} class:offline={!isOnline}>
			{isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}
		</span>
	</header>

	{#if error}
		<div class="error">
			{error}
			<button onclick={() => (error = '')}>✕</button>
		</div>
	{/if}

	<!-- ── Viewer Links ── -->
	<section class="card-grid">
		<a href="/map-test" class="card card-link">
			<div class="card-icon">🗺️</div>
			<h2>MAP TEST</h2>
			<p>Open Offline Map Viewer</p>
		</a>

		<a href="/image-test" class="card card-link">
			<div class="card-icon">🖼️</div>
			<h2>IMAGE TEST</h2>
			<p>Open Offline Image Viewer</p>
		</a>

		<a href="/audio-test" class="card card-link">
			<div class="card-icon">🎵</div>
			<h2>AUDIO TEST</h2>
			<p>Open Offline Audio Viewer</p>
		</a>
	</section>

	<!-- ── Storage Test ── -->
	<section class="card">
		<h2>📊 STORAGE TEST</h2>
		<button class="btn" onclick={refreshStorage} disabled={loading.storage}>
			{loading.storage ? 'Checking…' : 'Check Storage Usage'}
		</button>
		{#if storageInfo}
			<div class="stat-grid">
				<div class="stat">
					<span class="stat-label">Used</span>
					<span class="stat-value">{formatBytes(storageInfo.usage)}</span>
				</div>
				<div class="stat">
					<span class="stat-label">Quota</span>
					<span class="stat-value">{formatBytes(storageInfo.quota)}</span>
				</div>
				<div class="stat">
					<span class="stat-label">Usage</span>
					<span class="stat-value">{storageInfo.percentUsed}%</span>
				</div>
			</div>
			<div class="progress-track">
				<div
					class="progress-fill"
					style="width:{Math.min(storageInfo.percentUsed, 100)}%"
					class:warn={storageInfo.percentUsed > 50}
					class:danger={storageInfo.percentUsed > 80}
				></div>
			</div>
		{/if}
	</section>

	<!-- ── Cache Test ── -->
	<section class="card">
		<h2>📦 CACHE TEST</h2>
		<div class="btn-row">
			<button class="btn" onclick={refreshCaches} disabled={loading.caches}>
				{loading.caches ? 'Listing…' : 'List Cache Names'}
			</button>
			<button class="btn btn-primary" onclick={handleCacheAssets} disabled={loading.cacheAssets}>
				{loading.cacheAssets ? 'Caching…' : 'Cache Test Assets (~110 MB)'}
			</button>
			<button class="btn btn-accent" onclick={handleTestOffline} disabled={loading.offline}>
				{loading.offline ? 'Testing…' : 'Test Offline Capability'}
			</button>
			<button class="btn btn-danger" onclick={handleClearCaches} disabled={loading.clear}>
				{loading.clear ? 'Clearing…' : 'Clear All Caches'}
			</button>
		</div>

		{#if cacheNames.length > 0}
			<h3>{cacheNames.length} cache(s)</h3>
			<ul class="tag-list">
				{#each cacheNames as name}
					<li><code>{name}</code></li>
				{/each}
			</ul>
		{:else}
			<p class="muted">No caches found.</p>
		{/if}

		{#if cacheResult}
			<div class="result">
				<strong>Cache result:</strong>
				{cacheResult.cachedCount}/{cacheResult.totalFiles} files cached
				in {(cacheResult.durationMs / 1000).toFixed(1)}s
				{#if cacheResult.failedCount > 0}
					<span class="text-danger">({cacheResult.failedCount} failed)</span>
				{/if}
			</div>
		{/if}

		{#if offlineOk !== null}
			<div class="result">
				<strong>Offline:</strong>
				{#if offlineOk}
					<span class="text-success">✅ PASSED — cached assets retrievable</span>
				{:else}
					<span class="text-danger">❌ FAILED — no cached assets available</span>
				{/if}
			</div>
		{/if}
	</section>
</div>

<style>
	.page {
		max-width: 800px;
		margin: 0 auto;
		padding: 1.5rem 1rem 3rem;
		font-family: system-ui, -apple-system, sans-serif;
		color: #1a1a2e;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	h1 { font-size: 1.5rem; margin: 0; }
	h2 { font-size: 1.1rem; margin: 0 0 0.75rem; }
	h3 { font-size: 0.95rem; margin: 0.75rem 0 0.25rem; }

	.badge {
		font-size: 0.82rem;
		font-weight: 600;
		padding: 0.25rem 0.7rem;
		border-radius: 999px;
	}
	.online { background: #dcfce7; color: #166534; }
	.offline { background: #fee2e2; color: #991b1b; }

	/* Cards */
	.card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 1rem 1.25rem;
		margin-bottom: 1rem;
	}

	.card-link {
		text-decoration: none;
		color: inherit;
		text-align: center;
		transition: box-shadow 0.15s, border-color 0.15s;
		cursor: pointer;
	}

	.card-link:hover {
		border-color: #3b82f6;
		box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
	}

	.card-link h2 { color: #334155; font-size: 0.95rem; }
	.card-link p { color: #64748b; font-size: 0.85rem; margin: 0.25rem 0 0; }
	.card-icon { font-size: 2rem; margin-bottom: 0.5rem; }

	/* Buttons */
	.btn-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.btn {
		padding: 0.5rem 0.9rem;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #f1f5f9;
		color: #334155;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 500;
		transition: background 0.15s;
	}
	.btn:hover:not(:disabled) { background: #e2e8f0; }
	.btn:disabled { opacity: 0.5; cursor: not-allowed; }
	.btn-primary { background: #2563eb; color: #fff; border-color: #2563eb; }
	.btn-primary:hover:not(:disabled) { background: #1d4ed8; }
	.btn-accent { background: #7c3aed; color: #fff; border-color: #7c3aed; }
	.btn-accent:hover:not(:disabled) { background: #6d28d9; }
	.btn-danger { background: #ef4444; color: #fff; border-color: #ef4444; }
	.btn-danger:hover:not(:disabled) { background: #dc2626; }

	/* Stats */
	.stat-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
		margin: 0.75rem 0;
	}
	.stat { display: flex; flex-direction: column; gap: 0.1rem; }
	.stat-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; }
	.stat-value { font-size: 1.1rem; font-weight: 600; }

	/* Progress */
	.progress-track { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
	.progress-fill { height: 100%; background: #22c55e; border-radius: 3px; transition: width 0.3s; }
	.progress-fill.warn { background: #f59e0b; }
	.progress-fill.danger { background: #ef4444; }

	/* Tags */
	.tag-list { list-style: none; padding: 0; margin: 0.25rem 0; display: flex; flex-wrap: wrap; gap: 0.35rem; }
	.tag-list li { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.2rem 0.55rem; font-size: 0.8rem; }

	/* Results */
	.result { margin-top: 0.5rem; font-size: 0.9rem; }
	.text-success { color: #16a34a; }
	.text-danger { color: #dc2626; }
	.muted { color: #94a3b8; font-size: 0.88rem; }

	.error {
		background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b;
		padding: 0.6rem 1rem; border-radius: 8px; margin-bottom: 1rem;
		display: flex; align-items: center; gap: 0.5rem;
	}
	.error button {
		margin-left: auto; background: none; border: none;
		cursor: pointer; color: #991b1b; font-size: 1rem;
	}

	code { font-family: 'SF Mono', Consolas, monospace; font-size: 0.78rem; }
</style>
