<script lang="ts">
	import { onMount } from 'svelte';
	import { getCacheInfo, getStorageEstimate } from '$lib/offline-storage';

	let storageInfo = $state<{
		usageMB?: number;
		quotaMB?: number;
		usagePercent?: number;
	}>({});

	let cacheInfo = $state<Array<{ name: string; size: number }>>([]);
	let loading = $state(true);

	// Props
	interface Props {
		showDetails?: boolean;
		autoRefresh?: number; // seconds
	}

	let { showDetails = false, autoRefresh }: Props = $props();

	onMount(async () => {
		await refresh();
		loading = false;

		// Auto refresh
		let interval: NodeJS.Timeout | undefined;
		if (autoRefresh && autoRefresh > 0) {
			interval = setInterval(refresh, autoRefresh * 1000);
		}

		return () => {
			if (interval) clearInterval(interval);
		};
	});

	async function refresh() {
		storageInfo = await getStorageEstimate();
		cacheInfo = await getCacheInfo();
	}

	// Calculate cache sizes for different types
	const imageCacheSize = $derived(
		cacheInfo.find((c) => c.name === 'images-cache')?.size || 0
	);
	const audioCacheSize = $derived(
		cacheInfo.find((c) => c.name === 'audio-cache')?.size || 0
	);
	const mapTilesSize = $derived(
		(cacheInfo.find((c) => c.name === 'map-tiles-cache')?.size || 0) +
		(cacheInfo.find((c) => c.name === 'map-tiles-cdn-cache')?.size || 0)
	);
</script>

<div class="cache-widget">
	<div class="cache-header">
		<h3>📊 Cache Storage</h3>
		<button class="btn-refresh" onclick={() => refresh()}>🔄</button>
	</div>

	{#if loading}
		<p class="loading">Loading...</p>
	{:else}
		<!-- Storage Bar -->
		{#if storageInfo.usageMB !== undefined}
			<div class="storage-summary">
				<div class="storage-bar">
					<div class="storage-fill" style="width: {storageInfo.usagePercent || 0}%"></div>
				</div>
				<div class="storage-text">
					<strong>{storageInfo.usageMB.toFixed(2)} MB</strong> / 
					{storageInfo.quotaMB?.toFixed(2)} MB 
					<span class="percent">({storageInfo.usagePercent?.toFixed(1)}%)</span>
				</div>
			</div>
		{/if}

		<!-- Cache Breakdown -->
		{#if showDetails}
			<div class="cache-breakdown">
				<div class="cache-item">
					<span class="cache-label">🖼️ Images:</span>
					<span class="cache-value">{imageCacheSize} entries</span>
				</div>
				<div class="cache-item">
					<span class="cache-label">🎵 Audio:</span>
					<span class="cache-value">{audioCacheSize} entries</span>
				</div>
				<div class="cache-item">
					<span class="cache-label">🗺️ Map Tiles:</span>
					<span class="cache-value">{mapTilesSize} entries</span>
				</div>
			</div>

			<details class="cache-details">
				<summary>All Caches</summary>
				<ul class="cache-list">
					{#each cacheInfo as cache}
						<li>
							<strong>{cache.name}</strong>: {cache.size} entries
						</li>
					{/each}
				</ul>
			</details>
		{/if}
	{/if}
</div>

<style>
	.cache-widget {
		background: #f8f9fa;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
	}

	.cache-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	h3 {
		margin: 0;
		font-size: 1rem;
		color: #2c3e50;
	}

	.btn-refresh {
		background: #3498db;
		color: white;
		border: none;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
	}

	.btn-refresh:hover {
		background: #2980b9;
	}

	.loading {
		color: #6b7280;
		font-style: italic;
		margin: 0;
	}

	.storage-summary {
		margin: 1rem 0;
	}

	.storage-bar {
		width: 100%;
		height: 20px;
		background: #e5e7eb;
		border-radius: 10px;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	.storage-fill {
		height: 100%;
		background: linear-gradient(90deg, #3498db, #2ecc71);
		transition: width 0.3s ease;
	}

	.storage-text {
		font-size: 0.9rem;
		color: #374151;
	}

	.percent {
		color: #6b7280;
	}

	.cache-breakdown {
		margin: 1rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.cache-item {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem;
		background: white;
		border-radius: 4px;
		font-size: 0.9rem;
	}

	.cache-label {
		font-weight: 500;
		color: #2c3e50;
	}

	.cache-value {
		color: #6b7280;
		font-family: monospace;
	}

	.cache-details {
		margin-top: 1rem;
		font-size: 0.85rem;
	}

	summary {
		cursor: pointer;
		font-weight: 600;
		color: #3498db;
		padding: 0.25rem;
	}

	summary:hover {
		color: #2980b9;
	}

	.cache-list {
		list-style: none;
		padding: 0.5rem 0 0 1rem;
		margin: 0;
	}

	.cache-list li {
		padding: 0.25rem 0;
		color: #374151;
	}
</style>
