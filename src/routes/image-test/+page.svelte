<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let isOnline = $state(true);
	let imageStatuses = $state<Array<{ path: string; loaded: boolean }>>([]);

	const IMAGE_COUNT = 40;
	const images = Array.from({ length: IMAGE_COUNT }, (_, i) => {
		const num = String(i + 1).padStart(3, '0');
		return `/test-assets/images/test-image-${num}.bin`;
	});

	onMount(() => {
		isOnline = navigator.onLine;
		window.addEventListener('online', () => (isOnline = true));
		window.addEventListener('offline', () => (isOnline = false));

		// Initialize statuses
		imageStatuses = images.map((path) => ({ path, loaded: false }));

		// Probe each file to check availability (they are binary so we just fetch HEAD)
		images.forEach(async (path, idx) => {
			try {
				const res = await fetch(path, { method: 'HEAD' });
				imageStatuses[idx] = { path, loaded: res.ok };
			} catch {
				imageStatuses[idx] = { path, loaded: false };
			}
		});
	});

	const loadedCount = $derived(imageStatuses.filter((s) => s.loaded).length);
	const failedCount = $derived(imageStatuses.filter((s) => !s.loaded).length);
</script>

<svelte:head>
	<title>Offline Image Viewer — Lam Thuong PWA Test</title>
</svelte:head>

<div class="page">
	<div class="toolbar">
		<a href="/pwa-test" class="back">← Dashboard</a>
		<h1>Offline Image Viewer</h1>
		<span class="indicator" class:online={isOnline} class:offline={!isOnline}>
			{isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}
		</span>
	</div>

	<div class="content">
		<div class="summary">
			<span><strong>{IMAGE_COUNT}</strong> test images (1 MB each)</span>
			{#if imageStatuses.length > 0}
				<span class="text-success">✅ {loadedCount} available</span>
				{#if failedCount > 0}
					<span class="text-danger">❌ {failedCount} unavailable</span>
				{/if}
			{/if}
		</div>

		<div class="grid">
			{#each imageStatuses as item, i}
				<div class="tile" class:ok={item.loaded} class:fail={!item.loaded}>
					<div class="tile-icon">
						{#if item.loaded}
							✅
						{:else}
							❌
						{/if}
					</div>
					<div class="tile-name">Image {String(i + 1).padStart(3, '0')}</div>
					<div class="tile-size">1 MB</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.page {
		min-height: 100vh;
		font-family: system-ui, -apple-system, sans-serif;
		color: #1a1a2e;
	}

	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 1rem;
		background: #1e293b;
		color: #fff;
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.toolbar h1 { font-size: 1rem; margin: 0; flex: 1; }

	.back {
		color: #93c5fd;
		text-decoration: none;
		font-size: 0.85rem;
		white-space: nowrap;
	}
	.back:hover { text-decoration: underline; }

	.indicator {
		font-size: 0.78rem;
		font-weight: 600;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		white-space: nowrap;
	}
	.online { background: #166534; color: #dcfce7; }
	.offline { background: #991b1b; color: #fee2e2; }

	.content {
		max-width: 900px;
		margin: 0 auto;
		padding: 1rem;
	}

	.summary {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: center;
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}

	.text-success { color: #16a34a; }
	.text-danger { color: #dc2626; }

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
		gap: 0.6rem;
	}

	.tile {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.75rem 0.5rem;
		border-radius: 10px;
		border: 1px solid #e2e8f0;
		background: #f8fafc;
		transition: border-color 0.15s;
	}
	.tile.ok { border-color: #86efac; background: #f0fdf4; }
	.tile.fail { border-color: #fca5a5; background: #fef2f2; }

	.tile-icon { font-size: 1.5rem; }
	.tile-name { font-size: 0.82rem; font-weight: 500; color: #334155; }
	.tile-size { font-size: 0.72rem; color: #94a3b8; }
</style>
