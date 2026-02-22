<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let { children } = $props();

	let showUpdateBanner = $state(false);
	let registration = $state<ServiceWorkerRegistration | null>(null);

	onMount(async () => {
		if (browser && 'serviceWorker' in navigator) {
			// Register service worker
			try {
				const reg = await navigator.serviceWorker.register('/sw.js', {
					scope: '/',
					type: 'classic'
				});
				console.log('✅ Service Worker registered:', reg.scope);
				registration = reg;

				// Check for updates
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

				// Check if there's a waiting SW
				if (reg.waiting) {
					showUpdateBanner = true;
				}
			} catch (error) {
				console.error('❌ Service Worker registration failed:', error);
			}
		}
	});

	function applyUpdate() {
		registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
		showUpdateBanner = false;
		window.location.reload();
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

{#if showUpdateBanner}
	<div class="update-banner">
		<span>A new version is available.</span>
		<button onclick={applyUpdate}>Update now</button>
	</div>
{/if}

{@render children()}

<style>
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
</style>
