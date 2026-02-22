<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let isOnline = $state(browser ? navigator.onLine : true);
	let swStatus = $state('Checking…');
	let deferredPrompt = $state<Event | null>(null);
	let isInstallable = $state(false);
	let debugInfo = $state<string[]>([]);

	function addDebug(msg: string) {
		debugInfo = [...debugInfo, `[${new Date().toLocaleTimeString()}] ${msg}`];
		console.log('[PWA Debug]', msg);
	}

	let isDevMode = $state(import.meta.env.DEV);

	onMount(async () => {
		addDebug('App mounted');
		addDebug(`Mode: ${isDevMode ? '⚠️ DEV (PWA disabled)' : '✅ PRODUCTION'}`);
		
		window.addEventListener('online', () => (isOnline = true));
		window.addEventListener('offline', () => (isOnline = false));

		// Check manifest
		try {
			const manifestLink = document.querySelector('link[rel="manifest"]');
			if (manifestLink) {
				addDebug(`Manifest link found: ${manifestLink.getAttribute('href')}`);
				const manifestUrl = manifestLink.getAttribute('href');
				const response = await fetch(manifestUrl!);
				if (response.ok) {
					const manifest = await response.json();
					addDebug(`Manifest loaded: ${manifest.name}`);
					addDebug(`Icons: ${manifest.icons?.length || 0}`);
				} else {
					addDebug(`Manifest fetch failed: ${response.status}`);
				}
			} else {
				addDebug('⚠️ Manifest link NOT FOUND in <head>');
			}
		} catch (e: any) {
			addDebug(`Manifest error: ${e.message}`);
		}

		// Check service worker status
		if ('serviceWorker' in navigator) {
			addDebug('ServiceWorker API available');
			navigator.serviceWorker.ready.then((reg) => {
				swStatus = `Active (scope: ${reg.scope})`;
				addDebug(`SW registered: ${reg.scope}`);
			}).catch((err) => {
				swStatus = 'Registration failed';
				addDebug(`SW error: ${err.message}`);
			});
		} else {
			swStatus = 'Not supported';
			addDebug('ServiceWorker not supported');
		}

		// Check if already installed
		if (window.matchMedia('(display-mode: standalone)').matches) {
			addDebug('App already installed (standalone mode)');
		}

		// Capture install prompt
		window.addEventListener('beforeinstallprompt', (e) => {
			addDebug('beforeinstallprompt fired!');
			e.preventDefault();
			deferredPrompt = e;
			isInstallable = true;
		});

		window.addEventListener('appinstalled', () => {
			addDebug('App installed successfully');
			isInstallable = false;
			deferredPrompt = null;
		});

		// Debug: Check criteria
		setTimeout(() => {
			if (!isInstallable) {
				addDebug('Install prompt not fired. Possible reasons:');
				addDebug('- Not served over HTTPS/localhost');
				addDebug('- App already installed');
				addDebug('- Manifest invalid or missing');
				addDebug('- Browser does not support (iOS Safari, etc.)');
			}
		}, 2000);
	});

	async function installApp() {
		if (!deferredPrompt) return;
		(deferredPrompt as any).prompt();
		const { outcome } = await (deferredPrompt as any).userChoice;
		if (outcome === 'accepted') {
			deferredPrompt = null;
			isInstallable = false;
		}
	}
</script>

<svelte:head>
	<title>PWA Test</title>
</svelte:head>

<main>
	<h1>PWA Test</h1>

	<section class="card">
		<h2>Status</h2>
		<p>Network: <strong class:online={isOnline} class:offline={!isOnline}>{isOnline ? '🟢 Online' : '🔴 Offline'}</strong></p>
		<p>Service Worker: <code>{swStatus}</code></p>
	</section>

	{#if isInstallable}
		<section class="card">
			<h2>Install App</h2>
			<p>This app can be installed on your device for offline use.</p>
			<button class="btn" onclick={installApp}>Install</button>
		</section>
	{/if}

	<section class="card">
		<h2>Cache Strategies</h2>
		<h3>📦 CacheFirst (Total: 100-150MB)</h3>
		<ul>
			<li><strong>Images:</strong> 30-40MB (~200 entries, 30 days)</li>
			<li><strong>Audio:</strong> 20-30MB (~15 entries, 60 days)</li>
			<li><strong>Map Tiles:</strong> 40-50MB (~1000 entries, 90 days) - <strong>OFFLINE CRITICAL</strong></li>
			<li><strong>Fonts:</strong> (~20 entries, 1 year)</li>
			<li><strong>JS/CSS:</strong> (~50 entries, 7 days)</li>
			<li><strong>Video:</strong> ❌ KHÔNG cache (streaming only)</li>
		</ul>
		<h3>🌐 NetworkFirst</h3>
		<ul>
			<li><strong>API requests</strong> (timeout: 10s, fallback to cache)</li>
		</ul>
		<h3>🔄 StaleWhileRevalidate</h3>
		<ul>
			<li><strong>HTML pages</strong> (show cached, update in background)</li>
		</ul>
	</section>

	<section class="card">
		<h2>🧪 Test Features</h2>
		<div class="test-grid">
			<a href="/map" class="test-card">
				<div class="test-icon">🗺️</div>
				<h3>Map Offline</h3>
				<p>Test offline map tiles với Leaflet.js</p>
			</a>
			<a href="/audio" class="test-card">
				<div class="test-icon">🎵</div>
				<h3>Audio Cache</h3>
				<p>Test offline audio playback</p>
			</a>
			<a href="/cache" class="test-card">
				<div class="test-icon">📊</div>
				<h3>Cache Dashboard</h3>
				<p>Monitor và manage cache storage</p>
			</a>
			<a href="/offline" class="test-card">
				<div class="test-icon">📴</div>
				<h3>Offline Page</h3>
				<p>Fallback page khi offline</p>
			</a>
		</div>
	</section>

	<section class="card debug">
		<h2>🐛 Debug Info</h2>
		{#if isDevMode}
			<div class="warning-box">
				⚠️ <strong>DEV MODE</strong> - PWA is disabled. Run <code>npm run build && npm run preview</code> to test PWA features.
			</div>
		{/if}
		<div class="debug-log">
			{#if debugInfo.length === 0}
				<p class="muted">Loading...</p>
			{:else}
				{#each debugInfo as log}
					<div class="log-entry">{log}</div>
				{/each}
			{/if}
		</div>
		<details style="margin-top: 1rem;">
			<summary style="cursor: pointer; font-weight: 600;">Install Criteria</summary>
			<ul style="margin: 0.5rem 0 0; padding-left: 1.25rem; font-size: 0.85rem;">
				<li>✅ HTTPS or localhost</li>
				<li>✅ Valid manifest.json</li>
				<li>✅ Service Worker registered</li>
				<li>❌ App not already installed</li>
				<li>⚠️ Browser supports beforeinstallprompt (Chrome, Edge, Opera)</li>
				<li>⚠️ iOS Safari: use Share → Add to Home Screen</li>
			</ul>
		</details>
	</section>
</main>

<style>
	main {
		font-family: system-ui, sans-serif;
		max-width: 600px;
		margin: 2rem auto;
		padding: 0 1rem;
	}

	h1 {
		font-size: 2rem;
		margin-bottom: 1.5rem;
	}

	.card {
		background: #f8f9fa;
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		padding: 1.25rem 1.5rem;
		margin-bottom: 1rem;
	}

	.card h2 {
		margin: 0 0 0.75rem;
		font-size: 1.1rem;
	}

	.card p, .card ul {
		margin: 0.25rem 0;
		color: #374151;
	}

	.card ul {
		padding-left: 1.25rem;
	}

	.card li {
		margin: 0.3rem 0;
	}

	code {
		background: #e5e7eb;
		padding: 0.15em 0.4em;
		border-radius: 4px;
		font-size: 0.85rem;
		word-break: break-all;
	}

	:global(.online) { color: #16a34a; }
	:global(.offline) { color: #dc2626; }

	.btn {
		margin-top: 0.5rem;
		padding: 0.6rem 1.25rem;
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		cursor: pointer;
	}

	.btn:hover {
		background: #2563eb;
	}

	.debug {
		background: #fffbeb;
		border-color: #fbbf24;
	}

	.debug-log {
		max-height: 200px;
		overflow-y: auto;
		background: #fefce8;
		border: 1px solid #fde047;
		border-radius: 6px;
		padding: 0.75rem;
		font-family: 'Courier New', monospace;
		font-size: 0.8rem;
	}

	.log-entry {
		margin: 0.25rem 0;
		color: #78350f;
	}

	.muted {
		color: #a3a3a3;
		font-style: italic;
	}

	.warning-box {
		background: #fef2f2;
		border: 2px solid #ef4444;
		color: #991b1b;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		margin-bottom: 0.75rem;
		font-size: 0.9rem;
	}

	.warning-box code {
		background: #fee2e2;
		color: #7f1d1d;
		padding: 0.2em 0.5em;
	}

	.test-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		margin-top: 1rem;
	}

	.test-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1.5rem 1rem;
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 10px;
		text-decoration: none;
		color: #374151;
		transition: all 0.3s ease;
	}

	.test-card:hover {
		border-color: #3b82f6;
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
		transform: translateY(-2px);
	}

	.test-icon {
		font-size: 3rem;
		margin-bottom: 0.5rem;
	}

	.test-card h3 {
		margin: 0.5rem 0 0.25rem;
		font-size: 1rem;
		color: #1f2937;
	}

	.test-card p {
		margin: 0;
		font-size: 0.85rem;
		color: #6b7280;
		text-align: center;
	}
</style>
