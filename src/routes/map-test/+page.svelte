<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let mapContainer: HTMLDivElement;
	let isOnline = $state(true);
	let mapReady = $state(false);
	let tileError = $state('');
	let tileCacheStatus = $state<'checking' | 'cached' | 'partial' | 'none'>('checking');
	let tileCachedCount = $state(0);
	let tileTotalChecked = $state(0);

	const LAM_THUONG_CENTER: [number, number] = [22.283, 104.775];
	const DEFAULT_ZOOM = 15;

	// Kiểm tra một số tile mẫu xem đã cache chưa
	async function checkTileCache() {
		if (!('caches' in window)) {
			tileCacheStatus = 'none';
			return;
		}
		// Các tile mẫu quanh khu vực Lâm Thượng zoom 15
		const sampleTiles = [
			'/map-tiles/z15/25905/13929.png',
			'/map-tiles/z15/25906/13929.png',
			'/map-tiles/z15/25905/13930.png',
			'/map-tiles/z14/12952/6964.png',
			'/map-tiles/z16/51810/27858.png'
		];
		let found = 0;
		for (const url of sampleTiles) {
			const match = await caches.match(url);
			if (match) found++;
		}
		tileTotalChecked = sampleTiles.length;
		tileCachedCount = found;
		if (found === sampleTiles.length) tileCacheStatus = 'cached';
		else if (found > 0) tileCacheStatus = 'partial';
		else tileCacheStatus = 'none';
	}

	onMount(async () => {
		isOnline = navigator.onLine;
		window.addEventListener('online', () => (isOnline = true));
		window.addEventListener('offline', () => (isOnline = false));

		// Kiểm tra cache tile song song với load map
		checkTileCache();

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
		localTiles.on('tileerror', (e: any) => {
			if (!navigator.onLine) {
				// Khi offline, thử đọc từ cache thũ công
				const url = e.tile?.src ?? '';
				if (url && 'caches' in window) {
					caches.match(url).then((cached) => {
						if (cached) cached.blob().then((blob) => {
							e.tile.src = URL.createObjectURL(blob);
						});
					});
				}
			}
			if (!tileError) {
				tileError = isOnline
					? 'Một số tile local chưa có — đang dùng OSM online'
					: 'Tile chưa được cache — cần mở map lúc online trước';
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

	<!-- Trạng thái cache tile -->
	<div class="cache-bar">
		{#if tileCacheStatus === 'checking'}
			<span class="cache-tag checking">⏳ Đang kiểm tra cache tile…</span>
		{:else if tileCacheStatus === 'cached'}
			<span class="cache-tag ok">✅ Tiles đã cache ({tileCachedCount}/{tileTotalChecked} mẫu)</span>
		{:else if tileCacheStatus === 'partial'}
			<span class="cache-tag partial">⚠️ Cache một phần ({tileCachedCount}/{tileTotalChecked} mẫu) — mở map online để cache đủ</span>
		{:else}
			<span class="cache-tag none">❌ Chưa có tile nào trong cache. Mở map khi online để tải về.</span>
		{/if}
	</div>

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

	.cache-bar {
		padding: 0.3rem 1rem;
		background: #f8fafc;
		border-bottom: 1px solid #e2e8f0;
		flex-shrink: 0;
	}

	.cache-tag {
		font-size: 0.8rem;
		font-weight: 500;
	}
	.cache-tag.checking { color: #92400e; }
	.cache-tag.ok { color: #166534; }
	.cache-tag.partial { color: #b45309; }
	.cache-tag.none { color: #991b1b; }

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
