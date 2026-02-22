<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let mapContainer: HTMLDivElement;
	let isOnline = $state(true);
	let mapReady = $state(false);
	let tileError = $state('');

	const LAM_THUONG_CENTER: [number, number] = [22.283, 104.775];
	const DEFAULT_ZOOM = 15;

	onMount(async () => {
		isOnline = navigator.onLine;
		window.addEventListener('online', () => (isOnline = true));
		window.addEventListener('offline', () => (isOnline = false));

		// Dynamic import to avoid SSR issues
		const L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		const map = L.map(mapContainer, {
			center: LAM_THUONG_CENTER,
			zoom: DEFAULT_ZOOM,
			zoomControl: true
		});

		// Local cached tiles
		const localTiles = L.tileLayer('/map-tiles/z{z}/{x}/{y}.png', {
			minZoom: 14,
			maxZoom: 18,
			attribution: 'Cached tiles for offline testing',
			errorTileUrl: ''
		});

		// Online OSM fallback
		const osmTiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			minZoom: 1,
			maxZoom: 19,
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
		});

		// Try local first, add OSM as base
		localTiles.on('tileerror', () => {
			if (!tileError) {
				tileError = 'Some local tiles missing — using online fallback if available';
			}
		});

		// Use local tiles as primary; add OSM underneath as fallback
		osmTiles.addTo(map);
		localTiles.addTo(map);

		// Layer control
		L.control
			.layers(
				{ 'Online (OSM)': osmTiles, 'Offline (Local)': localTiles },
				{},
				{ position: 'topright' }
			)
			.addTo(map);

		// Center marker
		L.marker(LAM_THUONG_CENTER)
			.addTo(map)
			.bindPopup('<strong>Lam Thượng</strong><br>Offline PWA Map Center')
			.openPopup();

		mapReady = true;

		return () => {
			map.remove();
		};
	});
</script>

<svelte:head>
	<title>Offline Map Viewer — Lam Thuong PWA Test</title>
</svelte:head>

<div class="map-page">
	<div class="toolbar">
		<a href="/pwa-test" class="back">← Dashboard</a>
		<h1>Offline Map Viewer</h1>
		<span class="indicator" class:online={isOnline} class:offline={!isOnline}>
			{isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}
		</span>
	</div>

	{#if tileError}
		<div class="tile-warning">{tileError}</div>
	{/if}

	{#if !mapReady}
		<div class="loading">Loading map…</div>
	{/if}

	<div class="map-wrapper" bind:this={mapContainer}></div>
</div>

<style>
	.map-page {
		display: flex;
		flex-direction: column;
		height: 100vh;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 1rem;
		background: #1e293b;
		color: #fff;
		flex-shrink: 0;
		z-index: 1000;
	}

	.toolbar h1 {
		font-size: 1rem;
		margin: 0;
		flex: 1;
	}

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

	.tile-warning {
		background: #fef3c7;
		color: #92400e;
		padding: 0.4rem 1rem;
		font-size: 0.82rem;
		flex-shrink: 0;
	}

	.loading {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 1rem;
		color: #64748b;
		z-index: 999;
	}

	.map-wrapper {
		flex: 1;
		min-height: 0;
	}

	/* Leaflet overrides */
	:global(.leaflet-container) {
		width: 100%;
		height: 100%;
		background: #e2e8f0;
	}
</style>
