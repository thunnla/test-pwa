<script lang="ts">
	import CacheWidget from '$lib/CacheWidget.svelte';

	async function clearAllCaches() {
		try {
			const cacheNames = await caches.keys();
			await Promise.all(cacheNames.map(name => caches.delete(name)));
			
			const registration = await navigator.serviceWorker.getRegistration();
			if (registration) {
				await registration.unregister();
			}
			
			alert('All caches cleared! The page will reload.');
			location.reload();
		} catch (error) {
			console.error('Failed to clear caches:', error);
			alert('Failed to clear caches. Check console for details.');
		}
	}
</script>

<svelte:head>
	<title>Cache Dashboard - PWA Test</title>
</svelte:head>

<div class="dashboard">
	<header>
		<h1>📊 Cache Dashboard</h1>
		<nav>
			<a href="/">🏠 Home</a>
			<a href="/map">🗺️ Map</a>
			<a href="/audio">🎵 Audio</a>
		</nav>
	</header>

	<main>
		<section class="widget-section">
			<h2>Simple View</h2>
			<CacheWidget />
		</section>

		<section class="widget-section">
			<h2>Detailed View</h2>
			<CacheWidget showDetails={true} />
		</section>

		<section class="widget-section">
			<h2>Auto-Refresh (every 5s)</h2>
			<CacheWidget showDetails={true} autoRefresh={5} />
		</section>

		<section class="info-section">
			<h2>ℹ️ Cache Management</h2>
			
			<div class="info-grid">
				<div class="info-card">
					<h3>🗺️ Map Tiles</h3>
					<p><strong>Target:</strong> 40-50MB</p>
					<p><strong>Entries:</strong> ~1000 tiles</p>
					<p><strong>Priority:</strong> <span class="badge critical">OFFLINE CRITICAL</span></p>
					<p>Map tiles được cache với độ ưu tiên cao nhất để đảm bảo offline functionality.</p>
				</div>

				<div class="info-card">
					<h3>🎵 Audio</h3>
					<p><strong>Target:</strong> 20-30MB</p>
					<p><strong>Entries:</strong> ~15 files</p>
					<p><strong>Priority:</strong> <span class="badge medium">MEDIUM</span></p>
					<p>Audio files được cache để playback offline.</p>
				</div>

				<div class="info-card">
					<h3>🖼️ Images</h3>
					<p><strong>Target:</strong> 30-40MB</p>
					<p><strong>Entries:</strong> ~200 images</p>
					<p><strong>Priority:</strong> <span class="badge medium">MEDIUM</span></p>
					<p>Images được cache cho fast loading và offline access.</p>
				</div>
			</div>
		</section>

		<section class="actions-section">
			<h2>🛠️ Cache Actions</h2>
			<div class="action-buttons">
				<button class="btn btn-primary" onclick={() => location.reload()}>
					🔄 Refresh Page
				</button>
				<button 
					class="btn btn-danger" 
					onclick={() => {
						if (confirm('Clear all caches? This will remove all offline data.')) {
							clearAllCaches();
						}
					}}
				>
					🗑️ Clear All Caches
				</button>
			</div>
		</section>
	</main>
</div>

<style>
	.dashboard {
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	header {
		background: rgba(255, 255, 255, 0.95);
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	h1 {
		margin: 0 0 1rem 0;
		color: #2c3e50;
	}

	nav {
		display: flex;
		gap: 1rem;
	}

	nav a {
		text-decoration: none;
		color: #3498db;
		font-weight: 600;
		padding: 0.5rem 1rem;
		border-radius: 5px;
		transition: background 0.3s;
	}

	nav a:hover {
		background: #ecf0f1;
	}

	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.widget-section,
	.info-section,
	.actions-section {
		background: white;
		padding: 2rem;
		margin-bottom: 2rem;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	h2 {
		margin: 0 0 1.5rem 0;
		color: #2c3e50;
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.info-card {
		background: #f8f9fa;
		padding: 1.5rem;
		border-radius: 8px;
		border: 2px solid #e5e7eb;
	}

	.info-card h3 {
		margin: 0 0 1rem 0;
		color: #2c3e50;
		font-size: 1.2rem;
	}

	.info-card p {
		margin: 0.5rem 0;
		color: #374151;
		font-size: 0.95rem;
	}

	.badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: bold;
		text-transform: uppercase;
	}

	.badge.critical {
		background: #fee2e2;
		color: #991b1b;
	}

	.badge.medium {
		background: #dbeafe;
		color: #1e40af;
	}

	.action-buttons {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.3s;
	}

	.btn-primary {
		background: #3498db;
		color: white;
	}

	.btn-primary:hover {
		background: #2980b9;
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(52, 152, 219, 0.3);
	}

	.btn-danger {
		background: #e74c3c;
		color: white;
	}

	.btn-danger:hover {
		background: #c0392b;
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(231, 76, 60, 0.3);
	}
</style>
