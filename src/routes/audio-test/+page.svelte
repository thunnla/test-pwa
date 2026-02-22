<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let isOnline = $state(true);
	let audioStatuses = $state<Array<{ path: string; name: string; available: boolean }>>([]);

	const AUDIO_COUNT = 10;
	const audioFiles = Array.from({ length: AUDIO_COUNT }, (_, i) => {
		const num = String(i + 1).padStart(3, '0');
		return {
			path: `/test-assets/audio/test-audio-${num}.bin`,
			name: `Test Audio ${num}`
		};
	});

	onMount(() => {
		isOnline = navigator.onLine;
		window.addEventListener('online', () => (isOnline = true));
		window.addEventListener('offline', () => (isOnline = false));

		// Initialize
		audioStatuses = audioFiles.map((f) => ({ ...f, available: false }));

		// Check availability
		audioFiles.forEach(async (file, idx) => {
			try {
				// 1. Kiểm tra CacheStorage trước (hoạt động offline)
				if ('caches' in window) {
					const cached = await caches.match(file.path);
					if (cached) {
						audioStatuses[idx] = { ...file, available: true };
						return;
					}
				}
				// 2. Nếu online, thử GET (SW sẽ cache lại)
				if (navigator.onLine) {
					const res = await fetch(file.path);
					audioStatuses[idx] = { ...file, available: res.ok };
				} else {
					audioStatuses[idx] = { ...file, available: false };
				}
			} catch {
				audioStatuses[idx] = { ...file, available: false };
			}
		});
	});

	const availableCount = $derived(audioStatuses.filter((a) => a.available).length);
</script>

<svelte:head>
	<title>Offline Audio Viewer — Lam Thuong PWA Test</title>
</svelte:head>

<div class="page">
	<div class="toolbar">
		<a href="/pwa-test" class="back">← Dashboard</a>
		<h1>Offline Audio Viewer</h1>
		<span class="indicator" class:online={isOnline} class:offline={!isOnline}>
			{isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}
		</span>
	</div>

	<div class="content">
		<div class="summary">
			<span><strong>{AUDIO_COUNT}</strong> test audio files (3 MB each)</span>
			{#if audioStatuses.length > 0}
				<span class="text-success">✅ {availableCount} available</span>
				{#if availableCount < AUDIO_COUNT}
					<span class="text-danger">❌ {AUDIO_COUNT - availableCount} unavailable</span>
				{/if}
			{/if}
		</div>

		<ul class="audio-list">
			{#each audioStatuses as item, i}
				<li class="audio-item" class:ok={item.available} class:fail={!item.available}>
					<div class="audio-info">
						<span class="audio-status">{item.available ? '✅' : '❌'}</span>
						<div>
							<div class="audio-name">{item.name}</div>
							<div class="audio-meta">3 MB — {item.available ? 'cached / available' : 'not available'}</div>
						</div>
					</div>
					{#if item.available}
						<audio controls preload="none">
							<source src={item.path} type="application/octet-stream" />
							Your browser does not support audio playback.
						</audio>
					{:else}
						<div class="audio-unavailable">File not cached</div>
					{/if}
				</li>
			{/each}
		</ul>

		<div class="note">
			<strong>Note:</strong> Test audio files are random binary data (.bin) and will not produce
			meaningful sound. They exist to validate that cached assets are retrievable offline.
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
		max-width: 700px;
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

	.audio-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.audio-item {
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 0.75rem 1rem;
		background: #f8fafc;
	}
	.audio-item.ok { border-color: #86efac; background: #f0fdf4; }
	.audio-item.fail { border-color: #fca5a5; background: #fef2f2; }

	.audio-info {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: 0.5rem;
	}

	.audio-status { font-size: 1.2rem; }
	.audio-name { font-size: 0.9rem; font-weight: 500; }
	.audio-meta { font-size: 0.78rem; color: #64748b; }

	.audio-unavailable {
		font-size: 0.82rem;
		color: #94a3b8;
		font-style: italic;
	}

	audio {
		width: 100%;
		height: 36px;
	}

	.note {
		margin-top: 1.5rem;
		padding: 0.75rem 1rem;
		background: #fffbeb;
		border: 1px solid #fde68a;
		border-radius: 8px;
		font-size: 0.82rem;
		color: #78350f;
	}
</style>
