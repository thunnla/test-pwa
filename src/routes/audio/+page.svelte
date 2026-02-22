<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { getStorageEstimate, getCacheInfo } from '$lib/offline-storage';

	let storageInfo = $state<{
		usageMB?: number;
		quotaMB?: number;
		usagePercent?: number;
	}>({});

	let cacheInfo = $state<Array<{ name: string; size: number }>>([]);
	let isOnline = $state(browser ? navigator.onLine : true);

	// Sample audio files for testing (replace with your actual audio URLs)
	const audioFiles = [
		{
			name: 'Sample Audio 1',
			url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
		},
		{
			name: 'Sample Audio 2',
			url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
		},
		{
			name: 'Sample Audio 3',
			url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
		}
	];

	let currentAudio: HTMLAudioElement | null = null;
	let playingIndex = $state<number | null>(null);

	onMount(async () => {
		await updateInfo();

		// Listen to online/offline events
		window.addEventListener('online', handleOnlineStatus);
		window.addEventListener('offline', handleOnlineStatus);

		return () => {
			window.removeEventListener('online', handleOnlineStatus);
			window.removeEventListener('offline', handleOnlineStatus);
			if (currentAudio) {
				currentAudio.pause();
			}
		};
	});

	function handleOnlineStatus() {
		isOnline = navigator.onLine;
	}

	async function updateInfo() {
		storageInfo = await getStorageEstimate();
		cacheInfo = await getCacheInfo();
	}

	function playAudio(url: string, index: number) {
		if (currentAudio) {
			currentAudio.pause();
		}

		currentAudio = new Audio(url);
		currentAudio.play();
		playingIndex = index;

		currentAudio.onended = () => {
			playingIndex = null;
		};

		currentAudio.onerror = () => {
			alert('Failed to load audio. Check network connection.');
			playingIndex = null;
		};
	}

	function stopAudio() {
		if (currentAudio) {
			currentAudio.pause();
			playingIndex = null;
		}
	}
</script>

<svelte:head>
	<title>Audio Cache Test - Offline PWA</title>
</svelte:head>

<div class="audio-page">
	<header>
		<h1>🎵 Offline Audio Cache Test</h1>
		<div class="status">
			<span class="status-badge" class:online={isOnline} class:offline={!isOnline}>
				{isOnline ? '🟢 Online' : '🔴 Offline'}
			</span>
		</div>
	</header>

	<div class="content">
		<section class="storage-section">
			<h2>📊 Storage Info</h2>
			{#if storageInfo.usageMB !== undefined}
				<div class="storage-bar">
					<div
						class="storage-fill"
						style="width: {storageInfo.usagePercent}%"
					></div>
				</div>
				<p>
					<strong>Usage:</strong>
					{storageInfo.usageMB.toFixed(2)} MB / {storageInfo.quotaMB?.toFixed(2)} MB
					({storageInfo.usagePercent?.toFixed(1)}%)
				</p>
			{:else}
				<p>Loading storage info...</p>
			{/if}

			<h3>Cache Details:</h3>
			{#if cacheInfo.length > 0}
				<ul class="cache-list">
					{#each cacheInfo as cache}
						<li>
							<strong>{cache.name}:</strong> {cache.size} entries
						</li>
					{/each}
				</ul>
			{:else}
				<p>No caches found</p>
			{/if}

			<button onclick={() => updateInfo()}>🔄 Refresh Info</button>
		</section>

		<section class="audio-section">
			<h2>🎧 Audio Files</h2>
			<p class="info">
				Play audio để cache. Sau đó tắt network và refresh page để test offline playback.
			</p>

			<div class="audio-list">
				{#each audioFiles as audio, index}
					<div class="audio-item">
						<span class="audio-name">{audio.name}</span>
						<div class="audio-controls">
							{#if playingIndex === index}
								<button class="btn-stop" onclick={() => stopAudio()}>⏸ Stop</button>
							{:else}
								<button class="btn-play" onclick={() => playAudio(audio.url, index)}>
									▶ Play
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</section>

		<section class="cache-strategy">
			<h2>ℹ️ Cache Strategy</h2>
			<ul>
				<li><strong>Audio:</strong> 20-30MB (Cache First, 60 days)</li>
				<li><strong>Map Tiles:</strong> 40-50MB (Cache First, 90 days)</li>
				<li><strong>Images:</strong> 30-40MB (Cache First, 30 days)</li>
				<li><strong>Video:</strong> ❌ KHÔNG cache (streaming only)</li>
			</ul>
		</section>

		<section class="instructions">
			<h3>📝 Hướng dẫn test offline:</h3>
			<ol>
				<li>Play các audio files (sẽ tự động cached bởi Service Worker)</li>
				<li>Đợi audio load xong</li>
				<li>Tắt network (DevTools → Network → Offline)</li>
				<li>Refresh page</li>
				<li>Play audio lại → audio đã cache sẽ vẫn chạy được</li>
			</ol>
		</section>
	</div>

	<nav class="bottom-nav">
		<a href="/">🏠 Home</a>
		<a href="/map">🗺️ Map</a>
		<a href="/offline">📴 Offline</a>
	</nav>
</div>

<style>
	.audio-page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
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

	.content {
		flex: 1;
		padding: 1rem;
		max-width: 800px;
		margin: 0 auto;
		width: 100%;
	}

	section {
		background: white;
		padding: 1.5rem;
		margin-bottom: 1rem;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	h2 {
		margin-top: 0;
		color: #2c3e50;
	}

	.storage-bar {
		width: 100%;
		height: 20px;
		background: #ecf0f1;
		border-radius: 10px;
		overflow: hidden;
		margin: 1rem 0;
	}

	.storage-fill {
		height: 100%;
		background: linear-gradient(90deg, #3498db, #2ecc71);
		transition: width 0.3s ease;
	}

	.cache-list {
		list-style: none;
		padding: 0;
	}

	.cache-list li {
		padding: 0.5rem;
		background: #ecf0f1;
		margin: 0.5rem 0;
		border-radius: 5px;
	}

	button {
		background: #3498db;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 5px;
		cursor: pointer;
		font-weight: bold;
	}

	button:hover {
		background: #2980b9;
	}

	.info {
		background: #e8f4f8;
		padding: 1rem;
		border-left: 4px solid #3498db;
		margin: 1rem 0;
	}

	.audio-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.audio-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 8px;
		border: 2px solid #dee2e6;
	}

	.audio-name {
		font-weight: bold;
		color: #2c3e50;
	}

	.btn-play {
		background: #27ae60;
	}

	.btn-play:hover {
		background: #229954;
	}

	.btn-stop {
		background: #e74c3c;
	}

	.btn-stop:hover {
		background: #c0392b;
	}

	.cache-strategy ul {
		line-height: 1.8;
	}

	.instructions {
		background: #fff3cd;
		border: 2px solid #ffc107;
	}

	.instructions h3 {
		margin-top: 0;
		color: #856404;
	}

	.instructions ol {
		color: #856404;
		line-height: 1.8;
	}

	.bottom-nav {
		display: flex;
		justify-content: space-around;
		background: #34495e;
		padding: 1rem;
	}

	.bottom-nav a {
		color: white;
		text-decoration: none;
		font-weight: bold;
		padding: 0.5rem 1rem;
		border-radius: 5px;
		transition: background 0.3s;
	}

	.bottom-nav a:hover {
		background: #2c3e50;
	}
</style>
