<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	// ── Types ──────────────────────────────────────────────────────────────────
	type PlaceType = 'natural' | 'accommodation' | 'restaurant' | 'cultural' | string;

	interface PlaceProperties {
		id: string;
		name: string;
		type: PlaceType;
		description?: string;
	}

	interface SelectedPlace {
		name: string;
		type: PlaceType;
		description: string;
		rating: number;
		reviewCount: number;
		reviews: { author: string; rating: number; text: string; time: string }[];
	}

	// ── State ──────────────────────────────────────────────────────────────────
	let mapContainer: HTMLDivElement;
	let isOnline = $state(true);
	let mapReady = $state(false);
	let tileError = $state('');
	let tileCacheStatus = $state<'checking' | 'cached' | 'partial' | 'none'>('checking');
	let tileCachedCount = $state(0);
	let tileTotalChecked = $state(0);
	let geojsonStatus = $state<'loading' | 'loaded-network' | 'loaded-idb' | 'error'>('loading');
	let selectedPlace = $state<SelectedPlace | null>(null);
	let panelOpen = $state(false);

	const LAM_THUONG_CENTER: [number, number] = [22.2212453, 104.5942255];
	const DEFAULT_ZOOM = 13;
	const IDB_NAME = 'map-data-db';
	const IDB_STORE = 'geojson-store';
	const GEOJSON_KEY = 'lam-thuong-demo';

	// ── Place type config ──────────────────────────────────────────────────────
	const TYPE_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
		natural:       { emoji: '🌿', label: 'Thiên nhiên',   color: '#16a34a', bg: '#dcfce7' },
		accommodation: { emoji: '🏨', label: 'Lưu trú',       color: '#7c3aed', bg: '#ede9fe' },
		restaurant:    { emoji: '🍜', label: 'Ăn uống',       color: '#ea580c', bg: '#ffedd5' },
		cultural:      { emoji: '🏛️', label: 'Văn hóa',      color: '#0369a1', bg: '#e0f2fe' }
	};

	function getTypeConfig(type: PlaceType) {
		return TYPE_CONFIG[type] ?? { emoji: '📍', label: type, color: '#64748b', bg: '#f1f5f9' };
	}

	// ── Fake reviews per type ──────────────────────────────────────────────────
	const FAKE_REVIEWS: Record<string, { author: string; rating: number; text: string; time: string }[]> = {
		natural: [
			{ author: 'Minh Tuấn', rating: 5, text: 'Cảnh đẹp tuyệt vời, không khí trong lành. Rất đáng đến!', time: '2 tuần trước' },
			{ author: 'Lan Anh', rating: 4, text: 'Thiên nhiên hoang sơ, đường đi hơi khó nhưng xứng đáng.', time: '1 tháng trước' },
			{ author: 'Hoàng Nam', rating: 5, text: 'Chụp ảnh đẹp lắm, nên đến vào buổi sáng sớm.', time: '3 tháng trước' }
		],
		accommodation: [
			{ author: 'Thu Hương', rating: 5, text: 'Phòng sạch, nhân viên thân thiện, view đẹp.', time: '1 tuần trước' },
			{ author: 'Văn Đức', rating: 4, text: 'Không gian yên tĩnh, ăn sáng ngon. Sẽ quay lại!', time: '3 tuần trước' },
			{ author: 'Phương Linh', rating: 5, text: 'Trải nghiệm farmstay tuyệt vời, gần gũi thiên nhiên.', time: '2 tháng trước' }
		],
		restaurant: [
			{ author: 'Quốc Bảo', rating: 5, text: 'Đồ ăn ngon, cá suối tươi, giá hợp lý.', time: '5 ngày trước' },
			{ author: 'Hải Yến', rating: 4, text: 'Ngồi ven suối mát, thức ăn đặc sản địa phương rất ngon.', time: '2 tuần trước' },
			{ author: 'Tiến Đạt', rating: 5, text: 'Quán nhỏ mà ngon bất ngờ, nhất định phải thử!', time: '1 tháng trước' }
		],
		cultural: [
			{ author: 'Ngọc Mai', rating: 4, text: 'Kiến trúc độc đáo, tìm hiểu được nhiều văn hóa địa phương.', time: '1 tuần trước' },
			{ author: 'Trọng Khải', rating: 5, text: 'Ấn tượng với bản sắc dân tộc nơi đây, rất hay.', time: '1 tháng trước' },
			{ author: 'Diễm Quỳnh', rating: 4, text: 'Nên kết hợp tham quan cùng các điểm khác trong vùng.', time: '2 tháng trước' }
		]
	};

	function buildPlacePanel(props: PlaceProperties): SelectedPlace {
		const reviews = FAKE_REVIEWS[props.type] ?? FAKE_REVIEWS['natural'];
		const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
		return {
			name: props.name,
			type: props.type,
			description: props.description ?? '',
			rating: Math.round(avg * 10) / 10,
			reviewCount: reviews.length,
			reviews
		};
	}

	function closePanel() {
		panelOpen = false;
		setTimeout(() => (selectedPlace = null), 300);
	}

	function renderStars(rating: number): string {
		const full = Math.round(rating);
		return '★'.repeat(full) + '☆'.repeat(5 - full);
	}

	// ── IndexedDB helpers ──────────────────────────────────────────────────────

	function openIDB(): Promise<IDBDatabase> {
		return new Promise((resolve, reject) => {
			const req = indexedDB.open(IDB_NAME, 1);
			req.onupgradeneeded = () => {
				req.result.createObjectStore(IDB_STORE);
			};
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
	}

	async function saveToIDB(data: unknown): Promise<void> {
		const db = await openIDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(IDB_STORE, 'readwrite');
			tx.objectStore(IDB_STORE).put(data, GEOJSON_KEY);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	}

	async function loadFromIDB(): Promise<unknown | null> {
		const db = await openIDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(IDB_STORE, 'readonly');
			const req = tx.objectStore(IDB_STORE).get(GEOJSON_KEY);
			req.onsuccess = () => resolve(req.result ?? null);
			req.onerror = () => reject(req.error);
		});
	}

	// ── Fetch GeoJSON (network-first, IDB fallback) ────────────────────────────

	async function fetchGeoJSON(): Promise<unknown | null> {
		// 1. Thử network trước
		if (navigator.onLine) {
			try {
				const res = await fetch('/data/lam-thuong-demo.geojson');
				if (res.ok) {
					const data = await res.json();
					// Lưu vào IDB để dùng offline sau này
					await saveToIDB(data);
					geojsonStatus = 'loaded-network';
					return data;
				}
			} catch {
				// Network thất bại → fallback IDB
			}
		}

		// 2. Fallback: đọc từ IndexedDB
		const cached = await loadFromIDB();
		if (cached) {
			geojsonStatus = 'loaded-idb';
			return cached;
		}

		geojsonStatus = 'error';
		return null;
	}

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

	// ── Custom pin icon per type ───────────────────────────────────────────────
	function createPinIcon(L: typeof import('leaflet'), type: PlaceType) {
		const cfg = getTypeConfig(type);
		const svg = `
			<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
				<defs>
					<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
						<feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>
					</filter>
				</defs>
				<path d="M18 0C8.059 0 0 8.059 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.059 27.941 0 18 0z"
					fill="${cfg.color}" filter="url(#shadow)"/>
				<circle cx="18" cy="18" r="11" fill="white"/>
				<text x="18" y="23" text-anchor="middle" font-size="13">${cfg.emoji}</text>
			</svg>`;
		return L.divIcon({
			html: svg,
			className: '',
			iconSize: [36, 44],
			iconAnchor: [18, 44],
			popupAnchor: [0, -44]
		});
	}

	let mapInstance: import('leaflet').Map | null = null;

	onMount(() => {
		isOnline = navigator.onLine;
		window.addEventListener('online', () => (isOnline = true));
		window.addEventListener('offline', () => (isOnline = false));

		checkTileCache();

		(async () => {
			const L = await import('leaflet');
			await import('leaflet/dist/leaflet.css');

			// Fetch GeoJSON (network-first, IDB fallback)
			const geojsonData = await fetchGeoJSON();

			const map = L.map(mapContainer, {
				center: LAM_THUONG_CENTER,
				zoom: DEFAULT_ZOOM,
				zoomControl: true
			});
			mapInstance = map;

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

			// ── Load GeoJSON lên map ─────────────────────────────────────────────
			const overlays: Record<string, import('leaflet').Layer> = {};

			if (geojsonData) {
				// Dùng pointToLayer để render custom pin icon
				const geojsonLayer = L.geoJSON(geojsonData as any, {
					pointToLayer: (feature, latlng) => {
						const type: PlaceType = feature.properties?.type ?? 'natural';
						return L.marker(latlng, { icon: createPinIcon(L, type) });
					},
					onEachFeature: (feature, layer) => {
						layer.on('click', () => {
							const props = feature.properties as PlaceProperties;
							selectedPlace = buildPlacePanel(props);
							panelOpen = true;
							// Pan map so pin stays visible above panel
							if (feature.geometry.type === 'Point') {
								const [lng, lat] = (feature.geometry as any).coordinates;
								mapInstance?.panTo([lat, lng], { animate: true });
							}
						});
					}
				}).addTo(map);

				const bounds = geojsonLayer.getBounds();
				if (bounds.isValid()) {
					map.fitBounds(bounds, { padding: [40, 40] });
				}

				overlays['Lâm Thượng'] = geojsonLayer;
			}

			// Close panel when clicking on map background
			map.on('click', () => {
				if (panelOpen) closePanel();
			});

			// Layer control
			L.control
				.layers(
					{ 'Online (OSM)': osmTiles, 'Offline (Local)': localTiles },
					overlays,
					{ position: 'topright' }
				)
				.addTo(map);

			mapReady = true;
		})();

		// Synchronous cleanup — Svelte expects non-Promise return
		return () => {
			mapInstance?.remove();
			mapInstance = null;
		};
	});
</script>

<svelte:head>
	<title>Lâm Thượng Map</title>
</svelte:head>

<div class="map-page">
	<!-- Toolbar -->
	<div class="toolbar">
		<a href="/pwa-test" class="back">← Dashboard</a>
		<h1>Lâm Thượng Map</h1>
		<span class="indicator" class:online={isOnline} class:offline={!isOnline}>
			{isOnline ? '🟢 Online' : '🔴 Offline'}
		</span>
	</div>

	<!-- Status bar -->
	<div class="cache-bar">
		{#if tileCacheStatus === 'checking'}
			<span class="cache-tag checking">⏳ Kiểm tra tile…</span>
		{:else if tileCacheStatus === 'cached'}
			<span class="cache-tag ok">✅ Tile cached ({tileCachedCount}/{tileTotalChecked})</span>
		{:else if tileCacheStatus === 'partial'}
			<span class="cache-tag partial">⚠️ Tile một phần ({tileCachedCount}/{tileTotalChecked})</span>
		{:else}
			<span class="cache-tag none">❌ Chưa cache tile</span>
		{/if}
		<span class="sep">·</span>
		{#if geojsonStatus === 'loading'}
			<span class="cache-tag checking">⏳ Đang tải điểm…</span>
		{:else if geojsonStatus === 'loaded-network'}
			<span class="cache-tag ok">🗺️ Điểm từ mạng · đã lưu IDB</span>
		{:else if geojsonStatus === 'loaded-idb'}
			<span class="cache-tag partial">🗄️ Điểm từ IndexedDB</span>
		{:else}
			<span class="cache-tag none">❌ Không tải được điểm</span>
		{/if}
	</div>

	{#if tileError}
		<div class="tile-warning">{tileError}</div>
	{/if}

	<!-- Map -->
	<div class="map-area">
		{#if !mapReady}
			<div class="loading">
				<div class="spinner"></div>
				<span>Đang tải bản đồ…</span>
			</div>
		{/if}
		<div class="map-wrapper" bind:this={mapContainer}></div>
	</div>

	<!-- Google Maps–style bottom sheet -->
	{#if selectedPlace}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="sheet-backdrop" onclick={closePanel}></div>
		<div class="place-sheet" class:open={panelOpen}>
			<!-- Drag handle -->
			<div class="sheet-handle"></div>

			<!-- Header -->
			<div class="sheet-header">
				<div class="sheet-header-left">
					{#if selectedPlace}
						{@const cfg = getTypeConfig(selectedPlace.type)}
						<span class="type-badge" style="background:{cfg.bg}; color:{cfg.color}">
							{cfg.emoji} {cfg.label}
						</span>
					{/if}
					<h2 class="place-name">{selectedPlace.name}</h2>
					<!-- Rating row -->
					<div class="rating-row">
						<span class="rating-score">{selectedPlace.rating}</span>
						<span class="stars">{renderStars(selectedPlace.rating)}</span>
						<span class="review-count">({selectedPlace.reviewCount} đánh giá)</span>
					</div>
				</div>
				<button class="close-btn" onclick={closePanel} aria-label="Đóng">✕</button>
			</div>

			<!-- Action buttons like Google Maps -->
			<div class="action-row">
				<button class="action-btn">
					<span class="action-icon">🧭</span>
					<span>Chỉ đường</span>
				</button>
				<button class="action-btn">
					<span class="action-icon">💾</span>
					<span>Lưu</span>
				</button>
				<button class="action-btn">
					<span class="action-icon">📤</span>
					<span>Chia sẻ</span>
				</button>
				<button class="action-btn">
					<span class="action-icon">📷</span>
					<span>Ảnh</span>
				</button>
			</div>

			<!-- Divider -->
			<div class="divider"></div>

			<!-- Overview section -->
			<div class="sheet-section">
				<h3 class="section-title">Tổng quan</h3>
				<p class="place-desc">{selectedPlace.description}</p>
			</div>

			<div class="divider"></div>

			<!-- Reviews section -->
			<div class="sheet-section">
				<h3 class="section-title">Đánh giá &amp; nhận xét</h3>
				<div class="reviews-list">
					{#each selectedPlace.reviews as review}
						<div class="review-card">
							<div class="review-top">
								<div class="avatar">{review.author[0]}</div>
								<div class="review-meta">
									<span class="reviewer-name">{review.author}</span>
									<span class="review-time">{review.time}</span>
								</div>
								<span class="review-stars">{renderStars(review.rating)}</span>
							</div>
							<p class="review-text">{review.text}</p>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* ── Layout ── */
	.map-page {
		display: flex;
		flex-direction: column;
		height: 100dvh;
		font-family: system-ui, -apple-system, sans-serif;
		overflow: hidden;
	}

	/* ── Toolbar ── */
	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.55rem 1rem;
		background: #fff;
		border-bottom: 1px solid #e2e8f0;
		flex-shrink: 0;
		z-index: 1000;
		box-shadow: 0 1px 4px rgba(0,0,0,0.08);
	}
	.toolbar h1 {
		font-size: 0.95rem;
		font-weight: 600;
		margin: 0;
		flex: 1;
		color: #1e293b;
	}
	.back {
		color: #3b82f6;
		text-decoration: none;
		font-size: 0.82rem;
		white-space: nowrap;
	}
	.back:hover { text-decoration: underline; }
	.indicator {
		font-size: 0.72rem;
		font-weight: 600;
		padding: 0.18rem 0.55rem;
		border-radius: 999px;
		white-space: nowrap;
	}
	.online  { background: #dcfce7; color: #166534; }
	.offline { background: #fee2e2; color: #991b1b; }

	/* ── Cache bar ── */
	.cache-bar {
		padding: 0.25rem 1rem;
		background: #f8fafc;
		border-bottom: 1px solid #e2e8f0;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	.sep { color: #cbd5e1; font-size: 0.75rem; }
	.cache-tag { font-size: 0.75rem; font-weight: 500; }
	.cache-tag.checking { color: #92400e; }
	.cache-tag.ok       { color: #166534; }
	.cache-tag.partial  { color: #b45309; }
	.cache-tag.none     { color: #991b1b; }

	.tile-warning {
		background: #fef3c7;
		color: #92400e;
		padding: 0.35rem 1rem;
		font-size: 0.78rem;
		flex-shrink: 0;
	}

	/* ── Map area ── */
	.map-area {
		flex: 1;
		position: relative;
		min-height: 0;
	}
	.map-wrapper {
		width: 100%;
		height: 100%;
	}
	.loading {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		background: #f1f5f9;
		z-index: 999;
		font-size: 0.9rem;
		color: #64748b;
	}
	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid #e2e8f0;
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }

	/* ── Sheet backdrop ── */
	.sheet-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1100;
		background: transparent;
	}

	/* ── Place sheet (Google Maps–style bottom panel) ── */
	.place-sheet {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 1200;
		background: #fff;
		border-radius: 16px 16px 0 0;
		box-shadow: 0 -4px 24px rgba(0,0,0,0.18);
		max-height: 72dvh;
		overflow-y: auto;
		transform: translateY(100%);
		transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
		overscroll-behavior: contain;
	}
	.place-sheet.open {
		transform: translateY(0);
	}

	.sheet-handle {
		width: 36px;
		height: 4px;
		background: #cbd5e1;
		border-radius: 2px;
		margin: 10px auto 0;
	}

	/* ── Sheet header ── */
	.sheet-header {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.75rem 1rem 0.5rem;
	}
	.sheet-header-left {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.type-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.72rem;
		font-weight: 600;
		padding: 0.15rem 0.55rem;
		border-radius: 999px;
		width: fit-content;
	}
	.place-name {
		font-size: 1rem;
		font-weight: 700;
		color: #0f172a;
		margin: 0;
		line-height: 1.3;
	}
	.rating-row {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.8rem;
	}
	.rating-score {
		font-weight: 700;
		color: #ea580c;
	}
	.stars { color: #f59e0b; letter-spacing: -1px; }
	.review-count { color: #64748b; }

	.close-btn {
		background: #f1f5f9;
		border: none;
		border-radius: 50%;
		width: 30px;
		height: 30px;
		font-size: 0.85rem;
		cursor: pointer;
		color: #64748b;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-top: 2px;
	}
	.close-btn:hover { background: #e2e8f0; }

	/* ── Action buttons ── */
	.action-row {
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem 1rem 0.75rem;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.action-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 0.5rem 0.9rem;
		background: #eff6ff;
		border: none;
		border-radius: 10px;
		cursor: pointer;
		font-size: 0.72rem;
		color: #1d4ed8;
		font-weight: 500;
		white-space: nowrap;
		transition: background 0.15s;
	}
	.action-btn:hover { background: #dbeafe; }
	.action-icon { font-size: 1.1rem; }

	/* ── Divider ── */
	.divider {
		height: 6px;
		background: #f1f5f9;
		margin: 0;
	}

	/* ── Content sections ── */
	.sheet-section {
		padding: 0.85rem 1rem;
	}
	.section-title {
		font-size: 0.82rem;
		font-weight: 700;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.6rem;
	}
	.place-desc {
		font-size: 0.88rem;
		color: #334155;
		line-height: 1.6;
		margin: 0;
	}

	/* ── Reviews ── */
	.reviews-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.review-card {
		border: 1px solid #f1f5f9;
		border-radius: 10px;
		padding: 0.7rem;
		background: #fafafa;
	}
	.review-top {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.4rem;
	}
	.avatar {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: #3b82f6;
		color: #fff;
		font-size: 0.8rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.review-meta {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.05rem;
	}
	.reviewer-name { font-size: 0.82rem; font-weight: 600; color: #1e293b; }
	.review-time   { font-size: 0.72rem; color: #94a3b8; }
	.review-stars  { color: #f59e0b; font-size: 0.75rem; letter-spacing: -1px; }
	.review-text   { font-size: 0.82rem; color: #475569; margin: 0; line-height: 1.5; }

	/* ── Leaflet overrides ── */
	:global(.leaflet-container) {
		width: 100%;
		height: 100%;
		background: #e2e8f0;
	}
	:global(.leaflet-control-attribution) {
		font-size: 0.65rem !important;
	}
</style>
