<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let { children } = $props();

	let showUpdateBanner = $state(false);
	let deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);
	let showInstallButton = $state(false);

	interface BeforeInstallPromptEvent extends Event {
		prompt(): Promise<void>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	}

	onMount(() => {
		if (!browser) return;

		// Listen for SW updates via vite-plugin-pwa auto-registration
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.ready.then((reg) => {
				console.log('✅ Service Worker ready:', reg.scope);

				reg.addEventListener('updatefound', () => {
					const newWorker = reg.installing;
					console.log('🔄 Service Worker update found');
					newWorker?.addEventListener('statechange', () => {
						if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
							console.log('✨ New Service Worker installed');
							showUpdateBanner = true;
						}
					});
				});

				if (reg.waiting) {
					showUpdateBanner = true;
				}
			});
		}

		// Capture install prompt
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			deferredPrompt = e as BeforeInstallPromptEvent;
			showInstallButton = true;
			console.log('📲 Install prompt captured');
		});

		window.addEventListener('appinstalled', () => {
			showInstallButton = false;
			deferredPrompt = null;
			console.log('✅ App installed');
		});
	});

	function applyUpdate() {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.ready.then((reg) => {
				reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
			});
		}
		showUpdateBanner = false;
		window.location.reload();
	}

	async function installApp() {
		if (!deferredPrompt) return;
		await deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;
		console.log('Install prompt outcome:', outcome);
		deferredPrompt = null;
		showInstallButton = false;
	}
</script>

<svelte:head>
	<link rel="manifest" href="/manifest.webmanifest" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<meta name="theme-color" content="#ffffff" />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta name="apple-mobile-web-app-title" content="PWA Test" />
</svelte:head>

<nav class="nav-bar">
	<a href="/pwa-test" class="nav-link">Dashboard</a>
	<a href="/map-test" class="nav-link">Map Test</a>
	<a href="/image-test" class="nav-link">Image Test</a>
	<a href="/audio-test" class="nav-link">Audio Test</a>
</nav>

{#if showUpdateBanner}
	<div class="update-banner">
		<span>A new version is available.</span>
		<button onclick={applyUpdate}>Update now</button>
	</div>
{/if}

{#if showInstallButton}
	<div class="install-banner">
		<span>📲 Install this app for offline access</span>
		<button onclick={installApp}>Install</button>
	</div>
{/if}

{@render children()}

<style>
	.nav-bar {
		display: flex;
		gap: 0;
		background: #0f172a;
		padding: 0;
		font-family: system-ui, -apple-system, sans-serif;
		font-size: 0.85rem;
		position: sticky;
		top: 0;
		z-index: 10000;
	}

	.nav-link {
		color: #cbd5e1;
		text-decoration: none;
		padding: 0.6rem 1rem;
		transition: background 0.15s, color 0.15s;
	}

	.nav-link:hover {
		background: #1e293b;
		color: #fff;
	}

	.update-banner {
		position: fixed;
		bottom: 1rem;
		left: 50%;
		transform: translateX(-50%);
		background: #1a1a1a;
		color: #fff;
		padding: 0.75rem 1.25rem;
		border-radius: 8px;
		display: flex;
		align-items: center;
		gap: 1rem;
		z-index: 9999;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		font-family: system-ui, sans-serif;
		font-size: 0.9rem;
	}

	.update-banner button {
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: 6px;
		padding: 0.4rem 0.9rem;
		cursor: pointer;
		font-size: 0.85rem;
		white-space: nowrap;
	}

	.update-banner button:hover {
		background: #2563eb;
	}

	.install-banner {
		position: fixed;
		bottom: 4rem;
		left: 50%;
		transform: translateX(-50%);
		background: #166534;
		color: #fff;
		padding: 0.75rem 1.25rem;
		border-radius: 8px;
		display: flex;
		align-items: center;
		gap: 1rem;
		z-index: 9998;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		font-family: system-ui, sans-serif;
		font-size: 0.9rem;
	}

	.install-banner button {
		background: #22c55e;
		color: white;
		border: none;
		border-radius: 6px;
		padding: 0.4rem 0.9rem;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.install-banner button:hover {
		background: #16a34a;
	}
</style>
