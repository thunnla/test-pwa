<script lang="ts">
	import { browser } from '$app/environment';

	let isOnline = $state(browser ? navigator.onLine : true);

	if (browser) {
		window.addEventListener('online', () => (isOnline = true));
		window.addEventListener('offline', () => (isOnline = false));
	}
</script>

<svelte:head>
	<title>Offline – PWA Test</title>
</svelte:head>

<main>
	<div class="container">
		<div class="icon">📡</div>
		<h1>You're offline</h1>
		<p>No internet connection. Please check your network and try again.</p>

		{#if isOnline}
			<p class="status online">✅ Connection restored!</p>
			<a href="/" class="btn">Go back home</a>
		{:else}
			<p class="status offline">⚠️ Still offline…</p>
			<button class="btn" onclick={() => window.location.reload()}>Try again</button>
		{/if}
	</div>
</main>

<style>
	main {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		font-family: system-ui, sans-serif;
		background: #f8f9fa;
		margin: 0;
	}

	.container {
		text-align: center;
		padding: 2rem;
		max-width: 400px;
	}

	.icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	h1 {
		font-size: 2rem;
		margin-bottom: 0.5rem;
		color: #1a1a1a;
	}

	p {
		color: #555;
		line-height: 1.6;
	}

	.status {
		font-weight: 600;
		margin-top: 1rem;
	}

	.online { color: #22c55e; }
	.offline { color: #f59e0b; }

	.btn {
		display: inline-block;
		margin-top: 1.5rem;
		padding: 0.75rem 1.5rem;
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		cursor: pointer;
		text-decoration: none;
		transition: background 0.2s;
	}

	.btn:hover {
		background: #2563eb;
	}
</style>
