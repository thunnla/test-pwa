<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { getStorageEstimate } from '$lib/offline-storage';

	let mapContainer: HTMLElement;
	let map: any;
	let storageInfo = $state<{
		usageMB?: number;
		quotaMB?: number;
		usagePercent?: number;
	}>({});
	let isOnline = $state(browser ? navigator.onLine : true);

	onMount(async () => {
		// Dynamically import Leaflet (browser only)
		const L = await import('leaflet');
		
		// Import Leaflet CSS
		const style = document.createElement('link');
		style.rel = 'stylesheet';
		style.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
		document.head.appendChild(style);

		// Initialize map
		map = L.map(mapContainer).setView([21.0285, 105.8542], 13); // Hanoi coordinates

		// Add OpenStreetMap tile layer
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
			maxZoom: 19,
			// Tiles sẽ được cache bởi Service Worker
		}).addTo(map);

		// Add marker
		L.marker([21.0285, 105.8542])
			.addTo(map)
			.bindPopup('Hà Nội, Việt Nam')
			.openPopup();

		// Update storage info
		updateStorageInfo();

		// Listen to online/offline events
		window.addEventListener('online', handleOnlineStatus);
		window.addEventListener('offline', handleOnlineStatus);

		return () => {
			window.removeEventListener('online', handleOnlineStatus);
			window.removeEventListener('offline', handleOnlineStatus);
			if (map) {
				map.remove();
			}
		};
	});

	function handleOnlineStatus() {
		isOnline = navigator.onLine;
	}

	async function updateStorageInfo() {
		storageInfo = await getStorageEstimate();
	}
</script>

<svelte:head>
	<title>Map Test - Offline PWA</title>
</svelte:head>

<div class="map-page">
	<header>
		<h1>🗺️ Offline Map Test</h1>
		<div class="status">
			<span class="status-badge" class:online={isOnline} class:offline={!isOnline}>
				{isOnline ? '🟢 Online' : '🔴 Offline'}
			</span>
		</div>
	</header>

	<div class="info-panel">
		<h2>📊 Storage Info</h2>
		{#if storageInfo.usageMB !== undefined}
			<p>
				<strong>Usage:</strong>
				{storageInfo.usageMB.toFixed(2)} MB / {storageInfo.quotaMB?.toFixed(2)} MB
				({storageInfo.usagePercent?.toFixed(1)}%)
			</p>
		{:else}
			<p>Loading storage info...</p>
		{/if}

		<h2>ℹ️ Cache Strategy</h2>
		<ul>
			<li><strong>Map Tiles:</strong> 40-50MB (Cache First, 90 days)</li>
			<li><strong>Images:</strong> 30-40MB (Cache First, 30 days)</li>
			<li><strong>Audio:</strong> 20-30MB (Cache First, 60 days)</li>
		</ul>

		<button onclick={() => updateStorageInfo()}>🔄 Refresh Storage Info</button>
	</div>

	<div class="map-container" bind:this={mapContainer}></div>

	<div class="instructions">
		<h3>📝 Hướng dẫn test offline:</h3>
		<ol>
			<li>Pan/zoom map để load map tiles</li>
			<li>Đợi tiles load xong (tiles sẽ tự động cached)</li>
			<li>Tắt network (DevTools → Network → Offline)</li>
			<li>Refresh page → map tiles đã cache vẫn hiển thị</li>
		</ol>
	</div>
</div>

<style>
	.map-page {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}

	header {
		background: #2c3e50;
		color: white;
		padding: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	h1 {
		margin: 0;
		font-size: 1.5rem;
	}

	.status-badge {
		padding: 0.5rem 1rem;
		border-radius: 20px;
		font-weight: bold;
		font-size: 0.9rem;
	}

	.status-badge.online {
		background: #27ae60;
		color: white;
	}

	.status-badge.offline {
		background: #e74c3c;
		color: white;
	}

	.info-panel {
		background: #ecf0f1;
		padding: 1rem;
		border-bottom: 2px solid #bdc3c7;
	}

	.info-panel h2 {
		margin: 0.5rem 0;
		font-size: 1rem;
	}

	.info-panel ul {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
	}

	.info-panel button {
		background: #3498db;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 5px;
		cursor: pointer;
		font-weight: bold;
		margin-top: 0.5rem;
	}

	.info-panel button:hover {
		background: #2980b9;
	}

	.map-container {
		flex: 1;
		width: 100%;
		min-height: 400px;
	}

	.instructions {
		background: #fff3cd;
		padding: 1rem;
		border-top: 2px solid #ffc107;
	}

	.instructions h3 {
		margin: 0 0 0.5rem 0;
		color: #856404;
	}

	.instructions ol {
		margin: 0;
		padding-left: 1.5rem;
		color: #856404;
	}

	/* Fix Leaflet default icon issue */
	:global(.leaflet-default-icon-path) {
		background-image: url(https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png);
	}
</style>
