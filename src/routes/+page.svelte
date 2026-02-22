<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/pwa-test', { replaceState: true });
	});
</script>

<svelte:head>
	<title>PWA Cache Test</title>
</svelte:head>

<main style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui">
	<p>Redirecting to <a href="/pwa-test">PWA Cache Test Dashboard</a>…</p>
</main>
